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

type CreateSaleRequest struct {
	CashierID        string            `json:"cashier_id" binding:"required"`
	CashierName      string            `json:"cashier_name" binding:"required"`
	BranchID         string            `json:"branch_id"`
	BranchName       string            `json:"branch_name"`
	SaleDate         string            `json:"sale_date"`
	SaleTime         string            `json:"sale_time"`
	Items            []models.SaleItem `json:"items" binding:"required"`
	PaymentMethod    string            `json:"payment_method"` // "cash", "bank", "telebirr"
	PaymentReference string            `json:"payment_reference"`
	CustomerName     string            `json:"customer_name"`
	Remarks          string            `json:"remarks"`
	CreatedByAdmin   bool              `json:"created_by_admin"`
	AdminName        string            `json:"admin_name"`
}

func CreateSale(c *gin.Context) {
	var req CreateSaleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if len(req.Items) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Sale must contain at least one item"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Resolve branch
	targetBranchID := req.BranchID
	if targetBranchID == "" || targetBranchID == "main" {
		var mainBranch models.Branch
		if err := config.DB.Branches.FindOne(ctx, bson.M{"is_main": true}).Decode(&mainBranch); err == nil {
			targetBranchID = mainBranch.ID.Hex()
			req.BranchID = targetBranchID
			req.BranchName = mainBranch.Name
		} else {
			targetBranchID = "main"
		}
	}
	if req.BranchID == "" {
		req.BranchID = targetBranchID
	}
	if req.BranchName == "" {
		req.BranchName = "Main Bakery & Shop"
	}
	if req.PaymentMethod == "" {
		req.PaymentMethod = "cash"
	}

	now := time.Now()
	dateStr := now.Format("2006-01-02")
	if req.SaleDate != "" {
		dateStr = req.SaleDate
	}
	timeStr := now.Format("15:04:05")
	if req.SaleTime != "" {
		timeStr = req.SaleTime
	}

	// 1. Generate Receipt Number: REC-YYYYMMDD-XXXX
	dayPrefix := fmt.Sprintf("REC-%s", now.Format("20060102"))
	count, _ := config.DB.Sales.CountDocuments(ctx, bson.M{
		"receipt_number": bson.M{"$regex": "^" + dayPrefix},
	})
	receiptNumber := fmt.Sprintf("%s-%04d", dayPrefix, count+1)

	var totalAmount float64
	var totalCOGS float64

	// 2. Validate stock availability for each item (strictly no negative stock allowed)
	for _, item := range req.Items {
		if item.Quantity <= 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Quantity for '%s' must be at least 1", item.ProductName)})
			return
		}
		var stock models.FinishedProductStock
		found := false
		if targetBranchID != "" {
			if err := config.DB.FinishedStock.FindOne(ctx, bson.M{
				"product_id": item.ProductID,
				"branch_id":  targetBranchID,
			}).Decode(&stock); err == nil {
				found = true
			}
		}
		if !found {
			// Fallback: find any stock with highest available quantity for this product
			findOpts := options.FindOne().SetSort(bson.D{{Key: "available_quantity", Value: -1}})
			if err := config.DB.FinishedStock.FindOne(ctx, bson.M{"product_id": item.ProductID}, findOpts).Decode(&stock); err == nil {
				found = true
			}
		}

		if !found || stock.AvailableQuantity <= 0 {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": fmt.Sprintf("'%s' is SOLD OUT! No stock available.", item.ProductName),
			})
			return
		}
		if stock.AvailableQuantity < item.Quantity {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": fmt.Sprintf("Insufficient stock for '%s'. Available in shop: %d pcs, Requested: %d pcs.", item.ProductName, stock.AvailableQuantity, item.Quantity),
			})
			return
		}
	}

	// 3. Deduct Stock for each item and calculate COGS
	for i, item := range req.Items {
		// Calculate COGS from product recipe or average cost
		var prod models.Product
		var unitCOGS float64
		if pID, err := primitive.ObjectIDFromHex(item.ProductID); err == nil {
			if err := config.DB.Products.FindOne(ctx, bson.M{"_id": pID}).Decode(&prod); err == nil {
				for _, rItem := range prod.Recipe {
					var rawMat models.RawMaterial
					if err := config.DB.RawMaterials.FindOne(ctx, bson.M{
						"name": bson.M{"$regex": "^" + rItem.IngredientName + "$", "$options": "i"},
					}).Decode(&rawMat); err == nil {
						rawQty := rItem.Quantity
						if rItem.Unit == "g" && rawMat.Unit == "kg" {
							rawQty = rItem.Quantity / 1000.0
						}
						unitCOGS += rawQty * rawMat.PurchasePrice
					}
				}
			}
		}

		itemTotal := float64(item.Quantity) * item.UnitPrice
		itemCOGS := float64(item.Quantity) * unitCOGS

		req.Items[i].TotalPrice = itemTotal
		req.Items[i].UnitCOGS = math.Round(unitCOGS*100) / 100
		req.Items[i].TotalCOGS = math.Round(itemCOGS*100) / 100

		totalAmount += itemTotal
		totalCOGS += itemCOGS

		// Deduct from branch-specific stock atomically with $gte condition
		deductFilter := bson.M{
			"product_id":         item.ProductID,
			"available_quantity": bson.M{"$gte": item.Quantity},
		}
		if targetBranchID != "" {
			cnt, _ := config.DB.FinishedStock.CountDocuments(ctx, bson.M{
				"product_id": item.ProductID,
				"branch_id":  targetBranchID,
			})
			if cnt > 0 {
				deductFilter["branch_id"] = targetBranchID
			}
		}

		res, err := config.DB.FinishedStock.UpdateOne(ctx, deductFilter, bson.M{
			"$inc": bson.M{"available_quantity": -item.Quantity},
			"$set": bson.M{
				"product_name": item.ProductName,
				"last_updated": now,
			},
		})
		if err != nil || res.ModifiedCount == 0 {
			// Fallback: deduct from any document with adequate available stock
			resFallback, errFallback := config.DB.FinishedStock.UpdateOne(ctx, bson.M{
				"product_id":         item.ProductID,
				"available_quantity": bson.M{"$gte": item.Quantity},
			}, bson.M{
				"$inc": bson.M{"available_quantity": -item.Quantity},
				"$set": bson.M{
					"product_name": item.ProductName,
					"last_updated": now,
				},
			})
			if errFallback != nil || resFallback.ModifiedCount == 0 {
				c.JSON(http.StatusBadRequest, gin.H{
					"error": fmt.Sprintf("Stock for '%s' is insufficient or was just sold out.", item.ProductName),
				})
				return
			}
		}
	}

	sale := models.Sale{
		ID:               primitive.NewObjectID(),
		ReceiptNumber:    receiptNumber,
		CashierID:        req.CashierID,
		CashierName:      req.CashierName,
		BranchID:         req.BranchID,
		BranchName:       req.BranchName,
		SaleDate:         dateStr,
		SaleTime:         timeStr,
		Items:            req.Items,
		TotalAmount:      math.Round(totalAmount*100) / 100,
		TotalCOGS:        math.Round(totalCOGS*100) / 100,
		PaymentMethod:    req.PaymentMethod,
		PaymentReference: req.PaymentReference,
		CustomerName:     req.CustomerName,
		Remarks:          req.Remarks,
		CreatedAt:        now,
	}

	_, err := config.DB.Sales.InsertOne(ctx, sale)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if req.CreatedByAdmin || req.AdminName != "" {
		adminName := req.AdminName
		if adminName == "" {
			adminName = "Administrator"
		}
		config.DB.AuditLogs.InsertOne(ctx, models.AuditLog{
			ID:         primitive.NewObjectID(),
			UserID:     req.CashierID,
			UserName:   adminName,
			Action:     "SALE_CREATE_ADMIN",
			EntityType: "sale",
			EntityID:   sale.ID.Hex(),
			Details:    fmt.Sprintf("Direct sale %s recorded by admin %s for %.2f ETB (%s)", receiptNumber, adminName, sale.TotalAmount, dateStr),
			CreatedAt:  now,
		})
	}

	// Real-time broadcast
	sse.GlobalHub.Broadcast("sale_created", sale)
	for _, itm := range req.Items {
		var remainingStock models.FinishedProductStock
		findFilter := bson.M{"product_id": itm.ProductID}
		if targetBranchID != "" {
			cnt, _ := config.DB.FinishedStock.CountDocuments(ctx, bson.M{"product_id": itm.ProductID, "branch_id": targetBranchID})
			if cnt > 0 {
				findFilter["branch_id"] = targetBranchID
			}
		}
		config.DB.FinishedStock.FindOne(ctx, findFilter).Decode(&remainingStock)
		sse.GlobalHub.Broadcast("stock_updated", gin.H{
			"product_id": itm.ProductID,
			"branch_id":  targetBranchID,
			"deducted":   itm.Quantity,
			"remaining":  remainingStock.AvailableQuantity,
			"sold_out":   remainingStock.AvailableQuantity <= 0,
		})
	}

	c.JSON(http.StatusCreated, sale)
}

