import React, { useState } from 'react';
import { Landmark, CheckCircle2, History, AlertCircle } from 'lucide-react';
import { formatETB } from '../../utils/formatters';
import { useTranslation } from '../../i18n';

export default function BankDepositForm({ 
  deposits = [], 
  flourTracker = null, 
  cashier = {}, 
  onRecordDeposit, 
  isSubmitting = false 
}) {
  const { t } = useTranslation();
  const safeDeposits = Array.isArray(deposits) ? deposits : [];
  const [depositAmount, setDepositAmount] = useState('');
  const [bankName, setBankName] = useState('Commercial Bank of Ethiopia (CBE)');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [remarks, setRemarks] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const banks = [
    'Commercial Bank of Ethiopia (CBE)',
    'Awash Bank',
    'Dashen Bank',
    'Bank of Abyssinia (BOA)',
    'Telebirr SuperApp / Merchant Deposit',
    'Other Bank',
  ];

  function handleSubmit(e) {
    e.preventDefault();
    if (!depositAmount || !referenceNumber) {
      alert(t('cashier.fillDepositFields', 'Please fill in deposit amount and bank reference number.'));
      return;
    }

    const payload = {
      deposit_date: new Date().toISOString().slice(0, 10),
      amount: parseFloat(depositAmount),
      bankName: bankName,
      bank_name: bankName,
      reference_number: referenceNumber,
      deposited_by_id: cashier?.id || cashier?._id || cashier?.username || 'cashier',
      deposited_by_name: cashier?.full_name || 'Tigist Haile (Cashier)',
      triggered_by_flour_milestone: Boolean(flourTracker?.deposit_reminder_active),
      remarks,
    };

    onRecordDeposit(payload);
    setSuccessMsg(t('cashier.depositSuccess', '✅ Bank deposit of {amount} recorded successfully!').replace('{amount}', formatETB(depositAmount)));
    setTimeout(() => setSuccessMsg(''), 6000);
    setDepositAmount('');
    setReferenceNumber('');
    setRemarks('');
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* Deposit Entry Form */}
      <div className="bg-white rounded-3xl border border-stone-200 p-4 sm:p-6 shadow-xs space-y-4">
        <div className="pb-3 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <Landmark className="w-5 h-5 text-[#064e3b] shrink-0" />
            <h2 className="text-base font-black text-stone-900 break-words">
              {t('cashier.recordDepositTitle', 'Record Bank Deposit Slip')}
            </h2>
          </div>
          <span className="text-xs text-stone-400 font-bold shrink-0">
            {t('cashier.separateDepositNotice', 'Recorded separately (does not represent expense or new sales revenue)')}
          </span>
        </div>

        {flourTracker?.deposit_reminder_active && (
          <div className="p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-600 text-xs text-emerald-950 flex items-center space-x-3 font-black shadow-xs">
            <AlertCircle className="w-5 h-5 text-emerald-700 shrink-0" />
            <span>
              {t('cashier.milestoneActiveNotice', '1 Quintal (100 kg) Flour Milestone is active! This bank deposit will fulfill and reset the milestone reminder.')}
            </span>
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-100 border-2 border-emerald-600 text-emerald-950 rounded-2xl p-4 flex items-center justify-between shadow-md text-sm font-black animate-in fade-in">
            <span>{successMsg}</span>
            <button onClick={() => setSuccessMsg('')} className="text-emerald-800 text-lg">✕</button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            <div>
              <label className="block text-xs font-black text-stone-700 uppercase mb-1">
                {t('cashier.depositAmountLabel', 'Deposit Amount (ETB) *')}
              </label>
              <input
                type="number"
                step="0.01"
                min="1"
                required
                placeholder="e.g. 15,000"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="w-full text-2xl font-black bg-stone-50 border-2 border-emerald-600/50 rounded-2xl p-3 text-emerald-950 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-stone-700 uppercase mb-1">
                {t('cashier.bankInstitutionLabel', 'Bank Institution *')}
              </label>
              <select
                required
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full text-xs font-black bg-stone-50 border border-stone-300 rounded-2xl p-3.5 text-stone-900 focus:bg-white"
              >
                {banks.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-black text-stone-700 uppercase mb-1">
                {t('cashier.bankRefLabel', 'Bank Reference / Slip Number *')}
              </label>
              <input
                type="text"
                required
                placeholder="e.g. FT2603498877"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                className="w-full text-sm font-mono font-black bg-stone-50 border border-stone-300 rounded-2xl p-3 text-stone-900 focus:bg-white"
              />
            </div>

          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <input
              type="text"
              placeholder={t('cashier.depositRemarksLabel', 'Deposit remarks / note (optional)')}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full sm:flex-1 text-xs bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-stone-800"
            />
            <button
              type="submit"
              disabled={isSubmitting || !depositAmount || !referenceNumber}
              className="w-full sm:w-auto bg-[#064e3b] hover:bg-emerald-900 text-white font-black text-xs px-8 py-3.5 rounded-2xl shadow-md transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              <span>{t('cashier.submitDepositBtn', 'RECORD BANK DEPOSIT SLIP')}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Deposits History */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-stone-200 bg-stone-50 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
          <h3 className="font-black text-stone-900 text-xs uppercase tracking-wider">
            {t('cashier.depositLogTitle', 'Bank Deposits Log')}
          </h3>
          <span className="text-xs text-stone-500 font-bold">
            {t('cashier.depositsCount', '{count} deposits recorded').replace('{count}', safeDeposits.length)}
          </span>
        </div>

        <div className="overflow-x-auto scrollbar-none">
          <table className="w-full min-w-[550px] text-left text-xs">
            <thead className="bg-stone-100 text-stone-500 font-bold uppercase text-[10px] border-b border-stone-200">
              <tr>
                <th className="py-2.5 px-4">{t('common.date', 'Date')}</th>
                <th className="py-2.5 px-4">{t('cashier.bankInstitutionLabel', 'Bank Name')}</th>
                <th className="py-2.5 px-4">{t('cashier.bankRefLabel', 'Slip / Ref #')}</th>
                <th className="py-2.5 px-4 text-right">{t('common.totalAmount', 'Amount (ETB)')}</th>
                <th className="py-2.5 px-4">{t('common.depositedBy', 'Deposited By')}</th>
                <th className="py-2.5 px-4 text-center">{t('nav.flourMilestone', 'Flour Milestone')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {safeDeposits.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-stone-400 font-bold">
                    {t('cashier.noDeposits', 'No bank deposits recorded yet.')}
                  </td>
                </tr>
              ) : (
                safeDeposits.map((d) => (
                  <tr key={d.id || d.reference_number} className="hover:bg-emerald-50/20">
                    <td className="py-3 px-4 font-mono text-stone-600">{d.deposit_date}</td>
                    <td className="py-3 px-4 font-black text-stone-900">{d.bank_name || d.bankName}</td>
                    <td className="py-3 px-4 font-mono font-bold text-[#064e3b]">{d.reference_number}</td>
                    <td className="py-3 px-4 text-right font-black text-emerald-800">{formatETB(d.amount)}</td>
                    <td className="py-3 px-4 text-stone-700 font-bold">{d.deposited_by_name}</td>
                    <td className="py-3 px-4 text-center">
                      {d.triggered_by_flour_milestone ? (
                        <span className="bg-emerald-100 text-emerald-800 font-black text-[10px] px-2 py-0.5 rounded-full uppercase">
                          100 kg Flour
                        </span>
                      ) : (
                        <span className="text-stone-400 text-[10px]">Standard</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
