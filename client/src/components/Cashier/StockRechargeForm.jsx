import React, { useState, useRef, useEffect } from 'react';
import { 
  Package, 
  Plus, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  DollarSign, 
  Layers, 
  Truck, 
  ArrowUpRight, 
  TrendingUp, 
  RefreshCw, 
  X, 
  Scale 
} from 'lucide-react';
import { formatETB } from '../../utils/formatters';
import { useTranslation } from '../../i18n';

export default function StockRechargeForm({ 
  rawMaterials = [], 
  expenses = [], 
  cashier = {}, 
  onAddExpense, 
  onAddMaterial,
  isSubmitting = false 
}) {
  const { t } = useTranslation();

  const safeMaterials = Array.isArray(rawMaterials) ? rawMaterials : [];
  const safeExpenses = Array.isArray(expenses) ? expenses : [];

  // Common material presets
  // SYSTEM RULE: Except for flour (kg), all ingredients are measured in grams (g). Packaging in pieces.
  const materialPresets = [
    { name: 'Flour', icon: '🌾', defaultQty: 100, quickAdds: [25, 50, 100, 200], unit: 'kg', defaultPrice: 125 },
    { name: 'MAJ mix', icon: '🧪', defaultQty: 500, quickAdds: [250, 500, 1000, 2500], unit: 'g', defaultPrice: 0.18 },
    { name: 'Yeast', icon: '🍞', defaultQty: 500, quickAdds: [250, 500, 1000, 2000], unit: 'g', defaultPrice: 0.22 },
    { name: 'Salt', icon: '🧂', defaultQty: 1000, quickAdds: [500, 1000, 2500, 5000], unit: 'g', defaultPrice: 0.025 },
    { name: 'Sugar', icon: '🍬', defaultQty: 5000, quickAdds: [1000, 2500, 5000, 10000], unit: 'g', defaultPrice: 0.095 },
    { name: 'Selit', icon: '🌱', defaultQty: 1000, quickAdds: [500, 1000, 2000, 5000], unit: 'g', defaultPrice: 0.14 },
    { name: 'Tekur azmud', icon: '🌿', defaultQty: 500, quickAdds: [250, 500, 1000, 2000], unit: 'g', defaultPrice: 0.26 },
    { name: 'Plastic bags', icon: '🛍️', defaultQty: 1000, quickAdds: [500, 1000, 2500, 5000], unit: 'pieces', defaultPrice: 1.5 },
    { name: 'Paper bags', icon: '📦', defaultQty: 500, quickAdds: [250, 500, 1000, 2000], unit: 'pieces', defaultPrice: 3.0 },
  ];

  // Selected material (defaults to first low stock or first material)
  const lowMaterials = safeMaterials.filter(m => m.current_quantity <= m.minimum_stock);
  const initialMaterial = lowMaterials[0] || safeMaterials[0] || null;

  const [selectedMaterialId, setSelectedMaterialId] = useState(initialMaterial?.id || initialMaterial?._id || '');
  const selectedMaterial = safeMaterials.find(m => m.id === selectedMaterialId || m._id === selectedMaterialId) || safeMaterials[0] || null;

  useEffect(() => {
    if (!selectedMaterialId && safeMaterials.length > 0) {
      const initMat = lowMaterials[0] || safeMaterials[0];
      if (initMat) {
        setSelectedMaterialId(initMat.id || initMat._id);
      }
    }
  }, [selectedMaterialId, safeMaterials, lowMaterials]);

  // Refs for auto-scroll and focus
  const step2Ref = useRef(null);
  const qtyInputRef = useRef(null);

  // Animation & Transition states
  const [animatingMaterialId, setAnimatingMaterialId] = useState(null);
  const [highlightStep2, setHighlightStep2] = useState(false);
  const [autoAdvanceNotice, setAutoAdvanceNotice] = useState('');

  // Form State
  const [quantityAdded, setQuantityAdded] = useState('100');
  const [unitCost, setUnitCost] = useState(selectedMaterial?.purchase_price ? String(selectedMaterial.purchase_price) : '0.22');
  const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash' or 'bank'
  const [supplierName, setSupplierName] = useState(selectedMaterial?.supplier || '');
  const [remarks, setRemarks] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Add New Ingredient Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [addName, setAddName] = useState('');
  const [addCategory, setAddCategory] = useState('ingredient'); // 'ingredient' or 'packaging'
  const [addUnit, setAddUnit] = useState('g'); // default 'g' for ingredients
  const [addCurrentQty, setAddCurrentQty] = useState('0');
  const [addMinStock, setAddMinStock] = useState('1000');
  const [addPurchasePrice, setAddPurchasePrice] = useState('');
  const [addSupplier, setAddSupplier] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState('');

  // When material selection changes (with animated transition & auto-advance)
  function handleSelectMaterial(mat, autoScroll = true) {
    if (!mat) return;
    setSelectedMaterialId(mat.id);

    const preset = materialPresets.find(p => p.name.toLowerCase() === mat.name.toLowerCase());
    let defaultQ = preset ? preset.defaultQty : (mat.unit === 'g' ? 500 : (mat.unit === 'kg' ? 50 : 500));
    setQuantityAdded(String(defaultQ));
    setUnitCost(String(mat.purchase_price || preset?.defaultPrice || 0));
    setSupplierName(mat.supplier || '');

    if (autoScroll) {
      setAnimatingMaterialId(mat.id);
      setAutoAdvanceNotice(`✨ Selected ${mat.name}! Automatically moving to Step 2...`);

      setTimeout(() => {
        setAnimatingMaterialId(null);
        setAutoAdvanceNotice('');
        setHighlightStep2(true);
        if (step2Ref.current) {
          step2Ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        setTimeout(() => {
          setHighlightStep2(false);
          qtyInputRef.current?.focus();
        }, 750);
      }, 280);
    }
  }

  // Quick quantity adder
  function handleQuickAddQty(qty) {
    setQuantityAdded(String(qty));
  }

  // Handle Category Toggle in Add Modal
  function handleAddCategoryChange(cat) {
    setAddCategory(cat);
    if (cat === 'ingredient') {
      setAddUnit('g');
      setAddMinStock('1000');
    } else {
      setAddUnit('pieces');
      setAddMinStock('500');
    }
  }

  // Handle Add New Ingredient Form Submit
  async function handleAddMaterialSubmit(e) {
    e.preventDefault();
    if (!addName.trim()) {
      setAddError('Please enter an ingredient name.');
      return;
    }

    if (!onAddMaterial) {
      setAddError('Add ingredient action not supported on this view.');
      return;
    }

    setIsAdding(true);
    setAddError('');

    try {
      const payload = {
        name: addName.trim(),
        category: addCategory,
        unit: addUnit,
        current_quantity: parseFloat(addCurrentQty) || 0,
        minimum_stock: parseFloat(addMinStock) || (addUnit === 'g' ? 1000 : 50),
        purchase_price: parseFloat(addPurchasePrice) || 0,
        supplier: addSupplier.trim() || 'Direct Supplier',
      };

      const created = await onAddMaterial(payload);

      setShowAddModal(false);
      setAddName('');
      setAddCurrentQty('0');
      setAddPurchasePrice('');
      setAddSupplier('');

      setSuccessMsg(`🎉 Success: New item "${payload.name}" created! Auto-selected below for recharge.`);

      // Select newly added material and auto-scroll to Step 2
      if (created && created.id) {
        handleSelectMaterial(created, true);
      } else {
        const found = rawMaterials.find(m => m.name.toLowerCase() === payload.name.toLowerCase());
        if (found) {
          handleSelectMaterial(found, true);
        }
      }
    } catch (err) {
      setAddError(err.message || 'Failed to create ingredient');
    } finally {
      setIsAdding(false);
    }
  }

  // Calculated total cost
  const calculatedTotal = (parseFloat(quantityAdded) || 0) * (parseFloat(unitCost) || 0);

  function handleSubmit(e) {
    e.preventDefault();
    if (!selectedMaterial || !quantityAdded || parseFloat(quantityAdded) <= 0 || calculatedTotal <= 0) {
      alert('Please enter a valid quantity and cost.');
      return;
    }

    const payload = {
      expense_category: `${selectedMaterial.name} purchases`,
      description: `Recharge ${quantityAdded} ${selectedMaterial.unit} of ${selectedMaterial.name}`,
      amount: Math.round(calculatedTotal * 100) / 100,
      expense_date: new Date().toISOString().slice(0, 10),
      payment_method: paymentMethod,
      recorded_by_id: cashier?.id || cashier?._id || cashier?.username || 'cashier',
      recorded_by_name: cashier?.full_name || 'Tigist Haile (Cashier)',
      is_inventory_purchase: true,
      inventory_material_id: selectedMaterial.id || selectedMaterial._id,
      inventory_quantity_added: parseFloat(quantityAdded),
      remarks: remarks || `Recharged by Cashier ${cashier?.full_name || 'Tigist'} (Supplier: ${supplierName || 'Standard'})`,
    };

    onAddExpense(payload);

    setSuccessMsg(`✅ SUCCESS: Recharged ${Number(quantityAdded).toLocaleString()} ${selectedMaterial.unit} of ${selectedMaterial.name} for ${formatETB(calculatedTotal)}! Stock updated immediately.`);
    setTimeout(() => setSuccessMsg(''), 6000);
    setRemarks('');
  }

  // Filter today's inventory recharges
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayRecharges = safeExpenses.filter(e => e.is_inventory_purchase && e.expense_date === todayStr);
  const totalRechargeSpendToday = todayRecharges.reduce((sum, e) => sum + e.amount, 0);

  // Active preset for selected material
  const currentPreset = materialPresets.find(p => selectedMaterial && p.name.toLowerCase() === selectedMaterial.name.toLowerCase());

  // Quick Adds for active material
  const activeQuickAdds = currentPreset?.quickAdds || (
    selectedMaterial?.unit === 'g' 
      ? [100, 250, 500, 1000] 
      : selectedMaterial?.unit === 'kg' 
      ? [10, 25, 50, 100] 
      : [100, 250, 500, 1000]
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      
      {/* Header Banner */}
      <div className="bg-[#064e3b] text-white rounded-3xl p-6 shadow-md shadow-emerald-950/20 relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 bg-emerald-800/80 text-emerald-200 text-xs font-black px-3 py-1 rounded-full mb-2">
              <Package className="w-3.5 h-3.5" />
              <span>{t('cashier.stockStationTitle', 'Store Ingredient & Raw Material Recharge Station')}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">
              {t('cashier.rechargeStock', 'Recharge Store Stock & Raw Materials')}
            </h1>
            <p className="text-emerald-100/90 text-xs sm:text-sm mt-1 max-w-2xl">
              {t('cashier.stockStationDesc', 'Add flour bags, ingredients & packaging bags into store stock with linked cash expenses')}
            </p>
          </div>

          <div className="bg-emerald-900/60 border border-emerald-700/60 p-3.5 rounded-2xl text-right shrink-0">
            <div className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider">{t('cashier.todaysCashOut', "Today's Restock Spend")}</div>
            <div className="text-xl font-black text-white mt-0.5">{formatETB(totalRechargeSpendToday)}</div>
            <div className="text-[10px] text-emerald-200 font-semibold">{todayRecharges.length} {t('common.recordsFound', 'transactions')}</div>
          </div>
        </div>
      </div>

      {/* Success Notification Alert */}
      {successMsg && (
        <div className="bg-emerald-100 border-2 border-emerald-600 text-emerald-950 rounded-2xl p-4 flex items-center justify-between shadow-md text-sm font-black animate-in fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-800 font-bold text-lg px-2 cursor-pointer">✕</button>
        </div>
      )}

      {/* Urgent Low-Stock Alert Bar if any item is low */}
      {lowMaterials.length > 0 && (
        <div className="bg-rose-50 border-2 border-rose-300 rounded-3xl p-5 shadow-xs">
          <div className="flex items-start space-x-3">
            <div className="bg-rose-100 p-2 rounded-xl text-rose-700 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-black text-rose-950 flex items-center space-x-2">
                <span>⚠️ {t('cashier.storeRunningLow', 'Store Ingredients Running Low!')}</span>
                <span className="bg-rose-200 text-rose-900 text-[10px] px-2 py-0.5 rounded-full font-extrabold">
                  {t('cashier.lowStockLabel', '({count} Low)').replace('{count}', lowMaterials.length)}
                </span>
              </h3>
              <p className="text-xs text-rose-800 mt-1">
                {t('cashier.storeRunningLowDesc', '{count} ingredient(s) are below minimum store levels. As cashier, please recharge bakery stock.').replace('{count}', lowMaterials.length)}
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {lowMaterials.map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleSelectMaterial(m, true)}
                    className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl shadow-xs transition-all flex items-center space-x-2 cursor-pointer active:scale-95"
                  >
                    <span>⚡ {t('cashier.rechargeStock', 'Restock')} {m.name}</span>
                    <span className="bg-rose-800/80 px-2 py-0.5 rounded-md text-[10px]">
                      {Number(m.current_quantity).toLocaleString()} {m.unit}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 1: Current Stock Grid & Selection */}
      <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-stone-100 pb-3 gap-3">
          <div>
            <h2 className="text-base font-black text-stone-900 flex items-center space-x-2">
              <Layers className="w-5 h-5 text-[#064e3b]" />
              <span>{t('cashier.step1Material', '1. Select Ingredient / Packaging to Recharge')}</span>
            </h2>
            <p className="text-xs text-stone-500 font-semibold mt-0.5">
              {t('cashier.step1MaterialDesc', 'Select raw material from the store')}
            </p>
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto justify-between sm:justify-end">
            <span className="text-xs font-bold text-stone-400">
              {rawMaterials.length} {t('common.items', 'items')}
            </span>

            {/* Cashier Add New Ingredient Button */}
            {onAddMaterial && (
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="bg-[#064e3b] hover:bg-emerald-900 text-white font-black text-xs px-4 py-2 rounded-xl shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer shrink-0 active:scale-95"
              >
                <Plus className="w-4 h-4 text-emerald-300" />
                <span>{t('cashier.addNewMaterialBtn', '➕ Add New Material to Store')}</span>
              </button>
            )}
          </div>
        </div>

        {/* Transient Auto-Advance Notice */}
        {autoAdvanceNotice && (
          <div className="bg-emerald-600 text-white text-xs font-black px-4 py-2.5 rounded-xl shadow-md flex items-center space-x-2 animate-bounce">
            <Sparkles className="w-4 h-4 text-emerald-200 animate-spin shrink-0" />
            <span>{autoAdvanceNotice}</span>
          </div>
        )}

        {/* Grid of Materials */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {rawMaterials.map((mat) => {
            const isSelected = selectedMaterial?.id === mat.id;
            const isAnimating = animatingMaterialId === mat.id;
            const isLow = mat.current_quantity <= mat.minimum_stock;
            const preset = materialPresets.find(p => p.name.toLowerCase() === mat.name.toLowerCase());
            const icon = preset?.icon || (mat.category === 'packaging' ? '📦' : '🧪');

            return (
              <button
                key={mat.id}
                type="button"
                onClick={() => handleSelectMaterial(mat, true)}
                className={`p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer relative flex flex-col justify-between ${
                  isSelected
                    ? 'border-[#064e3b] bg-emerald-50/90 shadow-lg ring-2 ring-[#064e3b] scale-[1.02]'
                    : isLow
                    ? 'border-rose-300 bg-rose-50/40 hover:bg-rose-50 hover:border-rose-400'
                    : 'border-stone-200 bg-stone-50 hover:bg-white hover:border-emerald-300'
                } ${isAnimating ? 'scale-105 ring-4 ring-emerald-500 bg-emerald-100 shadow-xl' : ''}`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xl">{icon}</span>
                    {isSelected ? (
                      <span className="text-[9px] font-black uppercase bg-[#064e3b] text-white px-2 py-0.5 rounded-full flex items-center space-x-0.5 shadow-xs">
                        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-300" />
                        <span>{t('common.active', 'Active')}</span>
                      </span>
                    ) : isLow ? (
                      <span className="text-[9px] font-black uppercase bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded-md animate-pulse">
                        {t('cashier.lowStockBadge', 'Low')}
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold uppercase text-stone-400">
                        {mat.unit}
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-black text-stone-900 mt-2 truncate">{mat.name}</div>
                  <div className="text-[11px] text-stone-500 font-bold">
                    {t('common.minStock', 'Min')}: {Number(mat.minimum_stock).toLocaleString()} {mat.unit}
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-stone-200/60 flex items-baseline justify-between">
                  <span className="text-[10px] font-bold text-stone-500">{t('pos.inShop', 'in shop')}:</span>
                  <span className={`text-sm font-black ${isLow ? 'text-rose-700 font-extrabold' : 'text-stone-900'}`}>
                    {Number(mat.current_quantity).toLocaleString()} <span className="text-[10px] font-normal">{mat.unit}</span>
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* STEP 2: Stock Recharge Form */}
      {selectedMaterial && (
        <form 
          ref={step2Ref}
          onSubmit={handleSubmit} 
          className={`bg-white rounded-3xl border transition-all duration-500 p-6 shadow-xs space-y-6 ${
            highlightStep2 
              ? 'ring-4 ring-emerald-500/50 border-[#064e3b] shadow-xl shadow-emerald-950/10 scale-[1.005]' 
              : 'border-stone-200'
          }`}
        >
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center text-xl shrink-0">
                {currentPreset?.icon || (selectedMaterial.category === 'packaging' ? '📦' : '🧪')}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="w-5 h-5 rounded-full bg-[#064e3b] text-white text-[11px] font-black flex items-center justify-center shrink-0">
                    2
                  </span>
                  <h3 className="text-base font-black text-stone-900">
                    {t('cashier.step2Qty', 'Recharge Details')}: <span className="text-[#064e3b]">{selectedMaterial.name}</span>
                  </h3>
                </div>
                <p className="text-xs text-stone-500 font-semibold mt-0.5">
                  {t('pos.inShop', 'in shop')}: <strong className="text-stone-800">{Number(selectedMaterial.current_quantity).toLocaleString()} {selectedMaterial.unit}</strong> ({t('common.minStock', 'Min')}: {Number(selectedMaterial.minimum_stock).toLocaleString()} {selectedMaterial.unit})
                </p>
              </div>
            </div>

            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-stone-400">{t('nav.cashier', 'Cashier on Duty')}</div>
              <div className="text-xs font-black text-stone-900">{cashier.full_name || 'Cashier'}</div>
            </div>
          </div>

          {/* Quick Quantity Buttons */}
          <div>
            <label className="block text-xs font-black text-stone-700 mb-2">
              {t('cashier.qtyToRestock', 'Quantity to Restock ({unit}) *').replace('{unit}', selectedMaterial.unit)}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
              {activeQuickAdds.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => handleQuickAddQty(q)}
                  className={`py-3 px-4 rounded-xl font-black text-xs transition-all cursor-pointer border ${
                    String(quantityAdded) === String(q)
                      ? 'bg-[#064e3b] text-white border-[#064e3b] shadow-xs'
                      : 'bg-stone-50 border-stone-200 text-stone-800 hover:bg-stone-100'
                  }`}
                >
                  +{Number(q).toLocaleString()} {selectedMaterial.unit}
                </button>
              ))}
            </div>

            <div className="relative">
              <input
                ref={qtyInputRef}
                type="number"
                step="0.01"
                min="0.01"
                required
                value={quantityAdded}
                onChange={(e) => setQuantityAdded(e.target.value)}
                placeholder={`Enter custom quantity in ${selectedMaterial.unit}`}
                className="w-full text-base font-black bg-stone-50 border-2 border-stone-200 rounded-2xl px-4 py-3 focus:outline-none focus:border-[#064e3b] focus:bg-white"
              />
              <span className="absolute right-4 top-3.5 text-xs font-black text-stone-400 uppercase">
                {selectedMaterial.unit}
              </span>
            </div>
          </div>

          {/* Financial Calculation: Unit Price & Total Cost */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
            <div>
              <label className="block text-xs font-black text-stone-700 mb-1">
                {t('cashier.purchasePricePerUnit', 'Purchase Price per {unit} (ETB) *').replace('{unit}', selectedMaterial.unit)}
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  required
                  value={unitCost}
                  onChange={(e) => setUnitCost(e.target.value)}
                  className="w-full text-sm font-black bg-white border border-stone-300 rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#064e3b]"
                />
                <span className="absolute right-3 top-2.5 text-xs font-bold text-stone-400">ETB</span>
              </div>
              <p className="text-[11px] text-stone-500 mt-1 font-semibold">
                {t('common.purchasePrice', 'Last purchase price')}: {formatETB(selectedMaterial.purchase_price || 0)} / {selectedMaterial.unit}
              </p>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-emerald-200 flex flex-col justify-center">
              <div className="text-xs font-bold text-emerald-800 uppercase tracking-wide">
                {t('cashier.totalRechargeCost', 'Total Recharge Expense')}
              </div>
              <div className="text-2xl font-black text-[#064e3b] mt-0.5">
                {formatETB(calculatedTotal)}
              </div>
              <div className="text-[11px] text-stone-500 font-semibold mt-0.5">
                {Number(quantityAdded || 0).toLocaleString()} {selectedMaterial.unit} × {unitCost || 0} ETB
              </div>
            </div>
          </div>

          {/* Payment Method & Supplier */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-stone-700 mb-1.5">
                {t('cashier.rechargePaymentSource', 'Paid From (Payment Source) *')}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`py-3 px-3 rounded-xl font-black text-xs transition-all border cursor-pointer text-center ${
                    paymentMethod === 'cash'
                      ? 'bg-[#064e3b] text-white border-[#064e3b] shadow-xs'
                      : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  {t('cashier.cashDrawerBtn', '💵 Main Shop Cash Drawer')}
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('bank')}
                  className={`py-3 px-3 rounded-xl font-black text-xs transition-all border cursor-pointer text-center ${
                    paymentMethod === 'bank'
                      ? 'bg-[#064e3b] text-white border-[#064e3b] shadow-xs'
                      : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  {t('cashier.bankOrTelebirrBtn', '🏦 CBE / Telebirr')}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-stone-700 mb-1">
                {t('cashier.supplierNameLabel', 'Supplier / Mill Name (Optional)')}
              </label>
              <input
                type="text"
                placeholder="e.g. Dire Dawa Mills, Alpha Ingredients"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                className="w-full text-xs font-bold bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 focus:bg-white focus:border-[#064e3b]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-stone-700 mb-1">
              {t('cashier.rechargeRemarks', 'Remarks / Receipt Ref (Optional)')}
            </label>
            <input
              type="text"
              placeholder="e.g. Receipt #9021, fresh delivery recharged into store"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full text-xs bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 focus:bg-white focus:border-[#064e3b]"
            />
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !quantityAdded || calculatedTotal <= 0}
              className="w-full bg-[#064e3b] hover:bg-emerald-900 text-white font-black text-sm py-4 rounded-2xl shadow-md shadow-emerald-950/20 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 active:scale-[0.99]"
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-300" />
              <span>
                {t('cashier.recordRechargeBtn', 'RECORD REPLENISHMENT & EXPENSE ({amount})').replace('{amount}', formatETB(calculatedTotal))}
              </span>
            </button>
          </div>
        </form>
      )}

      {/* TODAY'S RECHARGES ACTIVITY LOG */}
      <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div>
            <h3 className="text-sm font-black text-stone-900 flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-[#064e3b]" />
              <span>{t('cashier.todaysExpensesTitle', "Today's Restock Activity by Cashier").replace('({count})', '')}</span>
            </h3>
          </div>
          <span className="text-xs font-black text-[#064e3b]">
            {t('common.totalAmount', 'Total')}: {formatETB(totalRechargeSpendToday)}
          </span>
        </div>

        {todayRecharges.length === 0 ? (
          <div className="text-center py-8 text-stone-400 text-xs font-bold">
            {t('cashier.noExpensesToday', 'No stock recharges recorded today yet.')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-100 text-stone-600 font-bold uppercase text-[10px] border-b border-stone-200">
                <tr>
                  <th className="py-2.5 px-3">{t('common.date', 'Date')} / {t('common.time', 'Time')}</th>
                  <th className="py-2.5 px-3">{t('common.item', 'Item Recharged')}</th>
                  <th className="py-2.5 px-3 text-right">{t('common.quantity', 'Quantity Added')}</th>
                  <th className="py-2.5 px-3 text-right">{t('common.totalAmount', 'Purchase Amount')}</th>
                  <th className="py-2.5 px-3 text-center">{t('cashier.paymentSourceLabel', 'Paid Via')}</th>
                  <th className="py-2.5 px-3">{t('nav.cashier', 'Cashier')}</th>
                  <th className="py-2.5 px-3">{t('common.notes', 'Remarks')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {todayRecharges.map((rec) => (
                  <tr key={rec.id} className="hover:bg-stone-50">
                    <td className="py-2.5 px-3 font-semibold text-stone-600">{rec.expense_date}</td>
                    <td className="py-2.5 px-3 font-black text-stone-900">{rec.expense_category}</td>
                    <td className="py-2.5 px-3 text-right font-black text-emerald-700">
                      +{rec.inventory_quantity_added || 0}
                    </td>
                    <td className="py-2.5 px-3 text-right font-black text-stone-900">
                      {formatETB(rec.amount)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                        rec.payment_method === 'cash' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {rec.payment_method}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-stone-700 font-semibold">{rec.recorded_by_name}</td>
                    <td className="py-2.5 px-3 text-stone-500 truncate max-w-[200px]">{rec.remarks || rec.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CASHIER ADD NEW INGREDIENT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl space-y-5 animate-in zoom-in-95 border border-stone-200">
            <div className="flex items-start justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-[#064e3b] flex items-center justify-center font-black">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-stone-900">
                    {t('cashier.addNewMaterialBtn', 'Add New Ingredient / Material')}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-stone-400 hover:text-stone-700 text-xl font-bold p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {addError && (
              <div className="bg-rose-50 border border-rose-300 text-rose-800 text-xs font-bold rounded-xl p-3">
                {addError}
              </div>
            )}

            <form onSubmit={handleAddMaterialSubmit} className="space-y-4">
              {/* Item Name */}
              <div>
                <label className="block text-xs font-black text-stone-700 mb-1">
                  {t('admin.colMaterial', 'Item Name')} *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cocoa Powder, Cardamom, Vanilla Extract"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  className="w-full text-xs font-bold bg-stone-50 border border-stone-300 rounded-xl px-3 py-2.5 focus:bg-white focus:border-[#064e3b] focus:outline-none"
                />
              </div>

              {/* Category selector */}
              <div>
                <label className="block text-xs font-black text-stone-700 mb-1">
                  {t('admin.colCategory', 'Item Category')} *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleAddCategoryChange('ingredient')}
                    className={`py-2 px-3 rounded-xl font-black text-xs border transition-all cursor-pointer ${
                      addCategory === 'ingredient'
                        ? 'bg-[#064e3b] text-white border-[#064e3b]'
                        : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    🧪 {t('admin.tabRawMaterials', 'Ingredient')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddCategoryChange('packaging')}
                    className={`py-2 px-3 rounded-xl font-black text-xs border transition-all cursor-pointer ${
                      addCategory === 'packaging'
                        ? 'bg-[#064e3b] text-white border-[#064e3b]'
                        : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    📦 {t('cashier.plasticBagPurchase', 'Packaging')}
                  </button>
                </div>
              </div>

              {/* Measurement Unit */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-black text-stone-700">
                    {t('cashier.colUnit', 'Measurement Unit')} *
                  </label>
                </div>
                <select
                  value={addUnit}
                  onChange={(e) => setAddUnit(e.target.value)}
                  className="w-full text-xs font-bold bg-stone-50 border border-stone-300 rounded-xl px-3 py-2.5 focus:bg-white focus:border-[#064e3b] focus:outline-none"
                >
                  <option value="g">g ({t('common.grams', 'Grams')})</option>
                  <option value="kg">kg ({t('common.kg', 'Kilograms')})</option>
                  <option value="pieces">pieces ({t('common.pieces', 'Pieces')})</option>
                </select>
              </div>

              {/* Initial Qty, Min Alert, Unit Price */}
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-black text-stone-700 mb-1">
                    {t('admin.colCurrentStock', 'Opening Stock')} ({addUnit})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0"
                    value={addCurrentQty}
                    onChange={(e) => setAddCurrentQty(e.target.value)}
                    className="w-full text-xs font-bold bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 focus:bg-white focus:border-[#064e3b]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black text-stone-700 mb-1">
                    {t('common.minStock', 'Min Alert')} ({addUnit})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder={addUnit === 'g' ? '1000' : '50'}
                    value={addMinStock}
                    onChange={(e) => setAddMinStock(e.target.value)}
                    className="w-full text-xs font-bold bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 focus:bg-white focus:border-[#064e3b]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black text-stone-700 mb-1">
                    {t('common.unitCost', 'Price/Unit')} (ETB)
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    placeholder="0.00"
                    value={addPurchasePrice}
                    onChange={(e) => setAddPurchasePrice(e.target.value)}
                    className="w-full text-xs font-bold bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 focus:bg-white focus:border-[#064e3b]"
                  />
                </div>
              </div>

              {/* Supplier Name */}
              <div>
                <label className="block text-xs font-black text-stone-700 mb-1">
                  {t('cashier.supplierNameLabel', 'Default Supplier / Source (Optional)')}
                </label>
                <input
                  type="text"
                  placeholder="e.g. Merkato Wholesale, Local Market"
                  value={addSupplier}
                  onChange={(e) => setAddSupplier(e.target.value)}
                  className="w-full text-xs font-bold bg-stone-50 border border-stone-300 rounded-xl px-3 py-2.5 focus:bg-white focus:border-[#064e3b]"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 text-xs font-black text-stone-600 hover:bg-stone-100 rounded-xl transition-all cursor-pointer"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isAdding || !addName.trim()}
                  className="px-5 py-2.5 text-xs font-black text-white bg-[#064e3b] hover:bg-emerald-900 rounded-xl shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>{isAdding ? t('common.loading', 'Saving...') : t('common.save', 'Save & Select for Restock')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
