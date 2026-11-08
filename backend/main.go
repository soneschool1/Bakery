package main

import (
	"context"
	"log"
	"os"
	"strings"
	"time"

	"harbuu-backend/config"
	"harbuu-backend/handlers"
	"harbuu-backend/seed"
	"harbuu-backend/sse"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
)

func main() {
	// Connect to MongoDB
	db := config.ConnectDB()

	// Guarantee no negative stock exists anywhere in the database
	ctxInit, cancelInit := context.WithTimeout(context.Background(), 5*time.Second)
	_, _ = db.FinishedStock.UpdateMany(ctxInit, bson.M{"available_quantity": bson.M{"$lt": 0}}, bson.M{"$set": bson.M{"available_quantity": 0}})
	_, _ = db.RawMaterials.UpdateMany(ctxInit, bson.M{"current_quantity": bson.M{"$lt": 0}}, bson.M{"$set": bson.M{"current_quantity": 0}})
	cancelInit()

	// Seed database if empty
	seed.SeedDatabase(db)

	router := gin.Default()

	// CORS configuration
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// Real-time SSE endpoint
	router.GET("/api/events", sse.SSEHandler)

	api := router.Group("/api")
	{
		// System Health Check
		api.Match([]string{"GET", "HEAD"}, "/health", func(c *gin.Context) {
			c.JSON(200, gin.H{
				"status":    "healthy",
				"service":   "harbuu-bakery-api",
				"timestamp": time.Now().UTC(),
			})
		})

		// Authentication & Users
		api.POST("/auth/login", handlers.Login)
		api.GET("/users", handlers.GetUsers)
		api.POST("/users", handlers.CreateUser)
		api.PUT("/users/:id", handlers.UpdateUser)
		api.DELETE("/users/:id", handlers.DeleteUser)

		// Products & Recipes
		api.GET("/products", handlers.GetProducts)
		api.POST("/products", handlers.CreateProduct)
		api.PUT("/products/:id", handlers.UpdateProduct)
		api.DELETE("/products/:id", handlers.DeleteProduct)

		// Inventory (Raw Materials & Finished Stock)
		api.GET("/inventory/raw-materials", handlers.GetRawMaterials)
		api.POST("/inventory/raw-materials", handlers.CreateRawMaterial)
		api.PUT("/inventory/raw-materials/:id", handlers.UpdateRawMaterial)
		api.DELETE("/inventory/raw-materials/:id", handlers.DeleteRawMaterial)
		api.POST("/inventory/adjust", handlers.AdjustStock)
		api.GET("/inventory/finished-stock", handlers.GetFinishedStock)
		api.POST("/inventory/finished-stock/adjust", handlers.AdjustFinishedStock)
		api.GET("/inventory/stock-checks", handlers.GetWeeklyStockChecks)
		api.POST("/inventory/stock-checks", handlers.CreateWeeklyStockCheck)
		api.POST("/inventory/stock-checks/:id/approve", handlers.ApproveWeeklyStockCheck)

		// Production
		api.GET("/production/batches", handlers.GetProductionBatches)
		api.POST("/production/batches", handlers.CreateProductionBatch)
		api.PUT("/production/batches/:id", handlers.EditProductionBatch)
		api.POST("/production/batches/:id/cancel", handlers.CancelProductionBatch)

		// Sales (POS)
		api.GET("/sales", handlers.GetSales)
		api.POST("/sales", handlers.CreateSale)
		api.PUT("/sales/:id", handlers.UpdateSale)
		api.DELETE("/sales/:id", handlers.DeleteSale)
		api.GET("/sales/summary", handlers.GetSalesSummary)

		// Branches & Transfers
		api.GET("/branches", handlers.GetBranches)
		api.POST("/branches", handlers.CreateBranch)
		api.PUT("/branches/:id", handlers.UpdateBranch)
		api.GET("/branches/transfers", handlers.GetBranchTransfers)
		api.POST("/branches/transfers", handlers.CreateBranchTransfer)
		api.POST("/branches/transfers/:id/receive", handlers.ReceiveBranchTransfer)

		// Expenses (Variable & Fixed)
		api.GET("/expenses/variable", handlers.GetVariableExpenses)
		api.POST("/expenses/variable", handlers.CreateVariableExpense)
		api.PUT("/expenses/variable/:id", handlers.UpdateVariableExpense)
		api.DELETE("/expenses/variable/:id", handlers.DeleteVariableExpense)

		api.GET("/expenses/fixed", handlers.GetFixedExpenses)
		api.POST("/expenses/fixed", handlers.CreateFixedExpense)
		api.PUT("/expenses/fixed/:id", handlers.UpdateFixedExpense)
		api.DELETE("/expenses/fixed/:id", handlers.DeleteFixedExpense)
		api.GET("/expenses/fixed/payments", handlers.GetFixedExpensePayments)
		api.POST("/expenses/fixed/payments", handlers.RecordFixedExpensePayment)

		// Reconciliation & Daily Closing & Bank Deposits
		api.GET("/reconciliation/summary", handlers.GetDailyClosingSummary)
		api.GET("/reconciliation/closings", handlers.GetDailyCashClosings)
		api.POST("/reconciliation/closings", handlers.CreateDailyCashClosing)
		api.POST("/reconciliation/closings/:id/review", handlers.ReviewDailyCashClosing)
		api.GET("/reconciliation/deposits", handlers.GetBankDeposits)
		api.POST("/reconciliation/deposits", handlers.CreateBankDeposit)
		api.GET("/reconciliation/flour-tracker", handlers.GetFlourTracker)
		api.PUT("/reconciliation/flour-tracker/threshold", handlers.UpdateFlourThreshold)

		// Quick Suggestions
		api.GET("/suggestions", handlers.GetSuggestions)
		api.POST("/suggestions", handlers.CreateSuggestion)
		api.PUT("/suggestions/:id", handlers.UpdateSuggestion)
		api.DELETE("/suggestions/:id", handlers.DeleteSuggestion)

		// Reports & Dashboards
		api.GET("/reports/dashboard", handlers.GetDashboardData)
		api.GET("/reports/:type", handlers.GetReportData)

		// Notifications & Audit
		api.GET("/notifications", handlers.GetNotifications)
		api.PUT("/notifications/:id/read", handlers.MarkNotificationRead)
		api.PUT("/notifications/read-all", handlers.MarkAllNotificationsRead)
		api.GET("/audit-logs", handlers.GetAuditLogs)
	}

	// Serve React Frontend SPA
	distPath := "../client/dist"
	if _, err := os.Stat(distPath); err == nil {
		router.Static("/assets", distPath+"/assets")
		router.StaticFile("/favicon.svg", distPath+"/favicon.svg")
		router.StaticFile("/favicon.png", distPath+"/favicon.png")
		router.StaticFile("/icons.svg", distPath+"/icons.svg")
		router.StaticFile("/logo.png", distPath+"/logo.png")
		router.NoRoute(func(c *gin.Context) {
			if !strings.HasPrefix(c.Request.URL.Path, "/api") {
				c.File(distPath + "/index.html")
			} else {
				c.JSON(404, gin.H{"error": "API route not found"})
			}
		})
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Harbuu Bakery API Server running on port %s", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatalf("Server startup failed: %v", err)
	}
}
