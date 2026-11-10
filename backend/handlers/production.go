package handlers

import (
	"context"
	"fmt"
	"math"
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

type CreateBatchRequest struct {
	CategoryID          string                      `json:"category_id"`
	Category            string                      `json:"category" binding:"required"`
	ProductID           string                      `json:"product_id"`
	ProductName         string                      `json:"product_name"`
	BakerID             string                      `json:"baker_id" binding:"required"`
	BakerName           string                      `json:"baker_name" binding:"required"`
	PiecesProduced      int                         `json:"pieces_produced"`
	TotalWeightGrams    float64                     `json:"total_weight_grams"`
	UnitSellingPrice    float64                     `json:"unit_selling_price"`
	IngredientsConsumed []models.IngredientConsumed `json:"ingredients_consumed" binding:"required"`
	Remarks             string                      `json:"remarks"`
	BranchID            string                      `json:"branch_id"`
	Items               []models.BatchProductItem   `json:"items"`
}

func CreateProductionBatch(c *gin.Context) {
	var req CreateBatchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.BranchID == "" {
		req.BranchID = "main"
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	now := time.Now()
	dateStr := now.Format("2006-01-02")
	timeStr := now.Format("15:04:05")

	// Multi-product batch consolidation
	var potentialValue float64
	if len(req.Items) > 0 {
		var calcPieces int
		var calcWeight float64
		var calcPotential float64
		var names []string

		for _, itm := range req.Items {
			calcPieces += itm.PiecesProduced
			calcWeight += itm.TotalWeightGrams
			calcPotential += float64(itm.PiecesProduced) * itm.UnitSellingPrice
			if itm.ProductName != "" {
				names = append(names, itm.ProductName)
			}
		}

		if req.PiecesProduced <= 0 {
			req.PiecesProduced = calcPieces
		}
		if req.TotalWeightGrams <= 0 {
			req.TotalWeightGrams = calcWeight
		}
		if req.ProductID == "" && len(req.Items) > 0 {
			req.ProductID = req.Items[0].ProductID
		}
		if req.ProductName == "" && len(names) > 0 {
			req.ProductName = strings.Join(names, " + ")
		}
		if req.UnitSellingPrice <= 0 && req.PiecesProduced > 0 {
			req.UnitSellingPrice = math.Round((calcPotential/float64(req.PiecesProduced))*100) / 100
		}
		potentialValue = calcPotential
	} else {
		potentialValue = float64(req.PiecesProduced) * req.UnitSellingPrice
	}

	// 1. Generate Batch Number: BATCH-YYYYMMDD-XXX
	dayPrefix := fmt.Sprintf("BATCH-%s", now.Format("20060102"))
	count, _ := config.DB.ProductionBatches.CountDocuments(ctx, bson.M{
		"batch_number": bson.M{"$regex": "^" + dayPrefix},
	})
	batchNumber := fmt.Sprintf("%s-%03d", dayPrefix, count+1)

	// 3. Process Ingredients Consumption & Costing
	var totalCost float64
	var flourConsumedKG float64

	// Fetch raw materials from DB to match prices and validate stock
	for i, ing := range req.IngredientsConsumed {
		var mat models.RawMaterial
		// Search material by name (case-insensitive) or ID
		filter := bson.M{"name": bson.M{"$regex": "^" + strings.TrimSpace(ing.Name) + "$", "$options": "i"}}
		if ing.IngredientID != "" {
			if objID, err := primitive.ObjectIDFromHex(ing.IngredientID); err == nil {
				filter = bson.M{"_id": objID}
			}
		}

		err := config.DB.RawMaterials.FindOne(ctx, filter).Decode(&mat)
		if err == nil {
			req.IngredientsConsumed[i].IngredientID = mat.ID.Hex()
			unitCost := mat.PurchasePrice

			// Normalize quantity to material unit for deduction and cost
			deductQty := ing.Quantity
			ingUnit := strings.ToLower(strings.TrimSpace(ing.Unit))
			matUnit := strings.ToLower(strings.TrimSpace(mat.Unit))

			if (ingUnit == "g" || ingUnit == "grams") && (matUnit == "kg" || matUnit == "kilogram") {
				deductQty = ing.Quantity / 1000.0
			} else if (ingUnit == "kg" || ingUnit == "kilogram") && (matUnit == "g" || matUnit == "grams") {
				deductQty = ing.Quantity * 1000.0
			}

			lineCost := deductQty * unitCost
			req.IngredientsConsumed[i].UnitCost = unitCost
			req.IngredientsConsumed[i].TotalCost = math.Round(lineCost*100) / 100
			totalCost += lineCost

			// Deduct from raw materials
			newQty := mat.CurrentQuantity - deductQty
			config.DB.RawMaterials.UpdateOne(ctx, bson.M{"_id": mat.ID}, bson.M{
				"$set": bson.M{
					"current_quantity": newQty,
					"last_updated":     now,
				},
			})

			// Check if stock became low
			if newQty <= mat.MinimumStock {
				lowStockNotif := models.Notification{
					TargetRole: "admin",
					Type:       "low_stock",
					Title:      "Low Inventory Warning",
					Message:    fmt.Sprintf("Raw material '%s' is low (%.2f %s remaining, min: %.2f %s).", mat.Name, newQty, mat.Unit, mat.MinimumStock, mat.Unit),
					Severity:   "warning",
					Read:       false,
					Link:       "/inventory",
					CreatedAt:  now,
				}
				config.DB.Notifications.InsertOne(ctx, lowStockNotif)
				sse.GlobalHub.Broadcast("low_stock", lowStockNotif)
			}

			// Track flour consumption
			if strings.Contains(strings.ToLower(mat.Name), "flour") {
				if ingUnit == "g" || ingUnit == "grams" {
					flourConsumedKG += ing.Quantity / 1000.0
				} else {
					flourConsumedKG += ing.Quantity
				}
			}
		}
	}

	// 4. Update Finished Product Stock (Cashier's immediate availability)
	if len(req.Items) > 0 {
		for _, itm := range req.Items {
			if itm.ProductID == "" || itm.PiecesProduced <= 0 {
				continue
			}
			stockFilter := bson.M{"product_id": itm.ProductID}
			var currentStock models.FinishedProductStock
			err := config.DB.FinishedStock.FindOne(ctx, stockFilter).Decode(&currentStock)
			if err != nil {
				wGrams := itm.DoughWeightGrams
				if wGrams <= 0 && itm.PiecesProduced > 0 {
					wGrams = itm.TotalWeightGrams / float64(itm.PiecesProduced)
				}
				newStock := models.FinishedProductStock{
					BranchID:          req.BranchID,
					ProductID:         itm.ProductID,
					ProductName:       itm.ProductName,
					Category:          itm.Category,
					AvailableQuantity: itm.PiecesProduced,
					WeightGrams:       wGrams,
					SellingPrice:      itm.UnitSellingPrice,
					LastUpdated:       now,
				}
				config.DB.FinishedStock.InsertOne(ctx, newStock)
			} else {
				baseQty := currentStock.AvailableQuantity
				if baseQty < 0 {
					baseQty = 0
				}
				newQty := baseQty + itm.PiecesProduced
				config.DB.FinishedStock.UpdateOne(ctx, stockFilter, bson.M{
					"$set": bson.M{
						"available_quantity": newQty,
						"last_updated":       now,
						"selling_price":      itm.UnitSellingPrice,
					},
				})
			}
			sse.GlobalHub.Broadcast("stock_updated", gin.H{"product_id": itm.ProductID, "added": itm.PiecesProduced})
		}
	} else {
		// Single product stock update
		stockFilter := bson.M{
			"product_id": req.ProductID,
		}
		var currentStock models.FinishedProductStock
		err := config.DB.FinishedStock.FindOne(ctx, stockFilter).Decode(&currentStock)
		if err != nil {
			// Create new stock entry
			newStock := models.FinishedProductStock{
				BranchID:          req.BranchID,
				ProductID:         req.ProductID,
				ProductName:       req.ProductName,
				Category:          req.Category,
				AvailableQuantity: req.PiecesProduced,
				WeightGrams:       req.TotalWeightGrams / float64(req.PiecesProduced),
				SellingPrice:      req.UnitSellingPrice,
				LastUpdated:       now,
			}
			config.DB.FinishedStock.InsertOne(ctx, newStock)
		} else {
			// Update existing stock (ensure baseline non-negative)
			baseQty := currentStock.AvailableQuantity
			if baseQty < 0 {
				baseQty = 0
			}
			newQty := baseQty + req.PiecesProduced
			config.DB.FinishedStock.UpdateOne(ctx, stockFilter, bson.M{
				"$set": bson.M{
					"available_quantity": newQty,
					"last_updated":       now,
					"selling_price":      req.UnitSellingPrice,
				},
			})
		}
		sse.GlobalHub.Broadcast("stock_updated", gin.H{"product_id": req.ProductID, "added": req.PiecesProduced})
	}

	// 5. Update Flour Consumption Tracker (100 kg threshold)
	if flourConsumedKG > 0 {
		var tracker models.FlourTracker
		err := config.DB.FlourTracker.FindOne(ctx, bson.M{}).Decode(&tracker)
		if err == nil {
			newCumulative := tracker.CurrentCumulativeKG + flourConsumedKG
			threshold := tracker.MilestoneThresholdKG
			if threshold <= 0 {
				threshold = 100.0
			}

			reminderActive := tracker.DepositReminderActive
			var milestoneAt *time.Time = tracker.LastMilestoneAt

			if newCumulative >= threshold && !reminderActive {
				reminderActive = true
				milestoneAt = &now

				// Create reminder notification for Cashier and Admin
				flourNotif := models.Notification{
					TargetRole: "all",
					Type:       "deposit_reminder",
					Title:      "Flour Consumption Milestone Reached",
					Message:    fmt.Sprintf("%.1f kg of flour consumed in production! Please complete the required bank deposit.", newCumulative),
					Severity:   "danger",
					Read:       false,
					Link:       "/reconciliation",
					CreatedAt:  now,
				}
				config.DB.Notifications.InsertOne(ctx, flourNotif)
				sse.GlobalHub.Broadcast("deposit_reminder", flourNotif)
			}

			config.DB.FlourTracker.UpdateOne(ctx, bson.M{"_id": tracker.ID}, bson.M{
				"$set": bson.M{
					"current_cumulative_kg":   newCumulative,
					"deposit_reminder_active": reminderActive,
					"last_milestone_at":       milestoneAt,
					"last_updated":            now,
				},
			})
		}
	}

	// 6. Save Production Batch Record
	batch := models.ProductionBatch{
		ID:                    primitive.NewObjectID(),
		BatchNumber:           batchNumber,
		Category:              req.Category,
		ProductID:             req.ProductID,
		ProductName:           req.ProductName,
		BakerID:               req.BakerID,
		BakerName:             req.BakerName,
		ProductionDate:        dateStr,
		ProductionTime:        timeStr,
		PiecesProduced:        req.PiecesProduced,
		TotalWeightGrams:      req.TotalWeightGrams,
		UnitSellingPrice:      req.UnitSellingPrice,
		PotentialSellingValue: potentialValue,
		CostOfIngredients:     math.Round(totalCost*100) / 100,
		IngredientsConsumed:   req.IngredientsConsumed,
		Items:                 req.Items,
		Remarks:               req.Remarks,
		Status:                "completed",
		AuditTrail:            []models.AuditEntry{},
		BranchID:              req.BranchID,
		CreatedAt:             now,
	}

	_, err := config.DB.ProductionBatches.InsertOne(ctx, batch)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 7. Create Notification for Admin and Cashier
	batchNotif := models.Notification{
		TargetRole: "all",
		Type:       "production",
		Title:      "New Production Completed",
		Message:    fmt.Sprintf("%s produced %d pcs of %s (%s). Potential Value: %.2f ETB.", req.BakerName, req.PiecesProduced, req.ProductName, batchNumber, potentialValue),
		Severity:   "success",
		Read:       false,
		Link:       "/production",
		CreatedAt:  now,
	}
	config.DB.Notifications.InsertOne(ctx, batchNotif)

	// 8. Log Audit
	config.DB.AuditLogs.InsertOne(ctx, models.AuditLog{
		UserID:     req.BakerID,
		UserName:   req.BakerName,
		Action:     "CREATE_PRODUCTION_BATCH",
		EntityType: "production_batches",
		EntityID:   batch.ID.Hex(),
		Details:    fmt.Sprintf("Batch %s created for %d pcs of %s", batchNumber, req.PiecesProduced, req.ProductName),
		CreatedAt:  now,
	})

	// 9. Real-time broadcast
	sse.GlobalHub.Broadcast("production_created", batch)
	sse.GlobalHub.Broadcast("stock_updated", gin.H{"product_id": req.ProductID, "added": req.PiecesProduced})
	sse.GlobalHub.Broadcast("raw_material_updated", gin.H{"batch_id": batch.ID.Hex()})

	c.JSON(http.StatusCreated, batch)
}

func GetProductionBatches(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	filter := bson.M{}

	date := c.Query("date")
	if date != "" {
		filter["production_date"] = date
	}

	category := c.Query("category")
	if category != "" && category != "all" {
		filter["category"] = category
	}

	bakerID := c.Query("baker_id")
	if bakerID != "" {
		filter["baker_id"] = bakerID
	}

	status := c.Query("status")
	if status != "" {
		filter["status"] = status
	}

	findOptions := options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}})
	cursor, err := config.DB.ProductionBatches.Find(ctx, filter, findOptions)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer cursor.Close(ctx)

	var batches []models.ProductionBatch
	if err := cursor.All(ctx, &batches); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, batches)
}

