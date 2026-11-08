import React from 'react';
import { Package, AlertTriangle, CheckCircle } from 'lucide-react';
import { useTranslation } from '../../i18n';

export default function RawMaterialStatus({ materials }) {
  const { t } = useTranslation();
  return (
    <div className="bg-white rounded-3xl border border-stone-200 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Package className="w-5 h-5 text-amber-600" />
          <h3 className="font-bold text-stone-900 text-sm">
            {t('baker.rawMaterialStockTitle', 'Ingredient Availability in Store')}
          </h3>
        </div>
        <span className="text-xs text-stone-400 font-medium">{t('pos.inShop', 'Live Raw Stock')}</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {materials.map((mat) => {
          const isLow = mat.current_quantity <= mat.minimum_stock;
          return (
            <div 
              key={mat.id || mat.name}
              className={`p-3 rounded-2xl border transition-all ${
                isLow 
                  ? 'bg-rose-50/50 border-rose-200 text-rose-950' 
                  : 'bg-stone-50/60 border-stone-200/80 text-stone-900 hover:border-amber-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold truncate">{mat.name}</span>
                {isLow ? (
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                ) : (
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                )}
              </div>
              <div className="mt-1 flex items-baseline space-x-1">
                <span className={`text-base font-extrabold ${isLow ? 'text-rose-700' : 'text-stone-900'}`}>
                  {mat.current_quantity}
                </span>
                <span className="text-[11px] font-semibold text-stone-500">{mat.unit}</span>
              </div>
              {isLow && (
                <div className="text-[10px] font-semibold text-rose-600 mt-1">
                  {t('baker.lowStockAlert', 'Low stock!')} {t('common.minStock', 'Min')}: {mat.minimum_stock} {mat.unit}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