func GetSales(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	filter := bson.M{}

	date := c.Query("date")
	if date != "" {
		filter["sale_date"] = date
	}

	startDate := c.Query("start_date")
	endDate := c.Query("end_date")
	if startDate != "" && endDate != "" {
		filter["sale_date"] = bson.M{
			"$gte": startDate,
			"$lte": endDate,
		}
	}

	paymentMethod := c.Query("payment_method")
	if paymentMethod != "" && paymentMethod != "all" {
		filter["payment_method"] = paymentMethod
	}

	cashierID := c.Query("cashier_id")
	if cashierID != "" {
		filter["cashier_id"] = cashierID
	}

	branchID := c.Query("branch_id")
	if branchID != "" {
		filter["branch_id"] = branchID
	}

	findOptions := options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}})
	cursor, err := config.DB.Sales.Find(ctx, filter, findOptions)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer cursor.Close(ctx)

	var sales []models.Sale
	if err := cursor.All(ctx, &sales); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, sales)
}

func GetSalesSummary(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	date := c.Query("date")
	if date == "" {
		date = time.Now().Format("2006-01-02")
	}

	cursor, err := config.DB.Sales.Find(ctx, bson.M{"sale_date": date})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer cursor.Close(ctx)

	var sales []models.Sale
	if err := cursor.All(ctx, &sales); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var totalRevenue float64
	var totalCOGS float64
	var totalItemsSold int
	var cashSales float64
	var bankSales float64
	var telebirrSales float64
	productSales := make(map[string]map[string]interface{})

	for _, s := range sales {
		totalRevenue += s.TotalAmount
		totalCOGS += s.TotalCOGS
		if s.PaymentMethod == "cash" {
			cashSales += s.TotalAmount
		} else if s.PaymentMethod == "telebirr" {
			telebirrSales += s.TotalAmount
		} else {
			bankSales += s.TotalAmount
		}

		for _, itm := range s.Items {
			totalItemsSold += itm.Quantity
			if _, exists := productSales[itm.ProductName]; !exists {
				productSales[itm.ProductName] = map[string]interface{}{
					"name":     itm.ProductName,
					"quantity": 0,
					"revenue":  0.0,
				}
			}
			currQty := productSales[itm.ProductName]["quantity"].(int)
			currRev := productSales[itm.ProductName]["revenue"].(float64)
			productSales[itm.ProductName]["quantity"] = currQty + itm.Quantity
			productSales[itm.ProductName]["revenue"] = currRev + itm.TotalPrice
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"date":             date,
		"total_revenue":    math.Round(totalRevenue*100) / 100,
		"total_cogs":       math.Round(totalCOGS*100) / 100,
		"gross_profit":     math.Round((totalRevenue-totalCOGS)*100) / 100,
		"total_items_sold": totalItemsSold,
		"cash_sales":       math.Round(cashSales*100) / 100,
		"bank_sales":       math.Round(bankSales*100) / 100,
		"telebirr_sales":   math.Round(telebirrSales*100) / 100,
		"sales_count":      len(sales),
		"product_sales":    productSales,
	})
}

