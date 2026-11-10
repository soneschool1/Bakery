package handlers

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

	"harbuu-backend/config"
	"harbuu-backend/models"
	"harbuu-backend/sse"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type CreateTransferRequest struct {
	FromBranchID       string                `json:"from_branch_id"`
	FromBranchName     string                `json:"from_branch_name"`
	ToBranchID         string                `json:"to_branch_id" binding:"required"`
	ToBranchName       string                `json:"to_branch_name" binding:"required"`
	ProductID          string                `json:"product_id"`
	ProductName        string                `json:"product_name"`
	Quantity           int                   `json:"quantity"`
	Items              []models.TransferItem `json:"items"`
	TransportationCost float64               `json:"transportation_cost"`
	SentByID           string                `json:"sent_by_id" binding:"required"`
	SentByName         string                `json:"sent_by_name" binding:"required"`
	Remarks            string                `json:"remarks"`
}

func GetBranches(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	cursor, err := config.DB.Branches.Find(ctx, bson.M{"active": true})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer cursor.Close(ctx)

	var branches []models.Branch
	if err := cursor.All(ctx, &branches); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, branches)
}

func CreateBranch(c *gin.Context) {
	var b models.Branch
	if err := c.ShouldBindJSON(&b); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	b.ID = primitive.NewObjectID()
	b.Active = true
	b.CreatedAt = time.Now()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := config.DB.Branches.InsertOne(ctx, b)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, b)
}

func UpdateBranch(c *gin.Context) {
	idStr := c.Param("id")
	objID, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid branch ID"})
		return
	}

	var req models.Branch
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	update := bson.M{
		"$set": bson.M{
			"name":           req.Name,
			"location":       req.Location,
			"contact_person": req.ContactPerson,
			"phone":          req.Phone,
			"active":         req.Active,
			"is_main":        req.IsMain,
		},
	}

	_, err = config.DB.Branches.UpdateOne(ctx, bson.M{"_id": objID}, update)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Branch updated successfully"})
}

func DeleteBranch(c *gin.Context) {
	idStr := c.Param("id")
	objID, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid branch ID"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err = config.DB.Branches.UpdateOne(ctx, bson.M{"_id": objID}, bson.M{"$set": bson.M{"active": false}})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Branch deactivated successfully"})
}

func CreateBranchTransfer(c *gin.Context) {
	var req CreateTransferRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.FromBranchID == "" {
		req.FromBranchID = "main"
		req.FromBranchName = "Main Bakery & Shop"
	}

	// Support both multi-item shipment and single-item legacy payload
	items := req.Items
	if len(items) == 0 {
		if req.ProductID == "" || req.Quantity <= 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Please provide products and quantities to transfer"})
			return
		}
		items = append(items, models.TransferItem{
			ProductID:   req.ProductID,
			ProductName: req.ProductName,
			Quantity:    req.Quantity,
		})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	now := time.Now()
	dateStr := now.Format("2006-01-02")
	timeStr := now.Format("15:04:05")

	// 1. Validate Main Branch Stock for ALL items in the trip
	totalQuantity := 0
	var itemDescriptions []string

	for _, item := range items {
		if item.Quantity <= 0 {
			continue
		}
		totalQuantity += item.Quantity
		itemDescriptions = append(itemDescriptions, fmt.Sprintf("%s: %d pcs", item.ProductName, item.Quantity))

		var stock models.FinishedProductStock
		stockFilter := bson.M{"product_id": item.ProductID}
		err := config.DB.FinishedStock.FindOne(ctx, stockFilter).Decode(&stock)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Stock not found for product: %s", item.ProductName)})
			return
		}

		if stock.AvailableQuantity < item.Quantity {
			c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Insufficient stock for %s. Available in shop: %d, Requested: %d", item.ProductName, stock.AvailableQuantity, item.Quantity)})
			return
		}
	}

	if totalQuantity <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Total transfer quantity must be greater than 0"})
		return
	}

	// 2. Generate Transfer Number: TRF-YYYYMMDD-XXX
	dayPrefix := fmt.Sprintf("TRF-%s", now.Format("20060102"))
	count, _ := config.DB.BranchTransfers.CountDocuments(ctx, bson.M{
		"transfer_number": bson.M{"$regex": "^" + dayPrefix},
	})
	transferNumber := fmt.Sprintf("%s-%03d", dayPrefix, count+1)

	// 3. Deduct from Main Branch stock for all items
	for _, item := range items {
		if item.Quantity <= 0 {
			continue
		}
		stockFilter := bson.M{
			"product_id": item.ProductID,
			"available_quantity": bson.M{"$gte": item.Quantity},
		}
		config.DB.FinishedStock.UpdateOne(ctx, stockFilter, bson.M{
			"$inc": bson.M{"available_quantity": -item.Quantity},
			"$set": bson.M{"last_updated": now},
		})
		sse.GlobalHub.Broadcast("stock_updated", gin.H{"product_id": item.ProductID, "deducted": item.Quantity})
	}

	// 4. Construct Product Summary
	primaryProductName := req.ProductName
	primaryProductID := req.ProductID
	if len(items) == 1 {
		primaryProductName = items[0].ProductName
		primaryProductID = items[0].ProductID
	} else {
		primaryProductID = "multi"
		primaryProductName = fmt.Sprintf("%d Bread Types (%s)", len(items), strings.Join(itemDescriptions, ", "))
	}

	// 5. Save Branch Transfer (Single Dispatch Trip with Multiple Products)
	transfer := models.BranchTransfer{
		ID:                 primitive.NewObjectID(),
		TransferNumber:     transferNumber,
		FromBranchID:       req.FromBranchID,
		FromBranchName:     req.FromBranchName,
		ToBranchID:         req.ToBranchID,
		ToBranchName:       req.ToBranchName,
		ProductID:          primaryProductID,
		ProductName:        primaryProductName,
		Quantity:           totalQuantity,
		Items:              items,
		TransportationCost: req.TransportationCost,
		Status:             "sent",
		TransferDate:       dateStr,
		TransferTime:       timeStr,
		SentByID:           req.SentByID,
		SentByName:         req.SentByName,
		Remarks:            req.Remarks,
		CreatedAt:          now,
	}

	_, err := config.DB.BranchTransfers.InsertOne(ctx, transfer)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 6. Record Transportation Fee ONCE for the entire trip
	if req.TransportationCost > 0 {
		exp := models.VariableExpense{
			ID:              primitive.NewObjectID(),
			ExpenseCategory: "Transportation for sending bread to other branches",
			Description:     fmt.Sprintf("Trip transport: %d pcs (%s) to %s (%s)", totalQuantity, primaryProductName, req.ToBranchName, transferNumber),
			Amount:          req.TransportationCost,
			ExpenseDate:     dateStr,
			PaymentMethod:   "cash",
			RecordedByID:    req.SentByID,
			RecordedByName:  req.SentByName,
			Remarks:         fmt.Sprintf("Single trip transport fee for transfer %s (%d bread types)", transferNumber, len(items)),
			CreatedAt:       now,
		}
		config.DB.VariableExpenses.InsertOne(ctx, exp)
		sse.GlobalHub.Broadcast("expense_created", exp)
	}

	// 7. Notification & SSE
	notif := models.Notification{
		TargetRole: "admin",
		Type:       "branch_transfer",
		Title:      "Branch Transfer Sent",
		Message:    fmt.Sprintf("Dispatched %d pcs (%d product types) to %s in one trip (%s). Single transport fee: %.2f ETB.", totalQuantity, len(items), req.ToBranchName, transferNumber, req.TransportationCost),
		Severity:   "info",
		Read:       false,
		Link:       "/transfers",
		CreatedAt:  now,
	}
	config.DB.Notifications.InsertOne(ctx, notif)

	sse.GlobalHub.Broadcast("transfer_created", transfer)
	c.JSON(http.StatusCreated, transfer)
}

