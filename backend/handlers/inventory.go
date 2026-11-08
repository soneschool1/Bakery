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

func GetRawMaterials(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	findOptions := options.Find().SetSort(bson.D{{Key: "name", Value: 1}})
	cursor, err := config.DB.RawMaterials.Find(ctx, bson.M{}, findOptions)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer cursor.Close(ctx)

	var materials []models.RawMaterial
	if err := cursor.All(ctx, &materials); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, materials)
}

func CreateRawMaterial(c *gin.Context) {
	var m models.RawMaterial
	if err := c.ShouldBindJSON(&m); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	m.ID = primitive.NewObjectID()
	m.LastUpdated = time.Now()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := config.DB.RawMaterials.InsertOne(ctx, m)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	sse.GlobalHub.Broadcast("raw_material_created", m)
	c.JSON(http.StatusCreated, m)
}

func UpdateRawMaterial(c *gin.Context) {
	idStr := c.Param("id")
	objID, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid material ID"})
		return
	}

	var updateData bson.M
	if err := c.ShouldBindJSON(&updateData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	delete(updateData, "_id")
	delete(updateData, "id")
	updateData["last_updated"] = time.Now()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err = config.DB.RawMaterials.UpdateOne(ctx, bson.M{"_id": objID}, bson.M{"$set": updateData})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	sse.GlobalHub.Broadcast("raw_material_updated", gin.H{"id": idStr})
	c.JSON(http.StatusOK, gin.H{"message": "Material updated successfully"})
}

func DeleteRawMaterial(c *gin.Context) {
	idStr := c.Param("id")
	objID, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid material ID"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err = config.DB.RawMaterials.DeleteOne(ctx, bson.M{"_id": objID})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	sse.GlobalHub.Broadcast("raw_material_deleted", gin.H{"id": idStr})
	c.JSON(http.StatusOK, gin.H{"message": "Material deleted successfully"})
}

type StockAdjustmentRequest struct {
	MaterialID  string  `json:"material_id" binding:"required"`
	NewQuantity float64 `json:"new_quantity"`
	Reason      string  `json:"reason" binding:"required"`
	AdminName   string  `json:"admin_name" binding:"required"`
}

