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

func GetSuggestions(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	filter := bson.M{"active": true}
	roleTarget := c.Query("role")
	if roleTarget != "" && roleTarget != "all" {
		filter["role_target"] = roleTarget
	}

	category := c.Query("category")
	if category != "" {
		filter["category"] = category
	}

	findOptions := options.Find().SetSort(bson.D{{Key: "display_order", Value: 1}})
	cursor, err := config.DB.QuickSuggestions.Find(ctx, filter, findOptions)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer cursor.Close(ctx)

	var suggestions []models.QuickSuggestion
	if err := cursor.All(ctx, &suggestions); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, suggestions)
}

func CreateSuggestion(c *gin.Context) {
	var s models.QuickSuggestion
	if err := c.ShouldBindJSON(&s); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	s.ID = primitive.NewObjectID()
	s.Active = true

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := config.DB.QuickSuggestions.InsertOne(ctx, s)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	sse.GlobalHub.Broadcast("suggestion_created", s)
	c.JSON(http.StatusCreated, s)
}

func UpdateSuggestion(c *gin.Context) {
	idStr := c.Param("id")
	objID, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid suggestion ID"})
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

	_, err = config.DB.QuickSuggestions.UpdateOne(ctx, bson.M{"_id": objID}, bson.M{"$set": updateData})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	sse.GlobalHub.Broadcast("suggestion_updated", gin.H{"id": idStr})
	c.JSON(http.StatusOK, gin.H{"message": "Suggestion updated successfully"})
}

func DeleteSuggestion(c *gin.Context) {
	idStr := c.Param("id")
	objID, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid suggestion ID"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err = config.DB.QuickSuggestions.DeleteOne(ctx, bson.M{"_id": objID})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	sse.GlobalHub.Broadcast("suggestion_deleted", gin.H{"id": idStr})
	c.JSON(http.StatusOK, gin.H{"message": "Suggestion removed successfully"})
}
