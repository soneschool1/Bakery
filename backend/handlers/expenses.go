package handlers

import (
	"context"
	"fmt"
	"math"
	"net/http"
	"time"

	"harbuu-backend/config"
	"harbuu-backend/models"
	"harbuu-backend/sse"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func GetVariableExpenses(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	filter := bson.M{}
	date := c.Query("date")
	if date != "" {
		filter["expense_date"] = date
	}

	startDate := c.Query("start_date")
	endDate := c.Query("end_date")
	if startDate != "" && endDate != "" {
		filter["expense_date"] = bson.M{
			"$gte": startDate,
			"$lte": endDate,
		}
	}

	category := c.Query("category")
	if category != "" && category != "all" {
		filter["expense_category"] = category
	}

	paymentMethod := c.Query("payment_method")
	if paymentMethod != "" && paymentMethod != "all" {
		filter["payment_method"] = paymentMethod
	}

	findOptions := options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}})
	cursor, err := config.DB.VariableExpenses.Find(ctx, filter, findOptions)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer cursor.Close(ctx)

	var expenses []models.VariableExpense
	if err := cursor.All(ctx, &expenses); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, expenses)
}

func CreateVariableExpense(c *gin.Context) {
	var exp models.VariableExpense
	if err := c.ShouldBindJSON(&exp); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	now := time.Now()
	exp.ID = primitive.NewObjectID()
	if exp.ExpenseDate == "" {
		exp.ExpenseDate = now.Format("2006-01-02")
	}
	if exp.PaymentMethod == "" {
		exp.PaymentMethod = "cash"
	}
	exp.CreatedAt = now

	// If this expense is an inventory purchase, increase the inventory balance
	if exp.IsInventoryPurchase && exp.InventoryMaterialID != "" && exp.InventoryQuantityAdded > 0 {
		if matID, err := primitive.ObjectIDFromHex(exp.InventoryMaterialID); err == nil {
			// Update purchase price if calculated unit price
			unitPrice := exp.Amount / exp.InventoryQuantityAdded
			config.DB.RawMaterials.UpdateOne(ctx, bson.M{"_id": matID}, bson.M{
				"$inc": bson.M{"current_quantity": exp.InventoryQuantityAdded},
				"$set": bson.M{
					"purchase_price": math.Round(unitPrice*100) / 100,
					"last_updated":   now,
				},
			})
			sse.GlobalHub.Broadcast("raw_material_updated", gin.H{"id": exp.InventoryMaterialID, "added": exp.InventoryQuantityAdded})
		}
	}

	_, err := config.DB.VariableExpenses.InsertOne(ctx, exp)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	sse.GlobalHub.Broadcast("expense_created", exp)
	c.JSON(http.StatusCreated, exp)
}

type UpdateVariableExpenseRequest struct {
	ExpenseCategory string  `json:"expense_category"`
	Description     string  `json:"description"`
	Amount          float64 `json:"amount"`
	ExpenseDate     string  `json:"expense_date"`
	PaymentMethod   string  `json:"payment_method"`
	Remarks         string  `json:"remarks"`
	Reason          string  `json:"reason"`
	AdminName       string  `json:"admin_name"`
}