func AdjustStock(c *gin.Context) {
	var req StockAdjustmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.NewQuantity < 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Quantity cannot be negative"})
		return
	}

	objID, err := primitive.ObjectIDFromHex(req.MaterialID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid material ID"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var existing models.RawMaterial
	if err := config.DB.RawMaterials.FindOne(ctx, bson.M{"_id": objID}).Decode(&existing); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Material not found"})
		return
	}

	now := time.Now()
	_, err = config.DB.RawMaterials.UpdateOne(ctx, bson.M{"_id": objID}, bson.M{
		"$set": bson.M{
			"current_quantity": req.NewQuantity,
			"last_updated":     now,
		},
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Audit Log
	config.DB.AuditLogs.InsertOne(ctx, models.AuditLog{
		UserName:   req.AdminName,
		Action:     "ADJUST_RAW_MATERIAL_STOCK",
		EntityType: "raw_materials",
		EntityID:   req.MaterialID,
		Details:    fmt.Sprintf("Stock adjusted for %s from %.2f %s to %.2f %s. Reason: %s", existing.Name, existing.CurrentQuantity, existing.Unit, req.NewQuantity, existing.Unit, req.Reason),
		CreatedAt:  now,
	})

	sse.GlobalHub.Broadcast("raw_material_updated", gin.H{"id": req.MaterialID, "quantity": req.NewQuantity})
	c.JSON(http.StatusOK, gin.H{"message": "Stock adjusted successfully"})
}

func GetFinishedStock(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	branchID := c.Query("branch_id")
	filter := bson.M{}
	if branchID != "" {
		filter["branch_id"] = branchID
	}

	cursor, err := config.DB.FinishedStock.Find(ctx, filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer cursor.Close(ctx)

	var stock []models.FinishedProductStock
	if err := cursor.All(ctx, &stock); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	for i := range stock {
		if stock[i].AvailableQuantity < 0 {
			stock[i].AvailableQuantity = 0
		}
	}

	c.JSON(http.StatusOK, stock)
}

type FinishedStockAdjustmentRequest struct {
	StockID     string `json:"stock_id" binding:"required"`
	NewQuantity int    `json:"new_quantity"`
	Reason      string `json:"reason" binding:"required"`
	AdminName   string `json:"admin_name" binding:"required"`
}

func AdjustFinishedStock(c *gin.Context) {
	var req FinishedStockAdjustmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.NewQuantity < 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Quantity cannot be negative"})
		return
	}

	objID, err := primitive.ObjectIDFromHex(req.StockID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid stock ID"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var existing models.FinishedProductStock
	if err := config.DB.FinishedStock.FindOne(ctx, bson.M{"_id": objID}).Decode(&existing); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Finished product stock record not found"})
		return
	}

	now := time.Now()
	_, err = config.DB.FinishedStock.UpdateOne(ctx, bson.M{"_id": objID}, bson.M{
		"$set": bson.M{
			"available_quantity": req.NewQuantity,
			"last_updated":      now,
		},
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Audit Log
	config.DB.AuditLogs.InsertOne(ctx, models.AuditLog{
		UserName:   req.AdminName,
		Action:     "ADJUST_FINISHED_PRODUCT_STOCK",
		EntityType: "finished_stock",
		EntityID:   req.StockID,
		Details:    fmt.Sprintf("Finished stock adjusted for %s from %d pcs to %d pcs. Reason: %s", existing.ProductName, existing.AvailableQuantity, req.NewQuantity, req.Reason),
		CreatedAt:  now,
	})

	sse.GlobalHub.Broadcast("stock_updated", gin.H{"product_id": existing.ProductID, "new_quantity": req.NewQuantity})
	c.JSON(http.StatusOK, gin.H{"message": "Finished product stock adjusted successfully"})
}

type CreateStockCheckRequest struct {
	CheckDate    string                  `json:"check_date" binding:"required"`
	EmployeeID   string                  `json:"employee_id" binding:"required"`
	EmployeeName string                  `json:"employee_name" binding:"required"`
	Items        []models.StockCheckItem `json:"items" binding:"required"`
	Notes        string                  `json:"notes"`
}

func CreateWeeklyStockCheck(c *gin.Context) {
	var req CreateStockCheckRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	now := time.Now()

	// Calculate differences
	for i := range req.Items {
		diff := req.Items[i].PhysicalQuantity - req.Items[i].SystemQuantity
		req.Items[i].Difference = math.Round(diff*100) / 100
	}

	stockCheck := models.WeeklyStockCheck{
		ID:           primitive.NewObjectID(),
		CheckDate:    req.CheckDate,
		EmployeeID:   req.EmployeeID,
		EmployeeName: req.EmployeeName,
		Items:        req.Items,
		Status:       "pending_approval",
		Notes:        req.Notes,
		CreatedAt:    now,
	}

	_, err := config.DB.WeeklyStockChecks.InsertOne(ctx, stockCheck)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Notification for Admin
	notif := models.Notification{
		TargetRole: "admin",
		Type:       "stock_check",
		Title:      "Weekly Stock Check Submitted",
		Message:    fmt.Sprintf("%s submitted weekly physical inventory count for %d items. Review required.", req.EmployeeName, len(req.Items)),
		Severity:   "info",
		Read:       false,
		Link:       "/inventory",
		CreatedAt:  now,
	}
	config.DB.Notifications.InsertOne(ctx, notif)

	sse.GlobalHub.Broadcast("stock_check_created", stockCheck)
	c.JSON(http.StatusCreated, stockCheck)
}

func GetWeeklyStockChecks(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	findOptions := options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}})
	cursor, err := config.DB.WeeklyStockChecks.Find(ctx, bson.M{}, findOptions)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer cursor.Close(ctx)

	var checks []models.WeeklyStockCheck
	if err := cursor.All(ctx, &checks); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, checks)
}

type ApproveStockCheckRequest struct {
	AdminName string `json:"admin_name" binding:"required"`
}

func ApproveWeeklyStockCheck(c *gin.Context) {
	idStr := c.Param("id")
	objID, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid check ID"})
		return
	}

	var req ApproveStockCheckRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var check models.WeeklyStockCheck
	if err := config.DB.WeeklyStockChecks.FindOne(ctx, bson.M{"_id": objID}).Decode(&check); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Stock check not found"})
		return
	}

	if check.Status == "approved" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Stock check is already approved"})
		return
	}

	now := time.Now()

	// Apply physical counts to raw materials
	for _, itm := range check.Items {
		if itm.MaterialID != "" {
			if mID, err := primitive.ObjectIDFromHex(itm.MaterialID); err == nil {
				config.DB.RawMaterials.UpdateOne(ctx, bson.M{"_id": mID}, bson.M{
					"$set": bson.M{
						"current_quantity": itm.PhysicalQuantity,
						"last_updated":     now,
					},
				})
			}
		}
	}

	// Update check status
	config.DB.WeeklyStockChecks.UpdateOne(ctx, bson.M{"_id": objID}, bson.M{
		"$set": bson.M{
			"status":      "approved",
			"approved_by": req.AdminName,
			"approved_at": now,
		},
	})

	// Log audit
	config.DB.AuditLogs.InsertOne(ctx, models.AuditLog{
		UserName:   req.AdminName,
		Action:     "APPROVE_WEEKLY_STOCK_CHECK",
		EntityType: "weekly_stock_checks",
		EntityID:   idStr,
		Details:    fmt.Sprintf("Weekly stock check approved by %s. Inventory synchronized with physical count.", req.AdminName),
		CreatedAt:  now,
	})

	sse.GlobalHub.Broadcast("stock_check_approved", gin.H{"id": idStr})
	sse.GlobalHub.Broadcast("raw_material_updated", gin.H{"action": "bulk_sync"})

	c.JSON(http.StatusOK, gin.H{"message": "Stock check approved and inventory balances updated to physical count"})
}
