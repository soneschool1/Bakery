package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type User struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Username  string             `bson:"username" json:"username"`
	Password  string             `bson:"password,omitempty" json:"password,omitempty"`
	FullName  string             `bson:"full_name" json:"full_name"`
	Role      string             `bson:"role" json:"role"` // "admin", "baker", "cashier"
	BranchID  string             `bson:"branch_id" json:"branch_id"`
	Phone     string             `bson:"phone" json:"phone"`
	Active    bool               `bson:"active" json:"active"`
	CreatedAt time.Time          `bson:"created_at" json:"created_at"`
}

type Branch struct {
	ID            primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Name          string             `bson:"name" json:"name"`
	IsMain        bool               `bson:"is_main" json:"is_main"`
	Location      string             `bson:"location" json:"location"`
	ContactPerson string             `bson:"contact_person" json:"contact_person"`
	Phone         string             `bson:"phone" json:"phone"`
	Active        bool               `bson:"active" json:"active"`
	CreatedAt     time.Time          `bson:"created_at" json:"created_at"`
}

type RecipeItem struct {
	IngredientName string  `bson:"ingredient_name" json:"ingredient_name"`
	Quantity       float64 `bson:"quantity" json:"quantity"`
	Unit           string  `bson:"unit" json:"unit"` // "kg", "g", "liter", "piece"
}

type Product struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Category    string             `bson:"category" json:"category"` // "Bread", "Cookies", "Cakes", "Other Products"
	Name        string             `bson:"name" json:"name"`
	WeightGrams float64            `bson:"weight_grams" json:"weight_grams"`
	SellingPrice float64           `bson:"selling_price" json:"selling_price"`
	SellingUnit string             `bson:"selling_unit" json:"selling_unit"` // "piece", "pack", "box"
	Description string             `bson:"description" json:"description"`
	Active      bool               `bson:"active" json:"active"`
	ImageURL    string             `bson:"image_url" json:"image_url"`
	Recipe      []RecipeItem       `bson:"recipe" json:"recipe"`
	CreatedAt   time.Time          `bson:"created_at" json:"created_at"`
}

type RawMaterial struct {
	ID              primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Name            string             `bson:"name" json:"name"`
	Category        string             `bson:"category" json:"category"` // "ingredient", "packaging"
	CurrentQuantity float64            `bson:"current_quantity" json:"current_quantity"`
	Unit            string             `bson:"unit" json:"unit"` // "kg", "g", "quintal", "liter", "pieces"
	MinimumStock    float64            `bson:"minimum_stock" json:"minimum_stock"`
	PurchasePrice   float64            `bson:"purchase_price" json:"purchase_price"` // ETB per unit
	Supplier        string             `bson:"supplier" json:"supplier"`
	LastUpdated     time.Time          `bson:"last_updated" json:"last_updated"`
}

type FinishedProductStock struct {
	ID                primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	BranchID          string             `bson:"branch_id" json:"branch_id"`
	ProductID         string             `bson:"product_id" json:"product_id"`
	ProductName       string             `bson:"product_name" json:"product_name"`
	Category          string             `bson:"category" json:"category"`
	AvailableQuantity int                `bson:"available_quantity" json:"available_quantity"`
	WeightGrams       float64            `bson:"weight_grams" json:"weight_grams"`
	SellingPrice      float64            `bson:"selling_price" json:"selling_price"`
	LastUpdated       time.Time          `bson:"last_updated" json:"last_updated"`
}

type IngredientConsumed struct {
	IngredientID string  `bson:"ingredient_id" json:"ingredient_id"`
	Name         string  `bson:"name" json:"name"`
	Quantity     float64 `bson:"quantity" json:"quantity"`
	Unit         string  `bson:"unit" json:"unit"`
	UnitCost     float64 `bson:"unit_cost" json:"unit_cost"`
	TotalCost    float64 `bson:"total_cost" json:"total_cost"`
}

