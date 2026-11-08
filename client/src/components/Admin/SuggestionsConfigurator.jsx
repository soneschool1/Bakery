import React, { useState, useMemo, useEffect } from 'react';
import { 
  Sparkles, 
  Plus, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  HelpCircle, 
  Eye, 
  ShoppingBag, 
  ChefHat, 
  Receipt, 
  Search, 
  Filter, 
  AlertCircle,
  ArrowRight,
  Layers,
  Info
} from 'lucide-react';
import { useTranslation } from '../../i18n/LanguageContext';

export default function SuggestionsConfigurator({ 
  suggestions = [], 
  products = [], 
  rawMaterials = [],
  onAddSuggestion, 
  onUpdateSuggestion,
  onDeleteSuggestion 
}) {
  const { t } = useTranslation();

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all'); // 'all', 'baker', 'cashier_sale', 'cashier_expense'

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Guided Form States
  const [roleTarget, setRoleTarget] = useState('baker'); // 'baker' | 'cashier'
  const [actionType, setActionType] = useState('bread'); // For baker: 'bread' | 'cookie' | 'custom'; For cashier: 'sales_combo' | 'expense' | 'custom'
  const [title, setTitle] = useState('');
  const [manualTitleEdited, setManualTitleEdited] = useState(false);

  // Baker Form Fields
  const [bakerProductName, setBakerProductName] = useState('');
  const [flourKg, setFlourKg] = useState(50);
  const [piecesProduced, setPiecesProduced] = useState(500);
  const [majGrams, setMajGrams] = useState(500);
  const [yeastGrams, setYeastGrams] = useState(300);
  const [saltGrams, setSaltGrams] = useState(500);
  const [sugarGrams, setSugarGrams] = useState(10000);
  const [selitGrams, setSelitGrams] = useState(500);
  const [azmudGrams, setAzmudGrams] = useState(200);

  // Cashier Sale Combo Fields
  const [cashierProductName, setCashierProductName] = useState('');
  const [comboQuantity, setComboQuantity] = useState(10);

  // Cashier Expense Fields
  const [expenseCategory, setExpenseCategory] = useState('Employee food');
  const [expenseAmount, setExpenseAmount] = useState(250);
  const [expenseDescription, setExpenseDescription] = useState('Daily employee lunch allowance');

  // Advanced Mode (Optional JSON override)
  const [showAdvancedJson, setShowAdvancedJson] = useState(false);
  const [customPayloadText, setCustomPayloadText] = useState('');

  // Delete Confirmation State
  const [deletingItem, setDeletingItem] = useState(null);

  // Format currency
  const formatETB = (amount) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(amount) || 0) + ' ETB';
  };

  // Safe product lists
  const safeProducts = Array.isArray(products) ? products : [];
  const breadProducts = safeProducts.filter(p => !p.category || p.category.toLowerCase().includes('bread'));
  const cookieProducts = safeProducts.filter(p => p.category && (p.category.toLowerCase().includes('cookie') || p.category.toLowerCase().includes('pastry') || p.category.toLowerCase().includes('biscuit')));

  // Pre-select products when products load
  useEffect(() => {
    if (!bakerProductName && safeProducts.length > 0) {
      const defaultBread = breadProducts[0] || safeProducts[0];
      setBakerProductName(defaultBread.name);
    }
    if (!cashierProductName && safeProducts.length > 0) {
      setCashierProductName(safeProducts[0].name);
    }
  }, [safeProducts, breadProducts]);

  // Auto-generate a clear, human-readable title when form fields change (if user hasn't typed custom)
  useEffect(() => {
    if (manualTitleEdited) return;

    if (roleTarget === 'baker') {
      if (actionType === 'bread') {
        setTitle(`${flourKg}kg ${bakerProductName || 'Bread'} (${piecesProduced} pcs)`);
      } else if (actionType === 'cookie') {
        setTitle(`${flourKg}kg ${bakerProductName || 'Cookie'} (${piecesProduced} pcs)`);
      }
    } else {
      if (actionType === 'sales_combo') {
        const prod = safeProducts.find(p => p.name.toLowerCase() === (cashierProductName || '').toLowerCase());
        const price = prod?.selling_price ? ` (${formatETB(comboQuantity * prod.selling_price)})` : '';
        setTitle(`${comboQuantity}x ${cashierProductName || 'Bread Pack'}${price}`);
      } else if (actionType === 'expense') {
        setTitle(`${expenseCategory} (${formatETB(expenseAmount)})`);
      }
    }
  }, [roleTarget, actionType, bakerProductName, flourKg, piecesProduced, cashierProductName, comboQuantity, expenseCategory, expenseAmount, manualTitleEdited]);

  // Open modal for creating new shortcut
  function openAddModal() {
    setEditingId(null);
    setRoleTarget('baker');
    setActionType('bread');
    setManualTitleEdited(false);
    setShowAdvancedJson(false);

    const defaultBread = breadProducts[0] || safeProducts[0];
    setBakerProductName(defaultBread ? defaultBread.name : 'Bread 1 (Special Table)');
    setFlourKg(50);
    setPiecesProduced(500);
    setMajGrams(500);
    setYeastGrams(300);
    setSaltGrams(500);

    const defaultProd = safeProducts[0];
    setCashierProductName(defaultProd ? defaultProd.name : 'Bread 1 (Special Table)');
    setComboQuantity(10);

    setExpenseCategory('Employee food');
    setExpenseAmount(250);
    setExpenseDescription('Daily employee lunch allowance');

    setTitle(`50kg ${defaultBread ? defaultBread.name : 'Table Bread'} (500 pcs)`);
    setShowModal(true);
  }

  // Open modal for editing existing shortcut
  function openEditModal(item) {
    setEditingId(item.id);
    setRoleTarget(item.role_target || 'baker');
    setManualTitleEdited(true);
    setTitle(item.title || '');
    setShowAdvancedJson(false);

    const p = item.payload || {};

    if (item.role_target === 'baker') {
      if (p.sugar_g || p.selit_g || item.category === 'cookie_recipe') {
        setActionType('cookie');
      } else {
        setActionType('bread');
      }
      setBakerProductName(p.product_name || safeProducts[0]?.name || '');
      setFlourKg(p.flour_kg || 50);
      setPiecesProduced(p.pieces_produced || 500);
      setMajGrams(p.maj_g || 500);
      setYeastGrams(p.yeast_g || 300);
      setSaltGrams(p.salt_g || 500);
      setSugarGrams(p.sugar_g || 10000);
      setSelitGrams(p.selit_g || 500);
      setAzmudGrams(p.tekur_azmud_g || 200);
    } else {
      if (item.category === 'sales_combo' || p.quantity) {
        setActionType('sales_combo');
        setCashierProductName(p.product_name || safeProducts[0]?.name || '');
        setComboQuantity(p.quantity || 10);
      } else {
        setActionType('expense');
        setExpenseCategory(p.category || 'Employee food');
        setExpenseAmount(p.amount || 250);
        setExpenseDescription(p.description || '');
      }
    }

    setCustomPayloadText(JSON.stringify(p, null, 2));
    setShowModal(true);
  }

  // Generate clean payload and category
  function buildPayloadAndCategory() {
    if (showAdvancedJson && customPayloadText.trim()) {
      try {
        const parsed = JSON.parse(customPayloadText);
        return {
          category: roleTarget === 'baker' ? 'recipe' : (actionType === 'sales_combo' ? 'sales_combo' : 'expense_category'),
          payload: parsed,
        };
      } catch (err) {
        throw new Error('Technical JSON error: ' + err.message);
      }
    }

    if (roleTarget === 'baker') {
      if (actionType === 'bread') {
        return {
          category: 'recipe',
          payload: {
            category: 'Bread',
            product_name: bakerProductName,
            flour_kg: Number(flourKg) || 0,
            pieces_produced: Number(piecesProduced) || 0,
            maj_g: Number(majGrams) || 0,
            yeast_g: Number(yeastGrams) || 0,
            salt_g: Number(saltGrams) || 0,
          }
        };
      } else {
        return {
          category: 'recipe',
          payload: {
            category: 'Cookies',
            product_name: bakerProductName,
            flour_kg: Number(flourKg) || 0,
            pieces_produced: Number(piecesProduced) || 0,
            sugar_g: Number(sugarGrams) || 0,
            maj_g: Number(majGrams) || 0,
            selit_g: Number(selitGrams) || 0,
            tekur_azmud_g: Number(azmudGrams) || 0,
          }
        };
      }
    } else {
      if (actionType === 'sales_combo') {
        return {
          category: 'sales_combo',
          payload: {
            product_name: cashierProductName,
            quantity: Number(comboQuantity) || 1,
          }
        };
      } else {
        return {
          category: 'expense_category',
          payload: {
            category: expenseCategory,
            amount: Number(expenseAmount) || 0,
            description: expenseDescription || `${expenseCategory} payment`,
          }
        };
      }
    }
  }

  // Submit Handler
  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) {
      alert('Please provide a name for this shortcut button.');
      return;
    }

    try {
      setIsSubmitting(true);
      const { category, payload } = buildPayloadAndCategory();

      const suggestionData = {
        role_target: roleTarget,
        category,
        title: title.trim(),
        payload,
        display_order: suggestions.length + 1,
        active: true,
      };

      if (editingId && onUpdateSuggestion) {
        await onUpdateSuggestion(editingId, suggestionData);
      } else {
        await onAddSuggestion(suggestionData);
      }

      setShowModal(false);
      setEditingId(null);
    } catch (err) {
      alert('Could not save shortcut button: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  // Confirm delete handler
  async function handleConfirmDelete() {
    if (!deletingItem) return;
    try {
      setIsSubmitting(true);
      await onDeleteSuggestion(deletingItem.id);
      setDeletingItem(null);
    } catch (err) {
      alert('Could not delete shortcut button: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  // Filtered list
  const filteredSuggestions = useMemo(() => {
    return suggestions.filter(s => {
      // Role filter
      if (roleFilter === 'baker' && s.role_target !== 'baker') return false;
      if (roleFilter === 'cashier_sale' && (s.role_target !== 'cashier' || s.category !== 'sales_combo')) return false;
      if (roleFilter === 'cashier_expense' && (s.role_target !== 'cashier' || s.category === 'sales_combo')) return false;

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const titleMatch = (s.title || '').toLowerCase().includes(q);
        const prodMatch = (s.payload?.product_name || '').toLowerCase().includes(q);
        const catMatch = (s.category || '').toLowerCase().includes(q) || (s.payload?.category || '').toLowerCase().includes(q);
        if (!titleMatch && !prodMatch && !catMatch) return false;
      }

      return true;
    });
  }, [suggestions, roleFilter, searchTerm]);

  // Metric counts
  const bakerCount = suggestions.filter(s => s.role_target === 'baker').length;
  const cashierSaleCount = suggestions.filter(s => s.role_target === 'cashier' && s.category === 'sales_combo').length;
  const cashierExpenseCount = suggestions.filter(s => s.role_target === 'cashier' && s.category !== 'sales_combo').length;

  return (
    <div className="space-y-6">

      {/* Header & Metric Cards */}
      <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
              <Sparkles className="w-6 h-6 text-[#0E7452]" />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center space-x-2">
                <span>{t('admin.suggestionsConfigurator.title', 'Staff 1-Tap Quick Action Buttons')}</span>
                <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full">
                  {suggestions.length} Active Shortcuts
                </span>
              </h2>
              <p className="text-xs text-gray-500 mt-1 max-w-2xl leading-relaxed">
                {t('admin.suggestionsConfigurator.subtitle', 'Create 1-tap shortcut buttons so your Bakers and Cashiers can start standard recipes, ring up popular bread combos, or record daily expenses without repetitive typing or manual calculations.')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="w-full md:w-auto bg-[#0E7452] hover:bg-[#0c6446] text-white text-xs font-bold px-5 py-3 rounded-2xl shadow-md shadow-[#0E7452]/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center space-x-2 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>{t('admin.suggestionsConfigurator.newQuickAction', '+ Create Shortcut Button')}</span>
          </button>
        </div>

        {/* Top 3 Visual Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2 border-t border-gray-100">
          
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-100 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wider flex items-center space-x-1.5">
                <ChefHat className="w-4 h-4 text-amber-600" />
                <span>Baker Recipes</span>
              </div>
              <div className="text-2xl font-black text-amber-950 mt-1">{bakerCount}</div>
              <div className="text-[11px] text-amber-700/80 mt-0.5">Kitchen dough & baking presets</div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center space-x-1.5">
                <ShoppingBag className="w-4 h-4 text-emerald-600" />
                <span>Cashier Sales Combos</span>
              </div>
              <div className="text-2xl font-black text-emerald-950 mt-1">{cashierSaleCount}</div>
              <div className="text-[11px] text-emerald-700/80 mt-0.5">1-tap multi-bread checkout packs</div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-100 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-sky-800 uppercase tracking-wider flex items-center space-x-1.5">
                <Receipt className="w-4 h-4 text-sky-600" />
                <span>Cashier Expense Buttons</span>
              </div>
              <div className="text-2xl font-black text-sky-950 mt-1">{cashierExpenseCount}</div>
              <div className="text-[11px] text-sky-700/80 mt-0.5">Staff food, bajaj & daily costs</div>
            </div>
          </div>

        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-3xl border border-gray-100 p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        
        {/* Filter Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <button
            type="button"
            onClick={() => setRoleFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              roleFilter === 'all' 
                ? 'bg-[#0E7452] text-white shadow-xs' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All Shortcuts ({suggestions.length})
          </button>
          <button
            type="button"
            onClick={() => setRoleFilter('baker')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center space-x-1.5 ${
              roleFilter === 'baker' 
                ? 'bg-amber-600 text-white shadow-xs' 
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            <ChefHat className="w-3.5 h-3.5" />
            <span>🥖 Baker Recipes ({bakerCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setRoleFilter('cashier_sale')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center space-x-1.5 ${
              roleFilter === 'cashier_sale' 
                ? 'bg-emerald-700 text-white shadow-xs' 
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>🛒 POS Sales ({cashierSaleCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setRoleFilter('cashier_expense')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center space-x-1.5 ${
              roleFilter === 'cashier_expense' 
                ? 'bg-sky-700 text-white shadow-xs' 
                : 'bg-sky-50 text-sky-800 hover:bg-sky-100'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>💸 Expenses ({cashierExpenseCount})</span>
          </button>
        </div>

        {/* Live Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search shortcuts by name or bread..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0E7452]"
          />
        </div>

      </div>

      {/* Main Grid: Visual Human-Readable Cards */}
      {filteredSuggestions.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-gray-200 p-12 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-[#0E7452] flex items-center justify-center mx-auto">
            <Sparkles className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-gray-800">No shortcut buttons found</h3>
          <p className="text-xs text-gray-400 max-w-md mx-auto">
            {searchTerm || roleFilter !== 'all' 
              ? 'No shortcut buttons match your search or filter criteria. Try clearing filters.'
              : 'Add your first 1-tap shortcut button to help your bakers or cashiers perform daily tasks fast.'}
          </p>
          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center space-x-1.5 bg-[#0E7452] text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-[#0c6446] transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Shortcut</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSuggestions.map((item) => {
            const p = item.payload || {};
            const isBaker = item.role_target === 'baker';
            const isSale = item.role_target === 'cashier' && item.category === 'sales_combo';
            const isExpense = item.role_target === 'cashier' && item.category !== 'sales_combo';

            return (
              <div 
                key={item.id}
                className="bg-white rounded-3xl border border-gray-100 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 group relative"
              >
                {/* Top Badge & Action Icons */}
                <div className="flex items-start justify-between">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {isBaker && (
                      <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 flex items-center space-x-1">
                        <ChefHat className="w-3 h-3 text-amber-700" />
                        <span>Baker Shortcut</span>
                      </span>
                    )}
                    {isSale && (
                      <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 flex items-center space-x-1">
                        <ShoppingBag className="w-3 h-3 text-emerald-700" />
                        <span>Cashier POS Sale</span>
                      </span>
                    )}
                    {isExpense && (
                      <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-sky-100 text-sky-900 flex items-center space-x-1">
                        <Receipt className="w-3 h-3 text-sky-700" />
                        <span>Cashier Expense</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(item)}
                      title="Edit this shortcut"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingItem(item)}
                      title="Remove this shortcut"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Title */}
                <div>
                  <h3 className="font-extrabold text-sm text-gray-900 leading-snug">
                    {item.title}
                  </h3>
                </div>

                {/* Ordinary Person Explanation Box */}
                <div className="p-3.5 rounded-2xl bg-gray-50/90 border border-gray-100 text-xs space-y-2">
                  {isBaker && (
                    <>
                      <div className="flex items-center justify-between text-gray-700 font-semibold">
                        <span>🍞 Target Product:</span>
                        <span className="font-bold text-gray-900">{p.product_name || 'Bread 1'}</span>
                      </div>
                      <div className="flex items-center justify-between text-gray-700 font-semibold">
                        <span>⚖️ Flour Amount:</span>
                        <span className="font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          {p.flour_kg || 0} kg
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-gray-700 font-semibold">
                        <span>🥖 Expected Output:</span>
                        <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          {p.pieces_produced || 0} pieces
                        </span>
                      </div>
                      {/* Ingredient summary */}
                      <div className="pt-2 border-t border-gray-200/60 text-[11px] text-gray-500">
                        <span className="font-medium">Mix Recipe: </span>
                        {p.maj_g ? `${p.maj_g}g MAJ, ` : ''}
                        {p.yeast_g ? `${p.yeast_g}g Yeast, ` : ''}
                        {p.salt_g ? `${p.salt_g}g Salt, ` : ''}
                        {p.sugar_g ? `${p.sugar_g}g Sugar, ` : ''}
                        {p.selit_g ? `${p.selit_g}g Selit` : ''}
                      </div>
                    </>
                  )}

                  {isSale && (
                    <>
                      <div className="flex items-center justify-between text-gray-700 font-semibold">
                        <span>📦 Bundle Product:</span>
                        <span className="font-bold text-gray-900">{p.product_name || 'Bread'}</span>
                      </div>
                      <div className="flex items-center justify-between text-gray-700 font-semibold">
                        <span>🔢 Quick Quantity:</span>
                        <span className="font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                          {p.quantity || 1} pieces
                        </span>
                      </div>
                      <div className="pt-2 border-t border-gray-200/60 text-[11px] text-gray-500 flex items-center space-x-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Adds {p.quantity || 1} items to cashier cart in 1 click</span>
                      </div>
                    </>
                  )}

                  {isExpense && (
                    <>
                      <div className="flex items-center justify-between text-gray-700 font-semibold">
                        <span>🏷️ Expense Category:</span>
                        <span className="font-bold text-gray-900">{p.category || 'Employee food'}</span>
                      </div>
                      <div className="flex items-center justify-between text-gray-700 font-semibold">
                        <span>💰 Default Amount:</span>
                        <span className="font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
                          {formatETB(p.amount || 0)}
                        </span>
                      </div>
                      <div className="pt-2 border-t border-gray-200/60 text-[11px] text-gray-500 truncate" title={p.description}>
                        📝 Note: {p.description || 'Pre-fills daily expense entry'}
                      </div>
                    </>
                  )}
                </div>

                {/* Footer Employee Screen Preview */}
                <div className="text-[10px] text-gray-400 flex items-center justify-between pt-1">
                  <span>Display on {isBaker ? 'Baker Dashboard' : 'Cashier Screen'}</span>
                  <span className="font-bold text-emerald-700 flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span>Active 1-Tap</span>
                  </span>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT GUIDED MODAL (Ordinary Person Friendly) */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl relative my-8 animate-in fade-in zoom-in-95">
            
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-[#0E7452]" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-gray-900">
                    {editingId ? 'Edit Shortcut Button' : 'Create 1-Tap Shortcut Button'}
                  </h3>
                  <p className="text-xs text-gray-400 font-medium">
                    Set up an easy button that employees can tap without doing manual math
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 font-bold transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="mt-5 space-y-5">
              
              {/* Step 1: Who will use this button? */}
              <div>
                <label className="block text-xs font-black text-gray-800 uppercase tracking-wider mb-2">
                  1. Who will use this shortcut button?
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setRoleTarget('baker');
                      setActionType('bread');
                      setManualTitleEdited(false);
                    }}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center space-x-3 ${
                      roleTarget === 'baker'
                        ? 'border-amber-600 bg-amber-50/80 ring-2 ring-amber-500/30'
                        : 'border-gray-200 bg-gray-50 hover:bg-white'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                      <ChefHat className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-black text-gray-900">🥖 Baker (Kitchen)</div>
                      <div className="text-[11px] text-gray-500">Auto-fill baking recipes</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRoleTarget('cashier');
                      setActionType('sales_combo');
                      setManualTitleEdited(false);
                    }}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center space-x-3 ${
                      roleTarget === 'cashier'
                        ? 'border-emerald-600 bg-emerald-50/80 ring-2 ring-emerald-500/30'
                        : 'border-gray-200 bg-gray-50 hover:bg-white'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                      <ShoppingBag className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-black text-gray-900">🛒 Cashier (POS / Expense)</div>
                      <div className="text-[11px] text-gray-500">Fast checkout & expenses</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Step 2: What type of shortcut is it? */}
              <div>
                <label className="block text-xs font-black text-gray-800 uppercase tracking-wider mb-2">
                  2. What type of shortcut is this?
                </label>
                
                {roleTarget === 'baker' ? (
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setActionType('bread');
                        setManualTitleEdited(false);
                      }}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-2 ${
                        actionType === 'bread'
                          ? 'border-amber-600 bg-amber-100/70 text-amber-950 font-black'
                          : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <span>🍞 Standard Bread Batch</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActionType('cookie');
                        setManualTitleEdited(false);
                      }}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-2 ${
                        actionType === 'cookie'
                          ? 'border-amber-600 bg-amber-100/70 text-amber-950 font-black'
                          : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <span>🍪 Cookie / Pastry Batch</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setActionType('sales_combo');
                        setManualTitleEdited(false);
                      }}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-2 ${
                        actionType === 'sales_combo'
                          ? 'border-emerald-600 bg-emerald-100/70 text-emerald-950 font-black'
                          : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <span>🛍️ Multi-Bread Sale Bundle</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActionType('expense');
                        setManualTitleEdited(false);
                      }}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-2 ${
                        actionType === 'expense'
                          ? 'border-sky-600 bg-sky-100/70 text-sky-950 font-black'
                          : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <span>💸 Daily Expense Shortcut</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Step 3: Guided Form Fields based on Action Type */}
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200/80 space-y-4">
                
                {/* Baker: Bread Batch */}
                {roleTarget === 'baker' && actionType === 'bread' && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Which bread product is being baked? *
                      </label>
                      <select
                        value={bakerProductName}
                        onChange={(e) => {
                          setBakerProductName(e.target.value);
                          setManualTitleEdited(false);
                        }}
                        className="w-full text-xs font-bold bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        {breadProducts.map(p => (
                          <option key={p.id} value={p.name}>
                            {p.name} ({formatETB(p.selling_price || 0)})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          Flour to use (kg) *
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="1"
                            step="any"
                            value={flourKg}
                            onChange={(e) => {
                              const val = e.target.value;
                              setFlourKg(val);
                              // Auto calculate typical defaults: 10 pcs/kg, 10g maj/kg, 6g yeast/kg, 10g salt/kg
                              const num = Number(val) || 0;
                              if (!manualTitleEdited) {
                                setPiecesProduced(num * 10 || 500);
                                setMajGrams(num * 10 || 500);
                                setYeastGrams(num * 6 || 300);
                                setSaltGrams(num * 10 || 500);
                              }
                            }}
                            className="w-full text-xs font-bold bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-gray-900 pr-10 focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">kg</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          Expected pieces produced *
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="1"
                            value={piecesProduced}
                            onChange={(e) => setPiecesProduced(e.target.value)}
                            className="w-full text-xs font-bold bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-gray-900 pr-12 focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">pcs</span>
                        </div>
                      </div>
                    </div>

                    {/* Ingredient Ratios */}
                    <div>
                      <div className="text-[11px] font-bold text-gray-600 mb-1.5 flex items-center justify-between">
                        <span>Recipe Ingredients (Grams):</span>
                        <span className="text-[10px] text-gray-400 font-normal">Adjustable standard mix</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[10px] font-medium text-gray-500 mb-0.5">MAJ mix (g)</label>
                          <input
                            type="number"
                            value={majGrams}
                            onChange={(e) => setMajGrams(e.target.value)}
                            className="w-full text-xs font-bold bg-white border rounded-xl px-2.5 py-1.5"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Yeast (g)</label>
                          <input
                            type="number"
                            value={yeastGrams}
                            onChange={(e) => setYeastGrams(e.target.value)}
                            className="w-full text-xs font-bold bg-white border rounded-xl px-2.5 py-1.5"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Salt (g)</label>
                          <input
                            type="number"
                            value={saltGrams}
                            onChange={(e) => setSaltGrams(e.target.value)}
                            className="w-full text-xs font-bold bg-white border rounded-xl px-2.5 py-1.5"
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Baker: Cookie Batch */}
                {roleTarget === 'baker' && actionType === 'cookie' && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Which cookie / pastry product? *
                      </label>
                      <select
                        value={bakerProductName}
                        onChange={(e) => {
                          setBakerProductName(e.target.value);
                          setManualTitleEdited(false);
                        }}
                        className="w-full text-xs font-bold bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        {cookieProducts.length > 0 ? (
                          cookieProducts.map(p => (
                            <option key={p.id} value={p.name}>
                              {p.name} ({formatETB(p.selling_price || 0)})
                            </option>
                          ))
                        ) : (
                          safeProducts.map(p => (
                            <option key={p.id} value={p.name}>{p.name}</option>
                          ))
                        )}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          Flour to use (kg) *
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={flourKg}
                          onChange={(e) => setFlourKg(e.target.value)}
                          className="w-full text-xs font-bold bg-white border rounded-xl px-3 py-2.5"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          Pieces produced *
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={piecesProduced}
                          onChange={(e) => setPiecesProduced(e.target.value)}
                          className="w-full text-xs font-bold bg-white border rounded-xl px-3 py-2.5"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Sugar (g)</label>
                        <input
                          type="number"
                          value={sugarGrams}
                          onChange={(e) => setSugarGrams(e.target.value)}
                          className="w-full text-xs font-bold bg-white border rounded-xl px-2.5 py-1.5"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Selit (g)</label>
                        <input
                          type="number"
                          value={selitGrams}
                          onChange={(e) => setSelitGrams(e.target.value)}
                          className="w-full text-xs font-bold bg-white border rounded-xl px-2.5 py-1.5"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Tekur Azmud (g)</label>
                        <input
                          type="number"
                          value={azmudGrams}
                          onChange={(e) => setAzmudGrams(e.target.value)}
                          className="w-full text-xs font-bold bg-white border rounded-xl px-2.5 py-1.5"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Cashier: POS Sale Bundle */}
                {roleTarget === 'cashier' && actionType === 'sales_combo' && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Which bakery item is sold in this bundle? *
                      </label>
                      <select
                        value={cashierProductName}
                        onChange={(e) => {
                          setCashierProductName(e.target.value);
                          setManualTitleEdited(false);
                        }}
                        className="w-full text-xs font-bold bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        {safeProducts.map(p => (
                          <option key={p.id} value={p.name}>
                            {p.name} — {formatETB(p.selling_price || 0)} per piece
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        How many pieces are added in 1 tap? *
                      </label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          min="1"
                          max="500"
                          value={comboQuantity}
                          onChange={(e) => {
                            setComboQuantity(e.target.value);
                            setManualTitleEdited(false);
                          }}
                          className="w-full text-xs font-bold bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <span className="text-xs font-bold text-gray-500 whitespace-nowrap">pieces</span>
                      </div>
                    </div>

                    {/* Live Calculation Callout */}
                    {(() => {
                      const prod = safeProducts.find(p => p.name.toLowerCase() === (cashierProductName || '').toLowerCase());
                      const unit = prod?.selling_price || 0;
                      const totalVal = (Number(comboQuantity) || 1) * unit;
                      return (
                        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs">
                          <span className="font-semibold text-emerald-900">
                            Calculation: {comboQuantity} pcs × {formatETB(unit)}
                          </span>
                          <span className="font-black text-emerald-800 text-sm">
                            Total: {formatETB(totalVal)}
                          </span>
                        </div>
                      );
                    })()}
                  </>
                )}

                {/* Cashier: Expense Shortcut */}
                {roleTarget === 'cashier' && actionType === 'expense' && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Expense Purpose / Category *
                      </label>
                      <select
                        value={expenseCategory}
                        onChange={(e) => {
                          setExpenseCategory(e.target.value);
                          setManualTitleEdited(false);
                        }}
                        className="w-full text-xs font-bold bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                      >
                        <option value="Employee food">🍲 Employee food (Staff lunch, tea, breakfast)</option>
                        <option value="Transportation for sending bread to other branches">🛺 Transportation / Bajaj delivery to branches</option>
                        <option value="Cleaning supplies">🧹 Cleaning & sanitation supplies</option>
                        <option value="Plastic bag purchases">🛍️ Plastic bag purchases</option>
                        <option value="Paper bag purchases">📦 Paper bag purchases</option>
                        <option value="Maintenance and repairs">🔧 Maintenance and equipment repairs</option>
                        <option value="Utility expense">💡 Utility / electricity / fuel</option>
                        <option value="Other expenses">➕ Other general operational expense</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          Default Amount (ETB) *
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="1"
                            step="any"
                            value={expenseAmount}
                            onChange={(e) => {
                              setExpenseAmount(e.target.value);
                              setManualTitleEdited(false);
                            }}
                            className="w-full text-xs font-bold bg-white border rounded-xl px-3 py-2.5 text-gray-900 pr-12 focus:outline-none focus:ring-2 focus:ring-sky-500"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">ETB</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          Brief Note / Purpose
                        </label>
                        <input
                          type="text"
                          value={expenseDescription}
                          onChange={(e) => setExpenseDescription(e.target.value)}
                          placeholder="e.g. Daily employee lunch"
                          className="w-full text-xs font-bold bg-white border rounded-xl px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                        />
                      </div>
                    </div>
                  </>
                )}

              </div>

              {/* Step 4: Button Title */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-black text-gray-800 uppercase tracking-wider">
                    3. What text should appear on the button? *
                  </label>
                  <button
                    type="button"
                    onClick={() => setManualTitleEdited(false)}
                    className="text-[11px] text-emerald-700 font-bold hover:underline cursor-pointer"
                  >
                    Reset to Recommended Name
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setManualTitleEdited(true);
                  }}
                  placeholder="e.g. Standard 50kg Table Bread Batch"
                  className="w-full text-xs font-bold bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-3 text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0E7452]"
                />
              </div>

              {/* Step 5: Plain-English Live Preview Box */}
              <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200/90 text-xs space-y-2">
                <div className="flex items-center space-x-1.5 font-black text-emerald-950 text-xs">
                  <Eye className="w-4 h-4 text-[#0E7452]" />
                  <span>What happens when the employee taps this button:</span>
                </div>
                <div className="text-emerald-900 text-[11px] leading-relaxed">
                  {roleTarget === 'baker' ? (
                    actionType === 'bread' ? (
                      <>
                        When the baker taps <span className="font-bold underline decoration-emerald-500">"{title || 'This button'}"</span> on their production screen, it automatically fills the form with <span className="font-bold">{flourKg} kg Flour</span> to produce <span className="font-bold">{piecesProduced} pcs of {bakerProductName}</span> using <span className="font-bold">{majGrams}g MAJ, {yeastGrams}g Yeast, and {saltGrams}g Salt</span>. Zero manual typing required!
                      </>
                    ) : (
                      <>
                        When the baker taps <span className="font-bold underline decoration-emerald-500">"{title || 'This button'}"</span>, it fills in <span className="font-bold">{flourKg} kg Flour</span>, producing <span className="font-bold">{piecesProduced} pcs of {bakerProductName}</span> with pre-filled cookie ratios.
                      </>
                    )
                  ) : (
                    actionType === 'sales_combo' ? (
                      <>
                        When the cashier taps <span className="font-bold underline decoration-emerald-500">"{title || 'This button'}"</span> at the POS checkout counter, it instantly places <span className="font-bold">{comboQuantity} pieces of {cashierProductName}</span> into the customer's cart in 1 tap!
                      </>
                    ) : (
                      <>
                        When the cashier taps <span className="font-bold underline decoration-emerald-500">"{title || 'This button'}"</span> on their expense desk, it immediately records a <span className="font-bold">{formatETB(expenseAmount)}</span> expense under <span className="font-bold">{expenseCategory}</span>.
                      </>
                    )
                  )}
                </div>
              </div>

              {/* Collapsible Advanced Technical Mode (Optional for Developers) */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => {
                    if (!showAdvancedJson) {
                      const { payload } = buildPayloadAndCategory();
                      setCustomPayloadText(JSON.stringify(payload, null, 2));
                    }
                    setShowAdvancedJson(!showAdvancedJson);
                  }}
                  className="text-[11px] text-gray-400 hover:text-gray-600 font-bold flex items-center space-x-1 cursor-pointer"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>{showAdvancedJson ? 'Hide Technical Payload (JSON)' : '⚙️ Advanced: View Technical JSON Payload'}</span>
                </button>

                {showAdvancedJson && (
                  <div className="mt-2 space-y-1">
                    <textarea
                      rows="4"
                      value={customPayloadText}
                      onChange={(e) => setCustomPayloadText(e.target.value)}
                      className="w-full font-mono text-[11px] bg-stone-900 text-emerald-400 p-3 rounded-xl focus:outline-none"
                    />
                    <div className="text-[10px] text-gray-400">
                      Developers can directly modify the JSON payload above if custom technical attributes are needed.
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2.5 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-2xl text-xs transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-[#0E7452] hover:bg-[#0c6446] text-white font-bold py-3 rounded-2xl text-xs shadow-md shadow-[#0E7452]/20 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-60"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSubmitting ? 'Saving...' : editingId ? 'Update Shortcut Button' : 'Save Shortcut Button'}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 text-center">
            
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="font-extrabold text-base text-gray-900">
                Remove Shortcut Button?
              </h3>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                Are you sure you want to remove <span className="font-bold text-gray-800">"{deletingItem.title}"</span>?
              </p>
              <div className="mt-3 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 text-left flex items-start space-x-2">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>This only removes the 1-tap shortcut button from the employee screen. No recipe, sales, or accounting records will be lost.</span>
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingItem(null)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-2xl text-xs transition-all cursor-pointer"
              >
                Keep Shortcut
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isSubmitting}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 rounded-2xl text-xs shadow-md shadow-rose-600/20 transition-all cursor-pointer disabled:opacity-60"
              >
                {isSubmitting ? 'Removing...' : 'Yes, Remove'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
