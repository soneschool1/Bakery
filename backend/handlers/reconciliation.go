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

func GetDailyClosingSummary(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	date := c.Query("date")
	if date == "" {
		date = time.Now().Format("2006-01-02")
	}

	branchID := c.Query("branch_id")
	if branchID == "" {
		branchID = "main"
	}

	// 1. Fetch Sales for the day
	salesFilter := bson.M{"sale_date": date}
	cursor, err := config.DB.Sales.Find(ctx, salesFilter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer cursor.Close(ctx)

	var sales []models.Sale
	cursor.All(ctx, &sales)

	var totalQtySold int
	var totalSalesValue float64
	var totalCashSales float64
	var totalBankSales float64
	productBreakdown := make(map[string]map[string]interface{})

	for _, s := range sales {
		totalSalesValue += s.TotalAmount
		if s.PaymentMethod == "cash" {
			totalCashSales += s.TotalAmount
		} else {
			totalBankSales += s.TotalAmount
		}

		for _, item := range s.Items {
			totalQtySold += item.Quantity
			if _, exists := productBreakdown[item.ProductName]; !exists {
				productBreakdown[item.ProductName] = map[string]interface{}{
					"name":     item.ProductName,
					"quantity": 0,
					"revenue":  0.0,
				}
			}
			q := productBreakdown[item.ProductName]["quantity"].(int)
			r := productBreakdown[item.ProductName]["revenue"].(float64)
			productBreakdown[item.ProductName]["quantity"] = q + item.Quantity
			productBreakdown[item.ProductName]["revenue"] = r + item.TotalPrice
		}
	}

	// 2. Fetch Cash Variable Expenses for the day
	expFilter := bson.M{
		"expense_date":   date,
		"payment_method": "cash",
	}
	expCursor, err := config.DB.VariableExpenses.Find(ctx, expFilter)
	var cashExpensesTotal float64
	if err == nil {
		defer expCursor.Close(ctx)
		var expenses []models.VariableExpense
		if err := expCursor.All(ctx, &expenses); err == nil {
			for _, e := range expenses {
				cashExpensesTotal += e.Amount
			}
		}
	}

	// 3. Fetch Branch Transfers for the day
	trfCursor, _ := config.DB.BranchTransfers.Find(ctx, bson.M{"transfer_date": date})
	var totalTransfers int
	var transferItems []models.BranchTransfer
	if trfCursor != nil {
		defer trfCursor.Close(ctx)
		trfCursor.All(ctx, &transferItems)
		for _, t := range transferItems {
			totalTransfers += t.Quantity
		}
	}

	// Expected cash amount in shop: Cash Sales - Cash Expenses
	expectedCash := totalCashSales - cashExpensesTotal
	if expectedCash < 0 {
		expectedCash = 0
	}

	c.JSON(http.StatusOK, gin.H{
		"closing_date":           date,
		"total_quantity_sold":    totalQtySold,
		"total_sales_value":      math.Round(totalSalesValue*100) / 100,
		"total_cash_sales":        math.Round(totalCashSales*100) / 100,
		"total_bank_sales":        math.Round(totalBankSales*100) / 100,
		"total_cash_expenses":     math.Round(cashExpensesTotal*100) / 100,
		"expected_cash_amount":    math.Round(expectedCash*100) / 100,
		"total_branch_transfers": totalTransfers,
		"product_breakdown":      productBreakdown,
		"transfers_list":         transferItems,
	})
}

type CreateClosingRequest struct {
	ClosingDate         string  `json:"closing_date" binding:"required"`
	CashierID           string  `json:"cashier_id" binding:"required"`
	CashierName         string  `json:"cashier_name" binding:"required"`
	BranchID            string  `json:"branch_id"`
	BranchName          string  `json:"branch_name"`
	TotalQuantitySold   int     `json:"total_quantity_sold"`
	TotalSalesValue     float64 `json:"total_sales_value"`
	TotalCashSales      float64 `json:"total_cash_sales"`
	TotalBankSales      float64 `json:"total_bank_sales"`
	TotalCashExpenses   float64 `json:"total_cash_expenses"`
	ExpectedCashAmount  float64 `json:"expected_cash_amount"`
	ActualCashCounted   float64 `json:"actual_cash_counted"`
	BankDepositAmount   float64 `json:"bank_deposit_amount"`
	CashRemainingInShop float64 `json:"cash_remaining_in_shop"`
	Remarks             string  `json:"remarks"`
}

func CreateDailyCashClosing(c *gin.Context) {
	var req CreateClosingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.BranchID == "" {
		req.BranchID = "main"
		req.BranchName = "Main Bakery & Shop"
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	now := time.Now()
	// Cash Difference = Actual Cash Count - Expected Cash
	cashDiff := req.ActualCashCounted - req.ExpectedCashAmount

	closing := models.DailyCashClosing{
		ID:                  primitive.NewObjectID(),
		ClosingDate:         req.ClosingDate,
		CashierID:           req.CashierID,
		CashierName:         req.CashierName,
		BranchID:            req.BranchID,
		BranchName:          req.BranchName,
		TotalQuantitySold:   req.TotalQuantitySold,
		TotalSalesValue:     math.Round(req.TotalSalesValue*100) / 100,
		TotalCashSales:      math.Round(req.TotalCashSales*100) / 100,
		TotalBankSales:      math.Round(req.TotalBankSales*100) / 100,
		TotalCashExpenses:   math.Round(req.TotalCashExpenses*100) / 100,
		ExpectedCashAmount:  math.Round(req.ExpectedCashAmount*100) / 100,
		ActualCashCounted:   math.Round(req.ActualCashCounted*100) / 100,
		CashDifference:      math.Round(cashDiff*100) / 100,
		BankDepositAmount:   math.Round(req.BankDepositAmount*100) / 100,
		CashRemainingInShop: math.Round(req.CashRemainingInShop*100) / 100,
		Remarks:             req.Remarks,
		Status:              "pending",
		CreatedAt:           now,
	}

	_, err := config.DB.DailyCashClosings.InsertOne(ctx, closing)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Notification for Admin
	diffStatus := "Exact"
	if cashDiff < 0 {
		diffStatus = fmt.Sprintf("Shortage of %.2f ETB", -cashDiff)
	} else if cashDiff > 0 {
		diffStatus = fmt.Sprintf("Surplus of %.2f ETB", cashDiff)
	}

	notif := models.Notification{
		TargetRole: "admin",
		Type:       "cash_closing",
		Title:      "Daily Cash Reconciliation Submitted",
		Message:    fmt.Sprintf("%s submitted daily closing for %s. Expected: %.2f ETB, Counted: %.2f ETB (%s).", req.CashierName, req.ClosingDate, req.ExpectedCashAmount, req.ActualCashCounted, diffStatus),
		Severity:   "info",
		Read:       false,
		Link:       "/reconciliation",
		CreatedAt:  now,
	}
	config.DB.Notifications.InsertOne(ctx, notif)

	sse.GlobalHub.Broadcast("cash_closing_created", closing)
	c.JSON(http.StatusCreated, closing)
}

func GetDailyCashClosings(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	findOptions := options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}})
	cursor, err := config.DB.DailyCashClosings.Find(ctx, bson.M{}, findOptions)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer cursor.Close(ctx)

	var closings []models.DailyCashClosing
	if err := cursor.All(ctx, &closings); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, closings)
}

