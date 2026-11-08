package config

import (
	"context"
	"log"
	"os"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type Database struct {
	Client *mongo.Client
	DB     *mongo.Database

	Users                  *mongo.Collection
	Branches               *mongo.Collection
	Products               *mongo.Collection
	RawMaterials           *mongo.Collection
	FinishedStock          *mongo.Collection
	ProductionBatches      *mongo.Collection
	Sales                  *mongo.Collection
	BranchTransfers        *mongo.Collection
	VariableExpenses       *mongo.Collection
	FixedExpenses          *mongo.Collection
	FixedExpensePayments   *mongo.Collection
	DailyCashClosings      *mongo.Collection
	BankDeposits           *mongo.Collection
	WeeklyStockChecks      *mongo.Collection
	FlourTracker           *mongo.Collection
	QuickSuggestions       *mongo.Collection
	Notifications          *mongo.Collection
	AuditLogs              *mongo.Collection
}

var DB *Database

func ConnectDB() *Database {
	uri := os.Getenv("MONGO_URI")
	if uri == "" {
		uri = "mongodb://127.0.0.1:27017"
	}

	dbName := os.Getenv("MONGO_DB_NAME")
	if dbName == "" {
		dbName = "harbuu_bakery"
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	clientOpts := options.Client().ApplyURI(uri)
	client, err := mongo.Connect(ctx, clientOpts)
	if err != nil {
		log.Fatalf("Failed to connect to MongoDB: %v", err)
	}

	err = client.Ping(ctx, nil)
	if err != nil {
		log.Fatalf("Failed to ping MongoDB: %v", err)
	}

	log.Printf("Successfully connected to MongoDB at %s (Database: %s)", uri, dbName)
	database := client.Database(dbName)

	DB = &Database{
		Client:                 client,
		DB:                     database,
		Users:                  database.Collection("users"),
		Branches:               database.Collection("branches"),
		Products:               database.Collection("products"),
		RawMaterials:           database.Collection("raw_materials"),
		FinishedStock:          database.Collection("finished_stock"),
		ProductionBatches:      database.Collection("production_batches"),
		Sales:                  database.Collection("sales"),
		BranchTransfers:        database.Collection("branch_transfers"),
		VariableExpenses:       database.Collection("variable_expenses"),
		FixedExpenses:          database.Collection("fixed_expenses"),
		FixedExpensePayments:   database.Collection("fixed_expense_payments"),
		DailyCashClosings:      database.Collection("daily_cash_closings"),
		BankDeposits:           database.Collection("bank_deposits"),
		WeeklyStockChecks:      database.Collection("weekly_stock_checks"),
		FlourTracker:           database.Collection("flour_tracker"),
		QuickSuggestions:       database.Collection("quick_suggestions"),
		Notifications:          database.Collection("notifications"),
		AuditLogs:              database.Collection("audit_logs"),
	}

	return DB
}
