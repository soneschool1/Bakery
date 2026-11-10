package seed

import (
	"context"
	"log"
	"time"

	"harbuu-backend/config"
	"harbuu-backend/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func SeedDatabase(db *config.Database) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// 1. Check if users already seeded
	userCount, err := db.Users.CountDocuments(ctx, bson.M{})
	if err != nil {
		log.Printf("Error checking users count: %v", err)
		return
	}

	if userCount > 0 {
		log.Println("Database already contains records. Skipping seed.")
		return
	}

	log.Println("Seeding initial bakery data...")

	// 2. Branches
	mainBranchID := primitive.NewObjectID()
	kellaBranchID := primitive.NewObjectID()

	branches := []interface{}{
		models.Branch{
			ID:            mainBranchID,
			Name:          "Main Bakery & Shop",
			IsMain:        true,
			Location:      "Bole Medhanialem, Addis Ababa",
			ContactPerson: "Abebe Kebede",
			Phone:         "+251911223344",
			Active:        true,
			CreatedAt:     time.Now(),
		},
		models.Branch{
			ID:            kellaBranchID,
			Name:          "Kella Branch",
			IsMain:        false,
			Location:      "Kella",
			ContactPerson: "GETE",
			Phone:         "0912345678",
			Active:        true,
			CreatedAt:     time.Now(),
		},
	}
	db.Branches.InsertMany(ctx, branches)

	// 3. Users
	users := []interface{}{
		models.User{
			ID:        primitive.NewObjectID(),
			Username:  "admin",
			Password:  "admin123",
			FullName:  "Abebe Kebede (Manager)",
			Role:      "admin",
			BranchID:  mainBranchID.Hex(),
			Phone:     "+251911223344",
			Active:    true,
			CreatedAt: time.Now(),
		},
		models.User{
			ID:        primitive.NewObjectID(),
			Username:  "baker",
			Password:  "baker123",
			FullName:  "Dawit Alemu (Head Baker)",
			Role:      "baker",
			BranchID:  mainBranchID.Hex(),
			Phone:     "+251912345678",
			Active:    true,
			CreatedAt: time.Now(),
		},
		models.User{
			ID:        primitive.NewObjectID(),
			Username:  "cashier",
			Password:  "cashier123",
			FullName:  "Tigist Haile (Cashier)",
			Role:      "cashier",
			BranchID:  mainBranchID.Hex(),
			Phone:     "+251913456789",
			Active:    true,
			CreatedAt: time.Now(),
		},
	}
	db.Users.InsertMany(ctx, users)

	// 4. Products & Recipes
	b1ID := primitive.NewObjectID()
	b2ID := primitive.NewObjectID()
	b3ID := primitive.NewObjectID()
	c1ID := primitive.NewObjectID()
	c2ID := primitive.NewObjectID()
	k1ID := primitive.NewObjectID()
	k2ID := primitive.NewObjectID()
	o1ID := primitive.NewObjectID()

	products := []interface{}{
		models.Product{
			ID:           b1ID,
			Category:     "Bread",
			Name:         "Bread 1 (Special Table)",
			WeightGrams:  100,
			SellingPrice: 10,
			SellingUnit:  "piece",
			Description:  "Standard 100g golden crust breakfast bread",
			Active:       true,
			Recipe: []models.RecipeItem{
				{IngredientName: "Flour", Quantity: 0.07, Unit: "kg"},
				{IngredientName: "MAJ mix", Quantity: 1.0, Unit: "g"},
				{IngredientName: "Yeast", Quantity: 0.5, Unit: "g"},
				{IngredientName: "Salt", Quantity: 1.0, Unit: "g"},
			},
			CreatedAt: time.Now(),
		},
		models.Product{
			ID:           b2ID,
			Category:     "Bread",
			Name:         "Bread 2 (Medium Loaf)",
			WeightGrams:  200,
			SellingPrice: 20,
			SellingUnit:  "piece",
			Description:  "Medium 200g soft sandwich bread",
			Active:       true,
			Recipe: []models.RecipeItem{
				{IngredientName: "Flour", Quantity: 0.14, Unit: "kg"},
				{IngredientName: "MAJ mix", Quantity: 2.0, Unit: "g"},
				{IngredientName: "Yeast", Quantity: 1.0, Unit: "g"},
				{IngredientName: "Salt", Quantity: 2.0, Unit: "g"},
			},
			CreatedAt: time.Now(),
		},
		models.Product{
			ID:           b3ID,
			Category:     "Bread",
			Name:         "Bread 3 (Large Family Loaf)",
			WeightGrams:  300,
			SellingPrice: 30,
			SellingUnit:  "piece",
			Description:  "Large 300g family hearth bread",
			Active:       true,
			Recipe: []models.RecipeItem{
				{IngredientName: "Flour", Quantity: 0.21, Unit: "kg"},
				{IngredientName: "MAJ mix", Quantity: 3.0, Unit: "g"},
				{IngredientName: "Yeast", Quantity: 1.5, Unit: "g"},
				{IngredientName: "Salt", Quantity: 3.0, Unit: "g"},
			},
			CreatedAt: time.Now(),
		},
		models.Product{
			ID:           c1ID,
			Category:     "Cookies",
			Name:         "Selit Tea Cookies",
			WeightGrams:  80,
			SellingPrice: 15,
			SellingUnit:  "piece",
			Description:  "Traditional sesame topped crunchy tea cookies",
			Active:       true,
			Recipe: []models.RecipeItem{
				{IngredientName: "Flour", Quantity: 0.05, Unit: "kg"},
				{IngredientName: "Sugar", Quantity: 20, Unit: "g"},
				{IngredientName: "MAJ mix", Quantity: 1, Unit: "g"},
				{IngredientName: "Selit", Quantity: 5, Unit: "g"},
			},
			CreatedAt: time.Now(),
		},
		models.Product{
			ID:           c2ID,
			Category:     "Cookies",
			Name:         "Tekur Azmud Spiced Biscuit",
			WeightGrams:  90,
			SellingPrice: 25,
			SellingUnit:  "piece",
			Description:  "Aromatic black seed butter cookies",
			Active:       true,
			Recipe: []models.RecipeItem{
				{IngredientName: "Flour", Quantity: 0.06, Unit: "kg"},
				{IngredientName: "Sugar", Quantity: 25, Unit: "g"},
				{IngredientName: "Tekur azmud", Quantity: 4, Unit: "g"},
			},
			CreatedAt: time.Now(),
		},
		models.Product{
			ID:           k1ID,
			Category:     "Cakes",
			Name:         "Chocolate Fudge Cake Slice",
			WeightGrams:  150,
			SellingPrice: 60,
			SellingUnit:  "slice",
			Description:  "Rich layered Belgian chocolate cake slice",
			Active:       true,
			Recipe: []models.RecipeItem{
				{IngredientName: "Flour", Quantity: 0.08, Unit: "kg"},
				{IngredientName: "Sugar", Quantity: 40, Unit: "g"},
			},
			CreatedAt: time.Now(),
		},
		models.Product{
			ID:           k2ID,
			Category:     "Cakes",
			Name:         "Vanilla Sponge Celebration Cake",
			WeightGrams:  1000,
			SellingPrice: 450,
			SellingUnit:  "piece",
			Description:  "1kg decorated vanilla celebration cake",
			Active:       true,
			Recipe: []models.RecipeItem{
				{IngredientName: "Flour", Quantity: 0.5, Unit: "kg"},
				{IngredientName: "Sugar", Quantity: 250, Unit: "g"},
			},
			CreatedAt: time.Now(),
		},
		models.Product{
			ID:           o1ID,
			Category:     "Other Products",
			Name:         "Butter French Croissant",
			WeightGrams:  85,
			SellingPrice: 35,
			SellingUnit:  "piece",
			Description:  "Flaky multi-layered golden butter croissant",
			Active:       true,
			Recipe: []models.RecipeItem{
				{IngredientName: "Flour", Quantity: 0.06, Unit: "kg"},
				{IngredientName: "Yeast", Quantity: 1, Unit: "g"},
				{IngredientName: "Salt", Quantity: 1, Unit: "g"},
			},
			CreatedAt: time.Now(),
		},
	}
	db.Products.InsertMany(ctx, products)

	// 5. Initial Finished Product Stock at Main Branch
	stockItems := []interface{}{
		models.FinishedProductStock{
			BranchID:          mainBranchID.Hex(),
			ProductID:         b1ID.Hex(),
			ProductName:       "Bread 1 (Special Table)",
			Category:          "Bread",
			AvailableQuantity: 450,
			WeightGrams:       100,
			SellingPrice:      10,
			LastUpdated:       time.Now(),
		},
		models.FinishedProductStock{
			BranchID:          mainBranchID.Hex(),
			ProductID:         b2ID.Hex(),
			ProductName:       "Bread 2 (Medium Loaf)",
			Category:          "Bread",
			AvailableQuantity: 280,
			WeightGrams:       200,
			SellingPrice:      20,
			LastUpdated:       time.Now(),
		},
		models.FinishedProductStock{
			BranchID:          mainBranchID.Hex(),
			ProductID:         b3ID.Hex(),
			ProductName:       "Bread 3 (Large Family Loaf)",
			Category:          "Bread",
			AvailableQuantity: 150,
			WeightGrams:       300,
			SellingPrice:      30,
			LastUpdated:       time.Now(),
		},
		models.FinishedProductStock{
			BranchID:          mainBranchID.Hex(),
			ProductID:         c1ID.Hex(),
			ProductName:       "Selit Tea Cookies",
			Category:          "Cookies",
			AvailableQuantity: 95,
			WeightGrams:       80,
			SellingPrice:      15,
			LastUpdated:       time.Now(),
		},
		models.FinishedProductStock{
			BranchID:          mainBranchID.Hex(),
			ProductID:         c2ID.Hex(),
			ProductName:       "Tekur Azmud Spiced Biscuit",
			Category:          "Cookies",
			AvailableQuantity: 60,
			WeightGrams:       90,
			SellingPrice:      25,
			LastUpdated:       time.Now(),
		},
		models.FinishedProductStock{
			BranchID:          mainBranchID.Hex(),
			ProductID:         k1ID.Hex(),
			ProductName:       "Chocolate Fudge Cake Slice",
			Category:          "Cakes",
			AvailableQuantity: 30,
			WeightGrams:       150,
			SellingPrice:      60,
			LastUpdated:       time.Now(),
		},
		models.FinishedProductStock{
			BranchID:          mainBranchID.Hex(),
			ProductID:         o1ID.Hex(),
			ProductName:       "Butter French Croissant",
			Category:          "Other Products",
			AvailableQuantity: 40,
			WeightGrams:       85,
			SellingPrice:      35,
			LastUpdated:       time.Now(),
		},
	}
	db.FinishedStock.InsertMany(ctx, stockItems)

	// 6. Raw Materials (Inventory)
	rawMaterials := []interface{}{
		models.RawMaterial{
			Name:            "Flour",
			Category:        "ingredient",
			CurrentQuantity: 450, // kg
			Unit:            "kg",
			MinimumStock:    100,
			PurchasePrice:   85, // ETB/kg
			Supplier:        "Dire Dawa Mills Share Company",
			LastUpdated:     time.Now(),
		},
		models.RawMaterial{
			Name:            "MAJ mix",
			Category:        "ingredient",
			CurrentQuantity: 35000, // g
			Unit:            "g",
			MinimumStock:    5000,
			PurchasePrice:   0.18, // ETB/g
			Supplier:        "Alpha Bakery Ingredients Ltd",
			LastUpdated:     time.Now(),
		},
		models.RawMaterial{
			Name:            "Yeast",
			Category:        "ingredient",
			CurrentQuantity: 18000, // g
			Unit:            "g",
			MinimumStock:    3000,
			PurchasePrice:   0.22, // ETB/g
			Supplier:        "Angel Yeast Importers",
			LastUpdated:     time.Now(),
		},
		models.RawMaterial{
			Name:            "Salt",
			Category:        "ingredient",
			CurrentQuantity: 65000, // g
			Unit:            "g",
			MinimumStock:    10000,
			PurchasePrice:   0.025, // ETB/g
			Supplier:        "Afder Salt Enterprise",
			LastUpdated:     time.Now(),
		},
		models.RawMaterial{
			Name:            "Sugar",
			Category:        "ingredient",
			CurrentQuantity: 90000, // g
			Unit:            "g",
			MinimumStock:    15000,
			PurchasePrice:   0.095, // ETB/g
			Supplier:        "Wonji Sugar Trading",
			LastUpdated:     time.Now(),
		},
		models.RawMaterial{
			Name:            "Selit",
			Category:        "ingredient",
			CurrentQuantity: 28000, // g
			Unit:            "g",
			MinimumStock:    5000,
			PurchasePrice:   0.14, // ETB/g
			Supplier:        "Humera Farmers Union",
			LastUpdated:     time.Now(),
		},
		models.RawMaterial{
			Name:            "Tekur azmud",
			Category:        "ingredient",
			CurrentQuantity: 22000, // g
			Unit:            "g",
			MinimumStock:    4000,
			PurchasePrice:   0.26, // ETB/g
			Supplier:        "Bale Organic Spices",
			LastUpdated:     time.Now(),
		},
		models.RawMaterial{
			Name:            "Plastic bags",
			Category:        "packaging",
			CurrentQuantity: 2500, // pcs
			Unit:            "pieces",
			MinimumStock:    500,
			PurchasePrice:   1.5,
			Supplier:        "Poly Pack Addis",
			LastUpdated:     time.Now(),
		},
		models.RawMaterial{
			Name:            "Paper bags",
			Category:        "packaging",
			CurrentQuantity: 1200, // pcs
			Unit:            "pieces",
			MinimumStock:    300,
			PurchasePrice:   3.0,
			Supplier:        "Eco Kraft Packaging",
			LastUpdated:     time.Now(),
		},
	}
	db.RawMaterials.InsertMany(ctx, rawMaterials)

	// 7. Fixed / Monthly Expenses (Exact amounts from prompt)
	fixedExpenses := []interface{}{
		models.FixedExpense{
			Name:             "Rent – Main Shop",
			MonthlyAmount:    50000,
			PaymentFrequency: "monthly",
			DueDayOfMonth:    1,
			Active:           true,
			CreatedAt:        time.Now(),
		},
		models.FixedExpense{
			Name:             "Store Rent",
			MonthlyAmount:    10000,
			PaymentFrequency: "monthly",
			DueDayOfMonth:    5,
			Active:           true,
			CreatedAt:        time.Now(),
		},
		models.FixedExpense{
			Name:             "Bedroom Rent",
			MonthlyAmount:    10000,
			PaymentFrequency: "monthly",
			DueDayOfMonth:    5,
			Active:           true,
			CreatedAt:        time.Now(),
		},
		models.FixedExpense{
			Name:             "Head Baker Salary",
			MonthlyAmount:    7500,
			PaymentFrequency: "monthly",
			DueDayOfMonth:    28,
			Active:           true,
			CreatedAt:        time.Now(),
		},
		models.FixedExpense{
			Name:             "Assistant Salary",
			MonthlyAmount:    4500,
			PaymentFrequency: "monthly",
			DueDayOfMonth:    28,
			Active:           true,
			CreatedAt:        time.Now(),
		},
		models.FixedExpense{
			Name:             "Accountant Salary",
			MonthlyAmount:    5000,
			PaymentFrequency: "monthly",
			DueDayOfMonth:    28,
			Active:           true,
			CreatedAt:        time.Now(),
		},
	}
	db.FixedExpenses.InsertMany(ctx, fixedExpenses)

	// 8. Flour Consumption Tracker (100 kg threshold)
	db.FlourTracker.InsertOne(ctx, models.FlourTracker{
		CurrentCumulativeKG:   35.0, // starts at 35 kg
		MilestoneThresholdKG:  100.0,
		DepositReminderActive: false,
		LastDepositRef:        "INIT-DEPOSIT",
		LastUpdated:           time.Now(),
	})

	// 9. Quick Suggestions for Baker and Cashier
	suggestions := []interface{}{
		models.QuickSuggestion{
			RoleTarget:   "baker",
			Category:     "recipe",
			Title:        "Standard 50kg Flour Bread Batch (500 pcs)",
			Payload: map[string]interface{}{
				"flour_kg":         50.0,
				"maj_g":            500.0,
				"yeast_g":          300.0,
				"salt_g":           500.0,
				"pieces_produced":  500,
				"product_name":     "Bread 1 (Special Table)",
			},
			DisplayOrder: 1,
			Active:       true,
		},
		models.QuickSuggestion{
			RoleTarget:   "baker",
			Category:     "recipe",
			Title:        "25kg Flour Cookie Batch (200 pcs)",
			Payload: map[string]interface{}{
				"flour_kg":         25.0,
				"sugar_g":          10000.0,
				"maj_g":            250.0,
				"selit_g":          500.0,
				"tekur_azmud_g":    200.0,
				"pieces_produced":  200,
				"product_name":     "Selit Tea Cookies",
			},
			DisplayOrder: 2,
			Active:       true,
		},
		models.QuickSuggestion{
			RoleTarget:   "baker",
			Category:     "batch_size",
			Title:        "High Demand Weekend Batch (1,000 pcs)",
			Payload: map[string]interface{}{
				"flour_kg":         100.0,
				"maj_g":            1000.0,
				"yeast_g":          600.0,
				"salt_g":           1000.0,
				"pieces_produced":  1000,
			},
			DisplayOrder: 3,
			Active:       true,
		},
		models.QuickSuggestion{
			RoleTarget:   "cashier",
			Category:     "expense_category",
			Title:        "Staff Lunch / Employee Food (250 ETB)",
			Payload: map[string]interface{}{
				"category":    "Employee food",
				"description": "Daily employee lunch allowance",
				"amount":      250.0,
			},
			DisplayOrder: 1,
			Active:       true,
		},
		models.QuickSuggestion{
			RoleTarget:   "cashier",
			Category:     "expense_category",
			Title:        "Branch Transfer Transport / Bajaj (300 ETB)",
			Payload: map[string]interface{}{
				"category":    "Transportation for sending bread to other branches",
				"description": "Bajaj delivery to Kella branch",
				"amount":      300.0,
			},
			DisplayOrder: 2,
			Active:       true,
		},
		models.QuickSuggestion{
			RoleTarget:   "cashier",
			Category:     "sales_combo",
			Title:        "Popular 10x Bread 1 Bundle (100 ETB)",
			Payload: map[string]interface{}{
				"quantity":     10,
				"product_name": "Bread 1 (Special Table)",
			},
			DisplayOrder: 3,
			Active:       true,
		},
	}
	db.QuickSuggestions.InsertMany(ctx, suggestions)

	// 10. Sample Notification
	db.Notifications.InsertOne(ctx, models.Notification{
		TargetRole: "all",
		Type:       "system",
		Title:      "System Initialized",
		Message:    "Harbuu Bakery Management System is ready. Welcome Dawit, Tigist, and Abebe!",
		Severity:   "success",
		Read:       false,
		CreatedAt:  time.Now(),
	})

	log.Println("Database seed successfully completed!")
}
