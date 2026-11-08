import React, { useState } from 'react';
import { 
  Store, 
  ShoppingCart, 
  Truck, 
  Calculator, 
  Landmark, 
  Receipt, 
  ClipboardCheck, 
  CheckCircle2,
  DollarSign
} from 'lucide-react';
import POSView from './POSView';
import BranchTransferForm from './BranchTransferForm';
import DailyReconciliationForm from './DailyReconciliationForm';
import BankDepositForm from './BankDepositForm';
import ExpenseEntryForm from './ExpenseEntryForm';
import WeeklyStockCheckForm from './WeeklyStockCheckForm';
import StockRechargeForm from './StockRechargeForm';
import { useTranslation } from '../../i18n';

export default function CashierDashboard({ 
  cashier = {}, 
  products = [], 
  finishedStock = [], 
  branches = [], 
  rawMaterials = [], 
  transfers = [], 
  closings = [], 
  closingSummary = null, 
  deposits = [], 
  expenses = [], 
  flourTracker = null, 
  suggestions = [], 
  stockChecks = [],
  onCompleteSale, 
  onSendTransfer, 
  onReceiveTransfer, 
  onSubmitClosing, 
  onReviewClosing, 
  onRecordDeposit, 
  onAddExpense, 
  onSubmitStockCheck, 
  onApproveStockCheck, 
  onCreateBranch,
  onUpdateBranch,
  onCreateProduct,
  onUpdateProduct,
  onAddMaterial,
  isSubmitting = false 
}) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('pos'); // 'pos', 'recharge', 'transfers', 'expenses', 'closing', 'deposits', 'stock_check'

  const safeMaterials = Array.isArray(rawMaterials) ? rawMaterials : [];
  const lowStockCount = safeMaterials.filter(m => m.current_quantity <= m.minimum_stock).length;

  const cashierTabs = [
    { id: 'pos', label: `🛒 ${t('cashier.newSale', 'Sell Bread')}`, desc: t('cashier.newSaleDesc', 'Customer sales from baker stock') },
    { 
      id: 'recharge', 
      label: `📥 ${t('cashier.rechargeStock', 'Recharge Stock')}${lowStockCount > 0 ? ` ${t('cashier.lowStockLabel', '({count} Low)').replace('{count}', lowStockCount)}` : ''}`, 
      desc: t('cashier.rechargeStockDesc', 'Restock flour & ingredients'),
      isUrgent: lowStockCount > 0
    },
    { id: 'transfers', label: `🚚 ${t('cashier.branchTransfers', 'Send to Branch')}`, desc: t('cashier.branchTransfersDesc', 'Transfer bread & driver app') },
    { id: 'expenses', label: `💸 ${t('cashier.variableExpenses', 'Variable Expenses')}`, desc: t('cashier.variableExpensesDesc', 'Food, transport & other') },
    { id: 'closing', label: `💰 ${t('cashier.dailyClosing', 'Daily Cash Count')}`, desc: t('cashier.dailyClosingDesc', 'Expected vs counted cash') },
    { id: 'deposits', label: `🏦 ${t('cashier.bankDeposit', 'Bank Deposits')}`, desc: t('cashier.bankDepositDesc', 'Record bank deposit slips') },
    { id: 'stock_check', label: `📋 ${t('cashier.weeklyCheck', 'Weekly Check')}`, desc: t('cashier.weeklyCheckDesc', 'Store physical count') },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Low Stock Alert Header for Cashier if any ingredients are running low */}
      {lowStockCount > 0 && activeTab !== 'recharge' && (
        <div className="bg-amber-50 border-2 border-amber-400 text-amber-950 rounded-3xl p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-amber-800">
                {t('cashier.storeRunningLow', 'Store Ingredients Running Low!')}
              </div>
              <div className="text-sm font-extrabold text-stone-900 mt-0.5">
                {t('cashier.storeRunningLowDesc', '{count} ingredient(s) are below minimum store levels. As cashier, please recharge bakery stock.').replace('{count}', lowStockCount)}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('recharge')}
            className="bg-[#064e3b] hover:bg-emerald-900 text-white font-black text-xs px-4 py-2.5 rounded-xl shadow-xs transition-all shrink-0 cursor-pointer flex items-center space-x-1"
          >
            <span>{t('cashier.openRechargeStation', '📥 Open Stock Recharge Station')}</span>
          </button>
        </div>
      )}

      {/* Cashier Navigation Tabs in Dark Green Theme (Swipeable horizontal tabs on mobile) */}
      <div className="bg-white rounded-3xl border border-stone-200 p-2 sm:p-2.5 shadow-xs">
        <div className="overflow-x-auto flex sm:grid sm:grid-cols-4 lg:grid-cols-7 gap-1.5 sm:gap-2 scrollbar-none pb-1 sm:pb-0">
          {cashierTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 w-36 sm:w-auto p-2.5 sm:p-3 rounded-2xl text-center transition-all cursor-pointer relative ${
                activeTab === tab.id
                  ? 'bg-[#064e3b] text-white shadow-md shadow-emerald-950/25 scale-[1.02] font-black ring-2 ring-emerald-500'
                  : tab.isUrgent
                  ? 'bg-amber-50 text-amber-900 hover:bg-amber-100 font-black border border-amber-300'
                  : 'bg-stone-50 text-stone-700 hover:bg-stone-100 font-bold'
              }`}
            >
              <div className="text-xs font-black truncate">{tab.label}</div>
              <div className={`text-[10px] mt-0.5 truncate ${activeTab === tab.id ? 'text-emerald-200 font-semibold' : 'text-stone-400'}`}>
                {tab.desc}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'pos' && (
        <POSView
          finishedStock={finishedStock}
          products={products}
          suggestions={suggestions}
          cashier={cashier}
          branches={branches}
          onCompleteSale={onCompleteSale}
          isSubmitting={isSubmitting}
        />
      )}

      {activeTab === 'recharge' && (
        <StockRechargeForm
          rawMaterials={rawMaterials}
          expenses={expenses}
          cashier={cashier}
          onAddExpense={onAddExpense}
          onAddMaterial={onAddMaterial}
          isSubmitting={isSubmitting}
        />
      )}

      {activeTab === 'transfers' && (
        <BranchTransferForm
          branches={branches}
          products={products}
          finishedStock={finishedStock}
          cashier={cashier}
          transfers={transfers}
          onSendTransfer={onSendTransfer}
          onReceiveTransfer={onReceiveTransfer}
          onCreateBranch={onCreateBranch}
          onUpdateBranch={onUpdateBranch}
          onCreateProduct={onCreateProduct}
          onUpdateProduct={onUpdateProduct}
          isSubmitting={isSubmitting}
        />
      )}

      {activeTab === 'expenses' && (
        <ExpenseEntryForm
          rawMaterials={rawMaterials}
          expenses={expenses}
          cashier={cashier}
          suggestions={suggestions}
          onAddExpense={onAddExpense}
          isSubmitting={isSubmitting}
        />
      )}

      {activeTab === 'closing' && (
        <DailyReconciliationForm
          summary={closingSummary}
          cashier={cashier}
          closings={closings}
          onSubmitClosing={onSubmitClosing}
          onReviewClosing={onReviewClosing}
          isSubmitting={isSubmitting}
        />
      )}

      {activeTab === 'deposits' && (
        <BankDepositForm
          deposits={deposits}
          flourTracker={flourTracker}
          cashier={cashier}
          onRecordDeposit={onRecordDeposit}
          isSubmitting={isSubmitting}
        />
      )}

      {activeTab === 'stock_check' && (
        <WeeklyStockCheckForm
          rawMaterials={rawMaterials}
          stockChecks={stockChecks}
          cashier={cashier}
          onSubmitCheck={onSubmitStockCheck}
          onApproveCheck={onApproveStockCheck}
          isSubmitting={isSubmitting}
        />
      )}

    </div>
  );
}
