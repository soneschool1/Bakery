# Harbuu Bakery - Integrated Management System

A modern, simple, and fully integrated Bakery Management System that coordinates the entire daily operation of a bakery: production, raw material inventory consumption, finished goods stock, point of sale (POS), branch distribution, variable and fixed expense tracking, daily cash drawer reconciliation, bank deposits, and downloadable financial reports.

---

## 🏗️ Technology Stack

- **Frontend**: **React 18** (Vite, Tailwind CSS, Lucide Icons, jsPDF, autoTable, SheetJS/XLSX)
- **Backend**: **Go (Golang 1.27)** with Gin Web Framework & Server-Sent Events (SSE)
- **Database**: **MongoDB (v9.0)** with `harbuu_bakery` database running locally on `mongodb://127.0.0.1:27017`
- **Currency**: Ethiopian Birr (**ETB**)

---

## 👥 Three Main Roles & Interfaces

### 1. 🥖 Baker / Production Department (`Dawit Alemu`)
- **Category Selection**: Bread, Cookies, Cakes, Other Products
- **Bread Production**: Automatic batch numbering (`BATCH-YYYYMMDD-001`), bread type selection, ingredients consumption entry (Flour kg, MAJ mix g, Yeast g, Salt g, optional other), pieces produced, total weight calculation, and live potential selling value (`pieces * price`).
- **Cookies Production**: Flour, Sugar, MAJ, Yeast, Salt, Selit (Sesame), Tekur Azmud (Black Cumin), output pieces.
- **Cakes Production**: Configurable forms, ingredients, recipes, and piece outputs.
- **Real-Time Integration**: Completing a batch automatically deducts raw materials, increases finished stock for the cashier, accumulates flour consumption for deposit alerts, and broadcasts updates via SSE.
- **Production History**: Today's and previous records with authorized correction audit log.
- **Live Raw Material Status**: Displays store stock levels and low-stock alerts before baking.

### 2. 🏪 Cashier / Sales Department (`Tigist Haile`)
- **POS Interface**: Touchscreen product cards synchronized with the baker's finished goods inventory.
- **Quick Sales**: Fast quantity incrementing (+ / -), payment methods (Cash, CBE / Bank, Telebirr), receipt generation with printable thermal layout.
- **Branch Distribution**: Send products to other branches (Bole Atlas, Piassa, Kazanchis) with transportation costs (deducts main branch inventory as transfer, not customer revenue).
- **Daily Cash Reconciliation & Closing**: End-of-day sales summary, expected cash calculation (`Cash Sales - Cash Expenses`), actual cash counted entry, automated difference calculation (Shortage/Surplus), bank deposit amount, remaining float, and submission for admin review.
- **Flour Milestone Alert Banner**: Alerts cashier when 100 kg flour has been consumed in production with direct 1-click bank deposit recording.
- **Variable Expenses**: Quick selection buttons (Employee food, Transport, Flour purchases, MAJ purchases, etc.) with automatic inventory replenishment linking.
- **Weekly Stock Check**: Physical inventory count vs system count discrepancy form.

### 3. 👑 Administrator / Owner (`Abebe Kebede`)
- **Executive Dashboard**: 9 real-time KPI cards (Sales Revenue, Operating Expenses, Gross Profit, Net Profit, Available Finished Goods, Raw Material Stock Value, Total Bank Deposits, Cash on Hand, Outstanding Cash Differences).
- **Visual Analytics**: Interactive product sales distribution, expenses by category, production vs realized sales.
- **13 Downloadable Reports (PDF & Excel)**:
  1. Daily Sales Report
  2. Weekly Sales Report
  3. Monthly Sales Report
  4. Production Report
  5. Ingredient Consumption Report
  6. Raw Material Stock Report
  7. Finished Product Stock Report
  8. Branch Distribution Report
  9. Variable Expenses Report
  10. Fixed Expenses Report
  11. Daily Cash Reconciliation Report
  12. Bank Deposit Report
  13. Profit and Loss Report (Total Revenue, COGS, Gross Profit, OpEx, Net Operating Profit)
