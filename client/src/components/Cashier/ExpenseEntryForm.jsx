import React, { useState, useEffect } from 'react';
import { Receipt, Plus, CheckCircle2, Sparkles, DollarSign } from 'lucide-react';
import { formatETB } from '../../utils/formatters';
import { useTranslation } from '../../i18n';

export default function ExpenseEntryForm({ 
  rawMaterials = [], 
  expenses = [], 
  cashier = {}, 
  suggestions = [], 
  onAddExpense, 
  isSubmitting = false 
}) {
  const { t } = useTranslation();

  const safeMaterials = Array.isArray(rawMaterials) ? rawMaterials : [];
  const safeExpenses = Array.isArray(expenses) ? expenses : [];

  // Exact 10 items specified by the user + Add Other Expense
  const variableExpenseButtons = [
    { label: t('cashier.foodEmployees', '🍲 Food for the employees'), category: 'Employee food', defaultAmount: 250 },
    { label: t('cashier.transportationBranches', '🛺 Transportation to other branches'), category: 'Transportation for sending bread to other branches', defaultAmount: 300 },
    { label: t('cashier.flourPurchase', '🌾 Flour purchase'), category: 'Flour purchases', defaultAmount: 4250, isInventory: true, matName: 'Flour' },
    { label: t('cashier.majPurchase', '🧪 Maj mix purchase'), category: 'MAJ mix purchases', defaultAmount: 900, isInventory: true, matName: 'MAJ mix' },
    { label: t('cashier.yeastPurchase', '🍞 Yeast purchase'), category: 'Yeast purchases', defaultAmount: 660, isInventory: true, matName: 'Yeast' },
    { label: t('cashier.saltPurchase', '🧂 Salt purchase'), category: 'Salt purchases', defaultAmount: 250, isInventory: true, matName: 'Salt' },
    { label: t('cashier.selitPurchase', '🌱 Selit purchase'), category: 'Selit purchases', defaultAmount: 700, isInventory: true, matName: 'Selit' },
    { label: t('cashier.tekurAzmudPurchase', '🌿 Tekur azmud purchase'), category: 'Tekur azmud purchases', defaultAmount: 520, isInventory: true, matName: 'Tekur azmud' },
    { label: t('cashier.plasticBagPurchase', '🛍️ Plastic bag purchase'), category: 'Plastic bag purchases', defaultAmount: 750, isInventory: true, matName: 'Plastic bags' },
    { label: t('cashier.paperBagPurchase', '📦 Paper bag purchase'), category: 'Paper bag purchases', defaultAmount: 600, isInventory: true, matName: 'Paper bags' },
  ];

  const [category, setCategory] = useState('Employee food');
  const [description, setDescription] = useState(t('cashier.foodEmployees', 'Lunch for bakery staff'));
  const [amount, setAmount] = useState('250');
  const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash' or 'bank'
  const [remarks, setRemarks] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Inventory purchase linking
  const [isInventoryPurchase, setIsInventoryPurchase] = useState(false);
  const [inventoryMaterialId, setInventoryMaterialId] = useState(safeMaterials[0]?.id || safeMaterials[0]?._id || '');
  const [quantityAdded, setQuantityAdded] = useState('');

  // Auto-select material if empty when materials load
  useEffect(() => {
    if (!inventoryMaterialId && safeMaterials.length > 0) {
      setInventoryMaterialId(safeMaterials[0].id || safeMaterials[0]._id);
    }
  }, [inventoryMaterialId, safeMaterials]);

  // Custom expense modal toggle
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customCategoryName, setCustomCategoryName] = useState('');

  function applyQuickButton(item) {
    setCategory(item.category);
    setDescription(item.label);
    setAmount(String(item.defaultAmount));
    if (item.isInventory) {
      setIsInventoryPurchase(true);
      const match = safeMaterials.find(m => m.name.toLowerCase().includes(item.matName.toLowerCase()));
      if (match) setInventoryMaterialId(match.id || match._id);
    } else {
      setIsInventoryPurchase(false);
    }
  }

  function handleCustomAdd(e) {
    e.preventDefault();
    if (!customCategoryName) return;
    setCategory(customCategoryName);
    setDescription(customCategoryName);
    setShowCustomModal(false);
    setCustomCategoryName('');
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;

    const payload = {
      expense_category: category,
      description: description || category,
      amount: parseFloat(amount),
      expense_date: new Date().toISOString().slice(0, 10),
      payment_method: paymentMethod,
      recorded_by_id: cashier?.id || cashier?._id || cashier?.username || 'cashier',
      recorded_by_name: cashier?.full_name || 'Tigist Haile (Cashier)',
      is_inventory_purchase: Boolean(isInventoryPurchase),
      inventory_material_id: isInventoryPurchase ? inventoryMaterialId : '',
      inventory_quantity_added: isInventoryPurchase ? parseFloat(quantityAdded) || 0 : 0,
      remarks,
    };

    onAddExpense(payload);
    setSuccessMsg(t('cashier.expenseSuccess', '✅ Expense of {amount} recorded successfully!').replace('{amount}', formatETB(amount)));
    setTimeout(() => setSuccessMsg(''), 5000);
    setRemarks('');
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayExpenses = safeExpenses.filter(e => e.expense_date === todayStr);
  const todayTotal = todayExpenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* 10 QUICK VARIABLE EXPENSE BUTTONS */}
      <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-stone-200">
          <div>
            <h2 className="text-base font-black text-stone-900 flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-[#064e3b]" />
              <span>{t('cashier.quickExpensesTitle', 'Variable Expenses (Quick Selection):')}</span>
            </h2>
            <p className="text-xs text-stone-500 font-semibold">
              {t('cashier.quickExpensesDesc', 'Tap any button below to immediately fill the expense form')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCustomModal(true)}
            className="bg-[#064e3b] hover:bg-emerald-900 text-white font-black text-xs px-4 py-2 rounded-xl shadow-xs transition-all flex items-center space-x-1 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t('cashier.addOtherExpenseBtn', '➕ Add Other Expense')}</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {variableExpenseButtons.map((btn) => (
            <button
              key={btn.label}
              type="button"
              onClick={() => applyQuickButton(btn)}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between h-24 ${
                category === btn.category
                  ? 'border-[#064e3b] bg-emerald-50/80 shadow-md ring-2 ring-emerald-600/30 font-black'
                  : 'border-stone-200 bg-stone-50 hover:bg-white hover:border-emerald-400 font-bold'
              }`}
            >
              <div className="text-xs font-black text-stone-900 line-clamp-2">{btn.label}</div>
              <div className="text-xs font-black text-[#064e3b] mt-1">{formatETB(btn.defaultAmount)}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Success Notification Alert */}
      {successMsg && (
        <div className="bg-emerald-100 border-2 border-emerald-600 text-emerald-950 rounded-2xl p-4 flex items-center justify-between shadow-md text-sm font-black animate-in fade-in">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-800 text-lg">✕</button>
        </div>
      )}

      {/* Expense Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-stone-200">
          <div className="flex items-center space-x-2">
            <Receipt className="w-5 h-5 text-[#064e3b]" />
            <h2 className="text-base font-black text-stone-900">
              {t('cashier.recordExpenseTitle', 'Record Variable Expense')}
            </h2>
          </div>
          <span className="text-xs text-stone-500 font-black">
            {t('cashier.todaysCashOut', "Today's Total Cash Out: {amount}").replace('{amount}', '')}
            <strong className="text-rose-700">{formatETB(todayTotal)}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-black text-stone-700 uppercase mb-1">
              {t('cashier.expenseCategoryLabel', 'Expense Category *')}
            </label>
            <input
              type="text"
              required
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-stone-50 border border-stone-300 rounded-xl p-3 font-black text-stone-900 text-sm focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-stone-700 uppercase mb-1">
              {t('cashier.descReasonLabel', 'Description / Reason')}
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-stone-50 border border-stone-300 rounded-xl p-3 font-bold text-stone-900 text-sm focus:bg-white"
              placeholder="e.g. Lunch for Dawit & Tigist"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-stone-700 uppercase mb-1">
              {t('cashier.amountLabel', 'Amount (ETB) *')}
            </label>
            <input
              type="number"
              step="0.01"
              min="1"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-stone-50 border-2 border-emerald-600/50 rounded-xl p-3 font-black text-emerald-950 text-2xl focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-stone-700 uppercase mb-1">
              {t('cashier.paymentSourceLabel', 'Payment Source')}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`py-3 rounded-xl border-2 font-black text-xs transition-all cursor-pointer ${
                  paymentMethod === 'cash'
                    ? 'border-[#064e3b] bg-emerald-50 text-emerald-950 shadow-xs ring-1 ring-emerald-500'
                    : 'border-stone-200 bg-stone-50 text-stone-600'
                }`}
              >
                {t('cashier.cashDrawerBtn', '💵 Main Shop Cash Drawer')}
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('bank')}
                className={`py-3 rounded-xl border-2 font-black text-xs transition-all cursor-pointer ${
                  paymentMethod === 'bank'
                    ? 'border-blue-600 bg-blue-50 text-blue-950 shadow-xs ring-1 ring-blue-500'
                    : 'border-stone-200 bg-stone-50 text-stone-600'
                }`}
              >
                {t('cashier.bankOrTelebirrBtn', '🏦 CBE / Telebirr')}
              </button>
            </div>
          </div>
        </div>

        {/* Inventory Restock Checkbox */}
        <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <label className="flex items-center space-x-2 cursor-pointer font-black text-stone-800">
            <input
              type="checkbox"
              checked={isInventoryPurchase}
              onChange={(e) => setIsInventoryPurchase(e.target.checked)}
              className="w-4 h-4 rounded text-[#064e3b]"
            />
            <span>{t('cashier.didRestockQuestion', 'Did this purchase restock raw materials or bags in the store?')}</span>
          </label>

          {isInventoryPurchase && (
            <div className="flex items-center space-x-2">
              <select
                value={inventoryMaterialId}
                onChange={(e) => setInventoryMaterialId(e.target.value)}
                className="bg-white border border-stone-300 rounded-lg p-2 font-bold"
              >
                {safeMaterials.map((m) => (
                  <option key={m.id || m._id} value={m.id || m._id}>{m.name} ({m.unit})</option>
                ))}
              </select>
              <input
                type="number"
                placeholder={t('cashier.qtyAddedLabel', 'Qty added')}
                value={quantityAdded}
                onChange={(e) => setQuantityAdded(e.target.value)}
                className="w-24 bg-white border border-stone-300 rounded-lg p-2 font-bold"
              />
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !amount}
          className="w-full py-4 rounded-2xl bg-[#064e3b] hover:bg-emerald-900 text-white font-black text-base shadow-md transition-all active:scale-98 cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50"
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-300" />
          <span>
            {t('cashier.saveExpenseBtn', 'SAVE EXPENSE ({amount})').replace('{amount}', formatETB(amount || 0))}
          </span>
        </button>
      </form>

      {/* Custom Other Expense Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleCustomAdd} className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <h3 className="font-black text-base text-stone-900">
              {t('cashier.customExpenseModalTitle', 'Add Custom Other Expense')}
            </h3>
            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">
                {t('cashier.customExpenseNameLabel', 'Expense Name')}
              </label>
              <input
                type="text"
                required
                autoFocus
                placeholder="e.g. Water Bill, Generator Fuel"
                value={customCategoryName}
                onChange={(e) => setCustomCategoryName(e.target.value)}
                className="w-full bg-stone-50 border border-stone-300 rounded-xl p-3 font-bold text-sm"
              />
            </div>
            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCustomModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 cursor-pointer"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-black bg-[#064e3b] text-white cursor-pointer"
              >
                {t('cashier.useExpenseBtn', 'Use Expense')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Today's Expense Log */}
      <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-3">
        <h3 className="font-black text-sm text-stone-900 pb-2 border-b border-stone-200">
          {t('cashier.todaysExpensesTitle', "Today's Recorded Expenses ({count})").replace('{count}', todayExpenses.length)}
        </h3>
        {todayExpenses.length === 0 ? (
          <div className="text-center py-6 text-xs text-stone-400 font-semibold">
            {t('cashier.noExpensesToday', 'No expenses recorded yet today.')}
          </div>
        ) : (
          <div className="space-y-2">
            {todayExpenses.map((exp) => (
              <div key={exp.id} className="p-3 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-stone-900">{exp.expense_category}</span>
                  <span className="text-stone-400 ml-2">({exp.description})</span>
                </div>
                <div className="font-black text-stone-900">
                  {formatETB(exp.amount)} <span className="text-[10px] text-stone-400 uppercase">({exp.payment_method})</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