type AuditEntry struct {
	EditedBy       string    `bson:"edited_by" json:"edited_by"`
	EditedAt       time.Time `bson:"edited_at" json:"edited_at"`
	Reason         string    `bson:"reason" json:"reason"`
	PreviousValues string    `bson:"previous_values" json:"previous_values"`
}

type BatchProductItem struct {
	ProductID        string  `bson:"product_id" json:"product_id"`
	ProductName      string  `bson:"product_name" json:"product_name"`
	Category         string  `bson:"category" json:"category"`
	PiecesProduced   int     `bson:"pieces_produced" json:"pieces_produced"`
	DoughWeightGrams float64 `bson:"dough_weight_grams" json:"dough_weight_grams"`
	TotalWeightGrams float64 `bson:"total_weight_grams" json:"total_weight_grams"`
	UnitSellingPrice float64 `bson:"unit_selling_price" json:"unit_selling_price"`
}

type ProductionBatch struct {
	ID                     primitive.ObjectID   `bson:"_id,omitempty" json:"id"`
	BatchNumber            string               `bson:"batch_number" json:"batch_number"`
	Category               string               `bson:"category" json:"category"`
	ProductID              string               `bson:"product_id" json:"product_id"`
	ProductName            string               `bson:"product_name" json:"product_name"`
	BakerID                string               `bson:"baker_id" json:"baker_id"`
	BakerName              string               `bson:"baker_name" json:"baker_name"`
	ProductionDate         string               `bson:"production_date" json:"production_date"`
	ProductionTime         string               `bson:"production_time" json:"production_time"`
	PiecesProduced         int                  `bson:"pieces_produced" json:"pieces_produced"`
	TotalWeightGrams       float64              `bson:"total_weight_grams" json:"total_weight_grams"`
	UnitSellingPrice       float64              `bson:"unit_selling_price" json:"unit_selling_price"`
	PotentialSellingValue  float64              `bson:"potential_selling_value" json:"potential_selling_value"`
	CostOfIngredients      float64              `bson:"cost_of_ingredients" json:"cost_of_ingredients"`
	IngredientsConsumed    []IngredientConsumed `bson:"ingredients_consumed" json:"ingredients_consumed"`
	Items                  []BatchProductItem   `bson:"items,omitempty" json:"items,omitempty"`
	Remarks                string               `bson:"remarks" json:"remarks"`
	Status                 string               `bson:"status" json:"status"` // "completed", "cancelled", "edited"
	AuditTrail             []AuditEntry         `bson:"audit_trail" json:"audit_trail"`
	BranchID               string               `bson:"branch_id" json:"branch_id"`
	CreatedAt              time.Time            `bson:"created_at" json:"created_at"`
}

type SaleItem struct {
	ProductID   string  `bson:"product_id" json:"product_id"`
	ProductName string  `bson:"product_name" json:"product_name"`
	Quantity    int     `bson:"quantity" json:"quantity"`
	UnitPrice   float64 `bson:"unit_price" json:"unit_price"`
	TotalPrice  float64 `bson:"total_price" json:"total_price"`
	UnitCOGS    float64 `bson:"unit_cogs" json:"unit_cogs"`
	TotalCOGS   float64 `bson:"total_cogs" json:"total_cogs"`
}

type Sale struct {
	ID               primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	ReceiptNumber    string             `bson:"receipt_number" json:"receipt_number"`
	CashierID        string             `bson:"cashier_id" json:"cashier_id"`
	CashierName      string             `bson:"cashier_name" json:"cashier_name"`
	BranchID         string             `bson:"branch_id" json:"branch_id"`
	BranchName       string             `bson:"branch_name" json:"branch_name"`
	SaleDate         string             `bson:"sale_date" json:"sale_date"`
	SaleTime         string             `bson:"sale_time" json:"sale_time"`
	Items            []SaleItem         `bson:"items" json:"items"`
	TotalAmount      float64            `bson:"total_amount" json:"total_amount"`
	TotalCOGS        float64            `bson:"total_cogs" json:"total_cogs"`
	PaymentMethod    string             `bson:"payment_method" json:"payment_method"` // "cash", "bank", "telebirr"
	PaymentReference string             `bson:"payment_reference" json:"payment_reference"`
	CustomerName     string             `bson:"customer_name" json:"customer_name"`
	Remarks          string             `bson:"remarks" json:"remarks"`
	Status           string             `bson:"status,omitempty" json:"status,omitempty"` // "completed", "edited", "cancelled"
	AuditTrail       []AuditEntry       `bson:"audit_trail,omitempty" json:"audit_trail,omitempty"`
	CreatedAt        time.Time          `bson:"created_at" json:"created_at"`
	UpdatedAt        *time.Time         `bson:"updated_at,omitempty" json:"updated_at,omitempty"`
}