type EditBatchRequest struct {
	PiecesProduced int    `json:"pieces_produced"`
	Remarks        string `json:"remarks"`
	Reason         string `json:"reason" binding:"required"`
	EditorName     string `json:"editor_name" binding:"required"`
}

func EditProductionBatch(c *gin.Context) {
	idStr := c.Param("id")
	objID, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid batch ID"})
		return
	}

	var req EditBatchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var existing models.ProductionBatch
	if err := config.DB.ProductionBatches.FindOne(ctx, bson.M{"_id": objID}).Decode(&existing); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Batch not found"})
		return
	}

	diff := req.PiecesProduced - existing.PiecesProduced
	newPotential := float64(req.PiecesProduced) * existing.UnitSellingPrice

	auditEntry := models.AuditEntry{
		EditedBy:       req.EditorName,
		EditedAt:       time.Now(),
		Reason:         req.Reason,
		PreviousValues: fmt.Sprintf("Pieces: %d, Potential: %.2f ETB", existing.PiecesProduced, existing.PotentialSellingValue),
	}

	update := bson.M{
		"$set": bson.M{
			"pieces_produced":         req.PiecesProduced,
			"potential_selling_value": newPotential,
			"remarks":                 req.Remarks,
			"status":                  "edited",
		},
		"$push": bson.M{
			"audit_trail": auditEntry,
		},
	}

	_, err = config.DB.ProductionBatches.UpdateOne(ctx, bson.M{"_id": objID}, update)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Adjust finished stock if pieces changed (never allow negative)
	if diff != 0 {
		var stock models.FinishedProductStock
		if err := config.DB.FinishedStock.FindOne(ctx, bson.M{"product_id": existing.ProductID}).Decode(&stock); err == nil {
			newQty := stock.AvailableQuantity + diff
			if newQty < 0 {
				newQty = 0
			}
			config.DB.FinishedStock.UpdateOne(ctx, bson.M{"product_id": existing.ProductID}, bson.M{
				"$set": bson.M{"available_quantity": newQty, "last_updated": time.Now()},
			})
		}
		sse.GlobalHub.Broadcast("stock_updated", gin.H{"product_id": existing.ProductID, "diff": diff})
	}

	sse.GlobalHub.Broadcast("production_updated", gin.H{"batch_id": idStr})
	c.JSON(http.StatusOK, gin.H{"message": "Batch edited successfully with audit log"})
}