func UpdateVariableExpense(c *gin.Context) {
	idStr := c.Param("id")
	objID, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid expense ID"})
		return
	}

	var req UpdateVariableExpenseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Amount <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Amount must be greater than 0"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var existing models.VariableExpense
	err = config.DB.VariableExpenses.FindOne(ctx, bson.M{"_id": objID}).Decode(&existing)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Expense record not found"})
		return
	}

	now := time.Now()
	reason := req.Reason
	if reason == "" {
		reason = "Modified by administrator"
	}
	adminName := req.AdminName
	if adminName == "" {
		adminName = "Administrator"
	}

	auditEntry := models.AuditEntry{
		EditedBy:       adminName,
		EditedAt:       now,
		Reason:         reason,
		PreviousValues: fmt.Sprintf("Amount: %.2f ETB | Category: %s | Method: %s | Date: %s", existing.Amount, existing.ExpenseCategory, existing.PaymentMethod, existing.ExpenseDate),
	}

	updatedTrail := append(existing.AuditTrail, auditEntry)

	updateDoc := bson.M{
		"$set": bson.M{
			"expense_category": req.ExpenseCategory,
			"description":      req.Description,
			"amount":           req.Amount,
			"expense_date":     req.ExpenseDate,
			"payment_method":   req.PaymentMethod,
			"remarks":          req.Remarks,
			"status":           "edited",
			"audit_trail":      updatedTrail,
			"updated_at":       now,
		},
	}

	_, err = config.DB.VariableExpenses.UpdateOne(ctx, bson.M{"_id": objID}, updateDoc)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Global Audit Log
	config.DB.AuditLogs.InsertOne(ctx, models.AuditLog{
		ID:         primitive.NewObjectID(),
		UserID:     "admin",
		UserName:   adminName,
		Action:     "EXPENSE_EDIT",
		EntityType: "expense",
		EntityID:   idStr,
		Details:    fmt.Sprintf("Edited expense %s (%s). Amount changed from %.2f to %.2f ETB. Reason: %s", existing.Description, existing.ExpenseCategory, existing.Amount, req.Amount, reason),
		CreatedAt:  now,
	})

	var updated models.VariableExpense
	_ = config.DB.VariableExpenses.FindOne(ctx, bson.M{"_id": objID}).Decode(&updated)

	sse.GlobalHub.Broadcast("expense_updated", updated)
	c.JSON(http.StatusOK, updated)
}

func DeleteVariableExpense(c *gin.Context) {
	idStr := c.Param("id")
	objID, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid expense ID"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var existing models.VariableExpense
	err = config.DB.VariableExpenses.FindOne(ctx, bson.M{"_id": objID}).Decode(&existing)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Expense record not found"})
		return
	}

	reason := c.Query("reason")
	if reason == "" {
		reason = "Deleted by administrator"
	}
	adminName := c.Query("admin_name")
	if adminName == "" {
		adminName = "Administrator"
	}

	_, err = config.DB.VariableExpenses.DeleteOne(ctx, bson.M{"_id": objID})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	now := time.Now()
	// Global Audit Log
	config.DB.AuditLogs.InsertOne(ctx, models.AuditLog{
		ID:         primitive.NewObjectID(),
		UserID:     "admin",
		UserName:   adminName,
		Action:     "EXPENSE_DELETE",
		EntityType: "expense",
		EntityID:   idStr,
		Details:    fmt.Sprintf("Deleted expense: %s (%.2f ETB, %s, %s). Reason: %s", existing.Description, existing.Amount, existing.ExpenseCategory, existing.PaymentMethod, reason),
		CreatedAt:  now,
	})

	sse.GlobalHub.Broadcast("expense_deleted", gin.H{"id": idStr})
	c.JSON(http.StatusOK, gin.H{"message": "Expense deleted successfully", "id": idStr})
}

// Fixed Expenses
func GetFixedExpenses(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	findOptions := options.Find().SetSort(bson.D{{Key: "name", Value: 1}})
	cursor, err := config.DB.FixedExpenses.Find(ctx, bson.M{"active": true}, findOptions)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer cursor.Close(ctx)

	var list []models.FixedExpense
	if err := cursor.All(ctx, &list); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, list)
}

func CreateFixedExpense(c *gin.Context) {
	var f models.FixedExpense
	if err := c.ShouldBindJSON(&f); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	f.ID = primitive.NewObjectID()
	f.Active = true
	f.CreatedAt = time.Now()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := config.DB.FixedExpenses.InsertOne(ctx, f)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, f)
}

