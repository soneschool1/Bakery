import React, { useState } from 'react';
import { 
  BarChart3, 
  FileText, 
  Wheat, 
  Package, 
  Settings, 
  Landmark, 
  Sparkles, 
  Users, 
  ShieldAlert,
  LayoutGrid,
  ShoppingCart,
  DollarSign,
  Receipt,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import AdminDashboard from './AdminDashboard';
import ReportsCenter from './ReportsCenter';
import ProductionManager from './ProductionManager';
import ProductManager from './ProductManager';
import FixedExpenseManager from './FixedExpenseManager';
import SuggestionsConfigurator from './SuggestionsConfigurator';
import UserManager from './UserManager';
import AuditLogViewer from './AuditLogViewer';
import StockControlCenter from './StockControlCenter';
import DailySalesViewer from './DailySalesViewer';
import ExpenseControlCenter from './ExpenseControlCenter';
import { useTranslation } from '../../i18n';

export default function AdminPanel({ 
  admin, 
  dashboardData, 
  dateRange, 
  setDateRange, 
  customStart, 
  setCustomStart, 
  customEnd, 
  setCustomEnd, 
  onRefreshDashboard, 
  batches = [], 
  rawMaterials = [], 
  finishedStock = [],
  products = [], 
  fixedExpenses = [], 
  expenses = [],
  suggestions = [], 
  users = [], 
  branches = [], 
  auditLogs = [],
  stockChecks = [],
  onCancelBatch, 
  onEditBatch, 
  onAddMaterial, 
  onUpdateMaterial, 
  onDeleteMaterial, 
  onAdjustStock, 
  onAdjustFinishedStock,
  onApproveStockCheck,
  onAddProduct, 
  onUpdateProduct, 
  onDeleteProduct, 
  onAddFixedExpense, 
  onUpdateFixedExpense, 
  onDeleteFixedExpense, 
  onAddSuggestion, 
  onUpdateSuggestion,
  onDeleteSuggestion, 
  onAddUser, 
  onUpdateUser, 
  onDeleteUser,
  onSwitchRole
}) {
  const { t } = useTranslation();
  // Primary Sections: 'dashboard', 'daily_sales', 'stock_control', 'expenses', 'products', 'reports', 'settings_staff'
  const [activeSection, setActiveSection] = useState('dashboard');
  
  // Sub-tabs for Products & Batches
  const [productSubTab, setProductSubTab] = useState('products'); // 'products', 'batches'
  
  // Sub-tabs for Settings & Staff
  const [settingsSubTab, setSettingsSubTab] = useState('fixed'); // 'fixed', 'users', 'suggestions', 'audit'

  const mainSections = [
    { 
      id: 'dashboard', 
      label: t('admin.dashboard', 'Executive Dashboard'), 
      shortLabel: t('admin.dashboardShort', 'Dashboard'),
      desc: t('admin.dashboardDesc', 'KPIs, Sales & Profit'),
      icon: LayoutGrid,
      badge: 'Live'
    },
    { 
      id: 'daily_sales', 
      label: t('admin.dailySales', 'Daily Sales Monitor'), 
      shortLabel: t('admin.dailySalesShort', 'Daily Sales'),
      desc: t('admin.dailySalesDesc', 'Live Orders & Cashiers'),
      icon: ShoppingCart,
      badge: 'POS'
    },
    { 
      id: 'stock_control', 
      label: t('admin.stockControl', 'Stock Control Center'), 
      shortLabel: t('admin.stockControlShort', 'Stock Control'),
      desc: t('admin.stockControlDesc', 'Ingredients, Finished Stock & Audit'),
      icon: Package,
      badge: 'Audit'
    },
    { 
      id: 'expenses', 
      label: t('admin.expenseControlNav', 'Expense Control Center'), 
      shortLabel: t('admin.expenseControlShort', 'Expenses'),
      desc: t('admin.expenseControlNavDesc', 'Operating & Fixed Expenses'),
      icon: DollarSign,
      badge: 'Costs'
    },
    { 
      id: 'products', 
      label: t('admin.productsRecipes', 'Products & Recipes'), 
      shortLabel: t('admin.productsRecipesShort', 'Products'),
      desc: t('admin.productsRecipesDesc', 'Bread Types & Batches'),
      icon: Wheat,
      badge: 'Bread'
    },
    { 
      id: 'reports', 
      label: t('admin.reports', 'Financial Reports Center'), 
      shortLabel: t('admin.reportsShort', 'Reports'),
      desc: t('admin.reportsDesc', '13 Downloadable Reports'),
      icon: FileText,
      badge: '13 PDF'
    },
    { 
      id: 'settings_staff', 
      label: t('admin.settingsStaff', 'Settings & Payroll'), 
      shortLabel: t('admin.settingsStaffShort', 'Settings'),
      desc: t('admin.settingsStaffDesc', 'Salaries, Users & Presets'),
      icon: Settings,
      badge: 'Staff'
    },
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-5 lg:gap-6 items-start">
      
      {/* 1. SINO DESKTOP SIDEBAR NAVIGATION (Visible on Desktop lg+) */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-3.5 sm:p-4 shadow-[2px_0_12px_rgba(0,0,0,0.02)] sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto">
        
        {/* Top SINO Brand Card */}
        <div className="mb-3 px-3 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 rounded-2xl flex items-center gap-2.5">
          <img 
            src="/logo.png" 
            alt="Harbuu Bakery" 
            className="w-8 h-8 rounded-xl object-contain bg-white p-0.5 shadow-2xs shrink-0" 
          />
          <div className="min-w-0 flex-1">
            <div className="text-xs font-extrabold text-slate-900 dark:text-slate-100 truncate">Harbuu Bakery</div>
            <div className="text-[10px] text-slate-400 font-medium truncate flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>HQ Executive Admin</span>
            </div>
          </div>
        </div>

        {/* Navigation Section Title */}
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 px-3">
          {t('admin.mainNavigation', 'Admin Menu')}
        </div>

        {/* 7 Nav Items with Original Harbuu Green Active State */}
        <nav className="space-y-1">
          {mainSections.map((sec) => {
            const Icon = sec.icon;
            const isActive = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => setActiveSection(sec.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#0E7452] text-white font-bold shadow-md shadow-[#0E7452]/20'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span className="truncate">{sec.shortLabel}</span>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${
                  isActive 
                    ? 'bg-white/20 text-white' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                }`}>
                  {sec.badge}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Sidebar Bottom User & System Status Card */}
        <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-700/60 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#E8F6F2] text-[#0E7452] flex items-center justify-center font-bold text-xs shrink-0">
              {admin?.full_name ? admin.full_name.slice(0, 2).toUpperCase() : 'HB'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {admin?.full_name || 'Administrator'}
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                Role: {admin?.role || 'admin'}
              </div>
            </div>
          </div>
        </div>

      </aside>

      {/* 2. SINO MOBILE NAVIGATION BAR (Visible on Mobile/Tablet < lg) */}
      <div className="w-full lg:hidden">
        <div className="overflow-x-auto flex space-x-1.5 scrollbar-none p-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs mb-3">
          {mainSections.map((sec) => {
            const Icon = sec.icon;
            const isActive = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => setActiveSection(sec.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  isActive
                    ? 'bg-[#0E7452] text-white shadow-md shadow-[#0E7452]/20'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{sec.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. MAIN CONTENT CONTAINER */}
      <main className="flex-1 min-w-0 w-full space-y-4 sm:space-y-6">
        
        {/* SECTION: EXECUTIVE DASHBOARD */}
        {activeSection === 'dashboard' && (
          <AdminDashboard
            dashboardData={dashboardData}
            dateRange={dateRange}
            setDateRange={setDateRange}
            customStart={customStart}
            setCustomStart={setCustomStart}
            customEnd={customEnd}
            setCustomEnd={setCustomEnd}
            onRefresh={onRefreshDashboard}
            admin={admin}
            batches={batches}
            rawMaterials={rawMaterials}
            finishedStock={finishedStock}
            users={users}
            expenses={expenses}
            onNavigateSection={(sec) => setActiveSection(sec)}
          />
        )}

        {/* SECTION: DAILY SALES MONITOR */}
        {activeSection === 'daily_sales' && (
          <DailySalesViewer
            admin={admin}
            products={products}
            finishedStock={finishedStock}
            branches={branches}
            users={users}
            onRefreshDashboard={onRefreshDashboard}
          />
        )}

        {/* SECTION: STOCK CONTROL CENTER */}
        {activeSection === 'stock_control' && (
          <StockControlCenter
            admin={admin}
            rawMaterials={rawMaterials}
            finishedStock={finishedStock}
            batches={batches}
            branches={branches}
            expenses={expenses}
            auditLogs={auditLogs}
            stockChecks={stockChecks}
            onAddMaterial={onAddMaterial}
            onUpdateMaterial={onUpdateMaterial}
            onDeleteMaterial={onDeleteMaterial}
            onAdjustStock={onAdjustStock}
            onAdjustFinishedStock={onAdjustFinishedStock}
            onApproveStockCheck={onApproveStockCheck}
          />
        )}

        {/* SECTION: EXPENSE CONTROL CENTER */}
        {activeSection === 'expenses' && (
          <ExpenseControlCenter
            admin={admin}
            expenses={expenses}
            fixedExpenses={fixedExpenses}
            branches={branches}
            users={users}
            onRefreshDashboard={onRefreshDashboard}
          />
        )}

        {/* SECTION: PRODUCTS & RECIPES */}
        {activeSection === 'products' && (
          <div className="space-y-4">
            {/* Segmented Sub-Tab Switcher in Harbuu Green */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center space-x-1.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-1 rounded-2xl w-fit shadow-xs">
                <button
                  type="button"
                  onClick={() => setProductSubTab('products')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    productSubTab === 'products' 
                      ? 'bg-[#0E7452] text-white shadow-xs' 
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {t('admin.breadTypesSubTab', '🍞 Bread Types & Selling Prices')}
                </button>
                <button
                  type="button"
                  onClick={() => setProductSubTab('batches')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    productSubTab === 'batches' 
                      ? 'bg-[#0E7452] text-white shadow-xs' 
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {t('admin.allBatchesSubTab', '🥖 All Production Batches')}
                </button>
              </div>

              {onSwitchRole && (
                <button
                  type="button"
                  onClick={() => onSwitchRole('baker')}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-emerald-50 hover:bg-emerald-100 text-[#0E7452] border border-[#0E7452]/30 shadow-2xs transition-all cursor-pointer flex items-center space-x-1.5"
                >
                  <Wheat className="w-3.5 h-3.5" />
                  <span>🥖 Open Live Baker Production Desk</span>
                </button>
              )}
            </div>

            {productSubTab === 'products' && (
              <ProductManager
                products={products}
                onAddProduct={onAddProduct}
                onUpdateProduct={onUpdateProduct}
                onDeleteProduct={onDeleteProduct}
              />
            )}

            {productSubTab === 'batches' && (
              <ProductionManager
                batches={batches}
                onCancelBatch={onCancelBatch}
                onEditBatch={onEditBatch}
                admin={admin}
              />
            )}
          </div>
        )}

        {/* SECTION: 13 DOWNLOADABLE FINANCIAL REPORTS */}
        {activeSection === 'reports' && (
          <ReportsCenter />
        )}

        {/* SECTION: SETTINGS, PAYROLL & USERS */}
        {activeSection === 'settings_staff' && (
          <div className="space-y-4">
            {/* Segmented Sub-Tab Switcher in Harbuu Green */}
            <div className="flex flex-wrap items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-1 rounded-2xl w-fit shadow-xs">
              <button
                type="button"
                onClick={() => setSettingsSubTab('fixed')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  settingsSubTab === 'fixed' 
                    ? 'bg-[#0E7452] text-white shadow-xs' 
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {t('admin.fixedExpensesSubTab', '🏢 Monthly Rents & Salaries')}
              </button>
              <button
                type="button"
                onClick={() => setSettingsSubTab('users')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  settingsSubTab === 'users' 
                    ? 'bg-[#0E7452] text-white shadow-xs' 
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {t('admin.usersSubTab', '👥 Employee Logins & Roles')}
              </button>
              <button
                type="button"
                onClick={() => setSettingsSubTab('suggestions')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  settingsSubTab === 'suggestions' 
                    ? 'bg-[#0E7452] text-white shadow-xs' 
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {t('admin.quickButtonsSubTab', '⚡ Quick Action Buttons')}
              </button>
              <button
                type="button"
                onClick={() => setSettingsSubTab('audit')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  settingsSubTab === 'audit' 
                    ? 'bg-[#0E7452] text-white shadow-xs' 
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {t('admin.auditLogsSubTab', '🛡️ Audit Logs')}
              </button>
            </div>

            {settingsSubTab === 'fixed' && (
              <FixedExpenseManager
                fixedExpenses={fixedExpenses}
                onAddFixedExpense={onAddFixedExpense}
                onUpdateFixedExpense={onUpdateFixedExpense}
                onDeleteFixedExpense={onDeleteFixedExpense}
                admin={admin}
              />
            )}

            {settingsSubTab === 'users' && (
              <UserManager
                users={users}
                branches={branches}
                admin={admin}
                onAddUser={onAddUser}
                onUpdateUser={onUpdateUser}
                onDeleteUser={onDeleteUser}
              />
            )}

            {settingsSubTab === 'suggestions' && (
              <SuggestionsConfigurator
                suggestions={suggestions}
                products={products}
                rawMaterials={rawMaterials}
                onAddSuggestion={onAddSuggestion}
                onUpdateSuggestion={onUpdateSuggestion}
                onDeleteSuggestion={onDeleteSuggestion}
              />
            )}

            {settingsSubTab === 'audit' && (
              <AuditLogViewer auditLogs={auditLogs} />
            )}
          </div>
        )}

      </main>

    </div>
  );
}
