import React, { useState, useMemo } from 'react';
import { ArrowUpRight, TrendingUp, DollarSign, PieChart, Sparkles } from 'lucide-react';
import { formatETB } from '../../../utils/formatters';
import { useTranslation } from '../../../i18n';

export default function RevenueBarChart({ 
  dailySalesMap = {}, 
  dailyProfitMap = {},
  dailyCogsMap = {},
  dailyExpensesMap = {},
  monthlySalesMap = {},
  monthlyCogsMap = {},
  monthlyExpensesMap = {},
  kpis = {}, 
  batches = [] 
}) {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState('weekly'); // 'weekly' or 'monthly'
  const [hoveredIndex, setHoveredIndex] = useState(null);

  // Generate the last 7 calendar days up to today
  const weeklyDays = useMemo(() => {
    const days = [];
    const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayName = dayNames[d.getDay()];
      const isToday = i === 0;

      days.push({
        key: `${dayName}-${dateStr}`,
        label: dayName,
        dateStr,
        isCurrent: isToday,
      });
    }
    return days;
  }, []);

  // Generate the last 6 calendar months dynamically
  const monthlyData = useMemo(() => {
    const months = [];
    const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const mName = monthNames[d.getMonth()];
      const isCurrent = i === 0;

      // Sum actual sales, cogs and expenses from monthly or daily maps for this month
      let mRev = monthlySalesMap && monthlySalesMap[mStr] !== undefined ? monthlySalesMap[mStr] : 0;
      let mCogs = monthlyCogsMap && monthlyCogsMap[mStr] !== undefined ? monthlyCogsMap[mStr] : 0;
      let mExp = monthlyExpensesMap && monthlyExpensesMap[mStr] !== undefined ? monthlyExpensesMap[mStr] : 0;

      if (mRev === 0 && dailySalesMap) {
        Object.keys(dailySalesMap).forEach((date) => {
          if (date.startsWith(mStr)) {
            mRev += dailySalesMap[date] || 0;
            mCogs += dailyCogsMap[date] || 0;
            mExp += dailyExpensesMap[date] || 0;
          }
        });
      }

      if (isCurrent && kpis?.today_sales && mRev === 0) {
        mRev = kpis.today_sales;
        mCogs = Math.max(0, mRev - (kpis.today_gross_profit || 0));
        mExp = kpis.today_expenses || 0;
      }

      months.push({
        key: `${mName}-${mStr}`,
        label: mName,
        monthStr: mStr,
        isCurrent,
        actualRevenue: mRev,
        actualCogs: mCogs,
        actualExpenses: mExp,
      });
    }
    return months;
  }, [dailySalesMap, dailyCogsMap, dailyExpensesMap, monthlySalesMap, monthlyCogsMap, monthlyExpensesMap, kpis]);

  const activeRawData = viewMode === 'weekly' ? weeklyDays : monthlyData;

  // Process data with live database numbers strictly
  const processedData = useMemo(() => {
    return activeRawData.map((item) => {
      let revenue = 0;
      let cogs = 0;
      let operatingExpenses = 0;

      if (viewMode === 'weekly') {
        const actualSales = dailySalesMap ? dailySalesMap[item.dateStr] : undefined;
        const actualCogs = dailyCogsMap ? dailyCogsMap[item.dateStr] : undefined;
        const actualExpenses = dailyExpensesMap ? dailyExpensesMap[item.dateStr] : undefined;

        if (actualSales !== undefined && actualSales > 0) {
          revenue = actualSales;
          cogs = actualCogs !== undefined ? actualCogs : (revenue * 0.28);
          operatingExpenses = actualExpenses !== undefined ? actualExpenses : 0;
        } else if (actualExpenses !== undefined && actualExpenses > 0) {
          revenue = 0;
          cogs = 0;
          operatingExpenses = actualExpenses;
        } else if (item.isCurrent && kpis?.today_sales && kpis.today_sales > 0) {
          revenue = kpis.today_sales;
          cogs = kpis.today_gross_profit !== undefined ? Math.max(0, revenue - kpis.today_gross_profit) : (revenue * 0.28);
          operatingExpenses = dailyExpensesMap ? (dailyExpensesMap[item.dateStr] || 0) : 0;
        }
      } else {
        revenue = item.actualRevenue || 0;
        cogs = item.actualCogs || 0;
        operatingExpenses = item.actualExpenses || 0;
      }

      // Total Expenses = COGS (ingredient costs) + Operating expenses
      const totalExpenses = Math.round((cogs + operatingExpenses) * 100) / 100;
      const netProfit = Math.round((revenue - totalExpenses) * 100) / 100;
      
      let marginPct = '0';
      if (revenue > 0) {
        marginPct = ((netProfit / revenue) * 100).toFixed(1);
      } else if (totalExpenses > 0) {
        marginPct = '-100.0';
      }

      const hasActivity = revenue > 0 || totalExpenses > 0;

      return {
        ...item,
        revenue,
        cogs,
        operatingExpenses,
        expenses: totalExpenses,
        netProfit,
        marginPct,
        hasActivity,
      };
    });
  }, [activeRawData, viewMode, dailySalesMap, dailyCogsMap, dailyExpensesMap, kpis]);

  // Find max value between revenue and expenses across all columns to scale the chart
  const maxScaleValue = useMemo(() => {
    const highest = Math.max(
      ...processedData.map((d) => Math.max(d.revenue, d.expenses)),
      0
    );
    if (highest <= 0) return 5000;
    const padded = highest * 1.15;
    return Math.ceil(padded / 1000) * 1000;
  }, [processedData]);

  // Overall metrics in current view
  const totalRevenueInView = useMemo(() => {
    return processedData.reduce((sum, d) => sum + d.revenue, 0);
  }, [processedData]);

  const totalExpensesInView = useMemo(() => {
    return processedData.reduce((sum, d) => sum + d.expenses, 0);
  }, [processedData]);

  const totalNetProfitInView = useMemo(() => {
    return Math.round((totalRevenueInView - totalExpensesInView) * 100) / 100;
  }, [totalRevenueInView, totalExpensesInView]);

  const avgMarginPct = totalRevenueInView > 0 
    ? ((totalNetProfitInView / totalRevenueInView) * 100).toFixed(1) 
    : '0';

  // SVG dimensions for paired multi-bar
  const svgWidth = 580;
  const svgHeight = 270;
  const chartBottom = 215;
  const chartTop = 45;
  const chartHeight = chartBottom - chartTop;

  const barWidth = 18;
  const barGap = 4;
  const clusterWidth = (barWidth * 2) + barGap; // 40px
  const totalClusters = processedData.length;
  const spacing = (svgWidth - 65 - (totalClusters * clusterWidth)) / (totalClusters - 1);

  return (
    <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] flex flex-col justify-between">
      
      {/* Chart Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#0E7452] flex items-center justify-center font-bold shadow-xs">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-gray-900 text-base tracking-tight flex items-center gap-2">
              <span>{t('admin.charts.revenueVsExpensesTitle', 'Revenue vs Expenses & Net Profit')}</span>
            </h3>
            <p className="text-xs text-gray-400 font-medium">
              {t('admin.charts.revenueVsExpensesSubtitle', 'Daily income vs total operating costs (COGS + expenses) and net profit flow')}
            </p>
          </div>
        </div>

        {/* Legend Indicators & Timeframe Switcher */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Legend Badges */}
          <div className="hidden md:flex items-center space-x-3 text-xs font-bold bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#0E7452]"></span>
              <span className="text-gray-700">{t('admin.charts.legendRevenue', 'Revenue')}</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#E05D52]"></span>
              <span className="text-gray-700">{t('admin.charts.legendExpenses', 'Expenses')}</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-[#10B981]"></span>
              <span className="text-gray-700">{t('admin.charts.legendNetProfit', 'Net Profit')}</span>
            </div>
          </div>

          {/* Timeframe Switcher */}
          <div className="flex items-center bg-gray-100 p-1 rounded-2xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setViewMode('weekly')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                viewMode === 'weekly'
                  ? 'bg-white text-gray-900 shadow-2xs font-bold'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {t('admin.charts.weeklyView', 'Weekly')}
            </button>
            <button
              type="button"
              onClick={() => setViewMode('monthly')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                viewMode === 'monthly'
                  ? 'bg-white text-gray-900 shadow-2xs font-bold'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {t('admin.charts.annualView', 'Monthly')}
            </button>
          </div>
        </div>
      </div>

      {/* Main SVG Revenue vs Expenses Paired Bar Chart */}
      <div className="relative w-full overflow-x-auto select-none pt-2">
        <svg 
          viewBox={`0 0 ${svgWidth} ${svgHeight}`} 
          className="w-full h-auto min-w-[500px] overflow-visible"
        >
          <defs>
            {/* Pill Drop Shadow */}
            <filter id="profitPillShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#0E7452" floodOpacity="0.2" />
            </filter>
            <filter id="lossPillShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#DC2626" floodOpacity="0.2" />
            </filter>
          </defs>

          {/* Horizontal gridlines and Y-axis scale labels */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
            const y = chartBottom - (pct * chartHeight);
            const rawVal = maxScaleValue * pct;
            const valStr = rawVal >= 1000 
              ? `${Math.round(rawVal / 1000)}k` 
              : Math.round(rawVal).toString();
            return (
              <g key={i}>
                <line 
                  x1="45" 
                  y1={y} 
                  x2={svgWidth - 10} 
                  y2={y} 
                  stroke="#EFEFEF" 
                  strokeDasharray={pct === 0 ? "none" : "3 3"} 
                  strokeWidth="1" 
                />
                <text 
                  x="38" 
                  y={y + 3.5} 
                  fontSize="10.5" 
                  textAnchor="end" 
                  fill="#9CA3AF" 
                  fontFamily="'Plus Jakarta Sans', sans-serif"
                  fontWeight="600"
                >
                  {valStr}
                </text>
              </g>
            );
          })}

          {/* Render Paired Bar Clusters (Revenue bar + Expenses bar + Net Profit pill) */}
          {processedData.map((item, index) => {
            const clusterX = 52 + (index * (clusterWidth + spacing));
            const hasRev = item.revenue > 0;
            const hasExp = item.expenses > 0;

            const revH = hasRev ? Math.max(8, (item.revenue / maxScaleValue) * chartHeight) : 4;
            const expH = hasExp ? Math.max(8, (item.expenses / maxScaleValue) * chartHeight) : 4;

            const revY = chartBottom - revH;
            const expY = chartBottom - expH;
            const tallerY = Math.min(revY, expY);

            const isHovered = hoveredIndex === index;
            const isPositiveNet = item.netProfit >= 0;

            return (
              <g 
                key={index} 
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                className="cursor-pointer transition-transform"
              >
                {/* 1. Revenue Bar (Green) */}
                <rect
                  x={clusterX}
                  y={revY}
                  width={barWidth}
                  height={revH}
                  rx={hasRev ? 5 : 2}
                  ry={hasRev ? 5 : 2}
                  fill={hasRev ? '#0E7452' : '#E5E7EB'}
                  className="transition-all duration-300"
                  opacity={hoveredIndex !== null && !isHovered ? 0.75 : 1}
                />

                {/* 2. Expenses Bar (Coral Rose) */}
                <rect
                  x={clusterX + barWidth + barGap}
                  y={expY}
                  width={barWidth}
                  height={expH}
                  rx={hasExp ? 5 : 2}
                  ry={hasExp ? 5 : 2}
                  fill={hasExp ? '#E05D52' : '#F3F4F6'}
                  className="transition-all duration-300"
                  opacity={hoveredIndex !== null && !isHovered ? 0.75 : 1}
                />

                {/* 3. Floating Net Profit Badge above the taller bar */}
                {item.hasActivity && (
                  <g>
                    <rect
                      x={clusterX + (clusterWidth / 2) - 27}
                      y={tallerY - 22}
                      width="54"
                      height="16"
                      rx="8"
                      ry="8"
                      fill={isPositiveNet ? '#E8F6F2' : '#FEE2E2'}
                      stroke={isPositiveNet ? '#0E7452' : '#DC2626'}
                      strokeWidth="1"
                      filter={isPositiveNet ? 'url(#profitPillShadow)' : 'url(#lossPillShadow)'}
                    />
                    <text
                      x={clusterX + (clusterWidth / 2)}
                      y={tallerY - 11}
                      fontSize="9"
                      textAnchor="middle"
                      fill={isPositiveNet ? '#0E7452' : '#DC2626'}
                      fontWeight="800"
                      fontFamily="'Plus Jakarta Sans', sans-serif"
                    >
                      {isPositiveNet ? `+${item.marginPct}%` : `${item.marginPct}%`}
                    </text>
                  </g>
                )}

                {/* X-axis Day/Month Label */}
                <text
                  x={clusterX + (clusterWidth / 2)}
                  y={chartBottom + 20}
                  fontSize="11"
                  textAnchor="middle"
                  fill={isHovered ? '#1F2937' : '#9CA3AF'}
                  fontFamily="'Plus Jakarta Sans', sans-serif"
                  fontWeight={isHovered ? '800' : '600'}
                  letterSpacing="0.05em"
                >
                  {item.label}
                </text>

                {/* Rich Interactive Hover Tooltip */}
                {isHovered && (
                  <g>
                    <rect
                      x={Math.max(10, Math.min(svgWidth - 210, clusterX + (clusterWidth / 2) - 105))}
                      y={Math.max(10, tallerY - 68)}
                      width="210"
                      height="58"
                      rx="10"
                      ry="10"
                      fill="#1E293B"
                    />
                    <text
                      x={Math.max(10, Math.min(svgWidth - 210, clusterX + (clusterWidth / 2) - 105)) + 105}
                      y={Math.max(10, tallerY - 68) + 15}
                      fontSize="9.5"
                      textAnchor="middle"
                      fill="#94A3B8"
                      fontWeight="700"
                    >
                      {item.dateStr || item.monthStr || item.label}
                    </text>
                    <text
                      x={Math.max(10, Math.min(svgWidth - 210, clusterX + (clusterWidth / 2) - 105)) + 105}
                      y={Math.max(10, tallerY - 68) + 31}
                      fontSize="9"
                      textAnchor="middle"
                      fill="#FFFFFF"
                      fontWeight="800"
                    >
                      Rev: {formatETB(item.revenue)} • Exp: {formatETB(item.expenses)}
                    </text>
                    <text
                      x={Math.max(10, Math.min(svgWidth - 210, clusterX + (clusterWidth / 2) - 105)) + 105}
                      y={Math.max(10, tallerY - 68) + 47}
                      fontSize="9.5"
                      textAnchor="middle"
                      fill={isPositiveNet ? '#34D399' : '#F87171'}
                      fontWeight="800"
                    >
                      Net Profit: {formatETB(item.netProfit)} ({isPositiveNet ? `+${item.marginPct}%` : `${item.marginPct}%`})
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Bottom Summary Indicators */}
      <div className="pt-4 border-t border-gray-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs text-gray-500 font-medium">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0E7452]"></span>
            <span>Total Revenue: <strong className="text-gray-900 font-bold">{formatETB(totalRevenueInView)}</strong></span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#E05D52]"></span>
            <span>Total Expenses: <strong className="text-gray-900 font-bold">{formatETB(totalExpensesInView)}</strong></span>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <span className="font-bold text-gray-700">
            Net Profit: <strong className={totalNetProfitInView >= 0 ? "text-[#0E7452] font-black" : "text-rose-600 font-black"}>{formatETB(totalNetProfitInView)}</strong>
          </span>
          <span className={totalNetProfitInView >= 0 ? "bg-emerald-50 text-[#0E7452] font-black px-2.5 py-1 rounded-full border border-emerald-100" : "bg-rose-50 text-rose-600 font-black px-2.5 py-1 rounded-full border border-rose-100"}>
            {avgMarginPct}% Net Margin
          </span>
        </div>
      </div>

    </div>
  );
}

export { RevenueBarChart as RevenueVsExpensesChart };
export { RevenueBarChart as ProfitBarChart };
