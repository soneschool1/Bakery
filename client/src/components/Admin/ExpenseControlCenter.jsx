import React, { useState, useEffect, useMemo } from 'react';
import { 
  DollarSign, 
  Landmark, 
  Calendar, 
  Search, 
  Filter, 
  Plus, 
  Pencil, 
  Trash2, 
  Download, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  TrendingDown, 
  Banknote, 
  Smartphone, 
  CreditCard, 
  Tag, 
  FileText, 
  X, 
  History, 
  AlertTriangle, 
  PieChart, 
  BarChart2,
  Users,
  Building
} from 'lucide-react';
import { api } from '../../services/api';
import { formatETB } from '../../utils/formatters';
import { exportToExcel } from '../../utils/exportReports';
import { useTranslation } from '../../i18n';

export default function ExpenseControlCenter({ 
  admin, 
  expenses = [], 
  fixedExpenses = [], 
  branches = [], 
  users = [],
  onRefreshDashboard 
}) {
  const { t } = useTranslation();
  const todayStr = new Date().toISOString().slice(0, 10);
  const currentMonthStr = new Date().toISOString().slice(0, 7);

  // Active top-level subtab
  const [activeTab, setActiveTab] = useState('variable'); // 'variable', 'fixed', 'analytics'

  // Variable Expenses Filter States
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [isAllDates, setIsAllDates] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [variableList, setVariableList] = useState(expenses);
  const [isLoading, setIsLoading] = useState(false);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [deletingExpense, setDeletingExpense] = useState(null);
  const [viewingAuditExpense, setViewingAuditExpense] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState('');

  // Fixed Expenses State
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [monthStatuses, setMonthStatuses] = useState([]);
  const [fixedList, setFixedList] = useState(fixedExpenses);
  const [showAddFixedModal, setShowAddFixedModal] = useState(false);
  const [editingFixedExpense, setEditingFixedExpense] = useState(null);

  // Load variable expenses from API
  async function loadVariableExpenses() {
    setIsLoading(true);
    try {
      let params = '';
      if (!isAllDates && selectedDate) {
        params = `date=${selectedDate}`;
      }
      const data = await api.getVariableExpenses(params);
      setVariableList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load variable expenses:', err);
    } finally {
      setIsLoading(false);
    }
  }

  // Load fixed expense payment statuses for selected month
  async function loadMonthStatuses() {
    try {
      const res = await api.getFixedExpensePayments(selectedMonth);
      setMonthStatuses(res.items || []);
    } catch (err) {
      console.error('Failed to load fixed expense payments:', err);
    }
  }

  // Reload fixed list
  async function loadFixedExpenses() {
    try {
      const data = await api.getFixedExpenses();
      setFixedList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load fixed expenses:', err);
    }
  }

  useEffect(() => {
    loadVariableExpenses();
  }, [selectedDate, isAllDates]);

  useEffect(() => {
    loadMonthStatuses();
    loadFixedExpenses();
  }, [selectedMonth]);

  // Standard bakery expense categories
  const expenseCategories = [
    { id: 'Staff Meals & Food', label: 'Staff Meals & Tea', icon: '🍲' },
    { id: 'Transportation & Bajaj', label: 'Transportation & Bajaj', icon: '🛺' },
    { id: 'Bakery Maintenance', label: 'Bakery Maintenance & Repairs', icon: '🔧' },
    { id: 'Cleaning Supplies', label: 'Cleaning & Sanitation', icon: '🧹' },
    { id: 'Packaging & Bags', label: 'Packaging & Plastic Bags', icon: '🛍️' },
    { id: 'Fuel & Energy', label: 'Firewood, Fuel & Electricity', icon: '⚡' },
    { id: 'Raw Material Restock', label: 'Flour & Raw Material Restock', icon: '🌾' },
    { id: 'Office & Miscellaneous', label: 'Office & Miscellaneous', icon: '📦' },
  ];

  // Filtered variable expenses
  const filteredVariableExpenses = useMemo(() => {
    return variableList.filter((exp) => {
      // Payment filter
      if (paymentFilter !== 'all' && exp.payment_method !== paymentFilter) {
        return false;
      }
      // Category filter
      if (categoryFilter !== 'all' && exp.expense_category !== categoryFilter) {
        return false;
      }
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesDesc = exp.description?.toLowerCase().includes(q);
        const matchesCat = exp.expense_category?.toLowerCase().includes(q);
        const matchesUser = exp.recorded_by_name?.toLowerCase().includes(q);
        const matchesRemarks = exp.remarks?.toLowerCase().includes(q);
        if (!matchesDesc && !matchesCat && !matchesUser && !matchesRemarks) {
          return false;
        }
      }
      return true;
    });
  }, [variableList, paymentFilter, categoryFilter, searchQuery]);

  // Totals for filtered variable expenses
  const totalVariableAmount = useMemo(() => {
    return filteredVariableExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  }, [filteredVariableExpenses]);

  const cashExpensesAmount = useMemo(() => {
    return filteredVariableExpenses
      .filter(e => e.payment_method === 'cash')
      .reduce((sum, e) => sum + (e.amount || 0), 0);
  }, [filteredVariableExpenses]);

  const bankTelebirrAmount = useMemo(() => {
    return filteredVariableExpenses
      .filter(e => e.payment_method !== 'cash')
      .reduce((sum, e) => sum + (e.amount || 0), 0);
  }, [filteredVariableExpenses]);

  // Fixed monthly commitments
  const totalMonthlyCommitment = useMemo(() => {
    return fixedList.reduce((sum, f) => sum + (f.monthly_amount || 0), 0);
  }, [fixedList]);

  const paidMonthlyAmount = useMemo(() => {
    return monthStatuses
      .filter(m => m.status === 'paid')
      .reduce((sum, m) => sum + (m.fixed_expense?.monthly_amount || 0), 0);
  }, [monthStatuses]);

  const pendingMonthlyAmount = totalMonthlyCommitment - paidMonthlyAmount;

  // Category breakdown for analytics
  const categoryBreakdown = useMemo(() => {
    const map = {};
    variableList.forEach(e => {
      const cat = e.expense_category || 'Other';
      if (!map[cat]) {
        map[cat] = { category: cat, total: 0, count: 0 };
      }
      map[cat].total += e.amount || 0;
      map[cat].count += 1;
    });
    const grandTotal = Object.values(map).reduce((s, c) => s + c.total, 0) || 1;
    return Object.values(map)
      .map(c => ({
        ...c,
        percentage: ((c.total / grandTotal) * 100).toFixed(1)
      }))
      .sort((a, b) => b.total - a.total);
  }, [variableList]);

  // Excel Export
  function handleExportExcel() {
    if (filteredVariableExpenses.length === 0) {
      alert('No expense records to export.');
      return;
    }
    const columns = [
      { header: 'Date', key: 'expense_date' },
      { header: 'Category', key: 'expense_category' },
      { header: 'Description', key: 'description' },
      { header: 'Payment Method', key: 'payment_method' },
      { header: 'Amount (ETB)', key: 'amount' },
      { header: 'Recorded By', key: 'recorded_by_name' },
      { header: 'Remarks', key: 'remarks' },
    ];
    const rows = filteredVariableExpenses.map(e => ({
      expense_date: e.expense_date,
      expense_category: e.expense_category,
      description: e.description,
      payment_method: (e.payment_method || 'cash').toUpperCase(),
      amount: e.amount || 0,
      recorded_by_name: e.recorded_by_name || 'Staff',
      remarks: e.remarks || '',
    }));
    exportToExcel(`Harbuu_Expenses_${selectedDate}`, columns, rows, 'Operating_Expenses');
  }

  // ==========================================
  // ADD VARIABLE EXPENSE
  // ==========================================
  const [addForm, setAddForm] = useState({
    expense_date: todayStr,
    expense_category: 'Staff Meals & Food',
    description: '',
    amount: '',
    payment_method: 'cash',
    remarks: '',
  });

  function openAddModal() {
    setAddForm({
      expense_date: selectedDate || todayStr,
      expense_category: 'Staff Meals & Food',
      description: '',
      amount: '',
      payment_method: 'cash',
      remarks: '',
    });
    setActionError('');
    setShowAddModal(true);
  }

  async function handleAddSubmit(e) {
    e.preventDefault();
    setActionError('');

    const parsedAmount = parseFloat(addForm.amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setActionError('Please enter a valid expense amount greater than 0.');
      return;
    }
    if (!addForm.description.trim()) {
      setActionError('Please enter a brief description for this expense.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        expense_date: addForm.expense_date,
        expense_category: addForm.expense_category,
        description: addForm.description.trim(),
        amount: parsedAmount,
        payment_method: addForm.payment_method,
        remarks: addForm.remarks.trim(),
        recorded_by_id: admin?.id || admin?.username || 'admin',
        recorded_by_name: admin?.full_name || admin?.username || 'Admin',
      };
      await api.createVariableExpense(payload);
      setShowAddModal(false);
      await loadVariableExpenses();
      if (onRefreshDashboard) onRefreshDashboard();
    } catch (err) {
      console.error('Failed to create expense:', err);
      setActionError(err.message || 'Failed to record expense.');
    } finally {
      setIsSubmitting(false);
    }
  }

  // ==========================================
  // EDIT VARIABLE EXPENSE
  // ==========================================
  const [editForm, setEditForm] = useState({
    expense_date: '',
    expense_category: '',
    description: '',
    amount: '',
    payment_method: 'cash',
    remarks: '',
    reason: '',
  });

  function openEditModal(exp) {
    setEditingExpense(exp);
    setEditForm({
      expense_date: exp.expense_date || todayStr,
      expense_category: exp.expense_category || 'Staff Meals & Food',
      description: exp.description || '',
      amount: exp.amount ? String(exp.amount) : '',
      payment_method: exp.payment_method || 'cash',
      remarks: exp.remarks || '',
      reason: '',
    });
    setActionError('');
  }

  async function handleEditSubmit(e) {
    e.preventDefault();
    setActionError('');

    const parsedAmount = parseFloat(editForm.amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setActionError('Please enter a valid expense amount.');
      return;
    }
    if (!editForm.description.trim()) {
      setActionError('Description is required.');
      return;
    }
    if (!editForm.reason || editForm.reason.trim().length < 3) {
      setActionError('Please provide a mandatory reason for modifying this expense.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        expense_date: editForm.expense_date,
        expense_category: editForm.expense_category,
        description: editForm.description.trim(),
        amount: parsedAmount,
        payment_method: editForm.payment_method,
        remarks: editForm.remarks.trim(),
        reason: editForm.reason.trim(),
        admin_name: admin?.full_name || admin?.username || 'Admin',
      };
      await api.updateVariableExpense(editingExpense.id, payload);
      setEditingExpense(null);
      await loadVariableExpenses();
      if (onRefreshDashboard) onRefreshDashboard();
    } catch (err) {
      console.error('Failed to update expense:', err);
      setActionError(err.message || 'Failed to update expense.');
    } finally {
      setIsSubmitting(false);
    }
  }

  // ==========================================
  // DELETE VARIABLE EXPENSE
  // ==========================================
  const [deleteReason, setDeleteReason] = useState('');

  function openDeleteModal(exp) {
    setDeletingExpense(exp);
    setDeleteReason('');
    setActionError('');
  }

  async function handleDeleteSubmit(e) {
    e.preventDefault();
    setActionError('');

    if (!deleteReason || deleteReason.trim().length < 3) {
      setActionError('Please provide a mandatory reason for deleting this expense.');
      return;
    }

    setIsSubmitting(true);
    try {
      const adminName = admin?.full_name || admin?.username || 'Admin';
      const params = `reason=${encodeURIComponent(deleteReason.trim())}&admin_name=${encodeURIComponent(adminName)}`;
      await api.deleteVariableExpense(deletingExpense.id, params);
      setDeletingExpense(null);
      await loadVariableExpenses();
      if (onRefreshDashboard) onRefreshDashboard();
    } catch (err) {
      console.error('Failed to delete expense:', err);
      setActionError(err.message || 'Failed to delete expense.');
    } finally {
      setIsSubmitting(false);
    }
  }

  // ==========================================
  // FIXED EXPENSES TOGGLE & ACTIONS
  // ==========================================
  async function toggleFixedStatus(item) {
    const newStatus = item.status === 'paid' ? 'unpaid' : 'paid';
    try {
      await api.recordFixedExpensePayment({
        fixed_expense_id: item.fixed_expense.id,
        period_month: selectedMonth,
        amount: item.fixed_expense.monthly_amount,
        status: newStatus,
        payment_method: 'bank',
        paid_by: admin?.full_name || 'Admin',
        reference: `MTH-${selectedMonth}`,
        remarks: `Marked ${newStatus} by admin`,
      });
      await loadMonthStatuses();
      if (onRefreshDashboard) onRefreshDashboard();
    } catch (err) {
      alert(`Error updating fixed payment: ${err.message}`);
    }
  }

  // Add Fixed Expense Form
  const [newFixedName, setNewFixedName] = useState('');
  const [newFixedAmount, setNewFixedAmount] = useState('');
  const [newFixedDueDay, setNewFixedDueDay] = useState('1');

  async function handleAddFixedSubmit(e) {
    e.preventDefault();
    if (!newFixedName || !newFixedAmount) return;

    try {
      await api.createFixedExpense({
        name: newFixedName.trim(),
        monthly_amount: parseFloat(newFixedAmount),
        payment_frequency: 'monthly',
        due_day_of_month: parseInt(newFixedDueDay, 10) || 1,
        active: true,
      });
      setShowAddFixedModal(false);
      setNewFixedName('');
      setNewFixedAmount('');
      await loadFixedExpenses();
      await loadMonthStatuses();
    } catch (err) {
      alert(`Error creating fixed expense: ${err.message}`);
    }
  }

  async function handleDeleteFixed(id) {
    if (!confirm('Deactivate this fixed expense obligation?')) return;
    try {
      await api.deleteFixedExpense(id);
      await loadFixedExpenses();
      await loadMonthStatuses();
    } catch (err) {
      alert(`Error deleting fixed expense: ${err.message}`);
    }
  }

  return (
    <div className="space-y-6">

      {/* 1. Header & Section Switcher */}
      <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-[0_4px_24px_rgba(0,0,0,0.02)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-700 flex items-center justify-center shadow-xs">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                {t('admin.expenseControl.title', 'Expense Control Center')}
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800">
                  {t('admin.expenseControl.badge', 'Audit & Budget Management')}
                </span>
              </h1>
              <p className="text-xs text-gray-500 font-medium">
                {t('admin.expenseControl.subtitle', 'Comprehensive management of daily operational expenses, cash drawer payouts & monthly staff payroll')}
              </p>
            </div>
          </div>
        </div>

        {/* Top Segmented Sub-tab Switcher */}
        <div className="flex items-center bg-gray-100 p-1 rounded-2xl">
          <button
            type="button"
            onClick={() => setActiveTab('variable')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'variable'
                ? 'bg-[#0E7452] text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {t('admin.expenseControl.tabVariable', '💸 Daily Operating Expenses')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('fixed')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'fixed'
                ? 'bg-[#0E7452] text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {t('admin.expenseControl.tabFixed', '🏢 Monthly Rents & Salaries')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'analytics'
                ? 'bg-[#0E7452] text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {t('admin.expenseControl.tabAnalytics', '📊 Spending Breakdown')}
          </button>
        </div>
      </div>

      {/* 2. Top Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Filtered Variable Expenses */}
        <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              {t('admin.expenseControl.kpiVariable', 'Operating Expenses')}
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-gray-900 tracking-tight">
              {formatETB(totalVariableAmount)}
            </div>
            <p className="text-xs text-rose-700 font-bold mt-0.5">
              {filteredVariableExpenses.length} {t('admin.expenseControl.recordsCount', 'transactions recorded')}
            </p>
          </div>
        </div>

        {/* Cash Drawer Deductions */}
        <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              {t('admin.expenseControl.kpiCash', 'Cash Drawer Payouts')}
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-amber-900 tracking-tight">
              {formatETB(cashExpensesAmount)}
            </div>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              {totalVariableAmount > 0 ? ((cashExpensesAmount / totalVariableAmount) * 100).toFixed(0) : 0}% of daily expenses
            </p>
          </div>
        </div>

        {/* Bank & Digital Expenses */}
        <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              {t('admin.expenseControl.kpiDigital', 'Bank & Telebirr Outflow')}
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
              <Smartphone className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-purple-900 tracking-tight">
              {formatETB(bankTelebirrAmount)}
            </div>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              Direct transfer & electronic checks
            </p>
          </div>
        </div>

        {/* Monthly Fixed Obligations */}
        <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              {t('admin.expenseControl.kpiFixed', 'Monthly Overhead')}
            </span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
              <Landmark className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-teal-900 tracking-tight">
              {formatETB(totalMonthlyCommitment)}
            </div>
            <p className="text-xs text-teal-700 font-bold mt-0.5">
              {formatETB(paidMonthlyAmount)} paid • {formatETB(pendingMonthlyAmount)} pending
            </p>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 3. TAB 1: DAILY OPERATING EXPENSES */}
      {/* ==================================================================== */}
      {activeTab === 'variable' && (
        <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-[0_4px_24px_rgba(0,0,0,0.02)] space-y-4">
          
          {/* Action & Filter Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-gray-100">
            <div>
              <h2 className="font-extrabold text-gray-900 text-base tracking-tight flex items-center gap-2">
                <span>{t('admin.expenseControl.variableTitle', 'Daily Operating Expense Register')}</span>
                <span className="text-xs font-black bg-rose-100 text-rose-800 px-2.5 py-0.5 rounded-full">
                  {filteredVariableExpenses.length} Records
                </span>
              </h2>
              <p className="text-xs text-gray-400 font-medium">
                {t('admin.expenseControl.variableSubtitle', 'Filter, search, record, modify or void operational expenses with full audit compliance')}
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Record Expense Button */}
              <button
                type="button"
                onClick={openAddModal}
                className="flex items-center space-x-1.5 bg-[#0E7452] hover:bg-[#0c6446] text-white font-bold text-xs px-3.5 py-2 rounded-2xl shadow-xs transition-all active:scale-98 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{t('admin.expenseControl.addExpenseBtn', 'Record New Expense')}</span>
              </button>

              {/* Export Excel Button */}
              <button
                type="button"
                onClick={handleExportExcel}
                className="flex items-center space-x-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 font-bold text-xs px-3.5 py-2 rounded-2xl shadow-2xs transition-all active:scale-98 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-gray-500" />
                <span>{t('admin.expenseControl.exportExcel', 'Export Excel')}</span>
              </button>
            </div>
          </div>

          {/* Filter Pills Bar */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {/* Date Pickers & Quick Dates */}
            <div className="flex items-center space-x-1 bg-gray-100 p-1 rounded-2xl">
              <button
                type="button"
                onClick={() => { setIsAllDates(false); setSelectedDate(todayStr); }}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  !isAllDates && selectedDate === todayStr 
                    ? 'bg-[#0E7452] text-white shadow-xs' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAllDates(false);
                  const y = new Date();
                  y.setDate(y.getDate() - 1);
                  setSelectedDate(y.toISOString().slice(0, 10));
                }}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  !isAllDates && selectedDate === new Date(Date.now() - 86400000).toISOString().slice(0, 10)
                    ? 'bg-[#0E7452] text-white shadow-xs' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Yesterday
              </button>
              <button
                type="button"
                onClick={() => setIsAllDates(true)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isAllDates 
                    ? 'bg-[#0E7452] text-white shadow-xs' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                All Dates
              </button>
            </div>

            {/* Custom Date Input */}
            {!isAllDates && (
              <div className="flex items-center space-x-1.5 bg-gray-50 border border-gray-200 rounded-2xl px-3 py-1.5 shadow-2xs">
                <Calendar className="w-4 h-4 text-[#0E7452]" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="text-xs font-bold text-gray-800 bg-transparent focus:outline-none cursor-pointer"
                />
              </div>
            )}

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs font-bold bg-gray-50 border border-gray-200 rounded-2xl px-3 py-1.5 focus:bg-white focus:outline-none focus:border-[#0E7452] cursor-pointer"
            >
              <option value="all">All Categories</option>
              {expenseCategories.map(c => (
                <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
              ))}
            </select>

            {/* Payment Method Filter */}
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="text-xs font-bold bg-gray-50 border border-gray-200 rounded-2xl px-3 py-1.5 focus:bg-white focus:outline-none focus:border-[#0E7452] cursor-pointer"
            >
              <option value="all">All Payment Methods</option>
              <option value="cash">Cash Only</option>
              <option value="bank">Bank / CBE Only</option>
              <option value="telebirr">Telebirr Only</option>
            </select>

            {/* Search Box */}
            <div className="relative ml-auto">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search description, staff, notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-2xl w-56 font-medium focus:bg-white focus:outline-none focus:border-[#0E7452]"
              />
            </div>
          </div>

          {/* Expenses Table */}
          {filteredVariableExpenses.length === 0 ? (
            <div className="text-center py-16 text-gray-400 space-y-2">
              <TrendingDown className="w-10 h-10 mx-auto text-gray-300" />
              <h3 className="text-sm font-extrabold text-gray-700">No expense records found</h3>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                No operating expenses matching your selected criteria were recorded.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto scrollbar-none">
              <table className="w-full min-w-[680px] text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">Description & Remarks</th>
                    <th className="py-3 px-3">Recorded By</th>
                    <th className="py-3 px-3 text-center">Payment</th>
                    <th className="py-3 px-3 text-right">Amount (ETB)</th>
                    <th className="py-3 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredVariableExpenses.map((exp) => {
                    const paymentBadgeColor = 
                      exp.payment_method === 'cash' 
                        ? 'bg-amber-50 text-amber-800 border-amber-200' 
                        : exp.payment_method === 'bank' 
                        ? 'bg-blue-50 text-blue-800 border-blue-200' 
                        : 'bg-purple-50 text-purple-800 border-purple-200';

                    const isEdited = exp.status === 'edited' || (exp.audit_trail && exp.audit_trail.length > 0);

                    return (
                      <tr key={exp.id} className="hover:bg-rose-50/20 transition-colors group">
                        {/* Date */}
                        <td className="py-3 px-3 font-semibold text-gray-600 whitespace-nowrap">
                          <div className="flex items-center space-x-1.5">
                            <Clock className="w-3 h-3 text-gray-400" />
                            <span>{exp.expense_date}</span>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="inline-flex items-center space-x-1 bg-gray-50 border border-gray-200 text-gray-800 px-2.5 py-1 rounded-xl text-[11px] font-bold">
                            <Tag className="w-3 h-3 text-[#0E7452]" />
                            <span>{exp.expense_category}</span>
                          </span>
                        </td>

                        {/* Description & Remarks */}
                        <td className="py-3 px-3">
                          <div className="flex items-center space-x-2">
                            <div>
                              <div className="font-extrabold text-gray-900 text-xs">
                                {exp.description}
                              </div>
                              {exp.remarks && (
                                <p className="text-[10px] text-gray-400 font-medium">
                                  {exp.remarks}
                                </p>
                              )}
                            </div>

                            {/* Edited Badge */}
                            {isEdited && (
                              <button
                                type="button"
                                onClick={() => setViewingAuditExpense(exp)}
                                className="inline-flex items-center space-x-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-black px-1.5 py-0.5 rounded-md cursor-pointer transition-colors shadow-2xs"
                                title="Click to view modification history"
                              >
                                <History className="w-3 h-3 text-amber-700" />
                                <span>EDITED</span>
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Recorded By */}
                        <td className="py-3 px-3 font-bold text-gray-700 whitespace-nowrap">
                          <div className="flex items-center space-x-1.5">
                            <div className="w-5 h-5 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-[10px] font-black">
                              {exp.recorded_by_name ? exp.recorded_by_name[0] : 'S'}
                            </div>
                            <span>{exp.recorded_by_name || 'Staff'}</span>
                          </div>
                        </td>

                        {/* Payment Method */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <span className={`inline-flex items-center space-x-1 border px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${paymentBadgeColor}`}>
                            {exp.payment_method === 'cash' && <Banknote className="w-3 h-3" />}
                            {exp.payment_method === 'bank' && <CreditCard className="w-3 h-3" />}
                            {exp.payment_method === 'telebirr' && <Smartphone className="w-3 h-3" />}
                            <span>{exp.payment_method || 'CASH'}</span>
                          </span>
                        </td>

                        {/* Amount */}
                        <td className="py-3 px-3 text-right font-black text-rose-700 text-sm whitespace-nowrap">
                          -{formatETB(exp.amount)}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              type="button"
                              onClick={() => openEditModal(exp)}
                              className="p-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 transition-all cursor-pointer shadow-2xs"
                              title="Edit Expense"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openDeleteModal(exp)}
                              className="p-1.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 transition-all cursor-pointer shadow-2xs"
                              title="Delete Expense"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

        </div>
      )}

      {/* ==================================================================== */}
      {/* 4. TAB 2: FIXED MONTHLY OVERHEAD & STAFF PAYROLL */}
      {/* ==================================================================== */}
      {activeTab === 'fixed' && (
        <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-[0_4px_24px_rgba(0,0,0,0.02)] space-y-6">
          
          {/* Header & Month Selector */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
            <div>
              <h2 className="font-extrabold text-gray-900 text-base tracking-tight flex items-center gap-2">
                <span>{t('admin.fixedExpenseManager.title', 'Constant / Fixed Expenses & Staff Salaries')}</span>
                <span className="text-xs font-black bg-teal-50 text-teal-800 px-2.5 py-0.5 rounded-full border border-teal-100">
                  {formatETB(totalMonthlyCommitment)} / Month
                </span>
              </h2>
              <p className="text-xs text-gray-400 font-medium">
                {t('admin.fixedExpenseManager.subtitle', 'Main shop rent (50,000), store & bedroom rent (10,000 each), head baker (7,500), assistant (4,500), accountant (5,000).')}
              </p>
            </div>

            <div className="flex items-center space-x-3">
              {/* Month Picker */}
              <div className="flex items-center space-x-1.5 bg-gray-50 border border-gray-200 rounded-2xl px-3 py-1.5 shadow-2xs">
                <Calendar className="w-4 h-4 text-[#0E7452]" />
                <span className="text-xs font-bold text-gray-500">Period:</span>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="text-xs font-bold text-gray-800 bg-transparent focus:outline-none cursor-pointer"
                />
              </div>

              {/* Add Fixed Expense Button */}
              <button
                type="button"
                onClick={() => setShowAddFixedModal(true)}
                className="flex items-center space-x-1.5 bg-[#0E7452] hover:bg-[#0c6446] text-white font-bold text-xs px-3.5 py-2 rounded-2xl shadow-xs transition-all active:scale-98 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{t('admin.fixedExpenseManager.addNewBtn', 'Add Fixed Expense')}</span>
              </button>
            </div>
          </div>

          {/* Month Status Overview Progress Bar */}
          <div className="bg-teal-50/60 border border-teal-100 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-black text-teal-950">
                Payment Status for {selectedMonth}:
              </span>
              <p className="text-xs text-teal-800 font-medium">
                {formatETB(paidMonthlyAmount)} paid of {formatETB(totalMonthlyCommitment)} ({totalMonthlyCommitment > 0 ? ((paidMonthlyAmount / totalMonthlyCommitment) * 100).toFixed(0) : 0}%)
              </p>
            </div>

            <div className="w-full sm:w-64 bg-teal-200/60 rounded-full h-3 overflow-hidden">
              <div
                className="bg-[#0E7452] h-full rounded-full transition-all duration-500"
                style={{ width: `${totalMonthlyCommitment > 0 ? Math.min(100, (paidMonthlyAmount / totalMonthlyCommitment) * 100) : 0}%` }}
              />
            </div>
          </div>

          {/* Fixed Expenses Table */}
          <div className="overflow-x-auto scrollbar-none">
            <table className="w-full min-w-[650px] text-left text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">
                  <th className="py-3 px-3">Fixed Expense / Salary Item</th>
                  <th className="py-3 px-3">Frequency</th>
                  <th className="py-3 px-3">Due Day</th>
                  <th className="py-3 px-3 text-right">Monthly Amount</th>
                  <th className="py-3 px-3 text-center">Status ({selectedMonth})</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {monthStatuses.map((item) => {
                  const isPaid = item.status === 'paid';
                  return (
                    <tr key={item.fixed_expense?.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 px-3 font-extrabold text-gray-900">
                        {item.fixed_expense?.name}
                      </td>
                      <td className="py-3 px-3 text-gray-500 font-semibold uppercase">
                        {item.fixed_expense?.payment_frequency || 'Monthly'}
                      </td>
                      <td className="py-3 px-3 text-gray-500 font-semibold">
                        Day {item.fixed_expense?.due_day_of_month || 1}
                      </td>
                      <td className="py-3 px-3 text-right font-black text-gray-900 text-sm">
                        {formatETB(item.fixed_expense?.monthly_amount)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => toggleFixedStatus(item)}
                          className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                            isPaid
                              ? 'bg-emerald-100 text-[#0E7452] border border-emerald-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {isPaid ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                          <span>{isPaid ? 'PAID' : 'PENDING'}</span>
                        </button>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteFixed(item.fixed_expense?.id)}
                          className="p-1.5 rounded-xl bg-gray-50 hover:bg-rose-50 text-gray-400 hover:text-rose-700 transition-colors cursor-pointer"
                          title="Deactivate item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* ==================================================================== */}
      {/* 5. TAB 3: SPENDING BREAKDOWN & ANALYTICS */}
      {/* ==================================================================== */}
      {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* Category Breakdown (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-3xl border border-gray-100 p-6 shadow-[0_4px_24px_rgba(0,0,0,0.02)] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="font-extrabold text-gray-900 text-base">Expense Categories Distribution</h3>
                <p className="text-xs text-gray-400 font-medium">Ranked share of operational spending across all categories</p>
              </div>
              <PieChart className="w-5 h-5 text-[#0E7452]" />
            </div>

            <div className="space-y-3">
              {categoryBreakdown.map((cat) => (
                <div key={cat.category} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold text-gray-800">
                    <span className="flex items-center space-x-1.5">
                      <Tag className="w-3.5 h-3.5 text-[#0E7452]" />
                      <span>{cat.category}</span>
                      <span className="text-[10px] text-gray-400">({cat.count} expenses)</span>
                    </span>
                    <span className="font-black text-gray-900">
                      {formatETB(cat.total)} ({cat.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-[#0E7452] h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(2, cat.percentage))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Method & Cash Drawer Impact (5 cols) */}
          <div className="lg:col-span-5 bg-white rounded-3xl border border-gray-100 p-6 shadow-[0_4px_24px_rgba(0,0,0,0.02)] space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div>
                  <h3 className="font-extrabold text-gray-900 text-base">Payment Method Outflow</h3>
                  <p className="text-xs text-gray-400 font-medium">Physical cash drawer payouts vs digital transfers</p>
                </div>
                <Banknote className="w-5 h-5 text-amber-600" />
              </div>

              <div className="mt-4 space-y-4">
                <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                      <Banknote className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-gray-700">Cash Drawer Payouts</div>
                      <div className="text-xs text-gray-400">Paid by cashiers from drawer</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-amber-900 text-base">{formatETB(cashExpensesAmount)}</div>
                    <span className="text-[10px] font-bold text-amber-800">
                      {totalVariableAmount > 0 ? ((cashExpensesAmount / totalVariableAmount) * 100).toFixed(0) : 0}% of expenses
                    </span>
                  </div>
                </div>

                <div className="bg-purple-50/60 border border-purple-200 rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-gray-700">Bank & Telebirr Outflow</div>
                      <div className="text-xs text-gray-400">Electronic payments & cheques</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-purple-900 text-base">{formatETB(bankTelebirrAmount)}</div>
                    <span className="text-[10px] font-bold text-purple-800">
                      {totalVariableAmount > 0 ? ((bankTelebirrAmount / totalVariableAmount) * 100).toFixed(0) : 0}% of expenses
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3 text-xs text-gray-500 font-medium">
              💡 <strong>Petty Cash Management Tip:</strong> Cash drawer expenses directly reduce closing cash count and must match physical receipts in the cash drawer.
            </div>
          </div>

        </div>
      )}

      {/* ==================================================================== */}
      {/* 6. MODAL: ADD OPERATING EXPENSE */}
      {/* ==================================================================== */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-gray-100 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-700 flex items-center justify-center font-bold">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-gray-900 text-base">Record Operating Expense</h3>
                  <p className="text-xs text-gray-500 font-medium">Add a new cash or bank operational payment</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {actionError && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Expense Date</label>
                  <input
                    type="date"
                    value={addForm.expense_date}
                    onChange={(e) => setAddForm(prev => ({ ...prev, expense_date: e.target.value }))}
                    className="w-full text-xs font-bold bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 focus:bg-white focus:outline-none focus:border-[#0E7452]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Amount (ETB) *</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={addForm.amount}
                    placeholder="0.00"
                    onChange={(e) => setAddForm(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full text-xs font-bold bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 focus:bg-white focus:outline-none focus:border-[#0E7452]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Category</label>
                  <select
                    value={addForm.expense_category}
                    onChange={(e) => setAddForm(prev => ({ ...prev, expense_category: e.target.value }))}
                    className="w-full text-xs font-bold bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 focus:bg-white focus:outline-none focus:border-[#0E7452] cursor-pointer"
                  >
                    {expenseCategories.map(c => (
                      <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Payment Method</label>
                  <select
                    value={addForm.payment_method}
                    onChange={(e) => setAddForm(prev => ({ ...prev, payment_method: e.target.value }))}
                    className="w-full text-xs font-bold bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 focus:bg-white focus:outline-none focus:border-[#0E7452] cursor-pointer"
                  >
                    <option value="cash">Cash Drawer</option>
                    <option value="bank">Bank / CBE</option>
                    <option value="telebirr">Telebirr</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Description *</label>
                <input
                  type="text"
                  placeholder="e.g. Lunch for 3 bakers, Bajaj delivery to branch"
                  value={addForm.description}
                  onChange={(e) => setAddForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full text-xs font-medium bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 focus:bg-white focus:outline-none focus:border-[#0E7452]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Remarks / Receipt Note</label>
                <input
                  type="text"
                  placeholder="e.g. Receipt #1024 / paid by Abebe"
                  value={addForm.remarks}
                  onChange={(e) => setAddForm(prev => ({ ...prev, remarks: e.target.value }))}
                  className="w-full text-xs font-medium bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 focus:bg-white focus:outline-none focus:border-[#0E7452]"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-2xl border border-gray-200 text-gray-700 font-bold text-xs hover:bg-gray-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-2xl bg-[#0E7452] hover:bg-[#0c6446] text-white font-bold text-xs shadow-xs cursor-pointer flex items-center space-x-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  <span>Save Expense</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 7. MODAL: EDIT OPERATING EXPENSE */}
      {/* ==================================================================== */}
      {editingExpense && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-gray-100 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-gray-900 text-base">Edit Operating Expense</h3>
                  <p className="text-xs text-gray-500 font-medium">Modify amount, category, or notes with mandatory audit log</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingExpense(null)}
                className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {actionError && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Expense Date</label>
                  <input
                    type="date"
                    value={editForm.expense_date}
                    onChange={(e) => setEditForm(prev => ({ ...prev, expense_date: e.target.value }))}
                    className="w-full text-xs font-bold bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 focus:bg-white focus:outline-none focus:border-blue-600"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Amount (ETB) *</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={editForm.amount}
                    onChange={(e) => setEditForm(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full text-xs font-bold bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 focus:bg-white focus:outline-none focus:border-blue-600"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Category</label>
                  <select
                    value={editForm.expense_category}
                    onChange={(e) => setEditForm(prev => ({ ...prev, expense_category: e.target.value }))}
                    className="w-full text-xs font-bold bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 focus:bg-white focus:outline-none focus:border-blue-600 cursor-pointer"
                  >
                    {expenseCategories.map(c => (
                      <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Payment Method</label>
                  <select
                    value={editForm.payment_method}
                    onChange={(e) => setEditForm(prev => ({ ...prev, payment_method: e.target.value }))}
                    className="w-full text-xs font-bold bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 focus:bg-white focus:outline-none focus:border-blue-600 cursor-pointer"
                  >
                    <option value="cash">Cash Drawer</option>
                    <option value="bank">Bank / CBE</option>
                    <option value="telebirr">Telebirr</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Description *</label>
                <input
                  type="text"
                  value={editForm.description}
                  onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full text-xs font-medium bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 focus:bg-white focus:outline-none focus:border-blue-600"
                  required
                />
              </div>

              {/* Mandatory Reason */}
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 space-y-1">
                <label className="block text-xs font-black text-amber-900">
                  Reason for Modification *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Corrected amount, wrong category selected by cashier"
                  value={editForm.reason}
                  onChange={(e) => setEditForm(prev => ({ ...prev, reason: e.target.value }))}
                  className="w-full text-xs font-bold bg-white border border-amber-300 rounded-xl px-3 py-2 text-gray-900 focus:outline-none focus:border-amber-600"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Remarks</label>
                <input
                  type="text"
                  value={editForm.remarks}
                  onChange={(e) => setEditForm(prev => ({ ...prev, remarks: e.target.value }))}
                  className="w-full text-xs font-medium bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 focus:bg-white focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingExpense(null)}
                  className="px-4 py-2 rounded-2xl border border-gray-200 text-gray-700 font-bold text-xs hover:bg-gray-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-2xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shadow-xs cursor-pointer flex items-center space-x-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 8. MODAL: DELETE / VOID OPERATING EXPENSE */}
      {/* ==================================================================== */}
      {deletingExpense && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full border border-gray-100 shadow-2xl p-6 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-700 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-gray-900 text-base">Delete / Void Expense</h3>
                <p className="text-xs text-gray-500 font-medium">
                  {deletingExpense.expense_date} • {deletingExpense.expense_category}
                </p>
              </div>
            </div>

            {actionError && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 space-y-1.5">
              <p className="text-xs text-rose-900 font-semibold leading-relaxed">
                Voiding this expense will permanently remove it from financial reports and adjust cash drawer reconciliation.
              </p>
              <div className="border-t border-rose-200 pt-2 flex items-center justify-between text-xs font-bold text-rose-900">
                <span>Expense Description:</span>
                <span className="font-black truncate max-w-[180px]">{deletingExpense.description}</span>
              </div>
              <div className="flex items-center justify-between text-xs font-bold text-rose-900">
                <span>Amount:</span>
                <span className="font-black text-sm">{formatETB(deletingExpense.amount)}</span>
              </div>
            </div>

            <form onSubmit={handleDeleteSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-gray-800 mb-1">
                  Reason for Deletion *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Duplicate entry, cashier mistake, cancelled purchase"
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  className="w-full text-xs font-bold bg-gray-50 border border-gray-300 rounded-2xl px-3 py-2 text-gray-900 focus:bg-white focus:outline-none focus:border-rose-600"
                  required
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setDeletingExpense(null)}
                  className="px-4 py-2 rounded-2xl border border-gray-200 text-gray-700 font-bold text-xs hover:bg-gray-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs cursor-pointer flex items-center space-x-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  <span>Confirm Delete</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 9. MODAL: AUDIT LOG VIEWER */}
      {/* ==================================================================== */}
      {viewingAuditExpense && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-gray-100 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-800 flex items-center justify-center font-bold">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-gray-900 text-base">Expense Audit Log</h3>
                  <p className="text-xs text-gray-500 font-medium">{viewingAuditExpense.description}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingAuditExpense(null)}
                className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {viewingAuditExpense.audit_trail && viewingAuditExpense.audit_trail.length > 0 ? (
                viewingAuditExpense.audit_trail.map((entry, idx) => (
                  <div key={idx} className="bg-gray-50 border border-gray-200 rounded-2xl p-3 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-[#0E7452] uppercase tracking-wider text-[10px]">
                        MODIFIED
                      </span>
                      <span className="text-gray-400 font-medium text-[10px]">
                        {entry.edited_at ? new Date(entry.edited_at).toLocaleString() : '—'}
                      </span>
                    </div>
                    <div className="font-bold text-gray-800">
                      Modified By: <span className="font-medium text-gray-600">{entry.edited_by || 'Admin'}</span>
                    </div>
                    <div className="bg-white rounded-xl p-2 border border-gray-100 text-gray-700 italic">
                      "{entry.reason || 'No reason provided'}"
                    </div>
                    {entry.previous_values && (
                      <div className="text-[10px] text-gray-400">
                        Previous: {entry.previous_values}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-400 text-xs font-bold">
                  No previous modification logs found.
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-gray-100 text-right">
              <button
                type="button"
                onClick={() => setViewingAuditExpense(null)}
                className="px-4 py-2 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 10. MODAL: ADD FIXED EXPENSE OBLIGATION */}
      {/* ==================================================================== */}
      {showAddFixedModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full border border-gray-100 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
                  <Landmark className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-gray-900 text-base">Add Fixed Expense / Salary</h3>
                  <p className="text-xs text-gray-500 font-medium">Create a regular recurring monthly obligation</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddFixedModal(false)}
                className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddFixedSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Expense / Staff Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Store Rent, Head Baker Salary"
                  value={newFixedName}
                  onChange={(e) => setNewFixedName(e.target.value)}
                  className="w-full text-xs font-medium bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 focus:bg-white focus:outline-none focus:border-[#0E7452]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Monthly Amount (ETB) *</label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  placeholder="e.g. 50000"
                  value={newFixedAmount}
                  onChange={(e) => setNewFixedAmount(e.target.value)}
                  className="w-full text-xs font-bold bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 focus:bg-white focus:outline-none focus:border-[#0E7452]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Due Day of Month</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={newFixedDueDay}
                  onChange={(e) => setNewFixedDueDay(e.target.value)}
                  className="w-full text-xs font-bold bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 focus:bg-white focus:outline-none focus:border-[#0E7452]"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddFixedModal(false)}
                  className="px-4 py-2 rounded-2xl border border-gray-200 text-gray-700 font-bold text-xs hover:bg-gray-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-2xl bg-[#0E7452] hover:bg-[#0c6446] text-white font-bold text-xs shadow-xs cursor-pointer"
                >
                  Save Fixed Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