type ReviewClosingRequest struct {
	Status     string `json:"status" binding:"required"` // "approved" or "rejected"
	AdminName  string `json:"admin_name" binding:"required"`
	AdminNotes string `json:"admin_notes"`
}

func ReviewDailyCashClosing(c *gin.Context) {
	idStr := c.Param("id")
	objID, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid closing ID"})
		return
	}

	var req ReviewClosingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	now := time.Now()
	_, err = config.DB.DailyCashClosings.UpdateOne(ctx, bson.M{"_id": objID}, bson.M{
		"$set": bson.M{
			"status":      req.Status,
			"reviewed_by": req.AdminName,
			"reviewed_at": now,
		},
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Audit Log
	config.DB.AuditLogs.InsertOne(ctx, models.AuditLog{
		UserName:   req.AdminName,
		Action:     "REVIEW_DAILY_CLOSING",
		EntityType: "daily_cash_closings",
		EntityID:   idStr,
		Details:    fmt.Sprintf("Closing %s reviewed and marked %s by %s.", idStr, req.Status, req.AdminName),
		CreatedAt:  now,
	})

	sse.GlobalHub.Broadcast("cash_closing_reviewed", gin.H{"id": idStr, "status": req.Status})
	c.JSON(http.StatusOK, gin.H{"message": "Daily closing review saved"})
}

// Bank Deposits
func GetBankDeposits(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	findOptions := options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}})
	cursor, err := config.DB.BankDeposits.Find(ctx, bson.M{}, findOptions)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer cursor.Close(ctx)

	var deposits []models.BankDeposit
	if err := cursor.All(ctx, &deposits); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, deposits)
}

