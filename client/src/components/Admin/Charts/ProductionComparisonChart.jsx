import React from 'react';
import { ArrowUpRight, Scale } from 'lucide-react';
import { useTranslation } from '../../../i18n/LanguageContext';

export default function ProductionComparisonChart({ 
  totalPiecesProduced = 0, 
  totalItemsSold = 0,
  finishedStockPieces = 0 
}) {
  const { t } = useTranslation();
  const sellThroughRate = totalPiecesProduced > 0 
    ? Math.min(100, Math.round((totalItemsSold / totalPiecesProduced) * 100))
    : 0;

  const maxQty = Math.max(totalPiecesProduced, totalItemsSold, finishedStockPieces, 1);
  const prodWidth = totalPiecesProduced > 0 ? Math.max(4, Math.round((totalPiecesProduced / maxQty) * 100)) : 0;
  const soldWidth = totalItemsSold > 0 ? Math.max(4, Math.round((totalItemsSold / maxQty) * 100)) : 0;
  const stockWidth = finishedStockPieces > 0 ? Math.max(4, Math.round((finishedStockPieces / maxQty) * 100)) : 0;

  return (
    <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] flex flex-col justify-between">
      <div className="flex items-center justify-between pb-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-[#E8F6F2] text-[#0E7452] flex items-center justify-center font-bold">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm tracking-tight">
              {t('admin.charts.prodVsSalesTitle', 'Production vs Sales Volume')}
            </h3>
            <p className="text-[11px] text-gray-400 font-medium">
              {t('admin.charts.prodVsSalesSubtitle', 'Baking efficiency & counter sell-through')}
            </p>
          </div>
        </div>
        <button 
          type="button"
          className="w-8 h-8 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-gray-700 flex items-center justify-center transition-colors"
        >
          <ArrowUpRight className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-4 py-2">
        {/* Metric Comparison Bar 1: Produced */}
        <div>
          <div className="flex justify-between items-center text-xs font-bold mb-1.5">
            <span className="text-gray-600">{t('admin.charts.producedByBaker', 'Produced by Baker')}</span>
            <span className="text-gray-900 font-extrabold">{(totalPiecesProduced || 0).toLocaleString()} pcs</span>
          </div>
          <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#0E7452] rounded-full transition-all duration-700" 
              style={{ width: `${prodWidth}%` }}
            />
          </div>
        </div>

        {/* Metric Comparison Bar 2: Sold */}
        <div>
          <div className="flex justify-between items-center text-xs font-bold mb-1.5">
            <span className="text-gray-600">{t('admin.charts.soldByCashier', 'Sold by Cashier POS')}</span>
            <div className="flex items-center space-x-1.5">
              <span className="text-gray-900 font-extrabold">{(totalItemsSold || 0).toLocaleString()} pcs</span>
              <span className="text-[11px] font-bold text-[#0E7452] bg-[#E8F6F2] px-1.5 py-0.5 rounded-full">
                {t('admin.charts.pctSold', '{pct}% sold').replace('{pct}', sellThroughRate)}
              </span>
            </div>
          </div>
          <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#34A87C] rounded-full transition-all duration-700" 
              style={{ width: `${soldWidth}%` }}
            />
          </div>
        </div>

        {/* Metric Comparison Bar 3: Shelf Stock */}
        <div>
          <div className="flex justify-between items-center text-xs font-bold mb-1.5">
            <span className="text-gray-600">{t('admin.charts.shelfStock', 'Available on Store Shelves')}</span>
            <span className="text-gray-900 font-extrabold">{(finishedStockPieces || 0).toLocaleString()} pcs</span>
          </div>
          <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#9FD8C7] rounded-full transition-all duration-700" 
              style={{ width: `${stockWidth}%` }}
            />
          </div>
        </div>
      </div>

      {/* Summary Footer */}
      <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
        <span className="text-gray-400 font-medium">{t('admin.charts.dailyTarget', 'Daily Target Sell-Through: 80%')}</span>
        <span className="font-bold text-[#0E7452]">{t('admin.charts.optimalFreshness', 'Optimal Freshness')}</span>
      </div>
    </div>
  );
}