type UpdateSaleRequest struct {
	SaleDate         string            `json:"sale_date"`
	SaleTime         string            `json:"sale_time"`
	CashierID        string            `json:"cashier_id"`
	CashierName      string            `json:"cashier_name"`
	CustomerName     string            `json:"customer_name"`
	PaymentMethod    string            `json:"payment_method"`
	PaymentReference string            `json:"payment_reference"`
	Remarks          string            `json:"remarks"`
	Items            []models.SaleItem `json:"items" binding:"required"`
	Reason           string            `json:"reason"`
	EditorName       string            `json:"editor_name"`
}

func UpdateSale(c *gin.Context) {
	id := c.Param("id")
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid sale ID"})
		return
	}

	var req UpdateSaleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if len(req.Items) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Sale must contain at least one item"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	var existing models.Sale
	err = config.DB.Sales.FindOne(ctx, bson.M{"_id": objID}).Decode(&existing)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Sale not found"})
		return
	}

	targetBranchID := existing.BranchID
	if targetBranchID == "" || targetBranchID == "main" {
		var mainBranch models.Branch
		if err := config.DB.Branches.FindOne(ctx, bson.M{"is_main": true}).Decode(&mainBranch); err == nil {
			targetBranchID = mainBranch.ID.Hex()
		} else {
			targetBranchID = "main"
		}
	}

	// 1. Calculate item quantity changes per product_id
	oldMap := make(map[string]int)
	for _, itm := range existing.Items {
		oldMap[itm.ProductID] += itm.Quantity
	}

	newMap := make(map[string]int)
	for _, itm := range req.Items {
		if itm.Quantity <= 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Quantity for '%s' must be at least 1", itm.ProductName)})
			return
		}
		newMap[itm.ProductID] += itm.Quantity
	}

	// Check if net increases have adequate available shelf stock
	for pID, newQ := range newMap {
		oldQ := oldMap[pID]
		diff := newQ - oldQ
		if diff > 0 {
			var stock models.FinishedProductStock
			filter := bson.M{"product_id": pID}
			if targetBranchID != "" {
				cnt, _ := config.DB.FinishedStock.CountDocuments(ctx, bson.M{"product_id": pID, "branch_id": targetBranchID})
				if cnt > 0 {
					filter["branch_id"] = targetBranchID
				}
			}
			err := config.DB.FinishedStock.FindOne(ctx, filter).Decode(&stock)
			if err != nil && targetBranchID != "" {
				err = config.DB.FinishedStock.FindOne(ctx, bson.M{"product_id": pID}).Decode(&stock)
			}
			if err != nil || stock.AvailableQuantity < diff {
				avail := 0
				if err == nil {
					avail = stock.AvailableQuantity
				}
				c.JSON(http.StatusBadRequest, gin.H{
					"error": fmt.Sprintf("Insufficient shelf stock to increase item. Available: %d pcs, Needed: %d pcs", avail, diff),
				})
				return
			}
		}
	}

	// 2. Adjust stock counts for all affected products
	allProductIDs := make(map[string]bool)
	for pID := range oldMap {
		allProductIDs[pID] = true
	}
	for pID := range newMap {
		allProductIDs[pID] = true
	}

	now := time.Now()
	for pID := range allProductIDs {
		oldQ := oldMap[pID]
		newQ := newMap[pID]
		diff := newQ - oldQ
		if diff != 0 {
			updateFilter := bson.M{"product_id": pID}
			if targetBranchID != "" {
				cnt, _ := config.DB.FinishedStock.CountDocuments(ctx, bson.M{"product_id": pID, "branch_id": targetBranchID})
				if cnt > 0 {
					updateFilter["branch_id"] = targetBranchID
				}
			}
			config.DB.FinishedStock.UpdateOne(ctx, updateFilter, bson.M{
				"$inc": bson.M{"available_quantity": -diff},
				"$set": bson.M{"last_updated": now},
			})
			var updatedStock models.FinishedProductStock
			config.DB.FinishedStock.FindOne(ctx, updateFilter).Decode(&updatedStock)
			sse.GlobalHub.Broadcast("stock_updated", gin.H{
				"product_id": pID,
				"branch_id":  targetBranchID,
				"remaining":  updatedStock.AvailableQuantity,
				"sold_out":   updatedStock.AvailableQuantity <= 0,
			})
		}
	}

	// 3. Recalculate item totals and COGS
	var totalAmount float64
	var totalCOGS float64
	for i, item := range req.Items {
		var prod models.Product
		var unitCOGS float64
		if pID, err := primitive.ObjectIDFromHex(item.ProductID); err == nil {
			if err := config.DB.Products.FindOne(ctx, bson.M{"_id": pID}).Decode(&prod); err == nil {
				for _, rItem := range prod.Recipe {
					var rawMat models.RawMaterial
					if err := config.DB.RawMaterials.FindOne(ctx, bson.M{
						"name": bson.M{"$regex": "^" + rItem.IngredientName + "$", "$options": "i"},
					}).Decode(&rawMat); err == nil {
						rawQty := rItem.Quantity
						if rItem.Unit == "g" && rawMat.Unit == "kg" {
							rawQty = rItem.Quantity / 1000.0
						}
						unitCOGS += rawQty * rawMat.PurchasePrice
					}
				}
			}
		}

		itemTotal := float64(item.Quantity) * item.UnitPrice
		itemCOGS := float64(item.Quantity) * unitCOGS

		req.Items[i].TotalPrice = math.Round(itemTotal*100) / 100
		req.Items[i].UnitCOGS = math.Round(unitCOGS*100) / 100
		req.Items[i].TotalCOGS = math.Round(itemCOGS*100) / 100

		totalAmount += itemTotal
		totalCOGS += itemCOGS
	}

	totalAmount = math.Round(totalAmount*100) / 100
	totalCOGS = math.Round(totalCOGS*100) / 100

	editor := req.EditorName
	if editor == "" {
		editor = "Administrator"
	}
	reason := req.Reason
	if reason == "" {
		reason = "Edited by administrator"
	}

	auditEntry := models.AuditEntry{
		EditedBy:       editor,
		EditedAt:       now,
		Reason:         reason,
		PreviousValues: fmt.Sprintf("Amount: %.2f ETB | Method: %s | Items: %d", existing.TotalAmount, existing.PaymentMethod, len(existing.Items)),
	}
	auditTrail := append(existing.AuditTrail, auditEntry)

	saleDate := req.SaleDate
	if saleDate == "" {
		saleDate = existing.SaleDate
	}
	saleTime := req.SaleTime
	if saleTime == "" {
		saleTime = existing.SaleTime
	}
	cashierID := req.CashierID
	if cashierID == "" {
		cashierID = existing.CashierID
	}
	cashierName := req.CashierName
	if cashierName == "" {
		cashierName = existing.CashierName
	}
	paymentMethod := req.PaymentMethod
	if paymentMethod == "" {
		paymentMethod = existing.PaymentMethod
	}

	updateDoc := bson.M{
		"$set": bson.M{
			"sale_date":         saleDate,
			"sale_time":         saleTime,
			"cashier_id":        cashierID,
			"cashier_name":      cashierName,
			"customer_name":     req.CustomerName,
			"payment_method":    paymentMethod,
			"payment_reference": req.PaymentReference,
			"remarks":           req.Remarks,
			"items":             req.Items,
			"total_amount":      totalAmount,
			"total_cogs":        totalCOGS,
			"status":            "edited",
			"audit_trail":       auditTrail,
			"updated_at":        now,
		},
	}

	_, err = config.DB.Sales.UpdateOne(ctx, bson.M{"_id": objID}, updateDoc)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var updated models.Sale
	config.DB.Sales.FindOne(ctx, bson.M{"_id": objID}).Decode(&updated)

	config.DB.AuditLogs.InsertOne(ctx, models.AuditLog{
		ID:         primitive.NewObjectID(),
		UserID:     cashierID,
		UserName:   editor,
		Action:     "SALE_EDIT",
		EntityType: "sale",
		EntityID:   id,
		Details:    fmt.Sprintf("Edited receipt %s. Total changed from %.2f to %.2f ETB. Reason: %s", existing.ReceiptNumber, existing.TotalAmount, totalAmount, reason),
		CreatedAt:  now,
	})

	sse.GlobalHub.Broadcast("sale_updated", updated)

	c.JSON(http.StatusOK, updated)
}