type TransferItem struct {
	ProductID   string `bson:"product_id" json:"product_id"`
	ProductName string `bson:"product_name" json:"product_name"`
	Quantity    int    `bson:"quantity" json:"quantity"`
	WeightGrams int    `bson:"weight_grams,omitempty" json:"weight_grams,omitempty"`
}

type BranchTransfer struct {
	ID                 primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	TransferNumber     string             `bson:"transfer_number" json:"transfer_number"`
	FromBranchID       string             `bson:"from_branch_id" json:"from_branch_id"`
	FromBranchName     string             `bson:"from_branch_name" json:"from_branch_name"`
	ToBranchID         string             `bson:"to_branch_id" json:"to_branch_id"`
	ToBranchName       string             `bson:"to_branch_name" json:"to_branch_name"`
	ProductID          string             `bson:"product_id" json:"product_id"`
	ProductName        string             `bson:"product_name" json:"product_name"`
	Quantity           int                `bson:"quantity" json:"quantity"`
	Items              []TransferItem     `bson:"items,omitempty" json:"items,omitempty"`
	TransportationCost float64            `bson:"transportation_cost" json:"transportation_cost"`
	Status             string             `bson:"status" json:"status"` // "sent", "received", "cancelled"
	TransferDate       string             `bson:"transfer_date" json:"transfer_date"`
	TransferTime       string             `bson:"transfer_time" json:"transfer_time"`
	SentByID           string             `bson:"sent_by_id" json:"sent_by_id"`
	SentByName         string             `bson:"sent_by_name" json:"sent_by_name"`
	ReceivedByID       string             `bson:"received_by_id" json:"received_by_id"`
	ReceivedByName     string             `bson:"received_by_name" json:"received_by_name"`
	ReceivedDate       *time.Time         `bson:"received_date,omitempty" json:"received_date,omitempty"`
	Remarks            string             `bson:"remarks" json:"remarks"`
	CreatedAt          time.Time          `bson:"created_at" json:"created_at"`
}

type VariableExpense struct {
	ID                     primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	ExpenseCategory        string             `bson:"expense_category" json:"expense_category"`
	Description            string             `bson:"description" json:"description"`
	Amount                 float64            `bson:"amount" json:"amount"`
	ExpenseDate            string             `bson:"expense_date" json:"expense_date"`
	PaymentMethod          string             `bson:"payment_method" json:"payment_method"` // "cash", "bank"
	RecordedByID           string             `bson:"recorded_by_id" json:"recorded_by_id"`
	RecordedByName         string             `bson:"recorded_by_name" json:"recorded_by_name"`
	ReceiptAttachment      string             `bson:"receipt_attachment" json:"receipt_attachment"`
	IsInventoryPurchase    bool               `bson:"is_inventory_purchase" json:"is_inventory_purchase"`
	InventoryMaterialID    string             `bson:"inventory_material_id" json:"inventory_material_id"`
	InventoryQuantityAdded float64            `bson:"inventory_quantity_added" json:"inventory_quantity_added"`
	Remarks                string             `bson:"remarks" json:"remarks"`
	Status                 string             `bson:"status,omitempty" json:"status,omitempty"` // "active", "edited"
	AuditTrail             []AuditEntry       `bson:"audit_trail,omitempty" json:"audit_trail,omitempty"`
	CreatedAt              time.Time          `bson:"created_at" json:"created_at"`
	UpdatedAt              *time.Time         `bson:"updated_at,omitempty" json:"updated_at,omitempty"`
}