func UpdateFixedExpense(c *gin.Context) {
	idStr := c.Param("id")
	objID, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	var updateData bson.M
	if err := c.ShouldBindJSON(&updateData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	delete(updateData, "_id")
	delete(updateData, "id")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err = config.DB.FixedExpenses.UpdateOne(ctx, bson.M{"_id": objID}, bson.M{"$set": updateData})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Fixed expense updated successfully"})
}

func DeleteFixedExpense(c *gin.Context) {
	idStr := c.Param("id")
	objID, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err = config.DB.FixedExpenses.UpdateOne(ctx, bson.M{"_id": objID}, bson.M{"$set": bson.M{"active": false}})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Fixed expense removed successfully"})
}

// Fixed Expense Payments / Monthly tracking
func GetFixedExpensePayments(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	periodMonth := c.Query("month")
	if periodMonth == "" {
		periodMonth = time.Now().Format("2006-01")
	}

	// 1. Fetch active fixed expenses
	cursor, err := config.DB.FixedExpenses.Find(ctx, bson.M{"active": true})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer cursor.Close(ctx)

	var fixedExpenses []models.FixedExpense
	cursor.All(ctx, &fixedExpenses)

	// 2. Fetch existing payments for this month
	payCursor, err := config.DB.FixedExpensePayments.Find(ctx, bson.M{"period_month": periodMonth})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer payCursor.Close(ctx)

	var payments []models.FixedExpensePayment
	payCursor.All(ctx, &payments)

	paymentMap := make(map[string]models.FixedExpensePayment)
	for _, p := range payments {
		paymentMap[p.FixedExpenseID] = p
	}

	type MonthExpenseStatus struct {
		FixedExpense models.FixedExpense        `json:"fixed_expense"`
		Payment      *models.FixedExpensePayment `json:"payment"`
		Status       string                     `json:"status"` // "paid" or "unpaid"
	}

	var result []MonthExpenseStatus
	for _, fe := range fixedExpenses {
		st := MonthExpenseStatus{
			FixedExpense: fe,
			Status:       "unpaid",
		}
		if p, ok := paymentMap[fe.ID.Hex()]; ok {
			st.Payment = &p
			st.Status = p.Status
		}
		result = append(result, st)
	}

	c.JSON(http.StatusOK, gin.H{
		"period_month": periodMonth,
		"items":        result,
	})
}

type RecordPaymentRequest struct {
	FixedExpenseID string  `json:"fixed_expense_id" binding:"required"`
	PeriodMonth    string  `json:"period_month" binding:"required"`
	Amount         float64 `json:"amount" binding:"required"`
	Status         string  `json:"status"` // "paid" or "unpaid"
	PaymentMethod  string  `json:"payment_method"`
	PaidBy         string  `json:"paid_by"`
	Reference      string  `json:"reference"`
	Remarks        string  `json:"remarks"`
}

func RecordFixedExpensePayment(c *gin.Context) {
	var req RecordPaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Status == "" {
		req.Status = "paid"
	}
	if req.PaymentMethod == "" {
		req.PaymentMethod = "cash"
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	feObjID, _ := primitive.ObjectIDFromHex(req.FixedExpenseID)
	var fe models.FixedExpense
	config.DB.FixedExpenses.FindOne(ctx, bson.M{"_id": feObjID}).Decode(&fe)

	now := time.Now()
	filter := bson.M{
		"fixed_expense_id": req.FixedExpenseID,
		"period_month":    req.PeriodMonth,
	}

	update := bson.M{
		"$set": bson.M{
			"name":           fe.Name,
			"amount":         req.Amount,
			"status":         req.Status,
			"payment_date":   now.Format("2006-01-02"),
			"payment_method": req.PaymentMethod,
			"paid_by":        req.PaidBy,
			"reference":      req.Reference,
			"remarks":        req.Remarks,
			"created_at":     now,
		},
	}
	opts := options.Update().SetUpsert(true)
	_, err := config.DB.FixedExpensePayments.UpdateOne(ctx, filter, update, opts)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	sse.GlobalHub.Broadcast("fixed_expense_payment_updated", gin.H{"month": req.PeriodMonth})
	c.JSON(http.StatusOK, gin.H{"message": "Payment record updated successfully"})
}
