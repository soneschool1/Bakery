import React, { useState } from 'react';
import { Wheat, Eye, XCircle, AlertCircle, Edit3 } from 'lucide-react';
import { formatETB } from '../../utils/formatters';
import { useTranslation } from '../../i18n';

export default function ProductionManager({ 
  batches, 
  onCancelBatch, 
  onEditBatch, 
  admin 
}) {
  const { t } = useTranslation();
  const [cancelModalBatch, setCancelModalBatch] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [selectedBatch, setSelectedBatch] = useState(null);

  function handleCancelSubmit(e) {
    e.preventDefault();
    if (!cancelModalBatch || !cancelReason) return;
    onCancelBatch(cancelModalBatch.id, {
      reason: cancelReason,
      admin_name: admin.full_name || 'Abebe Kebede',
    });
    setCancelModalBatch(null);
    setCancelReason('');
  }

  return (
    <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-stone-200 bg-stone-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <Wheat className="w-5 h-5 text-[#064e3b]" />
          <h2 className="font-black text-stone-900 text-sm">
            {t('admin.productionManager.title', 'Production Management & Batch Oversight')}
          </h2>
        </div>
        <span className="text-xs text-stone-500">
          {t('admin.productionManager.batchesCount', '{count} total batches').replace('{count}', batches.length)}
        </span>
      </div>

      <div className="overflow-x-auto scrollbar-none">
        <table className="w-full min-w-[750px] text-left text-xs">
          <thead className="bg-stone-100 text-stone-600 font-bold uppercase text-[10px] border-b border-stone-200">
            <tr>
              <th className="py-3 px-4">{t('admin.productionManager.colBatch', 'Batch #')}</th>
              <th className="py-3 px-4">{t('admin.productionManager.colDateTime', 'Date & Time')}</th>
              <th className="py-3 px-4">{t('admin.productionManager.colBaker', 'Baker')}</th>
              <th className="py-3 px-4">{t('admin.productionManager.colProduct', 'Product Name')}</th>
              <th className="py-3 px-4 text-center">{t('admin.productionManager.colPieces', 'Pieces')}</th>
              <th className="py-3 px-4 text-right">{t('admin.productionManager.colPotential', 'Potential Value')}</th>
              <th className="py-3 px-4 text-right">{t('admin.productionManager.colCost', 'Ingredient Cost')}</th>
              <th className="py-3 px-4">{t('admin.productionManager.colStatus', 'Status')}</th>
              <th className="py-3 px-4 text-right">{t('admin.productionManager.colActions', 'Admin Actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {batches.map((b) => (
              <tr key={b.id || b.batch_number} className="hover:bg-amber-50/20">
                <td className="py-3 px-4 font-mono font-bold text-amber-800">{b.batch_number}</td>
                <td className="py-3 px-4 text-stone-600">{b.production_date} {b.production_time}</td>
                <td className="py-3 px-4 font-semibold text-stone-800">{b.baker_name}</td>
                <td className="py-3 px-4 font-bold text-stone-900">{b.product_name}</td>
                <td className="py-3 px-4 text-center font-extrabold text-stone-800">{b.pieces_produced}</td>
                <td className="py-3 px-4 text-right font-black text-amber-700">{formatETB(b.potential_selling_value)}</td>
                <td className="py-3 px-4 text-right font-bold text-rose-700">{formatETB(b.cost_of_ingredients)}</td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    b.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                    b.status === 'edited' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {b.status}
                  </span>
                </td>
                <td className="py-3 px-4 text-right space-x-2">
                  <button
                    onClick={() => setSelectedBatch(b)}
                    className="p-1 text-stone-600 hover:text-stone-900"
                    title={t('admin.productionManager.viewDetails', 'View Batch Details')}
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  {b.status !== 'cancelled' && (
                    <button
                      onClick={() => setCancelModalBatch(b)}
                      className="p-1 text-rose-600 hover:text-rose-800"
                      title={t('admin.productionManager.cancelBatch', 'Cancel Batch (Reverses Stock with Audit Log)')}
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cancel Modal */}
      {cancelModalBatch && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleCancelSubmit} className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="border-b border-stone-200 pb-3">
              <span className="text-xs font-mono font-bold text-rose-600">{cancelModalBatch.batch_number}</span>
              <h3 className="text-base font-extrabold text-stone-900">{t('admin.productionManager.cancelTitle', 'Cancel Production Batch')}</h3>
              <p className="text-xs text-stone-500">
                {t('admin.productionManager.cancelWarning', 'Cancelling reverses finished goods from shop stock and restores deducted raw ingredients.')}
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                {t('admin.productionManager.cancelReasonLabel', 'Reason for Cancellation *')}
              </label>
              <textarea
                required
                rows="3"
                placeholder={t('admin.productionManager.cancelReasonHint', 'e.g. Burnt in oven, test batch, wrong dough mix')}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full text-xs bg-stone-50 border border-stone-300 rounded-xl p-3 text-stone-800"
              />
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setCancelModalBatch(null)}
                className="flex-1 bg-stone-100 text-stone-700 font-bold py-2 rounded-xl text-xs"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                type="submit"
                className="flex-1 bg-rose-600 text-white font-bold py-2 rounded-xl text-xs shadow-xs"
              >
                {t('admin.productionManager.confirmCancelBtn', 'Confirm Batch Cancellation')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Batch Details Modal */}
      {selectedBatch && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b">
              <div>
                <span className="font-mono text-xs font-bold text-amber-800">{selectedBatch.batch_number}</span>
                <h3 className="text-base font-black">{selectedBatch.product_name}</h3>
              </div>
              <button onClick={() => setSelectedBatch(null)} className="font-bold text-stone-400">✕</button>
            </div>
            <div className="text-xs space-y-2">
              <div className="font-bold text-stone-800">{t('baker.step3Title', 'Ingredients Consumed')}:</div>
              <div className="bg-stone-50 p-3 rounded-xl divide-y">
                {selectedBatch.ingredients_consumed?.map((ing, i) => (
                  <div key={i} className="py-1 flex justify-between">
                    <span>{ing.name} ({ing.quantity} {ing.unit})</span>
                    <span className="font-bold text-amber-900">{formatETB(ing.total_cost)}</span>
                  </div>
                ))}
              </div>
            </div>
            <button
              onClick={() => setSelectedBatch(null)}
              className="w-full bg-stone-100 py-2 rounded-xl text-xs font-bold"
            >
              {t('common.close', 'Close')}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
