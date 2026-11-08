import React, { useState } from 'react';
import { 
  Package, 
  Layers, 
  Wheat, 
  Truck, 
  Plus, 
  Edit2, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowDownRight, 
  ArrowUpRight, 
  Clock, 
  Search, 
  Filter, 
  TrendingUp, 
  DollarSign, 
  Sparkles,
  ClipboardCheck,
  ShieldCheck,
  Info
} from 'lucide-react';
import { formatETB } from '../../utils/formatters';
import { useTranslation } from '../../i18n';

export default function StockControlCenter({ 
  admin,
  rawMaterials,
  finishedStock,
  batches,
  branches,
  expenses,
  auditLogs,
  stockChecks,
  onAddMaterial,
  onUpdateMaterial,
  onDeleteMaterial,
  onAdjustStock,
  onAdjustFinishedStock,
  onApproveStockCheck
}) {
  const { t } = useTranslation();
  const [activeSubTab, setActiveSubTab] = useState('raw_materials'); // 'raw_materials', 'finished_goods', 'movement_ledger', 'stock_checks'
  
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  
  // Raw Material Adjust Modal
  const [adjustMaterial, setAdjustMaterial] = useState(null);
  const [rawNewQty, setRawNewQty] = useState('');
  const [rawAdjustReason, setRawAdjustReason] = useState('');

  // Finished Product Stock Adjust Modal
  const [adjustFinishedItem, setAdjustFinishedItem] = useState(null);
  const [finishedNewQty, setFinishedNewQty] = useState('');
  const [finishedAdjustReason, setFinishedAdjustReason] = useState('');

  // Add / Edit Material Form State
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('ingredient');
  const [formQuantity, setFormQuantity] = useState('');
  const [formUnit, setFormUnit] = useState('kg');
  const [formMinStock, setFormMinStock] = useState('10');
  const [formPrice, setFormPrice] = useState('');
  const [formSupplier, setFormSupplier] = useState('');

  // Feedback banner
  const [actionAlert, setActionAlert] = useState('');

  function triggerAlert(msg) {
    setActionAlert(msg);
    setTimeout(() => setActionAlert(''), 5000);
  }

  // Handle Add or Edit Raw Material
  function handleSaveMaterial(e) {
    e.preventDefault();
    if (!formName) return;

    if (editingMaterial) {
      onUpdateMaterial(editingMaterial.id, {
        name: formName,
        category: formCategory,
        unit: formUnit,
        minimum_stock: parseFloat(formMinStock) || 0,
        purchase_price: parseFloat(formPrice) || 0,
        supplier: formSupplier,
      });
      triggerAlert(`✅ Updated ${formName} successfully!`);
    } else {
      onAddMaterial({
        name: formName,
        category: formCategory,
        current_quantity: parseFloat(formQuantity) || 0,
        unit: formUnit,
        minimum_stock: parseFloat(formMinStock) || 0,
        purchase_price: parseFloat(formPrice) || 0,
        supplier: formSupplier,
      });
      triggerAlert(`✅ Added new material: ${formName}!`);
    }

    closeMaterialModal();
  }

  function openEditModal(mat) {
    setEditingMaterial(mat);
    setFormName(mat.name);
    setFormCategory(mat.category);
    setFormQuantity(String(mat.current_quantity));
    setFormUnit(mat.unit);
    setFormMinStock(String(mat.minimum_stock));
    setFormPrice(String(mat.purchase_price || 0));
    setFormSupplier(mat.supplier || '');
    setShowAddModal(true);
  }

  function closeMaterialModal() {
    setShowAddModal(false);
    setEditingMaterial(null);
    setFormName('');
    setFormQuantity('');
    setFormPrice('');
    setFormSupplier('');
  }

  // Handle Raw Material Adjustment
  function handleRawAdjustSubmit(e) {
    e.preventDefault();
    if (!adjustMaterial || rawNewQty === '' || !rawAdjustReason) return;

    onAdjustStock({
      material_id: adjustMaterial.id,
      new_quantity: parseFloat(rawNewQty),
      reason: rawAdjustReason,
      admin_name: admin.full_name || 'Admin Abebe',
    });

    triggerAlert(`✅ Stock for ${adjustMaterial.name} adjusted to ${rawNewQty} ${adjustMaterial.unit}!`);
    setAdjustMaterial(null);
    setRawNewQty('');
    setRawAdjustReason('');
  }

  // Handle Finished Product Adjustment
  function handleFinishedAdjustSubmit(e) {
    e.preventDefault();
    if (!adjustFinishedItem || finishedNewQty === '' || !finishedAdjustReason) return;

    onAdjustFinishedStock({
      stock_id: adjustFinishedItem.id,
      new_quantity: parseInt(finishedNewQty, 10),
      reason: finishedAdjustReason,
      admin_name: admin.full_name || 'Admin Abebe',
    });

    triggerAlert(`✅ Stock for ${adjustFinishedItem.product_name} adjusted to ${finishedNewQty} pcs!`);
    setAdjustFinishedItem(null);
    setFinishedNewQty('');
    setFinishedAdjustReason('');
  }

  // Metrics
  const lowMaterials = rawMaterials.filter(m => m.current_quantity <= m.minimum_stock);
  const totalRawValue = rawMaterials.reduce((sum, m) => sum + (m.current_quantity * (m.purchase_price || 0)), 0);
  const totalFinishedPcs = finishedStock.reduce((sum, f) => sum + f.available_quantity, 0);
  const totalFinishedValue = finishedStock.reduce((sum, f) => sum + (f.available_quantity * (f.selling_price || 0)), 0);

  // Filtered raw materials
  const filteredMaterials = rawMaterials.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (m.supplier && m.supplier.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = categoryFilter === 'all' || m.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Filtered finished stock
  const filteredFinished = finishedStock.filter(f => {
    const matchesSearch = f.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (f.category && f.category.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesBranch = branchFilter === 'all' || f.branch_id === branchFilter;
    return matchesSearch && matchesBranch;
  });

  // Recharges by Cashier
  const cashierRecharges = expenses.filter(e => e.is_inventory_purchase);

  // Admin adjustments from audit logs
  const stockAdjustLogs = auditLogs.filter(a => a.action?.includes('ADJUST_'));

  return (
    <div className="space-y-6">
      
      {/* Stock Control Header */}
      <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 bg-emerald-100 text-[#064e3b] text-xs font-black px-3 py-1 rounded-full mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{t('admin.stockControlCenter.badge', 'Administrator Control Center')}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
            {t('admin.stockControlCenter.title', 'Central Bakery Stock Control')}
          </h1>
          <p className="text-xs text-stone-500 font-semibold mt-1">
            {t('admin.stockControlCenter.desc', 'Complete management over raw ingredients, finished goods, baker consumption deductions, and cashier restock purchases.')}
          </p>
        </div>

        <button
          onClick={() => {
            setEditingMaterial(null);
            setFormName('');
            setFormCategory('ingredient');
            setFormQuantity('');
            setFormUnit('kg');
            setFormMinStock('10');
            setFormPrice('');
            setFormSupplier('');
            setShowAddModal(true);
          }}
          className="bg-[#064e3b] hover:bg-emerald-900 text-white font-black text-xs px-5 py-3 rounded-2xl shadow-xs transition-all flex items-center space-x-2 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 text-emerald-300" />
          <span>{t('admin.stockControlCenter.addIngredientBtn', 'Add New Ingredient / Packaging')}</span>
        </button>
      </div>

      {/* Action Notification Alert */}
      {actionAlert && (
        <div className="bg-emerald-100 border-2 border-emerald-600 text-emerald-950 rounded-2xl p-4 flex items-center justify-between shadow-md text-sm font-black animate-in fade-in">
          <span>{actionAlert}</span>
          <button onClick={() => setActionAlert('')} className="text-emerald-800 font-bold text-lg">✕</button>
        </div>
      )}

      {/* 4 Overview KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">{t('admin.stockControlCenter.rawIngredients', 'Raw Ingredients')}</span>
            <Package className="w-4 h-4 text-[#064e3b]" />
          </div>
          <div className="text-2xl font-black text-stone-900 mt-2">
            {t('admin.stockControlCenter.itemsCount', '{count} Items').replace('{count}', rawMaterials.length)}
          </div>
          <div className="text-[11px] text-stone-500 font-semibold mt-1">{t('admin.stockControlCenter.flourYeastSpices', 'Flour, Yeast, Spices, Bags')}</div>
        </div>

        <div className={`p-5 rounded-3xl border shadow-xs transition-all ${
          lowMaterials.length > 0 ? 'bg-rose-50 border-rose-300 text-rose-950' : 'bg-white border-stone-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider">{t('admin.stockControlCenter.lowStockWarnings', 'Low Stock Warnings')}</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-700 mt-2">
            {t('admin.stockControlCenter.alertsCount', '{count} Alert(s)').replace('{count}', lowMaterials.length)}
          </div>
          <div className="text-[11px] text-rose-600 font-semibold mt-1">
            {lowMaterials.length > 0 ? t('admin.stockControlCenter.requiresRestock', 'Requires Cashier Restock') : t('admin.stockControlCenter.allHealthy', 'All stocks healthy')}
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">{t('admin.stockControlCenter.storeIngredientsValue', 'Store Ingredients Value')}</span>
            <DollarSign className="w-4 h-4 text-[#064e3b]" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-[#064e3b] mt-2">{formatETB(totalRawValue)}</div>
          <div className="text-[11px] text-stone-500 font-semibold mt-1">{t('admin.stockControlCenter.atCurrentCosts', 'At current purchase costs')}</div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">{t('admin.stockControlCenter.finishedReadyStock', 'Finished Ready Stock')}</span>
            <Wheat className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-stone-900 mt-2">{totalFinishedPcs} {t('common.pieces', 'pcs')}</div>
          <div className="text-[11px] text-amber-700 font-bold mt-1">
            {t('admin.stockControlCenter.finishedRetailValue', 'Value: {val}').replace('{val}', formatETB(totalFinishedValue))}
          </div>
        </div>
      </div>

      {/* Sub Navigation Tabs */}
      <div className="bg-white rounded-3xl border border-stone-200 p-2 shadow-xs">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => setActiveSubTab('raw_materials')}
            className={`p-3 rounded-2xl text-center transition-all cursor-pointer ${
              activeSubTab === 'raw_materials'
                ? 'bg-[#064e3b] text-white shadow-md font-black ring-2 ring-emerald-500'
                : 'bg-stone-50 text-stone-700 hover:bg-stone-100 font-bold'
            }`}
          >
            <div className="text-xs font-black truncate">{t('admin.stockControlCenter.tabRawMaterials', '🌾 Raw Materials & Ingredients')}</div>
            <div className={`text-[10px] mt-0.5 truncate ${activeSubTab === 'raw_materials' ? 'text-emerald-200' : 'text-stone-400'}`}>
              {t('admin.stockControlCenter.tabRawMaterialsSub', 'Balances, Alerts & Controls')}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('finished_goods')}
            className={`p-3 rounded-2xl text-center transition-all cursor-pointer ${
              activeSubTab === 'finished_goods'
                ? 'bg-[#064e3b] text-white shadow-md font-black ring-2 ring-emerald-500'
                : 'bg-stone-50 text-stone-700 hover:bg-stone-100 font-bold'
            }`}
          >
            <div className="text-xs font-black truncate">{t('admin.stockControlCenter.tabFinishedGoods', '🥖 Ready Finished Stock')}</div>
            <div className={`text-[10px] mt-0.5 truncate ${activeSubTab === 'finished_goods' ? 'text-emerald-200' : 'text-stone-400'}`}>
              {t('admin.stockControlCenter.tabFinishedGoodsSub', 'Branch Breads, Cookies & Cakes')}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('movement_ledger')}
            className={`p-3 rounded-2xl text-center transition-all cursor-pointer ${
              activeSubTab === 'movement_ledger'
                ? 'bg-[#064e3b] text-white shadow-md font-black ring-2 ring-emerald-500'
                : 'bg-stone-50 text-stone-700 hover:bg-stone-100 font-bold'
            }`}
          >
            <div className="text-xs font-black truncate">{t('admin.stockControlCenter.tabMovementLedger', '🔄 Movement & Audit Ledger')}</div>
            <div className={`text-[10px] mt-0.5 truncate ${activeSubTab === 'movement_ledger' ? 'text-emerald-200' : 'text-stone-400'}`}>
              {t('admin.stockControlCenter.tabMovementLedgerSub', 'Baker Deductions vs Cashier Restocks')}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('stock_checks')}
            className={`p-3 rounded-2xl text-center transition-all cursor-pointer ${
              activeSubTab === 'stock_checks'
                ? 'bg-[#064e3b] text-white shadow-md font-black ring-2 ring-emerald-500'
                : 'bg-stone-50 text-stone-700 hover:bg-stone-100 font-bold'
            }`}
          >
            <div className="text-xs font-black truncate">{t('admin.stockControlCenter.tabStockChecks', '📋 Weekly Physical Counts')}</div>
            <div className={`text-[10px] mt-0.5 truncate ${activeSubTab === 'stock_checks' ? 'text-emerald-200' : 'text-stone-400'}`}>
              {t('admin.stockControlCenter.tabStockChecksSub', 'Audit & Discrepancy Approval')}
            </div>
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: RAW MATERIALS CONTROL */}
      {activeSubTab === 'raw_materials' && (
        <div className="space-y-6">
          
          {/* Search & Filter Bar */}
          <div className="bg-white rounded-3xl border border-stone-200 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder={t('admin.stockControlCenter.searchIngredient', 'Search ingredient or supplier...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs font-semibold pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#064e3b]"
              />
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <span className="text-xs font-bold text-stone-500">{t('admin.stockControlCenter.categoryFilter', 'Category:')}</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="text-xs font-bold bg-stone-50 border border-stone-200 rounded-xl px-3 py-2"
              >
                <option value="all">{t('admin.stockControlCenter.allCategories', 'All Categories')}</option>
                <option value="ingredient">{t('admin.stockControlCenter.ingredientsOnly', 'Ingredients')}</option>
                <option value="packaging">{t('admin.stockControlCenter.packagingOnly', 'Packaging')}</option>
              </select>
            </div>
          </div>

          {/* Raw Materials Table */}
          <div className="bg-white rounded-3xl border border-stone-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto scrollbar-none">
              <table className="w-full min-w-[750px] text-left text-xs">
                <thead className="bg-stone-100 text-stone-600 font-bold uppercase text-[10px] border-b border-stone-200">
                  <tr>
                    <th className="py-3 px-4">{t('admin.stockControlCenter.colItemName', 'Item Name')}</th>
                    <th className="py-3 px-4">{t('admin.stockControlCenter.colCategory', 'Category')}</th>
                    <th className="py-3 px-4 text-right">{t('admin.stockControlCenter.colCurrentStock', 'Current Stock')}</th>
                    <th className="py-3 px-4 text-center">{t('admin.stockControlCenter.colUnit', 'Unit')}</th>
                    <th className="py-3 px-4 text-right">{t('admin.stockControlCenter.colMinAlert', 'Min Alert Level')}</th>
                    <th className="py-3 px-4 text-right">{t('admin.stockControlCenter.colUnitCost', 'Unit Cost (ETB)')}</th>
                    <th className="py-3 px-4 text-right">{t('admin.stockControlCenter.colStockValuation', 'Stock Valuation')}</th>
                    <th className="py-3 px-4">{t('admin.stockControlCenter.colSupplier', 'Supplier')}</th>
                    <th className="py-3 px-4 text-center">{t('admin.stockControlCenter.colStatus', 'Status')}</th>
                    <th className="py-3 px-4 text-right">{t('admin.stockControlCenter.colAdminActions', 'Admin Actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredMaterials.map((m) => {
                    const isLow = m.current_quantity <= m.minimum_stock;
                    const valuation = m.current_quantity * (m.purchase_price || 0);

                    return (
                      <tr key={m.id} className={isLow ? 'bg-rose-50/40 hover:bg-rose-50/70' : 'hover:bg-stone-50'}>
                        <td className="py-3.5 px-4 font-black text-stone-900 flex items-center space-x-2">
                          <span>{m.name}</span>
                          {isLow && (
                            <span className="text-[10px] bg-rose-100 text-rose-800 font-black px-2 py-0.5 rounded-full flex items-center space-x-1">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              <span>{t('admin.stockControlCenter.statusLow', 'LOW')}</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 capitalize font-semibold text-stone-600">{m.category}</td>
                        <td className={`py-3.5 px-4 text-right font-black ${isLow ? 'text-rose-700 text-sm' : 'text-stone-900'}`}>
                          {m.current_quantity}
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-stone-500">{m.unit}</td>
                        <td className="py-3.5 px-4 text-right font-bold text-stone-600">{m.minimum_stock}</td>
                        <td className="py-3.5 px-4 text-right font-bold text-stone-700">{formatETB(m.purchase_price)}</td>
                        <td className="py-3.5 px-4 text-right font-black text-[#064e3b]">{formatETB(valuation)}</td>
                        <td className="py-3.5 px-4 text-stone-600 truncate max-w-[140px] font-semibold">{m.supplier || '-'}</td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase ${
                            isLow ? 'bg-rose-100 text-rose-800 border border-rose-300' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {isLow ? t('admin.stockControlCenter.statusRecharge', 'Recharge Needed') : t('admin.stockControlCenter.statusAdequate', 'Adequate')}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-1">
                          <button
                            onClick={() => {
                              setAdjustMaterial(m);
                              setRawNewQty(String(m.current_quantity));
                              setRawAdjustReason('');
                            }}
                            className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-black text-[11px] px-2.5 py-1.5 rounded-lg transition-all cursor-pointer"
                            title="Directly Adjust Physical Stock"
                          >
                            {t('admin.stockControlCenter.btnAdjustStock', 'Adjust Stock')}
                          </button>
                          <button
                            onClick={() => openEditModal(m)}
                            className="p-1.5 text-stone-600 hover:text-stone-900 rounded-lg hover:bg-stone-100"
                            title={t('admin.stockControlCenter.btnEdit', 'Edit')}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete ${m.name}?`)) {
                                onDeleteMaterial(m.id);
                                triggerAlert(`Deleted ${m.name}`);
                              }
                            }}
                            className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                            title={t('admin.stockControlCenter.btnDelete', 'Delete')}
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
        </div>
      )}

      {/* SUB-TAB 2: FINISHED PRODUCTS STOCK CONTROL */}
      {activeSubTab === 'finished_goods' && (
        <div className="space-y-6">
          
          {/* Filter Bar */}
          <div className="bg-white rounded-3xl border border-stone-200 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder={t('admin.stockControlCenter.searchIngredient', 'Search finished product...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs font-semibold pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#064e3b]"
              />
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <span className="text-xs font-bold text-stone-500">{t('admin.stockControlCenter.branchFilter', 'Shop / Branch:')}</span>
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="text-xs font-bold bg-stone-50 border border-stone-200 rounded-xl px-3 py-2"
              >
                <option value="all">{t('admin.stockControlCenter.allBranches', 'All Branches')}</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Finished Stock Table */}
          <div className="bg-white rounded-3xl border border-stone-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto scrollbar-none">
              <table className="w-full min-w-[700px] text-left text-xs">
                <thead className="bg-stone-100 text-stone-600 font-bold uppercase text-[10px] border-b border-stone-200">
                  <tr>
                    <th className="py-3 px-4">{t('admin.stockControlCenter.colProduct', 'Product Variety')}</th>
                    <th className="py-3 px-4">{t('admin.stockControlCenter.colCategory', 'Category')}</th>
                    <th className="py-3 px-4">{t('admin.stockControlCenter.colShopBranch', 'Shop / Branch')}</th>
                    <th className="py-3 px-4 text-right">{t('admin.stockControlCenter.colAvailablePcs', 'Available Stock')}</th>
                    <th className="py-3 px-4 text-right">Unit Weight (g)</th>
                    <th className="py-3 px-4 text-right">{t('admin.stockControlCenter.colRetailPrice', 'Selling Price (ETB)')}</th>
                    <th className="py-3 px-4 text-right">{t('admin.stockControlCenter.colTotalRetail', 'Potential Sales Value')}</th>
                    <th className="py-3 px-4 text-right">{t('admin.stockControlCenter.colAdminActions', 'Admin Actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredFinished.map((item) => {
                    const branchName = branches.find(b => b.id === item.branch_id)?.name || item.branch_id || 'Main Branch';
                    const potentialVal = item.available_quantity * (item.selling_price || 0);

                    return (
                      <tr key={item.id} className="hover:bg-stone-50">
                        <td className="py-3.5 px-4 font-black text-stone-900">{item.product_name}</td>
                        <td className="py-3.5 px-4 text-stone-600 font-semibold">{item.category || 'Bakery'}</td>
                        <td className="py-3.5 px-4">
                          <span className="bg-stone-100 text-stone-800 font-bold px-2.5 py-0.5 rounded-lg text-[11px]">
                            {branchName}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-stone-900 text-sm">
                          {item.available_quantity <= 0 ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                              {t('admin.stockControlCenter.statusSoldOut', 'SOLD OUT')} (0 pcs)
                            </span>
                          ) : (
                            <span>{item.available_quantity} {t('common.pieces', 'pcs')}</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right font-semibold text-stone-600">{item.weight_grams} g</td>
                        <td className="py-3.5 px-4 text-right font-black text-stone-900">{formatETB(item.selling_price)}</td>
                        <td className="py-3.5 px-4 text-right font-black text-[#064e3b]">{formatETB(potentialVal)}</td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => {
                              setAdjustFinishedItem(item);
                              setFinishedNewQty(String(item.available_quantity));
                              setFinishedAdjustReason('');
                            }}
                            className="bg-emerald-50 hover:bg-emerald-100 text-[#064e3b] font-black text-[11px] px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                          >
                            {t('admin.stockControlCenter.btnAdjustStock', 'Adjust Stock')}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: STOCK MOVEMENT & AUDIT LEDGER */}
      {activeSubTab === 'movement_ledger' && (
        <div className="space-y-6">
          
          <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-5 shadow-xs">
            <div className="flex items-start space-x-3">
              <Info className="w-5 h-5 text-[#064e3b] shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-black text-stone-900">
                  Real-Time Stock Movement Integration
                </h3>
                <p className="text-xs text-stone-600 mt-1">
                  Whenever the <strong>Baker bakes a batch</strong>, the ingredients (flour, yeast, salt, maj mix) are automatically deducted from stock. Whenever the <strong>Cashier restocks / recharges</strong>, new raw materials are added directly to the store stock.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* COLUMN 1: BAKER BAKING DEDUCTIONS */}
            <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div className="flex items-center space-x-2">
                  <ArrowDownRight className="w-5 h-5 text-rose-600" />
                  <h3 className="font-black text-stone-900 text-sm">
                    🥖 Baker Baking Deductions (Raw Material Outflow)
                  </h3>
                </div>
                <span className="text-[11px] font-bold text-stone-400">{batches.length} batches</span>
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {batches.length === 0 ? (
                  <div className="text-center py-8 text-stone-400 text-xs font-semibold">
                    No production batches recorded yet.
                  </div>
                ) : (
                  batches.map((batch) => (
                    <div key={batch.id} className="p-3.5 rounded-2xl border border-stone-200 bg-stone-50/60 hover:bg-white transition-all space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-xs text-stone-900">{batch.batch_number}</span>
                        <span className="text-[10px] font-bold text-stone-400">{batch.production_date} {batch.production_time}</span>
                      </div>

                      <div className="text-xs text-stone-700 font-semibold">
                        Produced: <strong className="text-stone-900">{batch.pieces_produced} pcs</strong> of {batch.product_name} by <span className="text-[#064e3b] font-bold">{batch.baker_name}</span>
                      </div>

                      {/* Ingredients Deducted */}
                      <div className="bg-rose-50/60 border border-rose-100 rounded-xl p-2.5">
                        <div className="text-[10px] font-black uppercase text-rose-800 tracking-wider mb-1">
                          Consumed & Deducted from Stock:
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {batch.ingredients_consumed?.map((ing, idx) => (
                            <span key={idx} className="bg-white text-rose-900 text-[11px] font-bold px-2 py-0.5 rounded-md border border-rose-200">
                              -{ing.quantity} {ing.unit} {ing.name}
                            </span>
                          ))}
                        </div>
                        <div className="text-[10px] text-stone-500 font-semibold mt-1.5">
                          Cost deducted: {formatETB(batch.cost_of_ingredients)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* COLUMN 2: CASHIER RESTOCK PURCHASES */}
            <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div className="flex items-center space-x-2">
                  <ArrowUpRight className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-black text-stone-900 text-sm">
                    📥 Cashier Restocks (Raw Material Inflow)
                  </h3>
                </div>
                <span className="text-[11px] font-bold text-stone-400">{cashierRecharges.length} purchases</span>
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {cashierRecharges.length === 0 ? (
                  <div className="text-center py-8 text-stone-400 text-xs font-semibold">
                    No cashier inventory restocks recorded yet.
                  </div>
                ) : (
                  cashierRecharges.map((rec) => (
                    <div key={rec.id} className="p-3.5 rounded-2xl border border-stone-200 bg-stone-50/60 hover:bg-white transition-all space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-xs text-stone-900">{rec.expense_category}</span>
                        <span className="text-[10px] font-bold text-stone-400">{rec.expense_date}</span>
                      </div>

                      <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-2.5 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-black text-emerald-900">
                            +{rec.inventory_quantity_added || 0} units added to store
                          </div>
                          <div className="text-[10px] text-stone-500 font-semibold mt-0.5">
                            Purchased by: <strong className="text-stone-800">{rec.recorded_by_name}</strong> ({rec.payment_method})
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-black text-[#064e3b]">{formatETB(rec.amount)}</div>
                          <div className="text-[10px] text-stone-400 font-bold uppercase">{rec.payment_method}</div>
                        </div>
                      </div>

                      {rec.remarks && (
                        <div className="text-[11px] text-stone-500 italic truncate">{rec.remarks}</div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

          {/* ADMIN MANUAL ADJUSTMENTS AUDIT TRAIL */}
          <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                <h3 className="font-black text-stone-900 text-sm">
                  🛡️ Administrator Manual Stock Overrides (Audit Trail)
                </h3>
              </div>
              <span className="text-xs font-bold text-stone-400">Strictly logged for financial compliance</span>
            </div>

            {stockAdjustLogs.length === 0 ? (
              <div className="text-center py-6 text-stone-400 text-xs font-semibold">
                No manual adjustments have been performed by admin yet.
              </div>
            ) : (
              <div className="divide-y divide-stone-100">
                {stockAdjustLogs.map((log) => (
                  <div key={log.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div>
                      <span className="font-black text-stone-900">{log.user_name || 'Admin'}</span>
                      <span className="text-stone-500 ml-2 font-semibold">{log.details}</span>
                    </div>
                    <span className="text-stone-400 font-bold text-[11px] shrink-0">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* SUB-TAB 4: WEEKLY PHYSICAL AUDIT CHECKS */}
      {activeSubTab === 'stock_checks' && (
        <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div>
              <h3 className="font-black text-stone-900 text-sm flex items-center space-x-2">
                <ClipboardCheck className="w-5 h-5 text-[#064e3b]" />
                <span>Physical Store Inventory Counts (Weekly Stock Checks)</span>
              </h3>
              <p className="text-xs text-stone-500 font-semibold mt-0.5">
                Staff submissions comparing physical inventory against the system balance. Admin approval reconciles stock balances.
              </p>
            </div>
          </div>

          {stockChecks && stockChecks.length > 0 ? (
            <div className="space-y-4">
              {stockChecks.map((check) => (
                <div key={check.id} className="border border-stone-200 rounded-2xl p-4 bg-stone-50/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-black text-stone-900">
                        Check Date: {check.check_date} — Submitted by {check.employee_name}
                      </div>
                      <div className="text-[11px] text-stone-500 font-semibold">
                        Status: <strong className="uppercase">{check.status}</strong> {check.approved_by ? `(Approved by ${check.approved_by})` : ''}
                      </div>
                    </div>
                    {check.status === 'pending_approval' && (
                      <button
                        onClick={() => {
                          onApproveStockCheck(check.id, admin.full_name || 'Admin Abebe');
                          triggerAlert(`Stock check approved and inventory updated to physical count!`);
                        }}
                        className="bg-[#064e3b] hover:bg-emerald-900 text-white font-black text-xs px-4 py-2 rounded-xl transition-all cursor-pointer"
                      >
                        Approve & Sync Balances
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {check.items?.map((itm, i) => (
                      <div key={i} className="bg-white p-2.5 rounded-xl border border-stone-200 text-xs">
                        <div className="font-bold text-stone-800">{itm.material_name}</div>
                        <div className="text-stone-500 text-[10px]">Physical: <strong>{itm.physical_quantity}</strong> | Sys: {itm.system_quantity}</div>
                        <div className={`text-[10px] font-black mt-1 ${itm.difference < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                          Diff: {itm.difference > 0 ? `+${itm.difference}` : itm.difference} {itm.unit}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-stone-400 text-xs font-bold">
              No weekly stock counts currently awaiting approval.
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: ADD / EDIT RAW MATERIAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleSaveMaterial} className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-extrabold text-stone-900 text-base">
                {editingMaterial ? `${t('admin.stockControlCenter.editMaterialTitle', 'Edit Material Details')}: ${editingMaterial.name}` : t('admin.stockControlCenter.addMaterialTitle', 'Add New Ingredient or Packaging')}
              </h3>
              <button type="button" onClick={closeMaterialModal} className="text-stone-400 font-bold text-lg cursor-pointer">✕</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">{t('admin.stockControlCenter.materialName', 'Material / Item Name *')}</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cardamom, Butter, Cake Boxes"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full text-xs font-bold bg-stone-50 border rounded-xl px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">{t('admin.stockControlCenter.colCategory', 'Category')}</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full text-xs font-bold bg-stone-50 border rounded-xl px-3 py-2"
                  >
                    <option value="ingredient">{t('admin.stockControlCenter.ingredientsOnly', 'Ingredient')}</option>
                    <option value="packaging">{t('admin.stockControlCenter.packagingOnly', 'Packaging')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">{t('admin.stockControlCenter.unitMeasure', 'Unit of Measurement')}</label>
                  <select
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    className="w-full text-xs font-bold bg-stone-50 border rounded-xl px-3 py-2"
                  >
                    <option value="kg">kg (Kilogram)</option>
                    <option value="g">g (Gram)</option>
                    <option value="pieces">pieces</option>
                    <option value="liter">liter</option>
                    <option value="quintal">quintal</option>
                  </select>
                </div>
              </div>

              {!editingMaterial && (
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">{t('admin.stockControlCenter.initialQty', 'Initial In-Store Quantity *')} ({formUnit})</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0"
                    value={formQuantity}
                    onChange={(e) => setFormQuantity(e.target.value)}
                    className="w-full text-xs font-bold bg-stone-50 border rounded-xl px-3 py-2"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">{t('admin.stockControlCenter.minStockAlert', 'Minimum Stock Alert Level')}</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="10"
                    value={formMinStock}
                    onChange={(e) => setFormMinStock(e.target.value)}
                    className="w-full text-xs font-bold bg-stone-50 border rounded-xl px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">{t('admin.stockControlCenter.purchaseCost', 'Purchase Cost / Unit (ETB)')}</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    className="w-full text-xs font-bold bg-stone-50 border rounded-xl px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">{t('admin.stockControlCenter.supplierName', 'Supplier / Market Source')}</label>
                <input
                  type="text"
                  placeholder="e.g. Dire Dawa Mills Enterprise"
                  value={formSupplier}
                  onChange={(e) => setFormSupplier(e.target.value)}
                  className="w-full text-xs bg-stone-50 border rounded-xl px-3 py-2"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                type="button"
                onClick={closeMaterialModal}
                className="flex-1 bg-stone-100 font-bold py-2.5 rounded-xl text-xs cursor-pointer"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                type="submit"
                className="flex-1 bg-[#064e3b] text-white font-black py-2.5 rounded-xl text-xs shadow-xs cursor-pointer"
              >
                {editingMaterial ? t('common.save', 'Save Changes') : t('admin.stockControlCenter.saveMaterialBtn', 'Save Raw Material')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 2: ADJUST RAW MATERIAL STOCK */}
      {adjustMaterial && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleRawAdjustSubmit} className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="border-b pb-3">
              <h3 className="font-extrabold text-stone-900 text-base">{t('admin.stockControlCenter.adjustRawTitle', 'Direct Physical Stock Adjustment')}</h3>
              <p className="text-xs text-stone-500 font-semibold mt-0.5">
                {t('admin.stockControlCenter.currentRecorded', 'Current Recorded Quantity:')} <strong className="text-stone-800">{adjustMaterial.name}</strong> ({adjustMaterial.current_quantity} {adjustMaterial.unit})
              </p>
            </div>

            <div>
              <label className="block text-xs font-black text-stone-700 mb-1">
                {t('admin.stockControlCenter.newPhysicalQty', 'New Physical Quantity *')} ({adjustMaterial.unit})
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={rawNewQty}
                onChange={(e) => setRawNewQty(e.target.value)}
                className="w-full text-lg font-black bg-stone-50 border rounded-xl px-3 py-2 focus:bg-white focus:border-[#064e3b]"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-stone-700 mb-1">
                {t('admin.stockControlCenter.reasonForAdjustment', 'Reason for Adjustment *')}
              </label>
              <textarea
                required
                rows="3"
                placeholder={t('admin.stockControlCenter.reasonHint', 'e.g. Physical inventory check, bag spillage, supplier bonus')}
                value={rawAdjustReason}
                onChange={(e) => setRawAdjustReason(e.target.value)}
                className="w-full text-xs bg-stone-50 border rounded-xl p-3 focus:bg-white focus:border-[#064e3b]"
              />
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setAdjustMaterial(null)}
                className="flex-1 bg-stone-100 font-bold py-2.5 rounded-xl text-xs cursor-pointer"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black py-2.5 rounded-xl text-xs shadow-xs cursor-pointer"
              >
                {t('admin.stockControlCenter.saveStockLevel', 'Save New Stock Level')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 3: ADJUST FINISHED PRODUCT STOCK */}
      {adjustFinishedItem && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleFinishedAdjustSubmit} className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="border-b pb-3">
              <h3 className="font-extrabold text-stone-900 text-base">{t('admin.stockControlCenter.adjustFinishedTitle', 'Adjust Finished Bakery Stock')}</h3>
              <p className="text-xs text-stone-500 font-semibold mt-0.5">
                {t('admin.stockControlCenter.adjustFinishedDesc', 'Directly correct display shelf counts for sales')}: <strong className="text-stone-800">{adjustFinishedItem.product_name}</strong> ({adjustFinishedItem.available_quantity} pcs)
              </p>
            </div>

            <div>
              <label className="block text-xs font-black text-stone-700 mb-1">
                {t('admin.stockControlCenter.newPhysicalQty', 'New Available Pieces (Ready for Sale) *')}
              </label>
              <input
                type="number"
                step="1"
                min="0"
                required
                value={finishedNewQty}
                onChange={(e) => setFinishedNewQty(e.target.value)}
                className="w-full text-lg font-black bg-stone-50 border rounded-xl px-3 py-2 focus:bg-white focus:border-[#064e3b]"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-stone-700 mb-1">
                {t('admin.stockControlCenter.reasonForAdjustment', 'Reason for Adjustment (Required for Audit) *')}
              </label>
              <textarea
                required
                rows="3"
                placeholder={t('admin.stockControlCenter.reasonHint', 'e.g. 5 loaves damaged/spoiled, count corrected during end of day check')}
                value={finishedAdjustReason}
                onChange={(e) => setFinishedAdjustReason(e.target.value)}
                className="w-full text-xs bg-stone-50 border rounded-xl p-3 focus:bg-white focus:border-[#064e3b]"
              />
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setAdjustFinishedItem(null)}
                className="flex-1 bg-stone-100 font-bold py-2.5 rounded-xl text-xs cursor-pointer"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                type="submit"
                className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white font-black py-2.5 rounded-xl text-xs shadow-xs cursor-pointer"
              >
                {t('admin.stockControlCenter.saveStockLevel', 'Apply Adjustment')}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