type FixedExpense struct {
	ID               primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Name             string             `bson:"name" json:"name"`
	MonthlyAmount    float64            `bson:"monthly_amount" json:"monthly_amount"`
	PaymentFrequency string             `bson:"payment_frequency" json:"payment_frequency"`
	DueDayOfMonth    int                `bson:"due_day_of_month" json:"due_day_of_month"`
	Active           bool               `bson:"active" json:"active"`
	CreatedAt        time.Time          `bson:"created_at" json:"created_at"`
}

type FixedExpensePayment struct {
	ID             primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	FixedExpenseID string             `bson:"fixed_expense_id" json:"fixed_expense_id"`
	Name           string             `bson:"name" json:"name"`
	PeriodMonth    string             `bson:"period_month" json:"period_month"` // "YYYY-MM"
	Amount         float64            `bson:"amount" json:"amount"`
	Status         string             `bson:"status" json:"status"` // "paid", "unpaid", "pending"
	PaymentDate    string             `bson:"payment_date" json:"payment_date"`
	PaymentMethod  string             `bson:"payment_method" json:"payment_method"` // "cash", "bank"
	PaidBy         string             `bson:"paid_by" json:"paid_by"`
	Reference      string             `bson:"reference" json:"reference"`
	Remarks        string             `bson:"remarks" json:"remarks"`
	CreatedAt      time.Time          `bson:"created_at" json:"created_at"`
}

type DailyCashClosing struct {
	ID                  primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	ClosingDate         string             `bson:"closing_date" json:"closing_date"`
	CashierID           string             `bson:"cashier_id" json:"cashier_id"`
	CashierName         string             `bson:"cashier_name" json:"cashier_name"`
	BranchID            string             `bson:"branch_id" json:"branch_id"`
	BranchName          string             `bson:"branch_name" json:"branch_name"`
	TotalQuantitySold   int                `bson:"total_quantity_sold" json:"total_quantity_sold"`
	TotalSalesValue     float64            `bson:"total_sales_value" json:"total_sales_value"`
	TotalCashSales      float64            `bson:"total_cash_sales" json:"total_cash_sales"`
	TotalBankSales      float64            `bson:"total_bank_sales" json:"total_bank_sales"`
	TotalCashExpenses   float64            `bson:"total_cash_expenses" json:"total_cash_expenses"`
	ExpectedCashAmount  float64            `bson:"expected_cash_amount" json:"expected_cash_amount"`
	ActualCashCounted   float64            `bson:"actual_cash_counted" json:"actual_cash_counted"`
	CashDifference      float64            `bson:"cash_difference" json:"cash_difference"` // Actual - Expected
	BankDepositAmount   float64            `bson:"bank_deposit_amount" json:"bank_deposit_amount"`
	CashRemainingInShop float64            `bson:"cash_remaining_in_shop" json:"cash_remaining_in_shop"`
	Remarks             string             `bson:"remarks" json:"remarks"`
	Status              string             `bson:"status" json:"status"` // "pending", "approved", "rejected"
	ReviewedBy          string             `bson:"reviewed_by" json:"reviewed_by"`
	ReviewedAt          *time.Time         `bson:"reviewed_at,omitempty" json:"reviewed_at,omitempty"`
	CreatedAt           time.Time          `bson:"created_at" json:"created_at"`
}

