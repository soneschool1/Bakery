import React, { useState } from 'react';
import { History, Eye, Edit3, XCircle, AlertCircle, Calendar } from 'lucide-react';
import { useTranslation } from '../../i18n';

export default function ProductionHistory({ 
  batches, 
  onEditBatch, 
  baker,
  isAdmin = false 
}) {
  const { t } = useTranslation();
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [editModalBatch, setEditModalBatch] = useState(null);
  const [newPieces, setNewPieces] = useState(0);
  const [editReason, setEditReason] = useState('');
  const [filterDate, setFilterDate] = useState('all'); // "today" or "all"

  const todayStr = new Date().toISOString().slice(0, 10);
  const filteredBatches = batches.filter(b => {
    if (filterDate === 'today') return b.production_date === todayStr;
    return true;
  });

  function openEditModal(batch) {
    setEditModalBatch(batch);
    setNewPieces(batch.pieces_produced);
    setEditReason('');
  }

  function handleSaveEdit(e) {
    e.preventDefault();
    if (!editModalBatch || !editReason) return;
    onEditBatch(editModalBatch.id, {
      pieces_produced: Number(newPieces),
      reason: editReason,
      editor_name: baker.full_name || 'Dawit Alemu',
      remarks: editModalBatch.remarks,
    });
    setEditModalBatch(null);
  }

  return (
    <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
      
      {/* Header and Filter */}
      <div className="p-5 border-b border-stone-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-stone-50/50">
        <div className="flex items-center space-x-2">
          <History className="w-5 h-5 text-amber-600" />
          <h3 className="font-extrabold text-stone-900 text-sm">
            {t('baker.historyTitle', 'Production Batch Records')}
          </h3>
          <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
            {filteredBatches.length} {t('baker.todayBatches', 'batches')}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setFilterDate('today')}
            className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              filterDate === 'today'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
            }`}
          >
            {t('common.today', "Today's Batches")}
          </button>
          <button
            onClick={() => setFilterDate('all')}
            className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              filterDate === 'all'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
            }`}
          >
            {t('common.all', 'All History')}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-stone-100/70 text-stone-600 font-bold uppercase tracking-wider text-[11px] border-b border-stone-200">
            <tr>
              <th className="py-3 px-4">{t('baker.colBatch', 'Batch #')}</th>
              <th className="py-3 px-4">{t('common.date', 'Date')} & {t('common.time', 'Time')}</th>
              <th className="py-3 px-4">{t('baker.colProduct', 'Product Name')}</th>
              <th className="py-3 px-4 text-center">{t('common.pieces', 'Pieces')}</th>
              <th className="py-3 px-4 text-right">{t('baker.totalBatchWeight', 'Total Weight')}</th>
              <th className="py-3 px-4">{t('common.status', 'Status')}</th>
              <th className="py-3 px-4 text-right">{t('common.actions', 'Actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {filteredBatches.length === 0 ? (
              <tr>
                <td colSpan="7" className="py-12 text-center text-stone-400 font-medium">
                  {t('baker.noBatches', 'No production records found for this period.')}
                </td>
              </tr>
            ) : (
              filteredBatches.map((b) => (
                <tr key={b.id || b.batch_number} className="hover:bg-amber-50/40 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-amber-800">{b.batch_number}</td>
                  <td className="py-3 px-4 text-stone-600">{b.production_date} <span className="text-stone-400">{b.production_time}</span></td>
                  <td className="py-3 px-4 font-bold text-stone-900">{b.product_name}</td>
                  <td className="py-3 px-4 text-center font-extrabold text-stone-800">{b.pieces_produced}</td>
                  <td className="py-3 px-4 text-right font-black text-emerald-800">
                    {b.total_weight_grams ? (b.total_weight_grams / 1000).toFixed(1) + ' kg' : `${((b.pieces_produced * 100) / 1000).toFixed(1)} kg`}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      b.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                      b.status === 'edited' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {b.status === 'completed' ? t('common.completed', 'Completed') :
                       b.status === 'edited' ? t('common.edited', 'Edited') :
                       b.status === 'cancelled' ? t('common.cancelled', 'Cancelled') : b.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right space-x-1.5">
                    <button
                      onClick={() => setSelectedBatch(b)}
                      className="p-1.5 rounded-lg text-stone-600 hover:text-amber-800 hover:bg-amber-100 transition-colors cursor-pointer"
                      title={t('common.viewDetails', 'View Details')}
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {(isAdmin || baker.role === 'admin' || baker.role === 'baker') && b.status !== 'cancelled' && (
                      <button
                        onClick={() => openEditModal(b)}
                        className="p-1.5 rounded-lg text-stone-600 hover:text-blue-800 hover:bg-blue-100 transition-colors cursor-pointer"
                        title={t('common.edit', 'Authorized Correction')}
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Batch Details View Modal */}
      {selectedBatch && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <div>
                <span className="text-xs font-mono font-bold text-amber-700">{selectedBatch.batch_number}</span>
                <h3 className="text-lg font-extrabold text-stone-900">{selectedBatch.product_name}</h3>
              </div>
              <button 
                onClick={() => setSelectedBatch(null)}
                className="text-stone-400 hover:text-stone-600 text-xl font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-stone-50 p-3.5 rounded-2xl">
              <div>
                <span className="text-stone-400">{t('admin.colBaker', 'Baker')}:</span> <span className="font-bold text-stone-800">{selectedBatch.baker_name}</span>
              </div>
              <div>
                <span className="text-stone-400">{t('common.date', 'Date')}:</span> <span className="font-bold text-stone-800">{selectedBatch.production_date} {selectedBatch.production_time}</span>
              </div>
              <div>
                <span className="text-stone-400">{t('baker.piecesToBake', 'Pieces Produced')}:</span> <span className="font-extrabold text-stone-900">{selectedBatch.pieces_produced}</span>
              </div>
              <div>
                <span className="text-stone-400">{t('baker.totalBatchWeight', 'Total Batch Weight')}:</span> <span className="font-extrabold text-emerald-800">
                  {selectedBatch.total_weight_grams ? (selectedBatch.total_weight_grams / 1000).toFixed(1) + ' kg' : `${((selectedBatch.pieces_produced * 100) / 1000).toFixed(1)} kg`}
                </span>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                {t('baker.step3Title', 'Ingredients Consumed')}
              </h4>
              <div className="bg-stone-50 rounded-2xl p-3 divide-y divide-stone-200/60 text-xs">
                {selectedBatch.ingredients_consumed?.map((ing, i) => (
                  <div key={i} className="py-1.5 flex justify-between">
                    <span className="font-semibold text-stone-800">{ing.name}</span>
                    <span className="font-mono text-stone-600">{ing.quantity} {ing.unit}</span>
                  </div>
                ))}
              </div>
            </div>

            {selectedBatch.audit_trail?.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-2 flex items-center space-x-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{t('admin.auditLogs', 'Audit Trail of Modifications')}</span>
                </h4>
                <div className="bg-amber-50/60 rounded-2xl p-3 text-xs space-y-2 border border-amber-200/60 max-h-32 overflow-y-auto">
                  {selectedBatch.audit_trail.map((entry, idx) => (
                    <div key={idx} className="border-b border-amber-200/40 pb-1">
                      <div className="font-bold text-amber-950">{entry.edited_by} - <span className="font-normal text-stone-500">{new Date(entry.edited_at).toLocaleString()}</span></div>
                      <div className="text-stone-700">{t('common.reason', 'Reason')}: {entry.reason}</div>
                      <div className="text-stone-500 text-[11px]">{entry.previous_values}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => setSelectedBatch(null)}
              className="w-full py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs transition-colors cursor-pointer"
            >
              {t('common.close', 'Close')}
            </button>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editModalBatch && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleSaveEdit} className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-extrabold text-stone-900">
              {t('common.edit', 'Correct Production Count')} ({editModalBatch.batch_number})
            </h3>
            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">
                {t('baker.piecesToBake', 'Pieces Produced')} *
              </label>
              <input
                type="number"
                min="1"
                required
                value={newPieces}
                onChange={(e) => setNewPieces(e.target.value)}
                className="w-full bg-stone-50 border border-stone-300 rounded-xl p-2.5 text-base font-bold"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">
                {t('common.reason', 'Reason for Correction')} *
              </label>
              <input
                type="text"
                required
                placeholder={t('baker.correctionPlaceholder', 'e.g. Recounted cooling racks, typing mistake')}
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                className="w-full bg-stone-50 border border-stone-300 rounded-xl p-2.5 text-xs"
              />
            </div>
            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setEditModalBatch(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 cursor-pointer"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs cursor-pointer"
              >
                {t('common.save', 'Save Correction')}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