func DeleteSale(c *gin.Context) {
	id := c.Param("id")
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid sale ID"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var sale models.Sale
	err = config.DB.Sales.FindOne(ctx, bson.M{"_id": objID}).Decode(&sale)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Sale not found"})
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

	targetBranchID := sale.BranchID
	if targetBranchID == "" || targetBranchID == "main" {
		var mainBranch models.Branch
		if err := config.DB.Branches.FindOne(ctx, bson.M{"is_main": true}).Decode(&mainBranch); err == nil {
			targetBranchID = mainBranch.ID.Hex()
		} else {
			targetBranchID = "main"
		}
	}

	now := time.Now()

	// 1. Restore inventory stock for each sold item
	for _, itm := range sale.Items {
		restoreFilter := bson.M{"product_id": itm.ProductID}
		if targetBranchID != "" {
			cnt, _ := config.DB.FinishedStock.CountDocuments(ctx, bson.M{"product_id": itm.ProductID, "branch_id": targetBranchID})
			if cnt > 0 {
				restoreFilter["branch_id"] = targetBranchID
			}
		}
		config.DB.FinishedStock.UpdateOne(ctx, restoreFilter, bson.M{
			"$inc": bson.M{"available_quantity": itm.Quantity},
			"$set": bson.M{"last_updated": now},
		})

		var remainingStock models.FinishedProductStock
		config.DB.FinishedStock.FindOne(ctx, restoreFilter).Decode(&remainingStock)
		sse.GlobalHub.Broadcast("stock_updated", gin.H{
			"product_id": itm.ProductID,
			"branch_id":  targetBranchID,
			"remaining":  remainingStock.AvailableQuantity,
			"sold_out":   remainingStock.AvailableQuantity <= 0,
		})
	}

	// 2. Delete the sale from DB
	_, err = config.DB.Sales.DeleteOne(ctx, bson.M{"_id": objID})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 3. Insert into AuditLogs
	config.DB.AuditLogs.InsertOne(ctx, models.AuditLog{
		ID:         primitive.NewObjectID(),
		UserID:     "admin",
		UserName:   adminName,
		Action:     "SALE_DELETE",
		EntityType: "sale",
		EntityID:   id,
		Details:    fmt.Sprintf("Voided/Deleted receipt %s (Total: %.2f ETB, %d items). All items restored to shop inventory. Reason: %s", sale.ReceiptNumber, sale.TotalAmount, len(sale.Items), reason),
		CreatedAt:  now,
	})

	// 4. SSE broadcast
	sse.GlobalHub.Broadcast("sale_deleted", gin.H{
		"id":             id,
		"receipt_number": sale.ReceiptNumber,
	})

	c.JSON(http.StatusOK, gin.H{
		"message":        "Sale deleted and stock restored successfully",
		"id":             id,
		"receipt_number": sale.ReceiptNumber,
	})
}