- **Production Management**: View all batches, filter by baker, cancel batch with audit trail and automated stock reversal.
- **Fixed Costs & Payroll**: Main Shop Rent (50,000 ETB), Store Rent (10,000 ETB), Bedroom Rent (10,000 ETB), Head Baker (7,500 ETB), Assistant (4,500 ETB), Accountant (5,000 ETB), and monthly paid/unpaid tracking.
- **Quick Action Configurator**: Add, edit, and delete employee suggestion buttons without modifying source code.
- **User & Role Management**: Add and manage employee accounts and roles.
- **Audit Logs Viewer**: Full chronological log of all sensitive operations.

---

## 🚀 Running the System

### Server & Client URLs:
- **Application (SPA + API)**: [http://127.0.0.1:8080](http://127.0.0.1:8080)
- **Vite React Dev Server**: [http://127.0.0.1:5173](http://127.0.0.1:5173)
- **Backend API Base**: `http://127.0.0.1:8080/api`
- **Real-Time Events (SSE)**: `http://127.0.0.1:8080/api/events`

### Default Login Accounts:
| Role | Username | Password | Full Name |
|---|---|---|---|
| Administrator | `admin` | `admin123` | Abebe Kebede (Manager) |
| Head Baker | `baker` | `baker123` | Dawit Alemu (Head Baker) |
| Sales Cashier | `cashier` | `cashier123` | Tigist Haile (Cashier) |

*(You can also switch roles anytime using the Role Switcher pill in the top header).*

---

## 📁 Project Architecture

```
Harbuu/
├── backend/
│   ├── main.go               # Gin HTTP server, static SPA server, route definitions
│   ├── config/
│   │   └── db.go             # MongoDB connection and collection handles
│   ├── models/
│   │   └── models.go         # Struct definitions with BSON and JSON tags
│   ├── seed/
│   │   └── seed.go           # Initial products, recipes, raw materials, fixed expenses
│   ├── sse/
│   │   └── hub.go            # Real-time multi-client event broadcaster
│   └── handlers/
│       ├── auth.go           # User authentication & user management
│       ├── production.go     # Batch creation, raw material deduction, flour tracker
│       ├── sales.go          # POS sales recording, stock reduction, COGS
│       ├── branches.go       # Branch locations, transfers & receiving
│       ├── inventory.go      # Raw materials CRUD, adjustments, weekly stock check
│       ├── products.go       # Product varieties, bread pricing, recipes
│       ├── expenses.go       # Variable expenses, inventory linking, fixed monthly costs
│       ├── reconciliation.go # Daily cash closing, bank deposits, flour tracker
│       ├── suggestions.go    # Quick action suggestions configurator
│       ├── reports.go        # 13 reports data aggregation & dashboard KPIs
│       ├── notifications.go  # In-app notifications
│       └── audit.go          # Activity audit logs
└── client/
    ├── src/
    │   ├── main.jsx          # React DOM root entry
    │   ├── App.jsx           # Master application container & state
    │   ├── index.css         # Tailwind CSS styling & print optimizations
    │   ├── services/
    │   │   └── api.js        # API service client & SSE EventSource listener
    │   ├── utils/
    │   │   ├── formatters.js # ETB currency and date/time formatters
    │   │   └── exportReports.js # jsPDF & SheetJS Excel exporter
    │   └── components/
    │       ├── Navbar.jsx    # Top header, role switcher, flour progress bar
    │       ├── FlourAlertBanner.jsx # 100 kg flour consumption deposit reminder
    │       ├── NotificationDrawer.jsx # Slide-out notification center
    │       ├── ReceiptModal.jsx # POS printable receipt modal
    │       ├── Baker/        # Production module forms & history
    │       ├── Cashier/      # POS, branch transfers, reconciliation, deposits
    │       └── Admin/        # Executive dashboard, 13 reports, configurators
```