func GetBranchTransfers(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	filter := bson.M{}
	status := c.Query("status")
	if status != "" && status != "all" {
		filter["status"] = status
	}

	toBranch := c.Query("to_branch_id")
	if toBranch != "" {
		filter["to_branch_id"] = toBranch
	}

	findOptions := options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}})
	cursor, err := config.DB.BranchTransfers.Find(ctx, filter, findOptions)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer cursor.Close(ctx)

	var transfers []models.BranchTransfer
	if err := cursor.All(ctx, &transfers); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, transfers)
}

type ReceiveTransferRequest struct {
	ReceiverID   string `json:"receiver_id" binding:"required"`
	ReceiverName string `json:"receiver_name" binding:"required"`
}

func ReceiveBranchTransfer(c *gin.Context) {
	idStr := c.Param("id")
	objID, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid transfer ID"})
		return
	}

	var req ReceiveTransferRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var trf models.BranchTransfer
	if err := config.DB.BranchTransfers.FindOne(ctx, bson.M{"_id": objID}).Decode(&trf); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Transfer not found"})
		return
	}

	if trf.Status == "received" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Transfer has already been received"})
		return
	}

	now := time.Now()
	// Update transfer status
	_, err = config.DB.BranchTransfers.UpdateOne(ctx, bson.M{"_id": objID}, bson.M{
		"$set": bson.M{
			"status":             "received",
			"received_by_id":   req.ReceiverID,
			"received_by_name": req.ReceiverName,
			"received_date":    now,
		},
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Update or insert finished product stock at destination branch
	if len(trf.Items) > 0 {
		for _, item := range trf.Items {
			if item.Quantity <= 0 {
				continue
			}
			destFilter := bson.M{
				"branch_id":  trf.ToBranchID,
				"product_id": item.ProductID,
			}
			update := bson.M{
				"$inc": bson.M{"available_quantity": item.Quantity},
				"$set": bson.M{
					"product_name": item.ProductName,
					"last_updated": now,
				},
			}
			upsertOpt := options.Update().SetUpsert(true)
			config.DB.FinishedStock.UpdateOne(ctx, destFilter, update, upsertOpt)
		}
	} else if trf.ProductID != "" && trf.ProductID != "multi" {
		destFilter := bson.M{
			"branch_id":  trf.ToBranchID,
			"product_id": trf.ProductID,
		}
		update := bson.M{
			"$inc": bson.M{"available_quantity": trf.Quantity},
			"$set": bson.M{
				"product_name": trf.ProductName,
				"last_updated": now,
			},
		}
		upsertOpt := options.Update().SetUpsert(true)
		config.DB.FinishedStock.UpdateOne(ctx, destFilter, update, upsertOpt)
	}

	sse.GlobalHub.Broadcast("transfer_received", gin.H{"transfer_id": idStr, "branch_id": trf.ToBranchID})
	c.JSON(http.StatusOK, gin.H{"message": "Transfer successfully received and destination stock updated"})
}
