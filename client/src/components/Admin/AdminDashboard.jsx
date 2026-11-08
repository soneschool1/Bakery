import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  Package, 
  Landmark, 
  Calendar, 
  Wheat, 
  ShoppingCart, 
  ArrowUpRight, 
  ArrowDownRight,
  ShieldCheck,
  Scale,
  Plus,
  CreditCard,
  CheckCircle2,
  Users,
  ChevronDown,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { api, setupSSE } from '../../services/api';
import { formatETB } from '../../utils/formatters';
import RevenueBarChart from './Charts/RevenueBarChart';
import ProfitAreaChart from './Charts/ProfitAreaChart';
import CategoryDonutChart from './Charts/CategoryDonutChart';
import ProductionComparisonChart from './Charts/ProductionComparisonChart';
import { useTranslation } from '../../i18n';

export default function AdminDashboard({ 
  dashboardData, 
  dateRange, 
  setDateRange, 
  customStart, 
  setCustomStart, 
  customEnd, 
  setCustomEnd, 
  onRefresh,
  admin,
  batches = [],
  rawMaterials = [],
  finishedStock = [],
  users = [],
  expenses = [],
  onNavigateSection
}) {
  const { t } = useTranslation();
  const kpis = dashboardData?.kpis || {};
  const ranges = [
    { id: 'today', label: t('common.today', 'Today') },
    { id: 'yesterday', label: t('common.yesterday', 'Yesterday') },
    { id: 'this_week', label: t('common.thisWeek', 'This Week') },
    { id: 'this_month', label: t('common.thisMonth', 'This Month') },
    { id: 'custom', label: t('common.custom', 'Custom') },
  ];

  const salesByProduct = dashboardData?.sales_by_product || {};
  const expensesByCategory = dashboardData?.expenses_by_category || {};
  const totalSalesRevenue = kpis.today_sales || 0;
  const adminName = admin?.full_name ? admin.full_name.split(' ')[0] : 'Administrator';

  // Live unified operational flow (Sales Inflows, Expense Outflows, and Bank Deposits)
  const [operationalFlow, setOperationalFlow] = useState([]);
  const [isFlowLoading, setIsFlowLoading] = useState(false);

  const fetchOperationalFlow = useCallback(async () => {
    setIsFlowLoading(true);
    try {
      const [salesRes, expensesRes, depositsRes, fixedPayRes] = await Promise.all([
        api.getSales().catch(() => []),
        api.getVariableExpenses().catch(() => []),
        api.getBankDeposits().catch(() => []),
        api.getFixedExpensePayments().catch(() => ({ items: [] }))
      ]);

      const items = [];

      // 1. Process Sales Inflows
      if (Array.isArray(salesRes)) {
        salesRes.forEach((s) => {
          const firstItem = s.items && s.items[0] ? s.items[0].product_name : 'Bakery Products';
          const extraCount = s.items && s.items.length > 1 ? ` +${s.items.length - 1} more` : '';
          const totalQty = s.items ? s.items.reduce((sum, itm) => sum + itm.quantity, 0) : 0;
          const timeStr = s.sale_time || (s.created_at ? new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '');
          items.push({
            id: 'sale-' + (s.id || s._id || s.receipt_number),
            name: `${firstItem}${extraCount}`,
            type: `${s.receipt_number || 'POS Sale'} (${totalQty} pcs • ${(s.payment_method || 'cash').toUpperCase()})`,
            date: s.sale_date,
            time: timeStr,
            timestamp: new Date(s.created_at || (s.sale_date + 'T' + (s.sale_time || '00:00:00'))).getTime(),
            amount: `+ ${formatETB(s.total_amount)}`,
            isIncome: true,
            status: s.status === 'edited' ? 'Edited' : t('common.completed', 'Completed'),
            iconBg: 'bg-emerald-50 text-[#0E7452]',
            icon: ShoppingCart,
          });
        });
      }

      // 2. Process Variable Expense Outflows
      if (Array.isArray(expensesRes)) {
        expensesRes.forEach((e) => {
          const timeStr = e.created_at ? new Date(e.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
          items.push({
            id: 'exp-' + (e.id || e._id),
            name: e.description || e.expense_category,
            type: `${e.expense_category || 'Operational Expense'} • ${(e.payment_method || 'cash').toUpperCase()}`,
            date: e.expense_date,
            time: timeStr,
            timestamp: new Date(e.created_at || (e.expense_date + 'T12:00:00')).getTime(),
            amount: `- ${formatETB(e.amount)}`,
            isIncome: false,
            status: e.status === 'edited' ? 'Edited' : t('common.completed', 'Completed'),
            iconBg: 'bg-rose-50 text-rose-600',
            icon: DollarSign,
          });
        });
      }

      // 3. Process Bank Deposits
      if (Array.isArray(depositsRes)) {
        depositsRes.forEach((d) => {
          const timeStr = d.created_at ? new Date(d.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
          items.push({
            id: 'dep-' + (d.id || d._id),
            name: d.bank_name || 'Bank Deposit',
            type: `Bank Cash Deposit${d.reference_number ? ` • Ref: ${d.reference_number}` : ''}`,
            date: d.deposit_date,
            time: timeStr,
            timestamp: new Date(d.created_at || (d.deposit_date + 'T12:00:00')).getTime(),
            amount: `+ ${formatETB(d.amount)}`,
            isIncome: true,
            status: t('common.completed', 'Completed'),
            iconBg: 'bg-teal-50 text-teal-700',
            icon: Landmark,
          });
        });
      }

      // 4. Process Fixed Expense Payments (Rent, Salaries, Contracts)
      if (fixedPayRes && Array.isArray(fixedPayRes.items)) {
        fixedPayRes.items.forEach((item) => {
          const p = item.payment;
          if (p && p.status === 'paid') {
            const timeStr = p.created_at ? new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
            items.push({
              id: 'fixed-' + (p.id || p._id || item.fixed_expense?.id),
              name: p.name || item.fixed_expense?.name || 'Fixed Overhead Payment',
              type: `Fixed Overhead (${p.period_month || 'Monthly'}) • ${(p.payment_method || 'bank').toUpperCase()}`,
              date: p.payment_date,
              time: timeStr,
              timestamp: new Date(p.created_at || (p.payment_date + 'T12:00:00')).getTime(),
              amount: `- ${formatETB(p.amount)}`,
              isIncome: false,
              status: t('common.completed', 'Completed'),
              iconBg: 'bg-amber-50 text-amber-700',
              icon: Landmark,
            });
          }
        });
      }

      // Sort newest first
      items.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      setOperationalFlow(items.slice(0, 5));
    } catch (err) {
      console.error('Failed to load operational flow:', err);
    } finally {
      setIsFlowLoading(false);
    }
  }, [t]);

  // Initial load and whenever dashboard data or refresh is triggered
  useEffect(() => {
    fetchOperationalFlow();
  }, [dashboardData, fetchOperationalFlow]);

  const fetchOperationalFlowRef = useRef(fetchOperationalFlow);
  useEffect(() => {
    fetchOperationalFlowRef.current = fetchOperationalFlow;
  }, [fetchOperationalFlow]);

  // Real-time SSE listener to immediately update Payment History whenever ANY transaction occurs
  useEffect(() => {
    const cleanup = setupSSE((event) => {
      if (
        event?.type === 'sale_created' ||
        event?.type === 'sale_updated' ||
        event?.type === 'sale_deleted' ||
        event?.type === 'expense_created' ||
        event?.type === 'expense_updated' ||
        event?.type === 'expense_deleted' ||
        event?.type === 'deposit_created' ||
        event?.type === 'fixed_expense_payment_updated'
      ) {
        if (fetchOperationalFlowRef.current) {
          fetchOperationalFlowRef.current();
        }
      }
    });
    return cleanup;
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* 1. HERO ROW: "Welcome Back, Sujon" style with date picker & action button */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pt-1">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
            {t('admin.welcomeBack', 'Welcome Back, {name}').replace('{name}', '')} <span className="text-[#0E7452]">{adminName}</span>
          </h1>
          <p className="text-xs text-gray-500 font-medium mt-0.5">
            {t('admin.operationsOverview', 'Harbuu Bakery Operations & Real-Time Executive Overview')}
          </p>
        </div>

        {/* Date Selector Pill & Action Button */}
        <div className="flex items-center flex-wrap gap-2 sm:gap-2.5 max-w-full">
          {/* Pill Date Range Filter */}
          <div className="overflow-x-auto max-w-full scrollbar-none flex items-center bg-white border border-gray-200/90 shadow-[0_2px_10px_rgba(0,0,0,0.02)] p-1 rounded-full text-xs font-semibold">
            {ranges.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setDateRange(r.id)}
                className={`px-3 sm:px-3.5 py-1.5 rounded-full transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  dateRange === r.id
                    ? 'bg-[#0E7452] text-white shadow-xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Primary Action Button matching reference "+ Add New Wallet" */}
          <button
            type="button"
            onClick={() => onNavigateSection && onNavigateSection('stock_control')}
            className="flex items-center space-x-1.5 bg-[#0E7452] hover:bg-[#0A573D] text-white px-4 py-2 rounded-full text-xs font-bold shadow-xs hover:scale-102 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t('admin.manageStockBtn', 'Manage Stock')}</span>
          </button>
        </div>
      </div>

      {/* Custom Date Inputs if selected */}
      {dateRange === 'custom' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2 text-xs font-bold text-gray-700">
            <Calendar className="w-4 h-4 text-[#0E7452]" />
            <span>{t('admin.selectDateRange', 'Select Date Range:')}</span>
          </div>
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="text-xs bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 font-bold"
          />
          <span className="text-xs text-gray-400 font-bold">to</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="text-xs bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 font-bold"
          />
          <button
            onClick={onRefresh}
            className="bg-[#0E7452] text-white font-bold text-xs px-4 py-1.5 rounded-full shadow-xs cursor-pointer"
          >
            {t('admin.applyRange', 'Apply Range')}
          </button>
        </div>
      )}

      {/* 2. MAIN 3-COLUMN FINTECH DASHBOARD GRID (matching reference layout!) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* COLUMN 1: LEFT (approx 4 cols) - VISA Card, Weekly Revenue, Payment History */}
        <div className="lg:col-span-4 flex flex-col space-y-6">
          
          {/* Card 1A: Forest Green VISA-Style Treasury Card matching the reference */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0E7452] via-[#0C6A4B] to-[#074D35] text-white p-6 shadow-[0_10px_30px_rgba(14,116,82,0.25)] flex flex-col justify-between min-h-[190px]">
            {/* Top row: Brand & Waves */}
            <div className="flex items-center justify-between">
              <span className="font-extrabold tracking-wider text-sm text-emerald-100">
                {t('admin.harbuuVaultTitle', 'HARBUU VAULT')}
              </span>
              <div className="flex items-center space-x-1 text-emerald-200" title="Contactless Active">
                <span className="text-sm font-mono tracking-tighter">·)))</span>
              </div>
            </div>

            {/* Middle: Big Balance */}
            <div className="my-2">
              <p className="text-[11px] font-medium text-emerald-200/90 tracking-wide uppercase">
                {t('admin.cashOnHandTitle', 'Estimated Cash On Hand')}
              </p>
              <div className="text-3xl font-extrabold tracking-tight text-white mt-1">
                {formatETB(kpis.cash_on_hand ?? 0)}
              </div>
            </div>

            {/* Bottom Row: Masked Number & Expiry */}
            <div className="flex items-center justify-between text-xs font-mono text-emerald-100/90 pt-2 border-t border-emerald-600/50">
              <span>**** 9090</span>
              <span className="text-[11px] font-bold text-emerald-200">EXP 09/26</span>
            </div>

            {/* Decorative background circle */}
            <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />
          </div>

          {/* Card 1B: Sales Revenue Mini-Widget with 1-Click Link to Daily Sales */}
          <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-[0_4px_24px_rgba(0,0,0,0.03)] flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-400">{t('admin.todaysSalesRevenue', "Today's Sales Revenue")}</p>
              <div className="text-2xl font-black text-gray-900 tracking-tight mt-0.5">
                {formatETB(kpis.today_sales ?? 0)}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigateSection && onNavigateSection('daily_sales')}
              className="flex items-center space-x-1 bg-[#0E7452] hover:bg-[#0c6446] text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-xs cursor-pointer transition-all active:scale-95"
              title="Open Daily Sales Monitor"
            >
              <span>{t('admin.dailySalesLink', 'Daily Sales')}</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Card 1C: Payment / Operations History Table matching reference */}
          <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-[0_4px_24px_rgba(0,0,0,0.03)] flex-1 flex flex-col justify-between">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-gray-900 text-sm tracking-tight">{t('admin.paymentHistoryTitle', 'Payment History')}</h3>
                <p className="text-[11px] text-gray-400 font-medium">{t('admin.paymentHistorySubtitle', 'Recent operational flow')}</p>
              </div>
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={fetchOperationalFlow}
                  className="w-8 h-8 rounded-xl bg-gray-50 hover:bg-[#E8F6F2] text-gray-400 hover:text-[#0E7452] flex items-center justify-center transition-colors cursor-pointer"
                  title="Refresh Operational Flow"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isFlowLoading ? 'animate-spin text-[#0E7452]' : ''}`} />
                </button>
                <button 
                  type="button"
                  onClick={() => onNavigateSection && onNavigateSection('daily_sales')}
                  className="w-8 h-8 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-gray-700 flex items-center justify-center transition-colors cursor-pointer"
                  title="View All Daily Sales"
                >
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {operationalFlow.length === 0 ? (
              <div className="py-6 text-center text-xs text-gray-400 font-medium">
                {t('admin.noRecentOperationsYet', 'No recent operational payments recorded yet.')}
              </div>
            ) : (
              <div className="divide-y divide-gray-50 mt-2 space-y-2">
                {operationalFlow.map((op) => {
                  const IconComponent = op.icon;
                  return (
                    <div key={op.id} className="pt-2 flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2.5">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold shrink-0 ${op.iconBg}`}>
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 pr-2">
                          <div className="font-bold text-gray-900 truncate">{op.name}</div>
                          <div className="text-[10px] text-gray-400 truncate">
                            {op.date} {op.time ? `• ${op.time}` : ''} • {op.type}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className={`font-bold font-mono ${op.isIncome ? 'text-[#0E7452]' : 'text-rose-600'}`}>
                          {op.amount}
                        </div>
                        <div className="text-[10px] font-semibold text-gray-400 flex items-center justify-end space-x-1">
                          <span className={`w-1.5 h-1.5 rounded-full ${op.isIncome ? 'bg-[#0E7452]' : 'bg-rose-500'}`}></span>
                          <span>{op.status}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* COLUMN 2: CENTER (approx 5 cols) - Revenue vs Expenses & Net Profit Bar Chart */}
        <div className="lg:col-span-5 flex flex-col">
          <RevenueBarChart 
            dailySalesMap={dashboardData?.daily_sales_map}
            dailyProfitMap={dashboardData?.daily_profit_map}
            dailyCogsMap={dashboardData?.daily_cogs_map}
            dailyExpensesMap={dashboardData?.daily_expenses_map}
            monthlySalesMap={dashboardData?.monthly_sales_map}
            monthlyCogsMap={dashboardData?.monthly_cogs_map}
            monthlyExpensesMap={dashboardData?.monthly_expenses_map}
            kpis={kpis}
            batches={batches}
          />
        </div>

        {/* COLUMN 3: RIGHT (approx 3 cols) - Balance Wave Area Chart, Credit/Exp, Staff */}
        <div className="lg:col-span-3 flex flex-col space-y-6">
          
          {/* Card 3A: Profit Area Chart with smooth wave & Send/Receive action pills */}
          <ProfitAreaChart 
            kpis={kpis}
            dailySalesMap={dashboardData?.daily_sales_map || {}}
            dailyProfitMap={dashboardData?.daily_profit_map || {}}
            dailyExpensesMap={dashboardData?.daily_expenses_map || {}}
            dailyNetProfitMap={dashboardData?.daily_net_profit_map || {}}
            onRecordDeposit={() => onNavigateSection && onNavigateSection('stock_control')}
            onViewClosings={() => onNavigateSection && onNavigateSection('reports')}
          />

          {/* Card 3B: Amount of Credit / Operating Expenses */}
          <div 
            onClick={() => onNavigateSection && onNavigateSection('expenses')}
            className="bg-white rounded-3xl border border-gray-100 p-5 shadow-[0_4px_24px_rgba(0,0,0,0.03)] cursor-pointer hover:border-[#0E7452]/30 transition-all"
            title="Open Expense Control Center"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-400">{t('admin.operatingExpenses', 'Operating Expenses')}</p>
                <div className="text-2xl font-black text-gray-900 tracking-tight mt-0.5">
                  {formatETB(kpis.today_expenses ?? 0)}
                </div>
              </div>
              <div className="flex items-center space-x-1 bg-[#0E7452] text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-xs">
                <span>Expenses</span>
              </div>
            </div>
            <p className="text-[11px] text-gray-400 font-medium mt-1">{t('admin.operatingExpensesDesc', 'Staff meals, deliveries, fixed rents & utilities')}</p>
          </div>

          {/* Card 3C: Mandatory Payments & Staff Team Avatars matching reference */}
          <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-[0_4px_24px_rgba(0,0,0,0.03)]">
            <div className="flex items-center justify-between pb-3">
              <div>
                <h3 className="font-bold text-gray-900 text-sm tracking-tight">{t('admin.activeTeam', 'Active Bakery Team')}</h3>
                <p className="text-[11px] text-gray-400 font-medium">{t('admin.activeTeamDesc', 'Bakers & sales shift')}</p>
              </div>
              <button 
                type="button"
                onClick={() => onNavigateSection && onNavigateSection('settings_staff')}
                className="w-7 h-7 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-gray-700 flex items-center justify-center transition-colors"
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Avatar Stack */}
            <div className="flex items-center space-x-2 pt-1">
              <div className="flex -space-x-2 overflow-hidden">
                <div className="inline-block h-9 w-9 rounded-full ring-2 ring-white bg-[#0E7452] text-white flex items-center justify-center text-xs font-bold" title="Dawit Alemu (Head Baker)">
                  DA
                </div>
                <div className="inline-block h-9 w-9 rounded-full ring-2 ring-white bg-amber-600 text-white flex items-center justify-center text-xs font-bold" title="Tigist Haile (Cashier)">
                  TH
                </div>
                <div className="inline-block h-9 w-9 rounded-full ring-2 ring-white bg-teal-700 text-white flex items-center justify-center text-xs font-bold" title="Abebe Kebede (Manager)">
                  AK
                </div>
                <div className="inline-block h-9 w-9 rounded-full ring-2 ring-white bg-gray-200 text-gray-700 flex items-center justify-center text-xs font-bold" title="Kenenisa (Assistant)">
                  +2
                </div>
              </div>
              <span className="text-xs font-semibold text-gray-500 pl-2">
                {t('admin.onDuty', '{count} On Duty').replace('{count}', 4)}
              </span>
            </div>
          </div>

        </div>

      </div>

      {/* 3. SECOND ROW OF ADMIN GRAPHS: Product Category Mix & Production vs Sales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
        
        {/* Graph A: Product Sales Mix Donut Chart */}
        <CategoryDonutChart salesByProduct={salesByProduct} />

        {/* Graph B: Production vs Sales Comparison Chart */}
        <ProductionComparisonChart 
          totalPiecesProduced={dashboardData?.total_pieces_produced || 0}
          totalItemsSold={dashboardData?.total_items_sold || 0}
          finishedStockPieces={kpis.available_finished_pieces || 0}
        />

      </div>

      {/* 4. THIRD ROW: 100 kg Flour Milestone & Raw Material Stock Reserves */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
        
        {/* Flour Quintal Tracker Card */}
        <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-[#E8F6F2] text-[#0E7452] flex items-center justify-center font-bold">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-sm tracking-tight">{t('admin.flourMilestoneTitle', '1 Quintal Flour Tracker')}</h3>
                <p className="text-[11px] text-gray-400 font-medium">{t('admin.flourMilestoneDesc', 'Automatic deposit milestone')}</p>
              </div>
            </div>
            <span className="text-xs font-bold text-[#0E7452] bg-[#E8F6F2] px-2.5 py-1 rounded-full">
              {kpis.flour_cumulative_kg ?? 0} / {kpis.flour_threshold_kg ?? 100} kg
            </span>
          </div>

          <div className="my-4">
            <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#0E7452] rounded-full transition-all duration-700" 
                style={{ width: `${Math.min(100, Math.round(((kpis.flour_cumulative_kg || 0) / (kpis.flour_threshold_kg || 100)) * 100))}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 font-medium mt-2">
              {kpis.deposit_reminder_active ? (
                <span className="text-rose-600 font-bold">{t('admin.flourTargetReached', '⚠️ 100 kg milestone reached! Bank deposit reminder active for Cashier.')}</span>
              ) : (
                <span>{t('admin.flourNextTrigger', 'Next deposit alert triggers at 100 kg milestone.')}</span>
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={() => onNavigateSection && onNavigateSection('stock_control')}
            className="w-full py-2 px-4 rounded-xl bg-gray-50 hover:bg-[#E8F6F2] text-[#0E7452] text-xs font-bold transition-all text-center cursor-pointer"
          >
            {t('admin.reviewFlourLogs', 'Review Production Flour Logs →')}
          </button>
        </div>

        {/* Raw Material Inventory Value Card */}
        <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-[#E8F6F2] text-[#0E7452] flex items-center justify-center font-bold">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-sm tracking-tight">{t('admin.rawMaterialsValue', 'Raw Materials Value')}</h3>
                <p className="text-[11px] text-gray-400 font-medium">{t('admin.rawMaterialsValueDesc', 'Flour, yeast, sugar, spices in stock')}</p>
              </div>
            </div>
          </div>

          <div className="my-3">
            <div className="text-2xl font-black text-gray-900 tracking-tight">
              {formatETB(kpis.raw_material_stock_value ?? 0)}
            </div>
            <p className="text-xs text-emerald-700 font-bold mt-1">
              {t('admin.rawMaterialsBuffer', '✓ Sufficient buffer for next 14 production batches')}
            </p>
          </div>

          <button
            type="button"
            onClick={() => onNavigateSection && onNavigateSection('stock_control')}
            className="w-full py-2 px-4 rounded-xl bg-gray-50 hover:bg-[#E8F6F2] text-[#0E7452] text-xs font-bold transition-all text-center cursor-pointer"
          >
            {t('admin.adjustRawStockBtn', 'Adjust Raw Materials Stock →')}
          </button>
        </div>

        {/* Total Bank Deposits Card */}
        <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-[#E8F6F2] text-[#0E7452] flex items-center justify-center font-bold">
                <Landmark className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-sm tracking-tight">{t('admin.bankDepositsTitle', 'Total Bank Deposits')}</h3>
                <p className="text-[11px] text-gray-400 font-medium">{t('admin.bankDepositsDesc', 'Deposited to CBE / Telebirr')}</p>
              </div>
            </div>
          </div>

          <div className="my-3">
            <div className="text-2xl font-black text-gray-900 tracking-tight">
              {formatETB(kpis.total_bank_deposits ?? 0)}
            </div>
            <p className="text-xs text-gray-500 font-medium mt-1">
              {t('admin.bankDepositsNote', 'Confirmed bakery bank slips & reconciliation')}
            </p>
          </div>

          <button
            type="button"
            onClick={() => onNavigateSection && onNavigateSection('reports')}
            className="w-full py-2 px-4 rounded-xl bg-gray-50 hover:bg-[#E8F6F2] text-[#0E7452] text-xs font-bold transition-all text-center cursor-pointer"
          >
            {t('admin.viewBankSlipsBtn', 'View Bank Deposit Slips →')}
          </button>
        </div>

      </div>

    </div>
  );
}