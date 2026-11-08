import React, { useState, useEffect } from 'react';
import { 
  Calculator, 
  DollarSign, 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle, 
  Clock,
  Landmark
} from 'lucide-react';
import { formatETB } from '../../utils/formatters';
import { useTranslation } from '../../i18n';

export default function DailyReconciliationForm({ 
  summary, 
  cashier, 
  closings, 
  onSubmitClosing, 
  onReviewClosing,
  isAdmin = false,
  isSubmitting 
}) {
  const { t } = useTranslation();
  const [actualCash, setActualCash] = useState('');
  const [bankDeposit, setBankDeposit] = useState('');
  const [cashRemaining, setCashRemaining] = useState('');
  const [remarks, setRemarks] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const expectedCash = summary?.expected_cash_amount || 0;
  const actualCashNum = parseFloat(actualCash) || 0;
  const cashDifference = actualCashNum - expectedCash;
  const isShortage = cashDifference < 0;
  const isSurplus = cashDifference > 0;
  const isExact = cashDifference === 0 && actualCash !== '';

  useEffect(() => {
    const dep = parseFloat(bankDeposit) || 0;
    if (actualCashNum >= dep) {
      setCashRemaining((actualCashNum - dep).toFixed(2));
    }
  }, [actualCashNum, bankDeposit]);

  function handleSubmit(e) {
    e.preventDefault();
    if (actualCash === '') {
      alert(t('cashier.enterActualCashPrompt', 'Please enter actual cash counted from the drawer.'));
      return;
    }

    const payload = {
      closing_date: summary?.closing_date || new Date().toISOString().slice(0, 10),
      cashier_id: cashier.id || cashier.username || 'cashier',
      cashier_name: cashier.full_name || 'Tigist Haile',
      branch_id: 'main',
      branch_name: 'Main Bakery & Shop',
      total_quantity_sold: summary?.total_quantity_sold || 0,
      total_sales_value: summary?.total_sales_value || 0,
      total_cash_sales: summary?.total_cash_sales || 0,
      total_bank_sales: summary?.total_bank_sales || 0,
      total_cash_expenses: summary?.total_cash_expenses || 0,
      expected_cash_amount: expectedCash,
      actual_cash_counted: actualCashNum,
      bank_deposit_amount: parseFloat(bankDeposit) || 0,
      cash_remaining_in_shop: parseFloat(cashRemaining) || 0,
      remarks,
    };

    onSubmitClosing(payload);
    setSuccessMsg(t('cashier.closingSubmitted', '✅ Daily cash closing submitted for manager review!'));
    setTimeout(() => setSuccessMsg(''), 6000);
    setActualCash('');
    setBankDeposit('');
    setRemarks('');
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      
      {/* Success Notification Alert */}
      {successMsg && (
        <div className="bg-emerald-100 border-2 border-emerald-500 text-emerald-950 rounded-2xl p-4 flex items-center justify-between shadow-md text-sm font-black animate-in fade-in">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-800 text-lg">✕</button>
        </div>
      )}

      {/* Step 1: Automatic System Numbers */}
      <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-stone-200">
          <div className="flex items-center space-x-2">
            <Calculator className="w-5 h-5 text-amber-600" />
            <h2 className="text-base font-black text-stone-900">
              {t('cashier.summaryTitle', "Today's Sales & Cash Summary ({date})").replace('{date}', summary?.closing_date || new Date().toISOString().slice(0, 10))}
            </h2>
          </div>
          <span className="text-xs text-stone-400 font-semibold">
            {t('cashier.autoCalculated', 'Auto-calculated from cash drawer')}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-stone-50 border border-stone-200 p-4 rounded-2xl">
            <div className="text-[11px] font-bold text-stone-500 uppercase">
              {t('cashier.itemsSold', 'Items Sold')}
            </div>
            <div className="text-xl font-black text-stone-900 mt-1">
              {summary?.total_quantity_sold || 0} {t('common.pieces', 'pcs')}
            </div>
          </div>

          <div className="bg-stone-50 border border-stone-200 p-4 rounded-2xl">
            <div className="text-[11px] font-bold text-stone-500 uppercase">
              {t('cashier.cashSales', 'Cash Sales')}
            </div>
            <div className="text-xl font-black text-emerald-700 mt-1">
              {formatETB(summary?.total_cash_sales || 0)}
            </div>
          </div>

          <div className="bg-stone-50 border border-stone-200 p-4 rounded-2xl">
            <div className="text-[11px] font-bold text-stone-500 uppercase">
              {t('cashier.cashPaidOut', 'Cash Paid Out')}
            </div>
            <div className="text-xl font-black text-rose-700 mt-1">
              {formatETB(summary?.total_cash_expenses || 0)}
            </div>
          </div>

          <div className="bg-amber-50 border-2 border-amber-500/50 p-4 rounded-2xl">
            <div className="text-[11px] font-black text-amber-900 uppercase">
              {t('cashier.expectedCash', 'Expected Cash')}
            </div>
            <div className="text-xl font-black text-amber-900 mt-1">
              {formatETB(expectedCash)}
            </div>
          </div>
        </div>
      </div>

      {/* Step 2: Cash Count & Verification */}
      <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-6">
        <div>
          <h2 className="text-base font-black text-stone-900 mb-1">
            {t('cashier.physicalDrawerTitle', 'Physical Drawer Cash Count')}
          </h2>
          <p className="text-xs text-stone-500">
            {t('cashier.physicalDrawerDesc', 'Count the physical cash in your drawer at closing time and enter below.')}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          {/* Actual Cash Input */}
          <div>
            <label className="block text-xs font-black text-stone-800 uppercase mb-1">
              {t('cashier.actualCashCounted', '1. Actual Cash Counted (ETB) *')}
            </label>
            <input
              type="number"
              step="0.01"
              required
              placeholder="e.g. 5200"
              value={actualCash}
              onChange={(e) => setActualCash(e.target.value)}
              className="w-full bg-stone-50 border-2 border-stone-300 rounded-2xl p-3 text-2xl font-black text-stone-900 focus:bg-white focus:border-amber-600"
            />
          </div>

          {/* Bank Deposit */}
          <div>
            <label className="block text-xs font-black text-stone-800 uppercase mb-1">
              {t('cashier.depositToBankOptional', '2. Deposit to Bank (Optional)')}
            </label>
            <input
              type="number"
              step="0.01"
              placeholder="Amount to bank"
              value={bankDeposit}
              onChange={(e) => setBankDeposit(e.target.value)}
              className="w-full bg-stone-50 border-2 border-stone-300 rounded-2xl p-3 text-2xl font-black text-emerald-800 focus:bg-white"
            />
          </div>

          {/* Cash Remaining Float */}
          <div>
            <label className="block text-xs font-black text-stone-800 uppercase mb-1">
              {t('cashier.shopFloat', '3. Cash Left in Shop Float')}
            </label>
            <input
              type="number"
              readOnly
              value={cashRemaining}
              className="w-full bg-stone-100 border-2 border-stone-200 rounded-2xl p-3 text-2xl font-black text-stone-600 cursor-not-allowed"
            />
          </div>

        </div>

        {/* Live Shortage / Surplus Indicator */}
        {actualCash !== '' && (
          <div className={`p-4 rounded-2xl border-2 flex items-center justify-between text-sm font-black ${
            isExact 
              ? 'bg-emerald-50 border-emerald-500 text-emerald-900' 
              : isShortage 
              ? 'bg-rose-50 border-rose-500 text-rose-900' 
              : 'bg-amber-50 border-amber-500 text-amber-900'
          }`}>
            <div className="flex items-center space-x-2">
              {isExact && <CheckCircle2 className="w-6 h-6 text-emerald-600" />}
              {isShortage && <AlertTriangle className="w-6 h-6 text-rose-600" />}
              {isSurplus && <CheckCircle2 className="w-6 h-6 text-amber-600" />}
              <span>
                {isExact && t('cashier.exactMatch', '🎉 Exact Match! Physical cash perfectly matches expected sales.')}
                {isShortage && t('cashier.shortageDiff', '⚠️ Shortage: Missing {diff} compared to expected sales.').replace('{diff}', formatETB(-cashDifference))}
                {isSurplus && t('cashier.surplusDiff', '🎉 Surplus: You have {diff} more than expected sales.').replace('{diff}', formatETB(cashDifference))}
              </span>
            </div>
            <span className="text-base font-black">
              {t('cashier.diffLabel', 'Diff: {amount}').replace('{amount}', formatETB(cashDifference))}
            </span>
          </div>
        )}

        <input
          type="text"
          placeholder={t('cashier.closingRemarks', 'Closing remarks / explanation for any difference (optional)')}
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-xs text-stone-800"
        />

        <button
          type="submit"
          disabled={isSubmitting || actualCash === ''}
          className="w-full py-4 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white font-black text-base shadow-lg transition-all active:scale-98 disabled:opacity-50 cursor-pointer flex items-center justify-center space-x-2"
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span>{t('cashier.submitClosingBtn', 'SUBMIT DAILY CLOSING FOR MANAGER APPROVAL')}</span>
        </button>
      </form>

    </div>
  );
}
