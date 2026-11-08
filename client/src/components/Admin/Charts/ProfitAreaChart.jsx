import React, { useState, useMemo } from 'react';
import { ArrowUpRight, ArrowUp, ArrowDown } from 'lucide-react';
import { formatETB } from '../../../utils/formatters';
import { useTranslation } from '../../../i18n/LanguageContext';

export default function ProfitAreaChart({ 
  kpis = {}, 
  dailySalesMap = {},
  dailyProfitMap = {},
  dailyExpensesMap = {},
  dailyNetProfitMap = {},
  onRecordDeposit, 
  onViewClosings 
}) {
  const { t } = useTranslation();
  const [hoverPoint, setHoverPoint] = useState(null);

  const netProfit = kpis?.today_net_profit ?? 0;
  const grossProfit = kpis?.today_gross_profit ?? 0;

  // Dynamically calculate smooth financial curve from actual daily net profit
  const points = useMemo(() => {
    const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const now = new Date();
    const rawPoints = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayName = dayNames[d.getDay()];

      let val = 0;
      if (dailyNetProfitMap && dailyNetProfitMap[dateStr] !== undefined) {
        val = dailyNetProfitMap[dateStr];
      } else if (dailyProfitMap && dailyProfitMap[dateStr] !== undefined) {
        const exp = dailyExpensesMap ? (dailyExpensesMap[dateStr] || 0) : 0;
        val = dailyProfitMap[dateStr] - exp;
      } else if (i === 0 && kpis?.today_net_profit !== undefined) {
        val = kpis.today_net_profit;
      }

      rawPoints.push({
        label: i === 0 ? 'Today' : dayName,
        dateStr,
        val: Math.round(val * 100) / 100,
      });
    }

    const values = rawPoints.map((p) => p.val);
    const maxVal = Math.max(...values, 0);
    const minVal = Math.min(...values, 0);
    const range = maxVal - minVal > 0 ? maxVal - minVal : 1000;

    const svgWidth = 340;
    const paddingX = 20;
    const usableWidth = svgWidth - (paddingX * 2);
    const stepX = usableWidth / (rawPoints.length - 1);

    return rawPoints.map((p, idx) => {
      const x = Math.round(paddingX + (idx * stepX));
      const normalized = (p.val - minVal) / range;
      const y = Math.round(92 - (normalized * 65));
      return {
        x,
        y: Math.max(22, Math.min(95, y)),
        val: p.val,
        label: p.label,
        dateStr: p.dateStr,
      };
    });
  }, [dailyNetProfitMap, dailyProfitMap, dailyExpensesMap, kpis]);

  // Generate cubic bezier smooth SVG path
  const svgWidth = 340;
  const svgHeight = 120;

  // Bezier curve computation
  let pathD = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const current = points[i];
    const next = points[i + 1];
    const controlX = (current.x + next.x) / 2;
    pathD += ` C ${controlX} ${current.y}, ${controlX} ${next.y}, ${next.x} ${next.y}`;
  }

  const areaD = `${pathD} L ${points[points.length - 1].x} ${svgHeight} L ${points[0].x} ${svgHeight} Z`;

  return (
    <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] flex flex-col justify-between">
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-900 text-sm tracking-tight">{t('admin.charts.netMarginTitle', 'Net Operating Margin')}</h3>
            <p className="text-[11px] text-gray-400 font-medium">{t('admin.charts.netMarginSubtitle', 'Profit & realized cash flow')}</p>
          </div>
          <button 
            type="button"
            className="w-8 h-8 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-gray-700 flex items-center justify-center transition-colors"
          >
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

        {/* Large Balance Display */}
        <div className="mt-4 text-center">
          <p className="text-xs font-semibold text-gray-400">{t('admin.charts.totalNetBalance', 'Total Net Balance')}</p>
          <div className="text-3xl font-extrabold text-gray-900 tracking-tight mt-0.5">
            {formatETB(netProfit)}
          </div>
        </div>
      </div>

      {/* Wave Line Chart with Soft Gradient Fill */}
      <div className="relative my-3">
        <svg 
          viewBox={`0 0 ${svgWidth} ${svgHeight}`} 
          className="w-full h-auto overflow-visible"
        >
          <defs>
            <linearGradient id="profitWaveGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0E7452" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#0E7452" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Dotted horizontal guides */}
          <line x1="0" y1="35" x2={svgWidth} y2="35" stroke="#F1F3F5" strokeDasharray="3 3" strokeWidth="1" />
          <line x1="0" y1="75" x2={svgWidth} y2="75" stroke="#F1F3F5" strokeDasharray="3 3" strokeWidth="1" />

          {/* Gradient Area */}
          <path d={areaD} fill="url(#profitWaveGrad)" />

          {/* Smooth Line Stroke */}
          <path 
            d={pathD} 
            fill="none" 
            stroke="#0E7452" 
            strokeWidth="2.5" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />

          {/* Points on Curve */}
          {points.map((pt, i) => (
            <g 
              key={i} 
              className="cursor-pointer"
              onMouseEnter={() => setHoverPoint(pt)}
              onMouseLeave={() => setHoverPoint(null)}
            >
              <circle 
                cx={pt.x} 
                cy={pt.y} 
                r={hoverPoint === pt ? 5 : 3} 
                fill="#FFFFFF" 
                stroke="#0E7452" 
                strokeWidth="2" 
                className="transition-all"
              />
            </g>
          ))}

          {/* Tooltip */}
          {hoverPoint && (
            <g>
              <rect 
                x={Math.min(svgWidth - 75, Math.max(5, hoverPoint.x - 35))} 
                y={hoverPoint.y - 30} 
                width="70" 
                height="22" 
                rx="6" 
                fill="#1E293B" 
              />
              <text 
                x={Math.min(svgWidth - 75, Math.max(5, hoverPoint.x - 35)) + 35} 
                y={hoverPoint.y - 15} 
                fontSize="10" 
                fill="#FFFFFF" 
                fontWeight="700" 
                textAnchor="middle"
                fontFamily="'Plus Jakarta Sans', sans-serif"
              >
                {formatETB(hoverPoint.val)}
              </text>
            </g>
          )}
        </svg>
      </div>

      {/* Bottom Action Pill Buttons matching reference Send ↑ and Receive ↓ */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        <button
          type="button"
          onClick={onRecordDeposit}
          className="flex items-center justify-center space-x-1.5 py-2.5 px-4 rounded-full bg-[#0E7452] hover:bg-[#0A573D] text-white text-xs font-bold transition-all shadow-xs cursor-pointer hover:scale-102"
        >
          <span>{t('admin.charts.depositBtn', 'Deposit')}</span>
          <ArrowUp className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={onViewClosings}
          className="flex items-center justify-center space-x-1.5 py-2.5 px-4 rounded-full bg-[#E8F6F2] hover:bg-[#D4EFE8] text-[#0E7452] text-xs font-bold transition-all cursor-pointer hover:scale-102"
        >
          <span>{t('admin.charts.closingsBtn', 'Closings')}</span>
          <ArrowDown className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
