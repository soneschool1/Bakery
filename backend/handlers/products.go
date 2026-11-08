package handlers

import (
	"context"
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

func GetProducts(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	filter := bson.M{}
	category := c.Query("category")
	if category != "" && category != "all" {
		filter["category"] = category
	}

	includeInactive := c.Query("include_inactive")
	if includeInactive != "true" {
		filter["active"] = true
	}

	findOptions := options.Find().SetSort(bson.D{{Key: "name", Value: 1}})
	cursor, err := config.DB.Products.Find(ctx, filter, findOptions)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer cursor.Close(ctx)

	var products []models.Product
	if err := cursor.All(ctx, &products); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, products)
}

func CreateProduct(c *gin.Context) {
	var p models.Product
	if err := c.ShouldBindJSON(&p); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	p.ID = primitive.NewObjectID()
	p.CreatedAt = time.Now()
	p.Active = true

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := config.DB.Products.InsertOne(ctx, p)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Create initial finished stock record at main branch
	newStock := models.FinishedProductStock{
		BranchID:          "main",
		ProductID:         p.ID.Hex(),
		ProductName:       p.Name,
		Category:          p.Category,
		AvailableQuantity: 0,
		WeightGrams:       p.WeightGrams,
		SellingPrice:      p.SellingPrice,
		LastUpdated:       time.Now(),
	}
	config.DB.FinishedStock.InsertOne(ctx, newStock)

	sse.GlobalHub.Broadcast("product_created", p)
	c.JSON(http.StatusCreated, p)
}

func UpdateProduct(c *gin.Context) {
	idStr := c.Param("id")
	objID, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid product ID"})
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

	_, err = config.DB.Products.UpdateOne(ctx, bson.M{"_id": objID}, bson.M{"$set": updateData})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Also sync finished stock if selling price or name changed
	stockUpdate := bson.M{}
	if price, ok := updateData["selling_price"]; ok {
		stockUpdate["selling_price"] = price
	}
	if name, ok := updateData["name"]; ok {
		stockUpdate["product_name"] = name
	}
	if len(stockUpdate) > 0 {
		config.DB.FinishedStock.UpdateMany(ctx, bson.M{"product_id": idStr}, bson.M{"$set": stockUpdate})
	}

	sse.GlobalHub.Broadcast("product_updated", gin.H{"id": idStr})
	c.JSON(http.StatusOK, gin.H{"message": "Product updated successfully"})
}

func DeleteProduct(c *gin.Context) {
	idStr := c.Param("id")
	objID, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid product ID"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Soft delete / deactivate
	_, err = config.DB.Products.UpdateOne(ctx, bson.M{"_id": objID}, bson.M{"$set": bson.M{"active": false}})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	sse.GlobalHub.Broadcast("product_deleted", gin.H{"id": idStr})
	c.JSON(http.StatusOK, gin.H{"message": "Product deactivated successfully"})
}
