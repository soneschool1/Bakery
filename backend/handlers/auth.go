package handlers

import (
	"context"
	"net/http"
	"regexp"
	"strings"
	"time"

	"harbuu-backend/config"
	"harbuu-backend/models"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type LoginRequest struct {
	Username   string `json:"username"`
	Phone      string `json:"phone"`
	Identifier string `json:"identifier"`
	Password   string `json:"password" binding:"required"`
}

func getPhoneVariations(input string) []string {
	var digits strings.Builder
	for _, r := range input {
		if r >= '0' && r <= '9' {
			digits.WriteRune(r)
		}
	}
	dStr := digits.String()
	if dStr == "" {
		return []string{input}
	}

	var subscriber string
	if strings.HasPrefix(dStr, "251") && len(dStr) >= 12 {
		subscriber = dStr[3:]
	} else if strings.HasPrefix(dStr, "0") && len(dStr) >= 10 {
		subscriber = dStr[1:]
	} else if len(dStr) == 9 {
		subscriber = dStr
	}

	variations := []string{input, dStr}
	if subscriber != "" {
		variations = append(variations,
			"+251"+subscriber,
			"251"+subscriber,
			"0"+subscriber,
			subscriber,
		)
	}
	return variations
}

func Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Username or phone number and password are required"})
		return
	}

	loginInput := strings.TrimSpace(req.Identifier)
	if loginInput == "" {
		loginInput = strings.TrimSpace(req.Username)
	}
	if loginInput == "" {
		loginInput = strings.TrimSpace(req.Phone)
	}

	if loginInput == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Please provide your username or phone number"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Build $or conditions to search by username OR phone variations
	var orFilters []bson.M

	// 1. Username (case-insensitive)
	orFilters = append(orFilters, bson.M{
		"username": bson.M{"$regex": "^" + regexp.QuoteMeta(loginInput) + "$", "$options": "i"},
	})

	// 2. Direct input match on phone
	orFilters = append(orFilters, bson.M{"phone": loginInput})

	// 3. Normalized phone number variations (supports 09..., +251..., 251..., 9...)
	variations := getPhoneVariations(loginInput)
	seen := make(map[string]bool)
	seen[loginInput] = true

	for _, v := range variations {
		if v != "" && !seen[v] {
			seen[v] = true
			orFilters = append(orFilters, bson.M{"phone": v})
		}
	}

	// 4. Regex match on phone ending with 9-digit subscriber number (e.g. if DB has spaces or dashes)
	for _, v := range variations {
		var dBuilder strings.Builder
		for _, r := range v {
			if r >= '0' && r <= '9' {
				dBuilder.WriteRune(r)
			}
		}
		d := dBuilder.String()
		if len(d) == 9 {
			orFilters = append(orFilters, bson.M{
				"phone": bson.M{"$regex": regexp.QuoteMeta(d) + "$"},
			})
			break
		}
	}

	query := bson.M{
		"$or":      orFilters,
		"password": req.Password,
		"active":   true,
	}

	var user models.User
	err := config.DB.Users.FindOne(ctx, query).Decode(&user)

	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid username, phone number, or password"})
		return
	}

	user.Password = "" // Strip password
	c.JSON(http.StatusOK, gin.H{
		"message": "Login successful",
		"user":    user,
	})
}

func GetUsers(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	cursor, err := config.DB.Users.Find(ctx, bson.M{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer cursor.Close(ctx)

	var users []models.User
	if err := cursor.All(ctx, &users); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	for i := range users {
		users[i].Password = ""
	}

	c.JSON(http.StatusOK, users)
}

func CreateUser(c *gin.Context) {
	var user models.User
	if err := c.ShouldBindJSON(&user); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user.ID = primitive.NewObjectID()
	user.CreatedAt = time.Now()
	user.Active = true

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := config.DB.Users.InsertOne(ctx, user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	user.Password = ""
	c.JSON(http.StatusCreated, user)
}

func UpdateUser(c *gin.Context) {
	idStr := c.Param("id")
	objID, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
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

	_, err = config.DB.Users.UpdateOne(ctx, bson.M{"_id": objID}, bson.M{"$set": updateData})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "User updated successfully"})
}

func DeleteUser(c *gin.Context) {
	idStr := c.Param("id")
	objID, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Soft delete
	_, err = config.DB.Users.UpdateOne(ctx, bson.M{"_id": objID}, bson.M{"$set": bson.M{"active": false}})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "User deactivated successfully"})
}
