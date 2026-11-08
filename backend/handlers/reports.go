package handlers

import (
	"context"
	"math"
	"net/http"
	"time"

	"harbuu-backend/config"
	"harbuu-backend/models"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type DashboardKPIs struct {
	TodaySales               float64 `json:"today_sales"`
	TodayExpenses            float64 `json:"today_expenses"`
	TodayGrossProfit         float64 `json:"today_gross_profit"`
	TodayNetProfit           float64 `json:"today_net_profit"`
	AvailableFinishedPieces  int     `json:"available_finished_pieces"`
	RawMaterialStockValue    float64 `json:"raw_material_stock_value"`
	TotalBankDeposits        float64 `json:"total_bank_deposits"`
	CashOnHand               float64 `json:"cash_on_hand"`
	OutstandingCashDiff      float64 `json:"outstanding_cash_diff"`
	FlourCumulativeKG        float64 `json:"flour_cumulative_kg"`
	FlourThresholdKG         float64 `json:"flour_threshold_kg"`
	DepositReminderActive    bool    `json:"deposit_reminder_active"`
}

func GetDashboardData(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	rangeType := c.Query("range") // "today", "yesterday", "this_week", "this_month", "custom"
	now := time.Now()
	todayStr := now.Format("2006-01-02")

	var startDate, endDate string
	switch rangeType {
	case "yesterday":
		y := now.AddDate(0, 0, -1)
		startDate = y.Format("2006-01-02")
		endDate = startDate
	case "this_week":
		// past 7 days
		w := now.AddDate(0, 0, -6)
		startDate = w.Format("2006-01-02")
		endDate = todayStr
	case "this_month":
		startDate = now.Format("2006-01") + "-01"
		endDate = todayStr
	default:
		// "today"
		startDate = todayStr
		endDate = todayStr
	}

	if c.Query("start_date") != "" && c.Query("end_date") != "" {
		startDate = c.Query("start_date")
		endDate = c.Query("end_date")
	}

	// 1. Fetch Sales in range
	salesFilter := bson.M{
		"sale_date": bson.M{"$gte": startDate, "$lte": endDate},
	}
	salesCursor, _ := config.DB.Sales.Find(ctx, salesFilter)
	var sales []models.Sale
	if salesCursor != nil {
		defer salesCursor.Close(ctx)
		salesCursor.All(ctx, &sales)
	}

	var totalRevenue, totalCOGS, cashSales, bankSales float64
	var totalPiecesSold int
	salesByProduct := make(map[string]float64)
	dailySalesMap := make(map[string]float64)
	dailyCogsMap := make(map[string]float64)
	dailyProfitMap := make(map[string]float64)

	for _, s := range sales {
		totalRevenue += s.TotalAmount
		totalCOGS += s.TotalCOGS
		if s.PaymentMethod == "cash" {
			cashSales += s.TotalAmount
		} else {
			bankSales += s.TotalAmount
		}
		dailySalesMap[s.SaleDate] += s.TotalAmount
		dailyCogsMap[s.SaleDate] += s.TotalCOGS
		dailyProfitMap[s.SaleDate] += (s.TotalAmount - s.TotalCOGS)
		for _, itm := range s.Items {
			salesByProduct[itm.ProductName] += itm.TotalPrice
			totalPiecesSold += itm.Quantity
		}
	}

	// 2. Fetch Variable Expenses in range
	expFilter := bson.M{
		"expense_date": bson.M{"$gte": startDate, "$lte": endDate},
	}
	expCursor, _ := config.DB.VariableExpenses.Find(ctx, expFilter)
	var expenses []models.VariableExpense
	if expCursor != nil {
		defer expCursor.Close(ctx)
		expCursor.All(ctx, &expenses)
	}

	var totalOperatingExpenses, totalCashExpenses float64
	expensesByCategory := make(map[string]float64)
	dailyExpensesMap := make(map[string]float64)
	for _, e := range expenses {
		// If it's an inventory purchase, it goes to inventory balance, not operational expense
		if !e.IsInventoryPurchase {
			totalOperatingExpenses += e.Amount
			expensesByCategory[e.ExpenseCategory] += e.Amount
			dailyExpensesMap[e.ExpenseDate] += e.Amount
		}
		if e.PaymentMethod == "cash" {
			totalCashExpenses += e.Amount
		}
	}

	// 2B. Fetch Paid Fixed Expenses in range (Salaries, Rents, Utility contracts)
	fePayFilter := bson.M{
		"payment_date": bson.M{"$gte": startDate, "$lte": endDate},
		"status":       "paid",
	}
	fePayCursor, _ := config.DB.FixedExpensePayments.Find(ctx, fePayFilter)
	var fePayments []models.FixedExpensePayment
	var totalFixedPaid, totalCashFixedPaid float64
	if fePayCursor != nil {
		defer fePayCursor.Close(ctx)
		fePayCursor.All(ctx, &fePayments)
		for _, p := range fePayments {
			totalFixedPaid += p.Amount
			if p.PaymentMethod == "cash" {
				totalCashFixedPaid += p.Amount
			}
			dailyExpensesMap[p.PaymentDate] += p.Amount
			expensesByCategory["Fixed: "+p.Name] += p.Amount
		}
	}
	totalOperatingExpenses += totalFixedPaid
	totalCashExpenses += totalCashFixedPaid

	// If calculating for full month and fixed expenses are not yet recorded as payments, allocate monthly active fixed expenses
	if rangeType == "this_month" {
		feCursor, _ := config.DB.FixedExpenses.Find(ctx, bson.M{"active": true})
		var feList []models.FixedExpense
		var monthlyFixedTotal float64
		if feCursor != nil {
			defer feCursor.Close(ctx)
			feCursor.All(ctx, &feList)
			for _, fe := range feList {
				monthlyFixedTotal += fe.MonthlyAmount
			}
		}
		if monthlyFixedTotal > totalFixedPaid {
			overheadDiff := monthlyFixedTotal - totalFixedPaid
			totalOperatingExpenses += overheadDiff
			expensesByCategory["Monthly Fixed Overheads"] += overheadDiff
		}
	}

	// 2C. Fetch historical trend data for charts (last 180 days)
	// This ensures Weekly and Monthly charts display complete, accurate trends regardless of the header date picker
	historyStart := now.AddDate(0, -6, 0).Format("2006-01-02")
	chartSalesCursor, _ := config.DB.Sales.Find(ctx, bson.M{
		"sale_date": bson.M{"$gte": historyStart},
	})
	var chartSales []models.Sale
	if chartSalesCursor != nil {
		defer chartSalesCursor.Close(ctx)
		chartSalesCursor.All(ctx, &chartSales)
	}

	chartDailySalesMap := make(map[string]float64)
	chartDailyCogsMap := make(map[string]float64)
	chartDailyProfitMap := make(map[string]float64)
	chartMonthlySalesMap := make(map[string]float64)
	chartMonthlyCogsMap := make(map[string]float64)

	for _, s := range chartSales {
		chartDailySalesMap[s.SaleDate] += s.TotalAmount
		chartDailyCogsMap[s.SaleDate] += s.TotalCOGS
		chartDailyProfitMap[s.SaleDate] += (s.TotalAmount - s.TotalCOGS)

		if len(s.SaleDate) >= 7 {
			mKey := s.SaleDate[:7]
			chartMonthlySalesMap[mKey] += s.TotalAmount
			chartMonthlyCogsMap[mKey] += s.TotalCOGS
		}
	}

	// Historical variable expenses
	chartExpCursor, _ := config.DB.VariableExpenses.Find(ctx, bson.M{
		"expense_date": bson.M{"$gte": historyStart},
	})
	var chartExpenses []models.VariableExpense
	if chartExpCursor != nil {
		defer chartExpCursor.Close(ctx)
		chartExpCursor.All(ctx, &chartExpenses)
	}

	chartDailyVarExpensesMap := make(map[string]float64)
	chartMonthlyExpensesMap := make(map[string]float64)

	for _, e := range chartExpenses {
		if !e.IsInventoryPurchase {
			chartDailyVarExpensesMap[e.ExpenseDate] += e.Amount
			if len(e.ExpenseDate) >= 7 {
				mKey := e.ExpenseDate[:7]
				chartMonthlyExpensesMap[mKey] += e.Amount
			}
		}
	}

	// Historical paid fixed expenses
	chartFeCursor, _ := config.DB.FixedExpensePayments.Find(ctx, bson.M{
		"status": "paid",
	})
	var chartFePayments []models.FixedExpensePayment
	if chartFeCursor != nil {
		defer chartFeCursor.Close(ctx)
		chartFeCursor.All(ctx, &chartFePayments)
	}

	for _, p := range chartFePayments {
		mKey := p.PeriodMonth
		if mKey == "" && len(p.PaymentDate) >= 7 {
			mKey = p.PaymentDate[:7]
		}
		if mKey != "" {
			chartMonthlyExpensesMap[mKey] += p.Amount
		}
	}

	// Compute trend daily net profit map
	chartDailyNetProfitMap := make(map[string]float64)
	for d, rev := range chartDailySalesMap {
		cogs := chartDailyCogsMap[d]
		exp := chartDailyVarExpensesMap[d]
		chartDailyNetProfitMap[d] = math.Round((rev-cogs-exp)*100) / 100
	}
	for d, exp := range chartDailyVarExpensesMap {
		if _, exists := chartDailyNetProfitMap[d]; !exists {
			chartDailyNetProfitMap[d] = math.Round((-exp)*100) / 100
		}
	}

	// Compute daily net profit map for filtered range
	dailyNetProfitMap := make(map[string]float64)
	allDates := make(map[string]bool)
	for d := range dailySalesMap {
		allDates[d] = true
	}
	for d := range dailyExpensesMap {
		allDates[d] = true
	}
	for d := range allDates {
		rev := dailySalesMap[d]
		cogs := dailyCogsMap[d]
		exp := dailyExpensesMap[d]
		dailyNetProfitMap[d] = math.Round((rev-cogs-exp)*100) / 100
	}

	// 3. Finished Products Available
	var finishedStock []models.FinishedProductStock
	fCursor, _ := config.DB.FinishedStock.Find(ctx, bson.M{})
	var totalFinishedPieces int
	if fCursor != nil {
		defer fCursor.Close(ctx)
		fCursor.All(ctx, &finishedStock)
		for _, fs := range finishedStock {
			if fs.AvailableQuantity > 0 {
				totalFinishedPieces += fs.AvailableQuantity
			}
		}
	}

	// 4. Raw Material Stock Value
	var rawMaterials []models.RawMaterial
	rCursor, _ := config.DB.RawMaterials.Find(ctx, bson.M{})
	var rawStockValue float64
	if rCursor != nil {
		defer rCursor.Close(ctx)
		rCursor.All(ctx, &rawMaterials)
		for _, rm := range rawMaterials {
			rawStockValue += rm.CurrentQuantity * rm.PurchasePrice
		}
	}

	// 5. Total Bank Deposits in range
	depFilter := bson.M{
		"deposit_date": bson.M{"$gte": startDate, "$lte": endDate},
	}
	depCursor, _ := config.DB.BankDeposits.Find(ctx, depFilter)
	var deposits []models.BankDeposit
	var totalDeposits float64
	if depCursor != nil {
		defer depCursor.Close(ctx)
		depCursor.All(ctx, &deposits)
		for _, d := range deposits {
			totalDeposits += d.Amount
		}
	}

	// 6. Cash Closings in range & Outstanding Cash Differences
	closeFilter := bson.M{
		"closing_date": bson.M{"$gte": startDate, "$lte": endDate},
	}
	cCursor, _ := config.DB.DailyCashClosings.Find(ctx, closeFilter)
	var closings []models.DailyCashClosing
	var outstandingCashDiff float64
	if cCursor != nil {
		defer cCursor.Close(ctx)
		cCursor.All(ctx, &closings)
		for _, cl := range closings {
			if cl.Status == "pending" {
				outstandingCashDiff += cl.CashDifference
			}
		}
	}

	// 7. Flour Tracker
	var tracker models.FlourTracker
	config.DB.FlourTracker.FindOne(ctx, bson.M{}).Decode(&tracker)

	// 8. Production vs Sales comparison (quantities)
	prodFilter := bson.M{
		"production_date": bson.M{"$gte": startDate, "$lte": endDate},
		"status":          "completed",
	}
	prodCursor, _ := config.DB.ProductionBatches.Find(ctx, prodFilter)
	var batches []models.ProductionBatch
	var totalPiecesProduced int
	var totalProductionValue float64
	if prodCursor != nil {
		defer prodCursor.Close(ctx)
		prodCursor.All(ctx, &batches)
		for _, b := range batches {
			totalPiecesProduced += b.PiecesProduced
			totalProductionValue += b.PotentialSellingValue
		}
	}

	// Estimated Cash on Hand = Cash Sales - Cash Expenses - Bank Deposits
	cashOnHand := cashSales - totalCashExpenses - totalDeposits
	if cashOnHand < 0 {
		cashOnHand = 0
	}

	grossProfit := totalRevenue - totalCOGS
	netProfit := grossProfit - totalOperatingExpenses

	kpis := DashboardKPIs{
		TodaySales:              math.Round(totalRevenue*100) / 100,
		TodayExpenses:           math.Round(totalOperatingExpenses*100) / 100,
		TodayGrossProfit:        math.Round(grossProfit*100) / 100,
		TodayNetProfit:          math.Round(netProfit*100) / 100,
		AvailableFinishedPieces: totalFinishedPieces,
		RawMaterialStockValue:   math.Round(rawStockValue*100) / 100,
		TotalBankDeposits:       math.Round(totalDeposits*100) / 100,
		CashOnHand:              math.Round(cashOnHand*100) / 100,
		OutstandingCashDiff:     math.Round(outstandingCashDiff*100) / 100,
		FlourCumulativeKG:       tracker.CurrentCumulativeKG,
		FlourThresholdKG:        tracker.MilestoneThresholdKG,
		DepositReminderActive:   tracker.DepositReminderActive,
	}

	c.JSON(http.StatusOK, gin.H{
		"kpis":                     kpis,
		"start_date":               startDate,
		"end_date":                 endDate,
		"daily_sales_map":          chartDailySalesMap,
		"daily_cogs_map":           chartDailyCogsMap,
		"daily_profit_map":         chartDailyProfitMap,
		"daily_gross_profit_map":   chartDailyProfitMap,
		"daily_net_profit_map":     chartDailyNetProfitMap,
		"daily_expenses_map":       chartDailyVarExpensesMap,
		"monthly_sales_map":        chartMonthlySalesMap,
		"monthly_cogs_map":         chartMonthlyCogsMap,
		"monthly_expenses_map":     chartMonthlyExpensesMap,
		"range_daily_sales_map":    dailySalesMap,
		"range_daily_expenses_map": dailyExpensesMap,
		"sales_by_product":         salesByProduct,
		"expenses_by_category":     expensesByCategory,
		"total_pieces_produced":   totalPiecesProduced,
		"total_production_value":  math.Round(totalProductionValue*100) / 100,
		"total_items_sold":        totalPiecesSold,
		"total_sales_count":       len(sales),
	})
}

// Full Reports Endpoints
func GetReportData(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	reportType := c.Param("type")
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")

	now := time.Now()
	if startDate == "" {
		startDate = now.AddDate(0, 0, -30).Format("2006-01-02")
	}
	if endDate == "" {
		endDate = now.Format("2006-01-02")
	}

	switch reportType {
	case "daily_sales", "weekly_sales", "monthly_sales":
		filter := bson.M{"sale_date": bson.M{"$gte": startDate, "$lte": endDate}}
		findOpts := options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}})
		cursor, _ := config.DB.Sales.Find(ctx, filter, findOpts)
		var list []models.Sale
		if cursor != nil {
			defer cursor.Close(ctx)
			cursor.All(ctx, &list)
		}
		c.JSON(http.StatusOK, gin.H{"report": reportType, "start_date": startDate, "end_date": endDate, "data": list})

	case "production":
		filter := bson.M{"production_date": bson.M{"$gte": startDate, "$lte": endDate}}
		findOpts := options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}})
		cursor, _ := config.DB.ProductionBatches.Find(ctx, filter, findOpts)
		var list []models.ProductionBatch
		if cursor != nil {
			defer cursor.Close(ctx)
			cursor.All(ctx, &list)
		}
		c.JSON(http.StatusOK, gin.H{"report": reportType, "start_date": startDate, "end_date": endDate, "data": list})

	case "ingredient_consumption":
		filter := bson.M{"production_date": bson.M{"$gte": startDate, "$lte": endDate}, "status": "completed"}
		cursor, _ := config.DB.ProductionBatches.Find(ctx, filter)
		var batches []models.ProductionBatch
		if cursor != nil {
			defer cursor.Close(ctx)
			cursor.All(ctx, &batches)
		}
		// Aggregate by ingredient
		agg := make(map[string]map[string]interface{})
		for _, b := range batches {
			for _, ing := range b.IngredientsConsumed {
				if _, ok := agg[ing.Name]; !ok {
					agg[ing.Name] = map[string]interface{}{
						"name":       ing.Name,
						"quantity":   0.0,
						"unit":       ing.Unit,
						"total_cost": 0.0,
					}
				}
				q := agg[ing.Name]["quantity"].(float64)
				cost := agg[ing.Name]["total_cost"].(float64)
				agg[ing.Name]["quantity"] = q + ing.Quantity
				agg[ing.Name]["total_cost"] = cost + ing.TotalCost
			}
		}
		c.JSON(http.StatusOK, gin.H{"report": reportType, "start_date": startDate, "end_date": endDate, "data": agg})

	case "raw_materials":
		cursor, _ := config.DB.RawMaterials.Find(ctx, bson.M{})
		var list []models.RawMaterial
		if cursor != nil {
			defer cursor.Close(ctx)
			cursor.All(ctx, &list)
		}
		c.JSON(http.StatusOK, gin.H{"report": reportType, "data": list})

	case "finished_stock":
		cursor, _ := config.DB.FinishedStock.Find(ctx, bson.M{})
		var list []models.FinishedProductStock
		if cursor != nil {
			defer cursor.Close(ctx)
			cursor.All(ctx, &list)
		}
		for i := range list {
			if list[i].AvailableQuantity < 0 {
				list[i].AvailableQuantity = 0
			}
		}
		c.JSON(http.StatusOK, gin.H{"report": reportType, "data": list})

	case "branch_distribution":
		filter := bson.M{"transfer_date": bson.M{"$gte": startDate, "$lte": endDate}}
		findOpts := options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}})
		cursor, _ := config.DB.BranchTransfers.Find(ctx, filter, findOpts)
		var list []models.BranchTransfer
		if cursor != nil {
			defer cursor.Close(ctx)
			cursor.All(ctx, &list)
		}
		c.JSON(http.StatusOK, gin.H{"report": reportType, "start_date": startDate, "end_date": endDate, "data": list})

	case "variable_expenses":
		filter := bson.M{"expense_date": bson.M{"$gte": startDate, "$lte": endDate}}
		findOpts := options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}})
		cursor, _ := config.DB.VariableExpenses.Find(ctx, filter, findOpts)
		var list []models.VariableExpense
		if cursor != nil {
			defer cursor.Close(ctx)
			cursor.All(ctx, &list)
		}
		c.JSON(http.StatusOK, gin.H{"report": reportType, "start_date": startDate, "end_date": endDate, "data": list})

	case "fixed_expenses":
		cursor, _ := config.DB.FixedExpenses.Find(ctx, bson.M{})
		var list []models.FixedExpense
		if cursor != nil {
			defer cursor.Close(ctx)
			cursor.All(ctx, &list)
		}
		c.JSON(http.StatusOK, gin.H{"report": reportType, "data": list})

	case "cash_reconciliation":
		filter := bson.M{"closing_date": bson.M{"$gte": startDate, "$lte": endDate}}
		findOpts := options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}})
		cursor, _ := config.DB.DailyCashClosings.Find(ctx, filter, findOpts)
		var list []models.DailyCashClosing
		if cursor != nil {
			defer cursor.Close(ctx)
			cursor.All(ctx, &list)
		}
		c.JSON(http.StatusOK, gin.H{"report": reportType, "start_date": startDate, "end_date": endDate, "data": list})

	case "bank_deposits":
		filter := bson.M{"deposit_date": bson.M{"$gte": startDate, "$lte": endDate}}
		findOpts := options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}})
		cursor, _ := config.DB.BankDeposits.Find(ctx, filter, findOpts)
		var list []models.BankDeposit
		if cursor != nil {
			defer cursor.Close(ctx)
			cursor.All(ctx, &list)
		}
		c.JSON(http.StatusOK, gin.H{"report": reportType, "start_date": startDate, "end_date": endDate, "data": list})

	case "profit_and_loss":
		// Sales
		sCursor, _ := config.DB.Sales.Find(ctx, bson.M{"sale_date": bson.M{"$gte": startDate, "$lte": endDate}})
		var sList []models.Sale
		if sCursor != nil {
			defer sCursor.Close(ctx)
			sCursor.All(ctx, &sList)
		}
		var totalRev, totalCogs float64
		for _, s := range sList {
			totalRev += s.TotalAmount
			totalCogs += s.TotalCOGS
		}

		// Operating variable expenses
		eCursor, _ := config.DB.VariableExpenses.Find(ctx, bson.M{
			"expense_date":           bson.M{"$gte": startDate, "$lte": endDate},
			"is_inventory_purchase": false,
		})
		var eList []models.VariableExpense
		var varExpensesTotal float64
		if eCursor != nil {
			defer eCursor.Close(ctx)
			eCursor.All(ctx, &eList)
			for _, e := range eList {
				varExpensesTotal += e.Amount
			}
		}

		// Fixed Expenses
		feCursor, _ := config.DB.FixedExpenses.Find(ctx, bson.M{"active": true})
		var feList []models.FixedExpense
		var monthlyFixedTotal float64
		if feCursor != nil {
			defer feCursor.Close(ctx)
			feCursor.All(ctx, &feList)
			for _, fe := range feList {
				monthlyFixedTotal += fe.MonthlyAmount
			}
		}

		grossProfit := totalRev - totalCogs
		totalOperating := varExpensesTotal + monthlyFixedTotal
		netProfit := grossProfit - totalOperating

		c.JSON(http.StatusOK, gin.H{
			"report":                   "profit_and_loss",
			"start_date":               startDate,
			"end_date":                 endDate,
			"total_revenue":            math.Round(totalRev*100) / 100,
			"cost_of_goods_sold":       math.Round(totalCogs*100) / 100,
			"gross_profit":             math.Round(grossProfit*100) / 100,
			"variable_expenses":        math.Round(varExpensesTotal*100) / 100,
			"fixed_expenses_allocated": math.Round(monthlyFixedTotal*100) / 100,
			"total_operating_expenses": math.Round(totalOperating*100) / 100,
			"net_profit":               math.Round(netProfit*100) / 100,
			"sales_count":              len(sList),
			"variable_expenses_count":  len(eList),
		})

	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "Unknown report type"})
	}
}