type BankDeposit struct {
	ID                        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	DepositDate               string             `bson:"deposit_date" json:"deposit_date"`
	Amount                    float64            `bson:"amount" json:"amount"`
	BankName                  string             `bson:"bank_name" json:"bank_name"`
	ReferenceNumber           string             `bson:"reference_number" json:"reference_number"`
	DepositedByID             string             `bson:"deposited_by_id" json:"deposited_by_id"`
	DepositedByName           string             `bson:"deposited_by_name" json:"deposited_by_name"`
	TriggeredByFlourMilestone bool               `bson:"triggered_by_flour_milestone" json:"triggered_by_flour_milestone"`
	Remarks                   string             `bson:"remarks" json:"remarks"`
	CreatedAt                 time.Time          `bson:"created_at" json:"created_at"`
}

type StockCheckItem struct {
	MaterialID       string  `bson:"material_id" json:"material_id"`
	MaterialName     string  `bson:"material_name" json:"material_name"`
	SystemQuantity   float64 `bson:"system_quantity" json:"system_quantity"`
	PhysicalQuantity float64 `bson:"physical_quantity" json:"physical_quantity"`
	Difference       float64 `bson:"difference" json:"difference"` // Physical - System
	Explanation      string  `bson:"explanation" json:"explanation"`
}

type WeeklyStockCheck struct {
	ID           primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	CheckDate    string             `bson:"check_date" json:"check_date"`
	EmployeeID   string             `bson:"employee_id" json:"employee_id"`
	EmployeeName string             `bson:"employee_name" json:"employee_name"`
	Items        []StockCheckItem   `bson:"items" json:"items"`
	Status       string             `bson:"status" json:"status"` // "pending_approval", "approved", "rejected"
	ApprovedBy   string             `bson:"approved_by" json:"approved_by"`
	ApprovedAt   *time.Time         `bson:"approved_at,omitempty" json:"approved_at,omitempty"`
	Notes        string             `bson:"notes" json:"notes"`
	CreatedAt    time.Time          `bson:"created_at" json:"created_at"`
}

type FlourTracker struct {
	ID                    primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	CurrentCumulativeKG   float64            `bson:"current_cumulative_kg" json:"current_cumulative_kg"`
	MilestoneThresholdKG  float64            `bson:"milestone_threshold_kg" json:"milestone_threshold_kg"`
	DepositReminderActive bool               `bson:"deposit_reminder_active" json:"deposit_reminder_active"`
	LastMilestoneAt       *time.Time         `bson:"last_milestone_at,omitempty" json:"last_milestone_at,omitempty"`
	LastDepositRef        string             `bson:"last_deposit_ref" json:"last_deposit_ref"`
	LastUpdated           time.Time          `bson:"last_updated" json:"last_updated"`
}

type QuickSuggestion struct {
	ID           primitive.ObjectID     `bson:"_id,omitempty" json:"id"`
	RoleTarget   string                 `bson:"role_target" json:"role_target"` // "baker", "cashier"
	Category     string                 `bson:"category" json:"category"`
	Title        string                 `bson:"title" json:"title"`
	Payload      map[string]interface{} `bson:"payload" json:"payload"`
	DisplayOrder int                    `bson:"display_order" json:"display_order"`
	Active       bool                   `bson:"active" json:"active"`
}

type Notification struct {
	ID         primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	TargetRole string             `bson:"target_role" json:"target_role"` // "all", "admin", "baker", "cashier"
	Type       string             `bson:"type" json:"type"`
	Title      string             `bson:"title" json:"title"`
	Message    string             `bson:"message" json:"message"`
	Severity   string             `bson:"severity" json:"severity"` // "info", "warning", "success", "danger"
	Read       bool               `bson:"read" json:"read"`
	Link       string             `bson:"link" json:"link"`
	CreatedAt  time.Time          `bson:"created_at" json:"created_at"`
}

type AuditLog struct {
	ID         primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID     string             `bson:"user_id" json:"user_id"`
	UserName   string             `bson:"user_name" json:"user_name"`
	Action     string             `bson:"action" json:"action"`
	EntityType string             `bson:"entity_type" json:"entity_type"`
	EntityID   string             `bson:"entity_id" json:"entity_id"`
	Details    string             `bson:"details" json:"details"`
	CreatedAt  time.Time          `bson:"created_at" json:"created_at"`
}
