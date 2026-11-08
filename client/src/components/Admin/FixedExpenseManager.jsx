import React, { useState, useEffect } from 'react';
import { Landmark, Plus, CheckCircle, Clock, AlertCircle, Edit2, Trash2 } from 'lucide-react';
import { api } from '../../services/api';
import { formatETB } from '../../utils/formatters';
import { useTranslation } from '../../i18n/LanguageContext';

export default function FixedExpenseManager({ 
  fixedExpenses, 
  onAddFixedExpense, 
  onUpdateFixedExpense, 
  onDeleteFixedExpense,
  admin 
}) {
  const { t } = useTranslation();
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7)); // "YYYY-MM"
  const [monthStatuses, setMonthStatuses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState('monthly');
  const [dueDay, setDueDay] = useState('1');

  useEffect(() => {
    loadMonthStatuses();
  }, [currentMonth, fixedExpenses]);

  async function loadMonthStatuses() {
    setIsLoading(true);
    try {
      const res = await api.getFixedExpensePayments(currentMonth);
      setMonthStatuses(res.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  async function toggleStatus(item) {
    const newStatus = item.status === 'paid' ? 'unpaid' : 'paid';
    try {
      await api.recordFixedExpensePayment({
        fixed_expense_id: item.fixed_expense.id,
        period_month: currentMonth,
        amount: item.fixed_expense.monthly_amount,
        status: newStatus,
        payment_method: 'bank',
        paid_by: admin.full_name || 'Abebe Kebede',
        reference: `MTH-${currentMonth}`,
        remarks: `Marked ${newStatus} by admin`,
      });
      loadMonthStatuses();
    } catch (err) {
      alert(`Error updating payment: ${err.message}`);
    }
  }

  function handleAddSubmit(e) {
    e.preventDefault();
    if (!name || !amount) return;

    onAddFixedExpense({
      name,
      monthly_amount: parseFloat(amount),
      payment_frequency: frequency,
      due_day_of_month: parseInt(dueDay) || 1,
      active: true,
    });

    setShowAddModal(false);
    setName('');
    setAmount('');
  }

  const totalMonthlyCommitment = fixedExpenses.reduce((sum, f) => sum + f.monthly_amount, 0);

  return (
    <div className="space-y-6">
      
      {/* Header and Total Commitment */}
      <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Landmark className="w-5 h-5 text-[#064e3b]" />
            <h2 className="text-base font-black text-stone-900">
              {t('admin.fixedExpenseManager.title', 'Constant / Fixed Expenses & Staff Salaries')}
            </h2>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            {t('admin.fixedExpenseManager.subtitle', 'Main shop rent (50,000), store & bedroom rent (10,000 each), head baker (7,500), assistant (4,500), accountant (5,000).')}
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="text-right">
            <span className="text-[10px] text-stone-400 font-bold uppercase">
              {t('admin.fixedExpenseManager.totalMonthly', 'Total Monthly Obligation')}
            </span>
            <div className="text-lg font-black text-[#064e3b]">
              {formatETB(totalMonthlyCommitment)}
            </div>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-[#064e3b] hover:bg-emerald-900 text-white font-black text-xs px-4 py-2.5 rounded-xl shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-emerald-300" />
            <span>{t('admin.fixedExpenseManager.addNewBtn', 'Add Fixed Expense')}</span>
          </button>
        </div>
      </div>

      {/* Month Selector Bar */}
      <div className="bg-stone-50 rounded-2xl border border-stone-200 p-3.5 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2 font-bold text-stone-700">
          <Clock className="w-4 h-4 text-amber-600" />
          <span>{t('admin.fixedExpenseManager.trackingMonth', 'Tracking Payment Status for Month:')}</span>
        </div>
        <input
          type="month"
          value={currentMonth}
          onChange={(e) => setCurrentMonth(e.target.value)}
          className="text-xs font-bold bg-white border border-stone-300 rounded-xl px-3 py-1.5 text-stone-900"
        />
      </div>

      {/* Fixed Expenses Cards / Table */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto scrollbar-none">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="bg-stone-100 text-stone-600 font-bold uppercase text-[10px] border-b border-stone-200">
              <tr>
                <th className="py-3 px-4">{t('admin.fixedExpenseManager.colExpenseName', 'Fixed Expense / Salary Item')}</th>
                <th className="py-3 px-4">{t('admin.fixedExpenseManager.colFrequency', 'Frequency')}</th>
                <th className="py-3 px-4">{t('admin.fixedExpenseManager.colDueDay', 'Due Day')}</th>
                <th className="py-3 px-4 text-right">{t('admin.fixedExpenseManager.colMonthlyAmount', 'Monthly Amount')}</th>
                <th className="py-3 px-4">{t('admin.fixedExpenseManager.statusForMonth', 'Status for {month}').replace('{month}', currentMonth)}</th>
                <th className="py-3 px-4 text-right">{t('admin.fixedExpenseManager.colPaymentAction', 'Payment Action')}</th>
                <th className="py-3 px-4 text-center">{t('admin.fixedExpenseManager.colManage', 'Manage')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {monthStatuses.map((item) => {
                const isPaid = item.status === 'paid';
                return (
                  <tr key={item.fixed_expense.id} className="hover:bg-amber-50/20">
                    <td className="py-3.5 px-4 font-extrabold text-stone-900">
                      {item.fixed_expense.name}
                    </td>
                    <td className="py-3.5 px-4 capitalize text-stone-600">{item.fixed_expense.payment_frequency}</td>
                    <td className="py-3.5 px-4 font-bold text-stone-500">
                      {t('admin.fixedExpenseManager.dayNumber', 'Day {day}').replace('{day}', item.fixed_expense.due_day_of_month)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-stone-900">
                      {formatETB(item.fixed_expense.monthly_amount)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {isPaid ? t('admin.fixedExpenseManager.paidBadge', '✓ PAID') : t('admin.fixedExpenseManager.unpaidBadge', 'UNPAID')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => toggleStatus(item)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                          isPaid 
                            ? 'bg-stone-100 hover:bg-stone-200 text-stone-700' 
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                        }`}
                      >
                        {isPaid ? t('admin.fixedExpenseManager.markUnpaid', 'Mark as Unpaid') : t('admin.fixedExpenseManager.markPaid', 'Mark as Paid')}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => onDeleteFixedExpense(item.fixed_expense.id)}
                        className="text-stone-400 hover:text-rose-600 cursor-pointer"
                        title={t('common.delete', 'Delete')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Fixed Expense Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleAddSubmit} className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-extrabold text-stone-900 text-base">
                {t('admin.fixedExpenseManager.addModalTitle', 'Add New Fixed Expense / Salary')}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-stone-400 font-bold text-lg cursor-pointer">✕</button>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                {t('admin.fixedExpenseManager.expenseNameLabel', 'Expense Name *')}
              </label>
              <input
                type="text"
                required
                placeholder={t('admin.fixedExpenseManager.namePlaceholder', 'e.g. Electricity Bill, Baker Bonus')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-xs font-bold bg-stone-50 border rounded-xl px-3 py-2"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  {t('admin.fixedExpenseManager.monthlyAmountLabel', 'Monthly Amount (ETB) *')}
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="50,000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full text-xs font-bold bg-stone-50 border rounded-xl px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  {t('admin.fixedExpenseManager.dueDayLabel', 'Due Day of Month')}
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={dueDay}
                  onChange={(e) => setDueDay(e.target.value)}
                  className="w-full text-xs font-bold bg-stone-50 border rounded-xl px-3 py-2"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="flex-1 bg-stone-100 font-bold py-2 rounded-xl text-xs cursor-pointer"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                type="submit"
                className="flex-1 bg-amber-700 text-white font-bold py-2 rounded-xl text-xs shadow-xs cursor-pointer"
              >
                {t('admin.fixedExpenseManager.saveFixedExpense', 'Save Fixed Expense')}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