func CancelProductionBatch(c *gin.Context) {
	idStr := c.Param("id")
	objID, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid batch ID"})
		return
	}

	var body struct {
		Reason    string `json:"reason" binding:"required"`
		AdminName string `json:"admin_name" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var existing models.ProductionBatch
	if err := config.DB.ProductionBatches.FindOne(ctx, bson.M{"_id": objID}).Decode(&existing); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Batch not found"})
		return
	}

	if existing.Status == "cancelled" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Batch is already cancelled"})
		return
	}

	auditEntry := models.AuditEntry{
		EditedBy:       body.AdminName,
		EditedAt:       time.Now(),
		Reason:         "CANCELLED: " + body.Reason,
		PreviousValues: fmt.Sprintf("Status: %s, Pieces: %d", existing.Status, existing.PiecesProduced),
	}

	// 1. Mark batch as cancelled
	config.DB.ProductionBatches.UpdateOne(ctx, bson.M{"_id": objID}, bson.M{
		"$set":  bson.M{"status": "cancelled"},
		"$push": bson.M{"audit_trail": auditEntry},
	})

	// 2. Reverse finished product stock (cannot go below 0)
	if len(existing.Items) > 0 {
		for _, itm := range existing.Items {
			if itm.ProductID == "" || itm.PiecesProduced <= 0 {
				continue
			}
			var stock models.FinishedProductStock
			if err := config.DB.FinishedStock.FindOne(ctx, bson.M{"product_id": itm.ProductID}).Decode(&stock); err == nil {
				newQty := stock.AvailableQuantity - itm.PiecesProduced
				if newQty < 0 {
					newQty = 0
				}
				config.DB.FinishedStock.UpdateOne(ctx, bson.M{"product_id": itm.ProductID}, bson.M{
					"$set": bson.M{"available_quantity": newQty, "last_updated": time.Now()},
				})
				sse.GlobalHub.Broadcast("stock_updated", gin.H{"product_id": itm.ProductID, "removed": itm.PiecesProduced})
			}
		}
	} else {
		var stock models.FinishedProductStock
		if err := config.DB.FinishedStock.FindOne(ctx, bson.M{"product_id": existing.ProductID}).Decode(&stock); err == nil {
			newQty := stock.AvailableQuantity - existing.PiecesProduced
			if newQty < 0 {
				newQty = 0
			}
			config.DB.FinishedStock.UpdateOne(ctx, bson.M{"product_id": existing.ProductID}, bson.M{
				"$set": bson.M{"available_quantity": newQty, "last_updated": time.Now()},
			})
			sse.GlobalHub.Broadcast("stock_updated", gin.H{"product_id": existing.ProductID, "removed": existing.PiecesProduced})
		}
	}

	// 3. Reverse consumed ingredients back to raw materials
	for _, ing := range existing.IngredientsConsumed {
		if ing.IngredientID != "" {
			if matID, err := primitive.ObjectIDFromHex(ing.IngredientID); err == nil {
				// Normalize back if needed
				var mat models.RawMaterial
				if err := config.DB.RawMaterials.FindOne(ctx, bson.M{"_id": matID}).Decode(&mat); err == nil {
					addQty := ing.Quantity
					ingUnit := strings.ToLower(strings.TrimSpace(ing.Unit))
					matUnit := strings.ToLower(strings.TrimSpace(mat.Unit))
					if (ingUnit == "g" || ingUnit == "grams") && (matUnit == "kg" || matUnit == "kilogram") {
						addQty = ing.Quantity / 1000.0
					}
					config.DB.RawMaterials.UpdateOne(ctx, bson.M{"_id": matID}, bson.M{
						"$inc": bson.M{"current_quantity": addQty},
					})
				}
			}
		}
	}

	sse.GlobalHub.Broadcast("production_cancelled", gin.H{"batch_id": idStr})
	sse.GlobalHub.Broadcast("stock_updated", gin.H{"product_id": existing.ProductID, "removed": existing.PiecesProduced})

	c.JSON(http.StatusOK, gin.H{"message": "Batch cancelled and stock reversed successfully"})
}
