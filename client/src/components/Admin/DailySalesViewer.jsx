import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, 
  Search, 
  Filter, 
  Download, 
  Printer, 
  RefreshCw, 
  TrendingUp, 
  CreditCard, 
  Banknote, 
  Smartphone, 
  ShoppingBag, 
  Receipt, 
  ChevronRight, 
  User, 
  Clock, 
  AlertCircle,
  Wheat,
  PieChart,
  BarChart2,
  Sparkles,
  ArrowUpRight,
  Plus,
  Pencil,
  Trash2,
  X,
  History,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { api } from '../../services/api';
import { formatETB } from '../../utils/formatters';
import { exportToExcel } from '../../utils/exportReports';
import { useTranslation } from '../../i18n';
import ReceiptModal from '../ReceiptModal';

export default function DailySalesViewer({ 
  admin, 
  products = [], 
  finishedStock = [], 
  branches = [], 
  users = [],
  onRefreshDashboard
}) {
  const { t } = useTranslation();
  const todayStr = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [sales, setSales] = useState([]);
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('all'); // 'all', 'cash', 'bank', 'telebirr'
  const [cashierFilter, setCashierFilter] = useState('all');
  const [activeReceipt, setActiveReceipt] = useState(null);

  // Modal states for Admin Control
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSale, setEditingSale] = useState(null);
  const [deletingSale, setDeletingSale] = useState(null);
  const [viewingAuditSale, setViewingAuditSale] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState('');

  // Stock Map for checking real-time available stock (strictly branch-aware)
  const stockMap = useMemo(() => {
    const map = {};
    const mainBranch = branches?.find(b => b.is_main);
    const targetBranchId = admin?.branch_id || mainBranch?.id || '6aec3ad95663067312ab76c2';

    // 1. Populate from target branch / main branch
    finishedStock.forEach(s => {
      if (s.branch_id === targetBranchId || s.branch_id === 'main' || (!s.branch_id && mainBranch)) {
        map[s.product_id] = Math.max(0, s.available_quantity || 0);
      }
    });

    // 2. Fallback for any product not yet registered under target branch
    finishedStock.forEach(s => {
      if (map[s.product_id] === undefined) {
        map[s.product_id] = Math.max(0, s.available_quantity || 0);
      }
    });

    return map;
  }, [finishedStock, branches, admin]);

  // Cashiers & Sellers list
  const cashierUsers = useMemo(() => {
    return users.filter(u => u.role === 'cashier' || u.role === 'admin');
  }, [users]);

  // Fetch sales and summary for the selected date
  async function loadDailySales(dateToFetch) {
    setIsLoading(true);
    try {
      const [salesData, summaryData] = await Promise.all([
        api.getSales(`date=${dateToFetch}`),
        api.getSalesSummary(dateToFetch),
      ]);
      setSales(Array.isArray(salesData) ? salesData : []);
      setSummary(summaryData || null);
    } catch (err) {
      console.error('Failed to load daily sales:', err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadDailySales(selectedDate);
  }, [selectedDate]);

  // Handle quick date selection
  function handleQuickDate(type) {
    if (type === 'today') {
      setSelectedDate(todayStr);
    } else if (type === 'yesterday') {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      setSelectedDate(y.toISOString().slice(0, 10));
    }
  }

  // Filtered sales list
  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      // Payment method filter
      if (paymentFilter !== 'all' && s.payment_method !== paymentFilter) {
        return false;
      }
      // Cashier filter
      if (cashierFilter !== 'all' && s.cashier_id !== cashierFilter && s.cashier_name !== cashierFilter) {
        return false;
      }
      // Search query filter (receipt #, customer, item names)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesReceipt = s.receipt_number?.toLowerCase().includes(query);
        const matchesCustomer = s.customer_name?.toLowerCase().includes(query);
        const matchesCashier = s.cashier_name?.toLowerCase().includes(query);
        const matchesItem = s.items?.some(it => it.product_name?.toLowerCase().includes(query));
        if (!matchesReceipt && !matchesCustomer && !matchesCashier && !matchesItem) {
          return false;
        }
      }
      return true;
    });
  }, [sales, paymentFilter, cashierFilter, searchQuery]);

  // Filtered totals
  const totalRevenue = useMemo(() => {
    return filteredSales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
  }, [filteredSales]);

  const totalItemsSold = useMemo(() => {
    return filteredSales.reduce((sum, s) => {
      const itemsCount = s.items?.reduce((iSum, it) => iSum + (it.quantity || 0), 0) || 0;
      return sum + itemsCount;
    }, 0);
  }, [filteredSales]);

  const cashTotal = useMemo(() => {
    return filteredSales
      .filter(s => s.payment_method === 'cash')
      .reduce((sum, s) => sum + (s.total_amount || 0), 0);
  }, [filteredSales]);

  const bankTotal = useMemo(() => {
    return filteredSales
      .filter(s => s.payment_method === 'bank')
      .reduce((sum, s) => sum + (s.total_amount || 0), 0);
  }, [filteredSales]);

  const telebirrTotal = useMemo(() => {
    return filteredSales
      .filter(s => s.payment_method === 'telebirr')
      .reduce((sum, s) => sum + (s.total_amount || 0), 0);
  }, [filteredSales]);

  const totalCOGS = useMemo(() => {
    return filteredSales.reduce((sum, s) => sum + (s.total_cogs || 0), 0);
  }, [filteredSales]);

  const grossProfit = totalRevenue - totalCOGS;
  const grossMarginPct = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : '0';
  const avgOrderValue = filteredSales.length > 0 ? (totalRevenue / filteredSales.length).toFixed(2) : '0';

  // Product breakdown for this date
  const productBreakdown = useMemo(() => {
    const map = {};
    filteredSales.forEach(s => {
      s.items?.forEach(it => {
        if (!map[it.product_name]) {
          map[it.product_name] = {
            productId: it.product_id,
            name: it.product_name,
            quantity: 0,
            revenue: 0,
            unitPrice: it.unit_price || 0,
          };
        }
        map[it.product_name].quantity += it.quantity || 0;
        map[it.product_name].revenue += it.total_price || (it.quantity * it.unit_price) || 0;
      });
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [filteredSales]);

  // Hourly breakdown of sales
  const hourlySales = useMemo(() => {
    const hours = {};
    for (let h = 6; h <= 21; h++) {
      const hStr = String(h).padStart(2, '0');
      hours[hStr] = { count: 0, revenue: 0 };
    }
    filteredSales.forEach(s => {
      const hour = s.sale_time ? s.sale_time.slice(0, 2) : '12';
      if (hours[hour]) {
        hours[hour].count += 1;
        hours[hour].revenue += s.total_amount || 0;
      }
    });
    return Object.entries(hours).map(([hour, data]) => ({
      hour: `${hour}:00`,
      ...data,
    }));
  }, [filteredSales]);

  const maxHourlyRevenue = useMemo(() => {
    return Math.max(...hourlySales.map(h => h.revenue), 1);
  }, [hourlySales]);

  // Excel Export
  function handleExportExcel() {
    if (filteredSales.length === 0) {
      alert(t('admin.dailySalesViewer.noSalesToExport', 'No sales data available to export for this date.'));
      return;
    }
    const columns = [
      { header: t('admin.dailySalesViewer.colReceipt', 'Receipt #'), key: 'receipt_number' },
      { header: t('common.date', 'Date'), key: 'sale_date' },
      { header: t('common.time', 'Time'), key: 'sale_time' },
      { header: t('admin.dailySalesViewer.colCashier', 'Cashier'), key: 'cashier_name' },
      { header: t('admin.dailySalesViewer.colCustomer', 'Customer'), key: 'customer_name' },
      { header: t('admin.dailySalesViewer.colPayment', 'Payment Method'), key: 'payment_method' },
      { header: t('admin.dailySalesViewer.colItems', 'Items Purchased'), key: 'items_summary' },
      { header: 'Total COGS (ETB)', key: 'total_cogs' },
      { header: t('common.totalAmount', 'Total Amount (ETB)'), key: 'total_amount' },
    ];

    const rows = filteredSales.map(s => ({
      receipt_number: s.receipt_number,
      sale_date: s.sale_date,
      sale_time: s.sale_time,
      cashier_name: s.cashier_name,
      customer_name: s.customer_name || t('admin.dailySalesViewer.walkInCustomer', 'Walk-in Customer'),
      payment_method: (s.payment_method || 'cash').toUpperCase(),
      items_summary: s.items?.map(i => `${i.quantity}x ${i.product_name}`).join(', ') || '',
      total_cogs: s.total_cogs || 0,
      total_amount: s.total_amount || 0,
    }));

    exportToExcel(`Harbuu_Daily_Sales_${selectedDate}`, columns, rows, `Daily_Sales_${selectedDate}`);
  }

  // ==========================================
  // ADD SALE (MANUAL / DIRECT BY ADMIN)
  // ==========================================
  const defaultAddForm = {
    sale_date: selectedDate,
    sale_time: new Date().toTimeString().slice(0, 5),
    cashier_id: admin?.id || admin?.username || '',
    cashier_name: admin?.full_name || admin?.username || 'Admin',
    customer_name: '',
    payment_method: 'cash',
    payment_reference: '',
    remarks: '',
    items: [],
  };

  const [addForm, setAddForm] = useState(defaultAddForm);

  function openAddModal() {
    const firstProd = products[0];
    setAddForm({
      sale_date: selectedDate,
      sale_time: new Date().toTimeString().slice(0, 5),
      cashier_id: admin?.id || admin?.username || '',
      cashier_name: admin?.full_name || admin?.username || 'Admin',
      customer_name: '',
      payment_method: 'cash',
      payment_reference: '',
      remarks: '',
      items: firstProd ? [
        {
          product_id: firstProd.id,
          product_name: firstProd.name,
          quantity: 1,
          unit_price: firstProd.selling_price || 0,
          total_price: firstProd.selling_price || 0,
        }
      ] : [
        { product_id: '', product_name: '', quantity: 1, unit_price: 0, total_price: 0 }
      ],
    });
    setActionError('');
    setShowAddModal(true);
  }

  function handleAddLineItem() {
    const firstProd = products[0];
    setAddForm(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          product_id: firstProd?.id || '',
          product_name: firstProd?.name || '',
          quantity: 1,
          unit_price: firstProd?.selling_price || 0,
          total_price: firstProd?.selling_price || 0,
        }
      ]
    }));
  }

  function handleRemoveAddLineItem(index) {
    setAddForm(prev => ({
      ...prev,
      items: prev.items.filter((_, idx) => idx !== index),
    }));
  }

  function handleAddLineItemChange(index, field, value) {
    setAddForm(prev => {
      const items = [...prev.items];
      const cur = { ...items[index] };

      if (field === 'product_id') {
        const prod = products.find(p => p.id === value);
        cur.product_id = value;
        cur.product_name = prod ? prod.name : '';
        cur.unit_price = prod ? (prod.selling_price || 0) : 0;
        cur.total_price = (Number(cur.quantity) || 0) * cur.unit_price;
      } else if (field === 'quantity') {
        const q = Math.max(1, parseInt(value, 10) || 1);
        cur.quantity = q;
        cur.total_price = q * (Number(cur.unit_price) || 0);
      } else if (field === 'unit_price') {
        const p = Math.max(0, parseFloat(value) || 0);
        cur.unit_price = p;
        cur.total_price = (Number(cur.quantity) || 0) * p;
      }

      items[index] = cur;
      return { ...prev, items };
    });
  }

  const addFormTotal = useMemo(() => {
    return addForm.items.reduce((s, it) => s + (Number(it.total_price) || 0), 0);
  }, [addForm.items]);

  const addFormPieces = useMemo(() => {
    return addForm.items.reduce((s, it) => s + (Number(it.quantity) || 0), 0);
  }, [addForm.items]);

  async function handleAddSaleSubmit(e) {
    e?.preventDefault();
    setActionError('');

    if (addForm.items.length === 0) {
      setActionError('Please add at least one line item to the sale.');
      return;
    }

    for (let i = 0; i < addForm.items.length; i++) {
      const it = addForm.items[i];
      if (!it.product_id) {
        setActionError(`Line #${i + 1}: Please select a valid product.`);
        return;
      }
      if (!it.quantity || it.quantity <= 0) {
        setActionError(`Line #${i + 1}: Quantity must be greater than 0.`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload = {
        sale_date: addForm.sale_date,
        sale_time: addForm.sale_time,
        cashier_id: addForm.cashier_id,
        cashier_name: addForm.cashier_name,
        customer_name: addForm.customer_name.trim() || t('admin.dailySalesViewer.walkInCustomer', 'Walk-in Customer'),
        payment_method: addForm.payment_method,
        payment_reference: addForm.payment_reference,
        remarks: addForm.remarks,
        items: addForm.items.map(it => ({
          product_id: it.product_id,
          product_name: it.product_name,
          quantity: Number(it.quantity),
          unit_price: Number(it.unit_price),
          total_price: Number(it.quantity) * Number(it.unit_price),
        })),
        total_amount: addFormTotal,
        branch_id: admin?.branch_id || (branches.find(b => b.is_main)?.id) || '6aec3ad95663067312ab76c2',
        branch_name: (branches.find(b => b.id === (admin?.branch_id || branches.find(b => b.is_main)?.id))?.name) || 'Main Bakery & Shop',
        created_by_admin: true,
        admin_name: admin?.full_name || admin?.username || 'Admin',
      };

      await api.createSale(payload);
      setShowAddModal(false);
      await loadDailySales(selectedDate);
      if (onRefreshDashboard) onRefreshDashboard();
    } catch (err) {
      console.error('Failed to create manual sale:', err);
      setActionError(err.message || 'Failed to record sale. Please verify available stock.');
    } finally {
      setIsSubmitting(false);
    }
  }

  // ==========================================
  // EDIT SALE
  // ==========================================
  const [editForm, setEditForm] = useState({
    sale_date: '',
    sale_time: '',
    cashier_id: '',
    cashier_name: '',
    customer_name: '',
    payment_method: 'cash',
    payment_reference: '',
    remarks: '',
    reason: '',
    items: [],
  });

  function openEditModal(sale) {
    setEditingSale(sale);
    setEditForm({
      sale_date: sale.sale_date || selectedDate,
      sale_time: sale.sale_time || '',
      cashier_id: sale.cashier_id || '',
      cashier_name: sale.cashier_name || '',
      customer_name: sale.customer_name || '',
      payment_method: sale.payment_method || 'cash',
      payment_reference: sale.payment_reference || '',
      remarks: sale.remarks || '',
      reason: '',
      items: sale.items?.map(it => ({
        product_id: it.product_id,
        product_name: it.product_name,
        quantity: it.quantity,
        unit_price: it.unit_price,
        total_price: it.total_price || (it.quantity * it.unit_price),
        original_quantity: it.quantity,
      })) || [],
    });
    setActionError('');
  }

  function handleEditLineItemChange(index, field, value) {
    setEditForm(prev => {
      const items = [...prev.items];
      const cur = { ...items[index] };

      if (field === 'product_id') {
        const prod = products.find(p => p.id === value);
        cur.product_id = value;
        cur.product_name = prod ? prod.name : '';
        cur.unit_price = prod ? (prod.selling_price || 0) : 0;
        cur.total_price = (Number(cur.quantity) || 0) * cur.unit_price;
      } else if (field === 'quantity') {
        const q = Math.max(1, parseInt(value, 10) || 1);
        cur.quantity = q;
        cur.total_price = q * (Number(cur.unit_price) || 0);
      } else if (field === 'unit_price') {
        const p = Math.max(0, parseFloat(value) || 0);
        cur.unit_price = p;
        cur.total_price = (Number(cur.quantity) || 0) * p;
      }

      items[index] = cur;
      return { ...prev, items };
    });
  }

  function handleAddEditLineItem() {
    const firstProd = products[0];
    setEditForm(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          product_id: firstProd?.id || '',
          product_name: firstProd?.name || '',
          quantity: 1,
          unit_price: firstProd?.selling_price || 0,
          total_price: firstProd?.selling_price || 0,
          original_quantity: 0,
        }
      ]
    }));
  }

  function handleRemoveEditLineItem(index) {
    setEditForm(prev => ({
      ...prev,
      items: prev.items.filter((_, idx) => idx !== index),
    }));
  }

  const editFormTotal = useMemo(() => {
    return editForm.items.reduce((s, it) => s + (Number(it.total_price) || 0), 0);
  }, [editForm.items]);

  const editFormPieces = useMemo(() => {
    return editForm.items.reduce((s, it) => s + (Number(it.quantity) || 0), 0);
  }, [editForm.items]);

  async function handleEditSaleSubmit(e) {
    e?.preventDefault();
    setActionError('');

    if (!editForm.reason || editForm.reason.trim().length < 3) {
      setActionError(t('admin.dailySalesViewer.reasonLabel', 'Reason for Edit / Modification *') + ' is required.');
      return;
    }

    if (editForm.items.length === 0) {
      setActionError('Sale must contain at least one item.');
      return;
    }

    for (let i = 0; i < editForm.items.length; i++) {
      const it = editForm.items[i];
      if (!it.product_id) {
        setActionError(`Line #${i + 1}: Please select a valid product.`);
        return;
      }
      if (!it.quantity || it.quantity <= 0) {
        setActionError(`Line #${i + 1}: Quantity must be greater than 0.`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload = {
        sale_date: editForm.sale_date,
        sale_time: editForm.sale_time,
        cashier_id: editForm.cashier_id,
        cashier_name: editForm.cashier_name,
        customer_name: editForm.customer_name.trim() || t('admin.dailySalesViewer.walkInCustomer', 'Walk-in Customer'),
        payment_method: editForm.payment_method,
        payment_reference: editForm.payment_reference,
        remarks: editForm.remarks,
        reason: editForm.reason.trim(),
        admin_name: admin?.full_name || admin?.username || 'Admin',
        items: editForm.items.map(it => ({
          product_id: it.product_id,
          product_name: it.product_name,
          quantity: Number(it.quantity),
          unit_price: Number(it.unit_price),
          total_price: Number(it.quantity) * Number(it.unit_price),
        })),
      };

      await api.updateSale(editingSale.id, payload);
      setEditingSale(null);
      await loadDailySales(selectedDate);
      if (onRefreshDashboard) onRefreshDashboard();
    } catch (err) {
      console.error('Failed to update sale:', err);
      setActionError(err.message || 'Failed to update sale.');
    } finally {
      setIsSubmitting(false);
    }
  }

  // ==========================================
  // DELETE / VOID SALE
  // ==========================================
  const [deleteReason, setDeleteReason] = useState('');

  function openDeleteModal(sale) {
    setDeletingSale(sale);
    setDeleteReason('');
    setActionError('');
  }

  async function handleDeleteSaleSubmit(e) {
    e?.preventDefault();
    setActionError('');

    if (!deleteReason || deleteReason.trim().length < 3) {
      setActionError(t('admin.dailySalesViewer.deleteReasonLabel', 'Reason for Voiding / Deletion *') + ' is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const adminName = admin?.full_name || admin?.username || 'Admin';
      const params = `reason=${encodeURIComponent(deleteReason.trim())}&admin_name=${encodeURIComponent(adminName)}`;
      await api.deleteSale(deletingSale.id, params);
      setDeletingSale(null);
      await loadDailySales(selectedDate);
      if (onRefreshDashboard) onRefreshDashboard();
    } catch (err) {
      console.error('Failed to delete sale:', err);
      setActionError(err.message || 'Failed to delete sale.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      
      {/* 1. Header & Date Control Bar */}
      <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-[0_4px_24px_rgba(0,0,0,0.02)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-[#0E7452] flex items-center justify-center shadow-xs">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                {t('admin.dailySalesViewer.title', 'Daily Sales Monitor')}
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-[#0E7452]">
                  {t('admin.dailySalesViewer.liveFeed', 'Live POS Feed')}
                </span>
              </h1>
              <p className="text-xs text-gray-500 font-medium">
                {t('admin.dailySalesViewer.subtitle', 'Detailed customer receipts, cashier audits, product velocity & daily revenue')}
              </p>
            </div>
          </div>
        </div>

        {/* Date Selector & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Dates */}
          <div className="flex items-center bg-gray-100 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => handleQuickDate('today')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedDate === todayStr 
                  ? 'bg-[#0E7452] text-white shadow-xs' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {t('admin.dailySalesViewer.todayBtn', 'Today')}
            </button>
            <button
              type="button"
              onClick={() => handleQuickDate('yesterday')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedDate !== todayStr && selectedDate === new Date(Date.now() - 86400000).toISOString().slice(0, 10)
                  ? 'bg-[#0E7452] text-white shadow-xs' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {t('admin.dailySalesViewer.yesterdayBtn', 'Yesterday')}
            </button>
          </div>

          {/* Date Picker */}
          <div className="flex items-center space-x-1.5 bg-gray-50 border border-gray-200 rounded-2xl px-3 py-1.5 shadow-2xs">
            <Calendar className="w-4 h-4 text-[#0E7452]" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs font-bold text-gray-800 bg-transparent focus:outline-none cursor-pointer"
            />
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => loadDailySales(selectedDate)}
            disabled={isLoading}
            className="w-9 h-9 rounded-2xl bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
            title={t('admin.dailySalesViewer.refreshBtn', 'Refresh sales data')}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#0E7452]' : ''}`} />
          </button>

          {/* + Record / Add Sale Button */}
          <button
            type="button"
            onClick={openAddModal}
            className="flex items-center space-x-1.5 bg-[#0E7452] hover:bg-[#0c6446] text-white font-bold text-xs px-3.5 py-2 rounded-2xl shadow-xs transition-all active:scale-98 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t('admin.dailySalesViewer.addSaleBtn', 'Record / Add Sale')}</span>
          </button>

          {/* Export Excel Button */}
          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center space-x-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 font-bold text-xs px-3.5 py-2 rounded-2xl shadow-2xs transition-all active:scale-98 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-gray-500" />
            <span>{t('admin.dailySalesViewer.exportExcel', 'Export Excel')}</span>
          </button>
        </div>
      </div>

      {/* 2. Top Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {/* Total Sales Revenue */}
        <div className="bg-white rounded-3xl border border-gray-100 p-4 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t('admin.dailySalesViewer.grossRevenue', 'Gross Revenue')}</span>
            <div className="w-7 h-7 rounded-xl bg-emerald-50 text-[#0E7452] flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl font-black text-gray-900 tracking-tight">
              {formatETB(totalRevenue)}
            </div>
            <p className="text-[11px] text-[#0E7452] font-bold mt-0.5">
              {t('admin.dailySalesViewer.avgOrder', 'Avg Order: {val}').replace('{val}', formatETB(avgOrderValue))}
            </p>
          </div>
        </div>

        {/* Orders Completed */}
        <div className="bg-white rounded-3xl border border-gray-100 p-4 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t('admin.dailySalesViewer.ordersCount', 'Orders Count')}</span>
            <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <Receipt className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl font-black text-gray-900 tracking-tight">
              {filteredSales.length}
            </div>
            <p className="text-[11px] text-gray-500 font-medium mt-0.5">
              {t('admin.dailySalesViewer.receiptsIssued', 'Customer receipts issued')}
            </p>
          </div>
        </div>

        {/* Pieces Sold */}
        <div className="bg-white rounded-3xl border border-gray-100 p-4 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t('admin.dailySalesViewer.piecesSold', 'Pieces Sold')}</span>
            <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Wheat className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl font-black text-gray-900 tracking-tight">
              {totalItemsSold.toLocaleString()} {t('common.pieces', 'pcs')}
            </div>
            <p className="text-[11px] text-gray-500 font-medium mt-0.5">
              {t('admin.dailySalesViewer.piecesCategory', 'Bread, cookies & cakes')}
            </p>
          </div>
        </div>

        {/* Cash Tendered */}
        <div className="bg-white rounded-3xl border border-gray-100 p-4 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t('admin.dailySalesViewer.cashDrawer', 'Cash Drawer')}</span>
            <div className="w-7 h-7 rounded-xl bg-emerald-50 text-[#0E7452] flex items-center justify-center">
              <Banknote className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl font-black text-emerald-800 tracking-tight">
              {formatETB(cashTotal)}
            </div>
            <p className="text-[11px] text-gray-500 font-medium mt-0.5">
              {t('admin.dailySalesViewer.pctOfDaily', '{pct}% of daily total').replace('{pct}', totalRevenue > 0 ? ((cashTotal / totalRevenue) * 100).toFixed(0) : 0)}
            </p>
          </div>
        </div>

        {/* Bank & Digital Sales */}
        <div className="bg-white rounded-3xl border border-gray-100 p-4 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t('admin.dailySalesViewer.bankTelebirr', 'Bank & Telebirr')}</span>
            <div className="w-7 h-7 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
              <Smartphone className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl font-black text-purple-900 tracking-tight">
              {formatETB(bankTotal + telebirrTotal)}
            </div>
            <p className="text-[11px] text-gray-500 font-medium mt-0.5">
              {t('admin.dailySalesViewer.bankSplit', 'CBE: {cbe} • Tele: {tele}').replace('{cbe}', formatETB(bankTotal)).replace('{tele}', formatETB(telebirrTotal))}
            </p>
          </div>
        </div>

        {/* Gross Margin & COGS */}
        <div className="bg-white rounded-3xl border border-gray-100 p-4 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t('admin.dailySalesViewer.grossProfit', 'Gross Profit')}</span>
            <div className="w-7 h-7 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
              <PieChart className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl font-black text-teal-900 tracking-tight">
              {formatETB(grossProfit)}
            </div>
            <p className="text-[11px] text-teal-700 font-bold mt-0.5">
              {t('admin.dailySalesViewer.marginWithCogs', '{pct}% Margin (COGS: {cogs})').replace('{pct}', grossMarginPct).replace('{cogs}', formatETB(totalCOGS))}
            </p>
          </div>
        </div>
      </div>

      {/* 3. Product Sales Velocity & Hourly Peak Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left 7 cols: Products Sold Today with Stock Status */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-gray-100 p-6 shadow-[0_4px_24px_rgba(0,0,0,0.02)] flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div>
              <h3 className="font-extrabold text-gray-900 text-sm tracking-tight flex items-center gap-2">
                <span>{t('admin.dailySalesViewer.velocityTitle', 'Product Sales Velocity')}</span>
                <span className="text-[10px] font-black bg-emerald-50 text-[#0E7452] px-2 py-0.5 rounded-full border border-emerald-100">
                  {t('admin.dailySalesViewer.varietiesSold', '{count} Varieties Sold').replace('{count}', productBreakdown.length)}
                </span>
              </h3>
              <p className="text-[11px] text-gray-400 font-medium">{t('admin.dailySalesViewer.velocitySubtitle', 'Quantity sold and remaining shop stock')}</p>
            </div>
            <span className="text-xs font-bold text-gray-500">{t('admin.dailySalesViewer.date', 'Date: {val}').replace('{val}', selectedDate)}</span>
          </div>

          {productBreakdown.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Wheat className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-xs font-bold text-gray-600">{t('admin.dailySalesViewer.noItemsSold', 'No items sold on this day')}</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1 divide-y divide-gray-50">
              {productBreakdown.map((item) => {
                const stock = stockMap[item.productId] !== undefined ? stockMap[item.productId] : 0;
                const isSoldOut = stock <= 0;
                const revenueShare = totalRevenue > 0 ? ((item.revenue / totalRevenue) * 100).toFixed(1) : 0;
                const icon = item.name.toLowerCase().includes('cookie') ? '🍪' : item.name.toLowerCase().includes('cake') ? '🎂' : item.name.toLowerCase().includes('croissant') ? '🥐' : '🥖';

                return (
                  <div key={item.name} className="pt-2 first:pt-0">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{icon}</span>
                        <div>
                          <div className="font-extrabold text-gray-900 flex items-center gap-1.5">
                            <span>{item.name}</span>
                            {isSoldOut ? (
                              <span className="bg-rose-100 text-rose-800 text-[10px] font-black px-2 py-0.2 rounded-full border border-rose-300">
                                {t('admin.dailySalesViewer.soldOut', 'SOLD OUT')}
                              </span>
                            ) : (
                              <span className="bg-emerald-50 text-[#0E7452] text-[10px] font-bold px-2 py-0.2 rounded-full border border-emerald-100">
                                {t('admin.dailySalesViewer.inShop', '{count} in shop').replace('{count}', stock)}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-gray-400 font-medium">
                            {t('admin.dailySalesViewer.soldAt', '{qty} pcs sold @ {price}').replace('{qty}', item.quantity).replace('{price}', formatETB(item.unitPrice))}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-black text-gray-900 text-sm">{formatETB(item.revenue)}</div>
                        <span className="text-[10px] font-bold text-gray-400">{t('admin.dailySalesViewer.shareOfDay', '{pct}% of day').replace('{pct}', revenueShare)}</span>
                      </div>
                    </div>

                    {/* Progress Bar for Revenue Share */}
                    <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1.5 overflow-hidden">
                      <div 
                        className="bg-[#0E7452] h-full rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, Math.max(2, revenueShare))}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right 5 cols: Hourly Peak Rush Chart */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-gray-100 p-6 shadow-[0_4px_24px_rgba(0,0,0,0.02)] flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div>
              <h3 className="font-extrabold text-gray-900 text-sm tracking-tight flex items-center gap-2">
                <span>{t('admin.dailySalesViewer.rushHoursTitle', 'Peak Rush Hours')}</span>
                <Clock className="w-3.5 h-3.5 text-[#0E7452]" />
              </h3>
              <p className="text-[11px] text-gray-400 font-medium">{t('admin.dailySalesViewer.rushHoursSubtitle', 'Sales volume distributed by hour of day')}</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-end justify-between h-40 gap-1.5 pt-4 px-2">
              {hourlySales.map((h) => {
                const heightPct = (h.revenue / maxHourlyRevenue) * 100;
                const hasActivity = h.count > 0;
                return (
                  <div key={h.hour} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                    {/* Hover Tooltip */}
                    <div className="absolute -top-10 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-150 bg-gray-900 text-white text-[10px] font-bold py-1 px-2 rounded-lg whitespace-nowrap z-20 shadow-md">
                      {t('admin.dailySalesViewer.rushHoursTooltip', '{hour}: {rev} ({count} sales)').replace('{hour}', h.hour).replace('{rev}', formatETB(h.revenue)).replace('{count}', h.count)}
                    </div>

                    <div 
                      className={`w-full rounded-t-lg transition-all duration-300 ${
                        hasActivity 
                          ? 'bg-[#0E7452] group-hover:bg-[#0c6446]' 
                          : 'bg-gray-100 group-hover:bg-gray-200'
                      }`}
                      style={{ height: `${Math.max(6, heightPct)}%` }}
                    />
                    <span className="text-[9px] font-bold text-gray-400 mt-1 rotate-45 sm:rotate-0 origin-left">
                      {h.hour.slice(0, 2)}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="text-center pt-2">
              <span className="text-[11px] font-semibold text-gray-400">
                {t('admin.dailySalesViewer.operatingHours', 'Operating Hours (06:00 AM – 09:00 PM)')}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* 4. Sales Orders Table with Filters & Search & Admin Controls */}
      <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-[0_4px_24px_rgba(0,0,0,0.02)] space-y-4">
        
        {/* Table Filter Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-gray-100">
          <div>
            <h2 className="font-extrabold text-gray-900 text-base tracking-tight flex items-center gap-2">
              <span>{t('admin.dailySalesViewer.txTitle', 'Customer Sales Transactions')}</span>
              <span className="text-xs font-black bg-gray-100 text-gray-700 px-2.5 py-0.5 rounded-full">
                {t('admin.dailySalesViewer.txReceiptsCount', '{count} Receipts').replace('{count}', filteredSales.length)}
              </span>
            </h2>
            <p className="text-xs text-gray-400 font-medium">{t('admin.dailySalesViewer.txSubtitle', 'Click any row to inspect & reprint the official receipt')}</p>
          </div>

          {/* Filter Pills & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
            
            {/* Search Box */}
            <div className="relative w-full sm:w-56">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={t('admin.dailySalesViewer.searchPlaceholder', 'Search receipt, item, customer...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-2xl font-medium focus:bg-white focus:outline-none focus:border-[#0E7452]"
              />
            </div>

            {/* Payment Method Filter */}
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="text-xs font-bold bg-gray-50 border border-gray-200 rounded-2xl px-3 py-1.5 focus:bg-white focus:outline-none focus:border-[#0E7452] cursor-pointer"
            >
              <option value="all">{t('admin.dailySalesViewer.allPaymentMethods', 'All Payment Methods')}</option>
              <option value="cash">{t('admin.dailySalesViewer.cashOnly', 'Cash Only')}</option>
              <option value="bank">{t('admin.dailySalesViewer.bankOnly', 'Bank / CBE Only')}</option>
              <option value="telebirr">{t('admin.dailySalesViewer.telebirrOnly', 'Telebirr Only')}</option>
            </select>

            {/* Cashier Filter */}
            {cashierUsers.length > 0 && (
              <select
                value={cashierFilter}
                onChange={(e) => setCashierFilter(e.target.value)}
                className="text-xs font-bold bg-gray-50 border border-gray-200 rounded-2xl px-3 py-1.5 focus:bg-white focus:outline-none focus:border-[#0E7452] cursor-pointer"
              >
                <option value="all">{t('admin.dailySalesViewer.allCashiers', 'All Cashiers')}</option>
                {cashierUsers.map(u => (
                  <option key={u.id || u.username} value={u.id || u.username}>
                    {u.full_name || u.username}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Transactions Table */}
        {filteredSales.length === 0 ? (
          <div className="text-center py-16 text-gray-400 space-y-2">
            <ShoppingBag className="w-10 h-10 mx-auto text-gray-300" />
            <h3 className="text-sm font-extrabold text-gray-700">{t('admin.dailySalesViewer.noSalesFound', 'No sales transactions found')}</h3>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              {t('admin.dailySalesViewer.noSalesOnDate', 'No sales matching the criteria were recorded on {date}.').replace('{date}', selectedDate)}
            </p>
            {selectedDate !== todayStr && (
              <button
                type="button"
                onClick={() => setSelectedDate(todayStr)}
                className="mt-2 text-xs font-bold text-[#0E7452] hover:underline"
              >
                {t('admin.dailySalesViewer.switchBackToday', 'Switch back to Today')}
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-none">
            <table className="w-full min-w-[680px] text-left text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">
                  <th className="py-3 px-3">{t('admin.dailySalesViewer.colTime', 'Time')}</th>
                  <th className="py-3 px-3">{t('admin.dailySalesViewer.colReceipt', 'Receipt #')}</th>
                  <th className="py-3 px-3">{t('admin.dailySalesViewer.colCashier', 'Cashier')}</th>
                  <th className="py-3 px-3">{t('admin.dailySalesViewer.colCustomer', 'Customer')}</th>
                  <th className="py-3 px-3">{t('admin.dailySalesViewer.colItems', 'Items Purchased')}</th>
                  <th className="py-3 px-3 text-center">{t('admin.dailySalesViewer.colPayment', 'Payment')}</th>
                  <th className="py-3 px-3 text-right">{t('admin.dailySalesViewer.colAmount', 'Amount (ETB)')}</th>
                  <th className="py-3 px-3 text-right">{t('admin.dailySalesViewer.colAction', 'Action')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredSales.map((sale) => {
                  const paymentBadgeColor = 
                    sale.payment_method === 'cash' 
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                      : sale.payment_method === 'bank' 
                      ? 'bg-blue-50 text-blue-800 border-blue-200' 
                      : 'bg-purple-50 text-purple-800 border-purple-200';

                  const isEdited = sale.status === 'edited' || (sale.audit_trail && sale.audit_trail.length > 0);

                  return (
                    <tr 
                      key={sale.id}
                      className="hover:bg-emerald-50/30 transition-colors group"
                    >
                      {/* Time */}
                      <td className="py-3 px-3 font-semibold text-gray-600 whitespace-nowrap">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3 text-gray-400" />
                          <span>{sale.sale_time || '—'}</span>
                        </div>
                      </td>

                      {/* Receipt Number with optional Audit Badge */}
                      <td className="py-3 px-3 font-black text-[#0E7452] font-mono whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => setActiveReceipt(sale)}
                            className="hover:underline flex items-center space-x-1 cursor-pointer"
                          >
                            <span>{sale.receipt_number}</span>
                            <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>

                          {isEdited && (
                            <button
                              type="button"
                              onClick={() => setViewingAuditSale(sale)}
                              className="inline-flex items-center space-x-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-black px-1.5 py-0.5 rounded-md cursor-pointer transition-colors shadow-2xs"
                              title="Click to view edit history"
                            >
                              <History className="w-3 h-3 text-amber-700" />
                              <span>{t('admin.dailySalesViewer.statusEdited', 'EDITED')}</span>
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Cashier */}
                      <td className="py-3 px-3 font-bold text-gray-800 whitespace-nowrap">
                        <div className="flex items-center space-x-1.5">
                          <div className="w-5 h-5 rounded-full bg-emerald-100 text-[#0E7452] flex items-center justify-center text-[10px] font-black">
                            {sale.cashier_name ? sale.cashier_name[0] : 'C'}
                          </div>
                          <span>{sale.cashier_name || t('admin.dailySalesViewer.colCashier', 'Cashier')}</span>
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="py-3 px-3 text-gray-600 font-medium whitespace-nowrap">
                        {sale.customer_name || t('admin.dailySalesViewer.walkInCustomer', 'Walk-in Customer')}
                      </td>

                      {/* Items Purchased Pills */}
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap gap-1 max-w-md">
                          {sale.items?.map((it, idx) => (
                            <span 
                              key={idx}
                              className="inline-flex items-center space-x-1 bg-gray-50 border border-gray-200 text-gray-800 px-2 py-0.5 rounded-lg text-[10px] font-bold"
                            >
                              <span className="text-[#0E7452] font-black">{it.quantity}x</span>
                              <span className="truncate max-w-[120px]">{it.product_name}</span>
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Payment Method Badge */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center space-x-1 border px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${paymentBadgeColor}`}>
                          {sale.payment_method === 'cash' && <Banknote className="w-3 h-3" />}
                          {sale.payment_method === 'bank' && <CreditCard className="w-3 h-3" />}
                          {sale.payment_method === 'telebirr' && <Smartphone className="w-3 h-3" />}
                          <span>{sale.payment_method || 'CASH'}</span>
                        </span>
                      </td>

                      {/* Total Amount */}
                      <td className="py-3 px-3 text-right font-black text-gray-900 text-sm whitespace-nowrap">
                        {formatETB(sale.total_amount)}
                      </td>

                      {/* Admin Actions: Receipt, Edit, Delete */}
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1.5">
                          {/* Receipt */}
                          <button
                            type="button"
                            onClick={() => setActiveReceipt(sale)}
                            className="bg-gray-100 hover:bg-[#0E7452] text-gray-700 hover:text-white font-bold text-[11px] px-2.5 py-1.5 rounded-xl transition-all shadow-2xs cursor-pointer flex items-center space-x-1"
                            title={t('admin.dailySalesViewer.receiptBtn', 'Receipt')}
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">{t('admin.dailySalesViewer.receiptBtn', 'Receipt')}</span>
                          </button>

                          {/* Edit Sale */}
                          <button
                            type="button"
                            onClick={() => openEditModal(sale)}
                            className="p-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 transition-all cursor-pointer shadow-2xs"
                            title={t('admin.dailySalesViewer.editSaleBtn', 'Edit Sale')}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Sale */}
                          <button
                            type="button"
                            onClick={() => openDeleteModal(sale)}
                            className="p-1.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 transition-all cursor-pointer shadow-2xs"
                            title={t('admin.dailySalesViewer.deleteSaleBtn', 'Delete / Void')}
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

      {/* 5. Printable Receipt Modal */}
      {activeReceipt && (
        <ReceiptModal
          sale={activeReceipt}
          onClose={() => setActiveReceipt(null)}
        />
      )}

      {/* ==================================================================== */}
      {/* 6. ADD SALE MODAL (ADMIN MANUAL SALE ENTRY) */}
      {/* ==================================================================== */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-gray-100 shadow-2xl p-6 space-y-5 my-8">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#0E7452] flex items-center justify-center font-bold">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-gray-900 text-base">
                    {t('admin.dailySalesViewer.addSaleModalTitle', 'Record Direct / Manual Sale')}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {t('admin.dailySalesViewer.addSaleModalDesc', 'Enter sales transaction details to update revenue and automatically deduct shelf stock.')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error Message */}
            {actionError && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            <form onSubmit={handleAddSaleSubmit} className="space-y-4">
              {/* Row 1: Date & Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    {t('admin.dailySalesViewer.saleDateLabel', 'Sale Date')}
                  </label>
                  <input
                    type="date"
                    value={addForm.sale_date}
                    onChange={(e) => setAddForm(prev => ({ ...prev, sale_date: e.target.value }))}
                    className="w-full text-xs font-bold bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 focus:bg-white focus:outline-none focus:border-[#0E7452]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    {t('admin.dailySalesViewer.saleTimeLabel', 'Sale Time')}
                  </label>
                  <input
                    type="time"
                    step="1"
                    value={addForm.sale_time}
                    onChange={(e) => setAddForm(prev => ({ ...prev, sale_time: e.target.value }))}
                    className="w-full text-xs font-bold bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 focus:bg-white focus:outline-none focus:border-[#0E7452]"
                    required
                  />
                </div>
              </div>

              {/* Row 2: Cashier & Customer */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    {t('admin.dailySalesViewer.cashierLabel', 'Cashier / Seller')}
                  </label>
                  <select
                    value={addForm.cashier_id}
                    onChange={(e) => {
                      const u = cashierUsers.find(cu => (cu.id || cu.username) === e.target.value);
                      setAddForm(prev => ({
                        ...prev,
                        cashier_id: e.target.value,
                        cashier_name: u ? (u.full_name || u.username) : 'Admin'
                      }));
                    }}
                    className="w-full text-xs font-bold bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 focus:bg-white focus:outline-none focus:border-[#0E7452] cursor-pointer"
                  >
                    {cashierUsers.map(u => (
                      <option key={u.id || u.username} value={u.id || u.username}>
                        {u.full_name || u.username} ({u.role})
                      </option>
                    ))}
                    {cashierUsers.length === 0 && (
                      <option value="admin">Admin</option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    {t('admin.dailySalesViewer.customerLabel', 'Customer Name')}
                  </label>
                  <input
                    type="text"
                    value={addForm.customer_name}
                    placeholder={t('admin.dailySalesViewer.walkInCustomer', 'Walk-in Customer')}
                    onChange={(e) => setAddForm(prev => ({ ...prev, customer_name: e.target.value }))}
                    className="w-full text-xs font-medium bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 focus:bg-white focus:outline-none focus:border-[#0E7452]"
                  />
                </div>
              </div>

              {/* Row 3: Payment Method & Reference */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    {t('admin.dailySalesViewer.paymentMethodLabel', 'Payment Method')}
                  </label>
                  <select
                    value={addForm.payment_method}
                    onChange={(e) => setAddForm(prev => ({ ...prev, payment_method: e.target.value }))}
                    className="w-full text-xs font-bold bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 focus:bg-white focus:outline-none focus:border-[#0E7452] cursor-pointer"
                  >
                    <option value="cash">{t('admin.dailySalesViewer.cashOnly', 'Cash Only')}</option>
                    <option value="bank">{t('admin.dailySalesViewer.bankOnly', 'Bank / CBE Only')}</option>
                    <option value="telebirr">{t('admin.dailySalesViewer.telebirrOnly', 'Telebirr Only')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    {t('admin.dailySalesViewer.paymentRefLabel', 'Payment Reference #')}
                  </label>
                  <input
                    type="text"
                    value={addForm.payment_reference}
                    placeholder="e.g. CBE-TX-99231 / Telebirr Ref"
                    onChange={(e) => setAddForm(prev => ({ ...prev, payment_reference: e.target.value }))}
                    className="w-full text-xs font-medium bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 focus:bg-white focus:outline-none focus:border-[#0E7452]"
                  />
                </div>
              </div>

              {/* Line Items Section */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-extrabold text-gray-800">
                    {t('admin.dailySalesViewer.itemsListLabel', 'Sale Line Items')}
                  </label>
                  <button
                    type="button"
                    onClick={handleAddLineItem}
                    className="text-xs font-black text-[#0E7452] hover:text-[#0c6446] flex items-center space-x-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t('admin.dailySalesViewer.addItemBtn', '+ Add Line Item')}</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {addForm.items.map((it, idx) => {
                    const currentStock = stockMap[it.product_id] !== undefined ? stockMap[it.product_id] : 0;
                    const isExceeding = it.quantity > currentStock;

                    return (
                      <div key={idx} className="bg-gray-50 border border-gray-200 rounded-2xl p-2.5 space-y-2">
                        <div className="grid grid-cols-12 gap-2 items-center">
                          {/* Product Selection */}
                          <div className="col-span-5">
                            <select
                              value={it.product_id}
                              onChange={(e) => handleAddLineItemChange(idx, 'product_id', e.target.value)}
                              className="w-full text-xs font-bold bg-white border border-gray-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-[#0E7452] cursor-pointer"
                            >
                              <option value="">{t('admin.dailySalesViewer.selectProductPlaceholder', 'Select product...')}</option>
                              {products.map(p => (
                                <option key={p.id} value={p.id}>
                                  {p.name} — {formatETB(p.selling_price)} ({stockMap[p.id] || 0} in shop)
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Qty */}
                          <div className="col-span-2">
                            <input
                              type="number"
                              min="1"
                              value={it.quantity}
                              onChange={(e) => handleAddLineItemChange(idx, 'quantity', e.target.value)}
                              className="w-full text-xs font-bold text-center bg-white border border-gray-200 rounded-xl px-2 py-1.5 focus:outline-none focus:border-[#0E7452]"
                              placeholder={t('admin.dailySalesViewer.qtyLabel', 'Qty')}
                            />
                          </div>

                          {/* Unit Price */}
                          <div className="col-span-2">
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              value={it.unit_price}
                              onChange={(e) => handleAddLineItemChange(idx, 'unit_price', e.target.value)}
                              className="w-full text-xs font-bold text-right bg-white border border-gray-200 rounded-xl px-2 py-1.5 focus:outline-none focus:border-[#0E7452]"
                              placeholder={t('admin.dailySalesViewer.priceLabel', 'Price (ETB)')}
                            />
                          </div>

                          {/* Line Total */}
                          <div className="col-span-2 text-right font-black text-gray-900 text-xs">
                            {formatETB(it.total_price)}
                          </div>

                          {/* Remove button */}
                          <div className="col-span-1 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveAddLineItem(idx)}
                              disabled={addForm.items.length <= 1}
                              className={`p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors ${addForm.items.length <= 1 ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Stock indicator info */}
                        <div className="flex items-center justify-between text-[10px] text-gray-500 font-medium px-1">
                          <span>
                            {t('admin.dailySalesViewer.stockAvailable', '({qty} available)').replace('{qty}', currentStock)}
                          </span>
                          {isExceeding && (
                            <span className="text-amber-700 font-bold flex items-center space-x-1">
                              <AlertTriangle className="w-3 h-3" />
                              <span>Requested quantity exceeds available shelf stock!</span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  {t('admin.dailySalesViewer.remarksLabel', 'Remarks / Notes')}
                </label>
                <input
                  type="text"
                  value={addForm.remarks}
                  placeholder="e.g. Special order, discount applied, cash delivery"
                  onChange={(e) => setAddForm(prev => ({ ...prev, remarks: e.target.value }))}
                  className="w-full text-xs font-medium bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 focus:bg-white focus:outline-none focus:border-[#0E7452]"
                />
              </div>

              {/* Grand Total Summary Card */}
              <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-3 flex items-center justify-between">
                <div>
                  <span className="text-xs font-black text-gray-800">{t('admin.dailySalesViewer.grandTotalLabel', 'Grand Total:')}</span>
                  <p className="text-[11px] text-emerald-800 font-bold">
                    {addFormPieces} {t('common.pieces', 'pcs')} {t('admin.dailySalesViewer.piecesSold', 'Pieces Sold')}
                  </p>
                </div>
                <div className="text-lg font-black text-[#0E7452]">
                  {formatETB(addFormTotal)}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-2xl border border-gray-200 text-gray-700 font-bold text-xs hover:bg-gray-100 cursor-pointer"
                >
                  {t('admin.dailySalesViewer.cancelBtn', 'Cancel')}
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
                  <span>{t('admin.dailySalesViewer.createSaleBtn', 'Record Sale & Deduct Stock')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 7. EDIT SALE MODAL (ADMIN MODIFY EXISTING SALE) */}
      {/* ==================================================================== */}
      {editingSale && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-gray-100 shadow-2xl p-6 space-y-5 my-8">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-gray-900 text-base">
                    {t('admin.dailySalesViewer.editSaleModalTitle', 'Edit Sales Receipt #{receipt}').replace('{receipt}', editingSale.receipt_number)}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {t('admin.dailySalesViewer.editSaleModalDesc', 'Modify quantities, items, payment method or cashier. Stock adjustments will be calculated automatically.')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingSale(null)}
                className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error Message */}
            {actionError && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            <form onSubmit={handleEditSaleSubmit} className="space-y-4">
              {/* Row 1: Date & Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    {t('admin.dailySalesViewer.saleDateLabel', 'Sale Date')}
                  </label>
                  <input
                    type="date"
                    value={editForm.sale_date}
                    onChange={(e) => setEditForm(prev => ({ ...prev, sale_date: e.target.value }))}
                    className="w-full text-xs font-bold bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 focus:bg-white focus:outline-none focus:border-[#0E7452]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    {t('admin.dailySalesViewer.saleTimeLabel', 'Sale Time')}
                  </label>
                  <input
                    type="time"
                    step="1"
                    value={editForm.sale_time}
                    onChange={(e) => setEditForm(prev => ({ ...prev, sale_time: e.target.value }))}
                    className="w-full text-xs font-bold bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 focus:bg-white focus:outline-none focus:border-[#0E7452]"
                    required
                  />
                </div>
              </div>

              {/* Row 2: Cashier & Customer */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    {t('admin.dailySalesViewer.cashierLabel', 'Cashier / Seller')}
                  </label>
                  <select
                    value={editForm.cashier_id}
                    onChange={(e) => {
                      const u = cashierUsers.find(cu => (cu.id || cu.username) === e.target.value);
                      setEditForm(prev => ({
                        ...prev,
                        cashier_id: e.target.value,
                        cashier_name: u ? (u.full_name || u.username) : prev.cashier_name
                      }));
                    }}
                    className="w-full text-xs font-bold bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 focus:bg-white focus:outline-none focus:border-[#0E7452] cursor-pointer"
                  >
                    {cashierUsers.map(u => (
                      <option key={u.id || u.username} value={u.id || u.username}>
                        {u.full_name || u.username} ({u.role})
                      </option>
                    ))}
                    {cashierUsers.length === 0 && (
                      <option value="admin">Admin</option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    {t('admin.dailySalesViewer.customerLabel', 'Customer Name')}
                  </label>
                  <input
                    type="text"
                    value={editForm.customer_name}
                    placeholder={t('admin.dailySalesViewer.walkInCustomer', 'Walk-in Customer')}
                    onChange={(e) => setEditForm(prev => ({ ...prev, customer_name: e.target.value }))}
                    className="w-full text-xs font-medium bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 focus:bg-white focus:outline-none focus:border-[#0E7452]"
                  />
                </div>
              </div>

              {/* Row 3: Payment Method & Reference */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    {t('admin.dailySalesViewer.paymentMethodLabel', 'Payment Method')}
                  </label>
                  <select
                    value={editForm.payment_method}
                    onChange={(e) => setEditForm(prev => ({ ...prev, payment_method: e.target.value }))}
                    className="w-full text-xs font-bold bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 focus:bg-white focus:outline-none focus:border-[#0E7452] cursor-pointer"
                  >
                    <option value="cash">{t('admin.dailySalesViewer.cashOnly', 'Cash Only')}</option>
                    <option value="bank">{t('admin.dailySalesViewer.bankOnly', 'Bank / CBE Only')}</option>
                    <option value="telebirr">{t('admin.dailySalesViewer.telebirrOnly', 'Telebirr Only')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    {t('admin.dailySalesViewer.paymentRefLabel', 'Payment Reference #')}
                  </label>
                  <input
                    type="text"
                    value={editForm.payment_reference}
                    placeholder="e.g. CBE-TX-99231 / Telebirr Ref"
                    onChange={(e) => setEditForm(prev => ({ ...prev, payment_reference: e.target.value }))}
                    className="w-full text-xs font-medium bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 focus:bg-white focus:outline-none focus:border-[#0E7452]"
                  />
                </div>
              </div>

              {/* Line Items Section */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-extrabold text-gray-800">
                    {t('admin.dailySalesViewer.itemsListLabel', 'Sale Line Items')}
                  </label>
                  <button
                    type="button"
                    onClick={handleAddEditLineItem}
                    className="text-xs font-black text-blue-700 hover:text-blue-900 flex items-center space-x-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t('admin.dailySalesViewer.addItemBtn', '+ Add Line Item')}</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {editForm.items.map((it, idx) => {
                    const currentStock = stockMap[it.product_id] !== undefined ? stockMap[it.product_id] : 0;
                    const origQty = it.original_quantity || 0;
                    const diff = (it.quantity || 0) - origQty;

                    return (
                      <div key={idx} className="bg-gray-50 border border-gray-200 rounded-2xl p-2.5 space-y-2">
                        <div className="grid grid-cols-12 gap-2 items-center">
                          {/* Product Selection */}
                          <div className="col-span-5">
                            <select
                              value={it.product_id}
                              onChange={(e) => handleEditLineItemChange(idx, 'product_id', e.target.value)}
                              className="w-full text-xs font-bold bg-white border border-gray-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-blue-600 cursor-pointer"
                            >
                              <option value="">{t('admin.dailySalesViewer.selectProductPlaceholder', 'Select product...')}</option>
                              {products.map(p => (
                                <option key={p.id} value={p.id}>
                                  {p.name} — {formatETB(p.selling_price)}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Qty */}
                          <div className="col-span-2">
                            <input
                              type="number"
                              min="1"
                              value={it.quantity}
                              onChange={(e) => handleEditLineItemChange(idx, 'quantity', e.target.value)}
                              className="w-full text-xs font-bold text-center bg-white border border-gray-200 rounded-xl px-2 py-1.5 focus:outline-none focus:border-blue-600"
                              placeholder={t('admin.dailySalesViewer.qtyLabel', 'Qty')}
                            />
                          </div>

                          {/* Unit Price */}
                          <div className="col-span-2">
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              value={it.unit_price}
                              onChange={(e) => handleEditLineItemChange(idx, 'unit_price', e.target.value)}
                              className="w-full text-xs font-bold text-right bg-white border border-gray-200 rounded-xl px-2 py-1.5 focus:outline-none focus:border-blue-600"
                              placeholder={t('admin.dailySalesViewer.priceLabel', 'Price (ETB)')}
                            />
                          </div>

                          {/* Line Total */}
                          <div className="col-span-2 text-right font-black text-gray-900 text-xs">
                            {formatETB(it.total_price)}
                          </div>

                          {/* Remove button */}
                          <div className="col-span-1 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveEditLineItem(idx)}
                              disabled={editForm.items.length <= 1}
                              className={`p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors ${editForm.items.length <= 1 ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Stock delta explanation */}
                        <div className="flex items-center justify-between text-[10px] px-1 font-semibold">
                          <span className="text-gray-500">
                            Available in shop: {currentStock} pcs
                          </span>
                          {diff > 0 && (
                            <span className="text-amber-700 font-bold">
                              +{diff} pcs will be deducted from shop stock
                            </span>
                          )}
                          {diff < 0 && (
                            <span className="text-emerald-700 font-bold">
                              {Math.abs(diff)} pcs will be restored back to shop stock
                            </span>
                          )}
                          {diff === 0 && (
                            <span className="text-gray-400">
                              (Quantity unchanged)
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Mandatory Reason for Edit */}
              <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-3 space-y-1.5">
                <label className="block text-xs font-black text-amber-900">
                  {t('admin.dailySalesViewer.reasonLabel', 'Reason for Edit / Modification *')}
                </label>
                <input
                  type="text"
                  value={editForm.reason}
                  placeholder={t('admin.dailySalesViewer.reasonPlaceholder', 'e.g. Customer returned bread, cashier error correction')}
                  onChange={(e) => setEditForm(prev => ({ ...prev, reason: e.target.value }))}
                  className="w-full text-xs font-bold bg-white border border-amber-300 rounded-xl px-3 py-2 text-gray-900 focus:outline-none focus:border-amber-600"
                  required
                />
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  {t('admin.dailySalesViewer.remarksLabel', 'Remarks / Notes')}
                </label>
                <input
                  type="text"
                  value={editForm.remarks}
                  placeholder="Additional notes"
                  onChange={(e) => setEditForm(prev => ({ ...prev, remarks: e.target.value }))}
                  className="w-full text-xs font-medium bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 focus:bg-white focus:outline-none focus:border-blue-600"
                />
              </div>

              {/* Grand Total Summary Card */}
              <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-3 flex items-center justify-between">
                <div>
                  <span className="text-xs font-black text-gray-800">{t('admin.dailySalesViewer.grandTotalLabel', 'Grand Total:')}</span>
                  <p className="text-[11px] text-blue-800 font-bold">
                    {editFormPieces} {t('common.pieces', 'pcs')} {t('admin.dailySalesViewer.piecesSold', 'Pieces Sold')}
                  </p>
                </div>
                <div className="text-lg font-black text-blue-900">
                  {formatETB(editFormTotal)}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingSale(null)}
                  className="px-4 py-2 rounded-2xl border border-gray-200 text-gray-700 font-bold text-xs hover:bg-gray-100 cursor-pointer"
                >
                  {t('admin.dailySalesViewer.cancelBtn', 'Cancel')}
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
                  <span>{t('admin.dailySalesViewer.saveSaleBtn', 'Save Changes & Update Inventory')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 8. DELETE / VOID SALE MODAL */}
      {/* ==================================================================== */}
      {deletingSale && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-gray-100 shadow-2xl p-6 space-y-4">
            {/* Header */}
            <div className="flex items-center space-x-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-700 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-gray-900 text-base">
                  {t('admin.dailySalesViewer.deleteSaleModalTitle', 'Void / Delete Sales Receipt #{receipt}').replace('{receipt}', deletingSale.receipt_number)}
                </h3>
                <p className="text-xs text-gray-500 font-medium">
                  {deletingSale.sale_date} • {deletingSale.sale_time || ''} • {deletingSale.cashier_name}
                </p>
              </div>
            </div>

            {/* Error Message */}
            {actionError && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            {/* Warning Box */}
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 space-y-2">
              <p className="text-xs text-rose-900 font-semibold leading-relaxed">
                {t('admin.dailySalesViewer.deleteSaleWarning', 'Deleting this sale will permanently remove it from revenue records and automatically restore all {count} pieces back into shop inventory.').replace(
                  '{count}',
                  deletingSale.items?.reduce((s, it) => s + (it.quantity || 0), 0) || 0
                )}
              </p>
              <div className="border-t border-rose-200 pt-2 flex items-center justify-between text-xs font-bold text-rose-900">
                <span>{t('admin.dailySalesViewer.totalRefundAmount', 'Total Refund / Void Amount:')}</span>
                <span className="font-black text-sm">{formatETB(deletingSale.total_amount)}</span>
              </div>
            </div>

            {/* Sold Items Summary to restore */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                {t('admin.dailySalesViewer.itemsToRestore', 'Items to restore to shelf stock:')}
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                {deletingSale.items?.map((it, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center space-x-1.5 bg-gray-50 border border-gray-200 text-gray-800 px-2.5 py-1 rounded-xl text-xs font-bold"
                  >
                    <span className="text-emerald-700 font-black">+{it.quantity}</span>
                    <span>{it.product_name}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Reason for Deletion */}
            <form onSubmit={handleDeleteSaleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-gray-800 mb-1">
                  {t('admin.dailySalesViewer.deleteReasonLabel', 'Reason for Voiding / Deletion *')}
                </label>
                <input
                  type="text"
                  value={deleteReason}
                  placeholder={t('admin.dailySalesViewer.deleteReasonPlaceholder', 'e.g. Order cancelled, duplicate entry, cashier mistake')}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  className="w-full text-xs font-bold bg-gray-50 border border-gray-300 rounded-2xl px-3 py-2 text-gray-900 focus:bg-white focus:outline-none focus:border-rose-600"
                  required
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setDeletingSale(null)}
                  className="px-4 py-2 rounded-2xl border border-gray-200 text-gray-700 font-bold text-xs hover:bg-gray-100 cursor-pointer"
                >
                  {t('admin.dailySalesViewer.cancelBtn', 'Cancel')}
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
                  <span>{t('admin.dailySalesViewer.deleteConfirmBtn', 'Confirm Delete & Restore Stock')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 9. VIEW AUDIT TRAIL MODAL */}
      {/* ==================================================================== */}
      {viewingAuditSale && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-gray-100 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-800 flex items-center justify-center font-bold">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-gray-900 text-base">
                    Audit Log: Receipt #{viewingAuditSale.receipt_number}
                  </h3>
                  <p className="text-xs text-gray-500 font-medium">
                    {t('admin.dailySalesViewer.auditLogSubtitle', 'Modification history and supervisor reasons')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingAuditSale(null)}
                className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {viewingAuditSale.audit_trail && viewingAuditSale.audit_trail.length > 0 ? (
                viewingAuditSale.audit_trail.map((entry, idx) => (
                  <div key={idx} className="bg-gray-50 border border-gray-200 rounded-2xl p-3 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-[#0E7452] uppercase tracking-wider text-[10px]">
                        {entry.action || 'MODIFIED'}
                      </span>
                      <span className="text-gray-400 font-medium text-[10px]">
                        {entry.timestamp ? new Date(entry.timestamp).toLocaleString() : '—'}
                      </span>
                    </div>
                    <div className="font-bold text-gray-800">
                      Modified By: <span className="font-medium text-gray-600">{entry.modified_by || 'Admin'}</span>
                    </div>
                    <div className="bg-white rounded-xl p-2 border border-gray-100 text-gray-700 italic">
                      "{entry.reason || 'No reason provided'}"
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-400 text-xs font-bold">
                  No modification records found for this receipt.
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-gray-100 text-right">
              <button
                type="button"
                onClick={() => setViewingAuditSale(null)}
                className="px-4 py-2 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs cursor-pointer"
              >
                {t('common.close', 'Close')}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