func CreateBankDeposit(c *gin.Context) {
	var d models.BankDeposit
	if err := c.ShouldBindJSON(&d); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	now := time.Now()
	d.ID = primitive.NewObjectID()
	if d.DepositDate == "" {
		d.DepositDate = now.Format("2006-01-02")
	}
	d.CreatedAt = now

	_, err := config.DB.BankDeposits.InsertOne(ctx, d)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// If triggered by flour milestone, reset active reminder
	if d.TriggeredByFlourMilestone {
		var tracker models.FlourTracker
		if err := config.DB.FlourTracker.FindOne(ctx, bson.M{}).Decode(&tracker); err == nil {
			// Subtract the milestone or reset cumulative
			remainingFlour := tracker.CurrentCumulativeKG - tracker.MilestoneThresholdKG
			if remainingFlour < 0 {
				remainingFlour = 0
			}
			config.DB.FlourTracker.UpdateOne(ctx, bson.M{"_id": tracker.ID}, bson.M{
				"$set": bson.M{
					"current_cumulative_kg":   remainingFlour,
					"deposit_reminder_active": false,
					"last_deposit_ref":        d.ReferenceNumber,
					"last_updated":            now,
				},
			})
		}
	}

	// Notification for Admin
	notif := models.Notification{
		TargetRole: "admin",
		Type:       "deposit",
		Title:      "Bank Deposit Recorded",
		Message:    fmt.Sprintf("%.2f ETB deposited at %s (Ref: %s) by %s.", d.Amount, d.BankName, d.ReferenceNumber, d.DepositedByName),
		Severity:   "success",
		Read:       false,
		Link:       "/reconciliation",
		CreatedAt:  now,
	}
	config.DB.Notifications.InsertOne(ctx, notif)

	sse.GlobalHub.Broadcast("deposit_created", d)
	sse.GlobalHub.Broadcast("flour_tracker_updated", gin.H{"status": "deposit_completed"})

	c.JSON(http.StatusCreated, d)
}

// Flour Tracker
func GetFlourTracker(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var tracker models.FlourTracker
	err := config.DB.FlourTracker.FindOne(ctx, bson.M{}).Decode(&tracker)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, tracker)
}

type UpdateThresholdRequest struct {
	ThresholdKG float64 `json:"threshold_kg" binding:"required"`
}

func UpdateFlourThreshold(c *gin.Context) {
	var req UpdateThresholdRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := config.DB.FlourTracker.UpdateOne(ctx, bson.M{}, bson.M{
		"$set": bson.M{
			"milestone_threshold_kg": req.ThresholdKG,
			"last_updated":           time.Now(),
		},
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	sse.GlobalHub.Broadcast("flour_tracker_updated", gin.H{"threshold": req.ThresholdKG})
	c.JSON(http.StatusOK, gin.H{"message": "Flour deposit milestone threshold updated successfully"})
}
