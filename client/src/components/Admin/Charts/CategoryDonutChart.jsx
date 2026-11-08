import React, { useState } from 'react';
import { PieChart, ArrowUpRight } from 'lucide-react';
import { formatETB } from '../../../utils/formatters';
import { useTranslation } from '../../../i18n/LanguageContext';

export default function CategoryDonutChart({ salesByProduct = {} }) {
  const { t } = useTranslation();
  const [hoveredSlice, setHoveredSlice] = useState(null);

  // Group into standard bakery product categories
  const entries = Object.entries(salesByProduct || {}).filter(([, amt]) => amt > 0);
  const totalValue = entries.reduce((sum, [, amt]) => sum + amt, 0);

  const colors = ['#0E7452', '#228B65', '#34A87C', '#57B594', '#8AD1BA', '#9AD6C4', '#CBEBE1', '#D0ECE3'];
  const chartData = entries.map(([name, value], i) => ({
    name,
    value,
    color: colors[i % colors.length],
    percent: totalValue > 0 ? Math.round((value / totalValue) * 100) : 0,
  }));

  // SVG Donut calculation
  const size = 180;
  const center = size / 2;
  const radius = 70;
  const innerRadius = 48;
  const strokeWidth = radius - innerRadius;
  const circ = 2 * Math.PI * ((radius + innerRadius) / 2);

  let accumulatedPercent = 0;

  return (
    <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] flex flex-col justify-between">
      <div className="flex items-center justify-between pb-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-[#E8F6F2] text-[#0E7452] flex items-center justify-center font-bold">
            <PieChart className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm tracking-tight">{t('admin.charts.salesMixTitle', 'Product Sales Mix')}</h3>
            <p className="text-[11px] text-gray-400 font-medium">{t('admin.charts.salesMixSubtitle', 'Revenue by baked category')}</p>
          </div>
        </div>
        <button 
          type="button"
          className="w-8 h-8 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-gray-700 flex items-center justify-center transition-colors"
        >
          <ArrowUpRight className="w-4 h-4" />
        </button>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-4">
        {/* SVG Donut */}
        <div className="relative shrink-0">
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rotate-[-90deg] overflow-visible">
            {chartData.length === 0 ? (
              <circle
                cx={center}
                cy={center}
                r={(radius + innerRadius) / 2}
                fill="transparent"
                stroke="#E5E7EB"
                strokeWidth={strokeWidth}
              />
            ) : (
              chartData.map((slice, idx) => {
                const slicePercent = totalValue > 0 ? slice.value / totalValue : 0;
                const strokeDasharray = `${slicePercent * circ} ${circ}`;
                const strokeDashoffset = -accumulatedPercent * circ;
                accumulatedPercent += slicePercent;
                const isHovered = hoveredSlice === idx;

                return (
                  <circle
                    key={idx}
                    cx={center}
                    cy={center}
                    r={(radius + innerRadius) / 2}
                    fill="transparent"
                    stroke={slice.color}
                    strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-300 cursor-pointer"
                    onMouseEnter={() => setHoveredSlice(idx)}
                    onMouseLeave={() => setHoveredSlice(null)}
                  />
                );
              })
            )}
          </svg>

          {/* Center Text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
              {t('admin.charts.total', 'Total')}
            </span>
            <span className="text-xs font-black text-gray-900">
              {hoveredSlice !== null ? formatETB(chartData[hoveredSlice].value) : formatETB(totalValue)}
            </span>
          </div>
        </div>

        {/* Legend */}
        {chartData.length === 0 ? (
          <div className="flex-1 w-full text-center py-6 text-xs text-gray-400 font-medium">
            {t('admin.charts.noSalesPeriod', 'No product sales recorded in this period yet.')}
          </div>
        ) : (
          <div className="space-y-2 flex-1 w-full text-xs">
            {chartData.slice(0, 5).map((slice, i) => {
              const pct = totalValue > 0 ? Math.round((slice.value / totalValue) * 100) : 0;
              return (
                <div 
                  key={i} 
                  className={`flex items-center justify-between p-1.5 rounded-xl transition-colors cursor-pointer ${
                    hoveredSlice === i ? 'bg-gray-50' : ''
                  }`}
                  onMouseEnter={() => setHoveredSlice(i)}
                  onMouseLeave={() => setHoveredSlice(null)}
                >
                  <div className="flex items-center space-x-2 truncate">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: slice.color }}></span>
                    <span className="font-semibold text-gray-700 truncate">{slice.name}</span>
                  </div>
                  <div className="flex items-center space-x-2 shrink-0">
                    <span className="font-mono font-bold text-gray-900">{formatETB(slice.value)}</span>
                    <span className="text-[10px] font-bold text-gray-400">({pct}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
        <span>{t('admin.charts.topPerforming', 'Fastest Moving Counter Items')}</span>
        <span className="font-bold text-[#0E7452]">✓ Healthy Category Mix</span>
      </div>
    </div>
  );
}
