import React, { useState, useEffect } from 'react';
import { ClipboardCheck, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useTranslation } from '../../i18n';

export default function WeeklyStockCheckForm({ 
  rawMaterials = [], 
  stockChecks = [], 
  cashier = {}, 
  onSubmitCheck, 
  onApproveCheck,
  isAdmin = false,
  isSubmitting = false 
}) {
  const { t } = useTranslation();

  const safeMaterials = Array.isArray(rawMaterials) ? rawMaterials : [];
  const safeStockChecks = Array.isArray(stockChecks) ? stockChecks : [];

  const [counts, setCounts] = useState(() => {
    const initial = {};
    safeMaterials.forEach(m => {
      const key = m.id || m._id;
      initial[key] = {
        physical: m.current_quantity,
        explanation: '',
      };
    });
    return initial;
  });

  // Keep counts in sync when materials arrive from server
  useEffect(() => {
    if (safeMaterials.length > 0) {
      setCounts(prev => {
        const next = { ...prev };
        let changed = false;
        safeMaterials.forEach(m => {
          const key = m.id || m._id;
          if (!next[key]) {
            next[key] = { physical: m.current_quantity, explanation: '' };
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }
  }, [safeMaterials]);

  const [notes, setNotes] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  function handleCountChange(materialId, physical) {
    setCounts(prev => ({
      ...prev,
      [materialId]: {
        ...prev[materialId],
        physical: parseFloat(physical) || 0,
      },
    }));
  }

  function handleExplanationChange(materialId, explanation) {
    setCounts(prev => ({
      ...prev,
      [materialId]: {
        ...prev[materialId],
        explanation,
      },
    }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    const items = safeMaterials.map(m => {
      const key = m.id || m._id;
      const c = counts[key] || { physical: m.current_quantity, explanation: '' };
      return {
        material_id: key,
        material_name: m.name,
        system_quantity: m.current_quantity,
        physical_quantity: c.physical,
        difference: c.physical - m.current_quantity,
        explanation: c.explanation || '',
      };
    });

    const payload = {
      check_date: new Date().toISOString().slice(0, 10),
      employee_id: cashier?.id || cashier?._id || cashier?.username || 'cashier',
      employee_name: cashier?.full_name || 'Staff (Cashier)',
      items,
      notes,
    };

    onSubmitCheck(payload);
    setSuccessMsg(t('cashier.weeklyCheckSuccess', '✅ Weekly physical stock check submitted for administrator approval!'));
    setTimeout(() => setSuccessMsg(''), 6000);
    setNotes('');
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* Physical Count Form */}
      <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-4">
        <div className="pb-3 border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ClipboardCheck className="w-5 h-5 text-[#064e3b]" />
            <h2 className="text-base font-black text-stone-900">
              {t('cashier.weeklyCheckTitle', 'Weekly Physical Inventory Count & Discrepancy Form')}
            </h2>
          </div>
          <span className="text-xs text-stone-500 font-bold">
            {t('cashier.weeklyCheckSubtitle', 'Physically count store stock vs system records')}
          </span>
        </div>

        {successMsg && (
          <div className="bg-emerald-100 border-2 border-emerald-600 text-emerald-950 rounded-2xl p-4 flex items-center justify-between shadow-md text-sm font-black animate-in fade-in">
            <span>{successMsg}</span>
            <button onClick={() => setSuccessMsg('')} className="text-emerald-800 text-lg">✕</button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="overflow-x-auto scrollbar-none">
            <table className="w-full min-w-[620px] text-left text-xs">
              <thead className="bg-stone-100/70 text-stone-600 font-bold uppercase text-[10px] border-b border-stone-200">
                <tr>
                  <th className="py-2.5 px-3">{t('cashier.colMaterial', 'Material Name')}</th>
                  <th className="py-2.5 px-3">{t('cashier.colUnit', 'Unit')}</th>
                  <th className="py-2.5 px-3 text-right">{t('cashier.colSystemStock', 'System Recorded')}</th>
                  <th className="py-2.5 px-3">{t('cashier.colPhysicalStock', 'Physically Counted')}</th>
                  <th className="py-2.5 px-3 text-right">{t('cashier.colDiscrepancy', 'Difference')}</th>
                  <th className="py-2.5 px-3">{t('cashier.colReason', 'Discrepancy Explanation')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {safeMaterials.map((m) => {
                  const key = m.id || m._id;
                  const currentVal = counts[key]?.physical !== undefined ? counts[key].physical : m.current_quantity;
                  const diff = currentVal - m.current_quantity;
                  return (
                    <tr key={key} className="hover:bg-emerald-50/20">
                      <td className="py-3 px-3 font-black text-stone-900">{m.name}</td>
                      <td className="py-3 px-3 text-stone-500 font-bold uppercase">{m.unit}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-stone-700">{m.current_quantity}</td>
                      <td className="py-3 px-3">
                        <input
                          type="number"
                          step="0.01"
                          value={currentVal}
                          onChange={(e) => handleCountChange(key, e.target.value)}
                          className="w-28 bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5 font-black text-stone-900 focus:bg-white text-xs"
                        />
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-black">
                        <span className={diff < 0 ? 'text-rose-600' : diff > 0 ? 'text-emerald-700' : 'text-stone-400'}>
                          {diff > 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1)}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <input
                          type="text"
                          placeholder={t('common.reason', 'Reason if difference...')}
                          value={counts[key]?.explanation || ''}
                          onChange={(e) => handleExplanationChange(key, e.target.value)}
                          className="w-full bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs text-stone-800"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-stone-100">
            <input
              type="text"
              placeholder={t('common.notes', 'Overall weekly physical check notes (optional)')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full sm:flex-1 text-xs bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-stone-800"
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto bg-[#064e3b] hover:bg-emerald-900 text-white font-black text-xs px-8 py-3.5 rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              <span>{t('cashier.submitWeeklyCheckBtn', 'SUBMIT WEEKLY STOCK CHECK')}</span>
            </button>
          </div>
        </form>
      </div>

    </div>
  );
}
