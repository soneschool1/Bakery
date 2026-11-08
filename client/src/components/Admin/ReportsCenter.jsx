import React, { useState } from 'react';
import { 
  FileText, 
  Download, 
  FileSpreadsheet, 
  Calendar, 
  Filter, 
  TrendingUp, 
  ArrowRight,
  Printer
} from 'lucide-react';
import { api } from '../../services/api';
import { exportToPDF, exportToExcel } from '../../utils/exportReports';
import { formatETB } from '../../utils/formatters';
import { useTranslation } from '../../i18n/LanguageContext';

export default function ReportsCenter() {
  const { t } = useTranslation();
  const [selectedReport, setSelectedReport] = useState('profit_and_loss');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 8) + '01');
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [reportData, setReportData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const reportList = [
    { id: 'profit_and_loss', name: t('admin.reportsCenter.rep1', '1. Profit and Loss Report'), desc: t('admin.reportsCenter.rep1Desc', 'Revenue, COGS, Gross Profit, Operating Expenses & Net Profit'), category: 'Financial' },
    { id: 'daily_sales', name: t('admin.reportsCenter.rep2', '2. Daily Sales Report'), desc: t('admin.reportsCenter.rep2Desc', 'Customer sales transactions, payment methods & receipts'), category: 'Sales' },
    { id: 'weekly_sales', name: t('admin.reportsCenter.rep3', '3. Weekly Sales Report'), desc: t('admin.reportsCenter.rep3Desc', '7-day sales breakdown and trends'), category: 'Sales' },
    { id: 'monthly_sales', name: t('admin.reportsCenter.rep4', '4. Monthly Sales Report'), desc: t('admin.reportsCenter.rep4Desc', 'Monthly sales performance and product volumes'), category: 'Sales' },
    { id: 'production', name: t('admin.reportsCenter.rep5', '5. Production Report'), desc: t('admin.reportsCenter.rep5Desc', 'Batches baked, baker records, potential values'), category: 'Production' },
    { id: 'ingredient_consumption', name: t('admin.reportsCenter.rep6', '6. Ingredient Consumption Report'), desc: t('admin.reportsCenter.rep6Desc', 'Flour, MAJ, yeast, sugar, salt total consumption & costs'), category: 'Production' },
    { id: 'raw_materials', name: t('admin.reportsCenter.rep7', '7. Raw Material Stock Report'), desc: t('admin.reportsCenter.rep7Desc', 'Current ingredient & packaging balances and values'), category: 'Inventory' },
    { id: 'finished_stock', name: t('admin.reportsCenter.rep8', '8. Finished Product Stock Report'), desc: t('admin.reportsCenter.rep8Desc', 'Available bread, cookies & cakes by branch'), category: 'Inventory' },
    { id: 'branch_distribution', name: t('admin.reportsCenter.rep9', '9. Branch Distribution Report'), desc: t('admin.reportsCenter.rep9Desc', 'Transfers to other branches and transportation costs'), category: 'Branches' },
    { id: 'variable_expenses', name: t('admin.reportsCenter.rep10', '10. Variable Expenses Report'), desc: t('admin.reportsCenter.rep10Desc', 'Food, bajaj transport, supplies & inventory purchases'), category: 'Expenses' },
    { id: 'fixed_expenses', name: t('admin.reportsCenter.rep11', '11. Fixed Expenses Report'), desc: t('admin.reportsCenter.rep11Desc', 'Shop rents, store rent, baker & accountant salaries'), category: 'Expenses' },
    { id: 'cash_reconciliation', name: t('admin.reportsCenter.rep12', '12. Daily Cash Reconciliation Report'), desc: t('admin.reportsCenter.rep12Desc', 'Expected vs actual counted cash & drawer shortages'), category: 'Reconciliation' },
    { id: 'bank_deposits', name: t('admin.reportsCenter.rep13', '13. Bank Deposit Report'), desc: t('admin.reportsCenter.rep13Desc', 'Bank deposit receipts, references & flour milestone links'), category: 'Reconciliation' },
  ];

  async function fetchReport() {
    setIsLoading(true);
    try {
      const res = await api.getReportData(selectedReport, `start_date=${startDate}&end_date=${endDate}`);
      setReportData(res);
    } catch (err) {
      alert(`Error loading report: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }

  // Handle PDF Export
  function handleExportPDF() {
    if (!reportData) return;
    const currentMeta = reportList.find(r => r.id === selectedReport);
    const title = currentMeta?.name || 'Bakery Report';
    const subtitle = `Period: ${startDate} to ${endDate} | Harbuu Bakery Addis Ababa`;

    if (selectedReport === 'profit_and_loss') {
      const d = reportData;
      const columns = [
        { header: 'Financial Accounting Metric', key: 'metric' },
        { header: 'Amount (ETB)', key: 'amount', isCurrency: true },
        { header: 'Notes', key: 'notes' },
      ];
      const rows = [
        { metric: '1. Total Sales Revenue', amount: d.total_revenue, notes: 'Actual completed customer sales' },
        { metric: '2. Cost of Goods Sold (COGS)', amount: d.cost_of_goods_sold, notes: 'Direct recipe ingredient costs' },
        { metric: '3. GROSS PROFIT', amount: d.gross_profit, notes: 'Revenue - COGS' },
        { metric: '4. Variable Operating Expenses', amount: d.variable_expenses, notes: 'Food, transport, non-inventory supplies' },
        { metric: '5. Fixed Expenses & Salaries', amount: d.fixed_expenses_allocated, notes: 'Rents and monthly staff payroll' },
        { metric: '6. Total Operating Expenses', amount: d.total_operating_expenses, notes: 'Fixed + Variable Operating Expenses' },
        { metric: '7. NET PROFIT (Operating Profit)', amount: d.net_profit, notes: 'Gross Profit - Operating Expenses' },
      ];
      exportToPDF(title, subtitle, columns, rows, 'Profit_and_Loss_Report');
      return;
    }

    if (Array.isArray(reportData.data)) {
      const list = reportData.data;
      if (list.length === 0) {
        alert('No records found for this period to export.');
        return;
      }

      // Generate dynamic columns based on data keys
      const sample = list[0];
      const columns = [];
      if (sample.receipt_number) {
        columns.push({ header: 'Receipt #', key: 'receipt_number' });
        columns.push({ header: 'Date', key: 'sale_date' });
        columns.push({ header: 'Cashier', key: 'cashier_name' });
        columns.push({ header: 'Payment', key: 'payment_method' });
        columns.push({ header: 'Total (ETB)', key: 'total_amount', isCurrency: true });
      } else if (sample.batch_number) {
        columns.push({ header: 'Batch #', key: 'batch_number' });
        columns.push({ header: 'Date', key: 'production_date' });
        columns.push({ header: 'Product', key: 'product_name' });
        columns.push({ header: 'Baker', key: 'baker_name' });
        columns.push({ header: 'Pieces', key: 'pieces_produced' });
        columns.push({ header: 'Potential Value (ETB)', key: 'potential_selling_value', isCurrency: true });
      } else if (sample.transfer_number) {
        columns.push({ header: 'Transfer #', key: 'transfer_number' });
        columns.push({ header: 'Date', key: 'transfer_date' });
        columns.push({ header: 'Destination', key: 'to_branch_name' });
        columns.push({ header: 'Product', key: 'product_name' });
        columns.push({ header: 'Quantity', key: 'quantity' });
        columns.push({ header: 'Transport Cost', key: 'transportation_cost', isCurrency: true });
        columns.push({ header: 'Status', key: 'status' });
      } else if (sample.expense_category) {
        columns.push({ header: 'Date', key: 'expense_date' });
        columns.push({ header: 'Category', key: 'expense_category' });
        columns.push({ header: 'Description', key: 'description' });
        columns.push({ header: 'Method', key: 'payment_method' });
        columns.push({ header: 'Amount (ETB)', key: 'amount', isCurrency: true });
      } else if (sample.monthly_amount !== undefined) {
        columns.push({ header: 'Expense / Salary Item', key: 'name' });
        columns.push({ header: 'Monthly Amount (ETB)', key: 'monthly_amount', isCurrency: true });
        columns.push({ header: 'Frequency', key: 'payment_frequency' });
        columns.push({ header: 'Due Day', key: 'due_day_of_month' });
      } else if (sample.current_quantity !== undefined) {
        columns.push({ header: 'Material Name', key: 'name' });
        columns.push({ header: 'Category', key: 'category' });
        columns.push({ header: 'Current Stock', key: 'current_quantity' });
        columns.push({ header: 'Unit', key: 'unit' });
        columns.push({ header: 'Min Stock', key: 'minimum_stock' });
        columns.push({ header: 'Unit Cost', key: 'purchase_price', isCurrency: true });
      } else if (sample.closing_date) {
        columns.push({ header: 'Date', key: 'closing_date' });
        columns.push({ header: 'Cashier', key: 'cashier_name' });
        columns.push({ header: 'Expected (ETB)', key: 'expected_cash_amount', isCurrency: true });
        columns.push({ header: 'Counted (ETB)', key: 'actual_cash_counted', isCurrency: true });
        columns.push({ header: 'Difference (ETB)', key: 'cash_difference', isCurrency: true });
        columns.push({ header: 'Status', key: 'status' });
      } else if (sample.deposit_date) {
        columns.push({ header: 'Date', key: 'deposit_date' });
        columns.push({ header: 'Bank', key: 'bank_name' });
        columns.push({ header: 'Ref #', key: 'reference_number' });
        columns.push({ header: 'Amount (ETB)', key: 'amount', isCurrency: true });
        columns.push({ header: 'Deposited By', key: 'deposited_by_name' });
      } else {
        // generic
        Object.keys(sample).slice(0, 5).forEach(k => {
          if (k !== '_id' && k !== 'id') columns.push({ header: k.toUpperCase(), key: k });
        });
      }

      exportToPDF(title, subtitle, columns, list, `${selectedReport}_report`);
    } else if (typeof reportData.data === 'object') {
      // Ingredient consumption map
      const rows = Object.values(reportData.data);
      const columns = [
        { header: 'Ingredient Name', key: 'name' },
        { header: 'Total Quantity Consumed', key: 'quantity' },
        { header: 'Unit', key: 'unit' },
        { header: 'Total Cost (ETB)', key: 'total_cost', isCurrency: true },
      ];
      exportToPDF(title, subtitle, columns, rows, 'Ingredient_Consumption');
    }
  }

  // Handle Excel Export
  function handleExportExcel() {
    if (!reportData) return;
    const currentMeta = reportList.find(r => r.id === selectedReport);
    const title = currentMeta?.name || 'Report';

    if (selectedReport === 'profit_and_loss') {
      const d = reportData;
      const columns = [
        { header: 'Metric', key: 'metric' },
        { header: 'Amount_ETB', key: 'amount' },
        { header: 'Notes', key: 'notes' },
      ];
      const rows = [
        { metric: 'Total Sales Revenue', amount: d.total_revenue, notes: 'Actual customer sales' },
        { metric: 'Cost of Goods Sold (COGS)', amount: d.cost_of_goods_sold, notes: 'Recipe ingredient costs' },
        { metric: 'Gross Profit', amount: d.gross_profit, notes: 'Revenue - COGS' },
        { metric: 'Variable Expenses', amount: d.variable_expenses, notes: 'Operating variable expenses' },
        { metric: 'Fixed Expenses Allocated', amount: d.fixed_expenses_allocated, notes: 'Salaries and rents' },
        { metric: 'Total Operating Expenses', amount: d.total_operating_expenses, notes: 'Fixed + Variable' },
        { metric: 'Net Profit', amount: d.net_profit, notes: 'Gross - Operating' },
      ];
      exportToExcel(title, columns, rows, 'Profit_and_Loss');
      return;
    }

    if (Array.isArray(reportData.data)) {
      const list = reportData.data;
      if (list.length === 0) return alert('No data to export');
      const keys = Object.keys(list[0]).filter(k => k !== '_id' && k !== 'id' && typeof list[0][k] !== 'object');
      const columns = keys.map(k => ({ header: k, key: k }));
      exportToExcel(title, columns, list, `${selectedReport}_data`);
    } else if (typeof reportData.data === 'object') {
      const rows = Object.values(reportData.data);
      const columns = [
        { header: 'Ingredient', key: 'name' },
        { header: 'Quantity', key: 'quantity' },
        { header: 'Unit', key: 'unit' },
        { header: 'Total_Cost_ETB', key: 'total_cost' },
      ];
      exportToExcel(title, columns, rows, 'Ingredient_Consumption');
    }
  }

  return (
    <div className="space-y-6">
      
      {/* Header and Report Selector */}
      <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm">
        <div className="pb-4 mb-5 border-b border-stone-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-[#064e3b]" />
            <h2 className="text-base font-black text-stone-900">
              {t('admin.reportsCenter.downloadableReports', 'Downloadable Reports & Financial Statements')}
            </h2>
          </div>
          <span className="text-xs text-stone-400">
            {t('admin.reportsCenter.formatDesc', 'PDF & Excel (XLSX) format with transparent accounting')}
          </span>
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              {t('admin.reportsCenter.selectReportLabel', 'Select Report Type (13 Reports Available)')}
            </label>
            <select
              value={selectedReport}
              onChange={(e) => {
                setSelectedReport(e.target.value);
                setReportData(null);
              }}
              className="w-full text-xs font-extrabold bg-stone-50 border border-stone-300 rounded-xl px-3 py-2.5 text-stone-900 focus:bg-white"
            >
              {reportList.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              {t('admin.reportsCenter.startDate', 'Start Date')}
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full text-xs font-bold bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              {t('admin.reportsCenter.endDate', 'End Date')}
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full text-xs font-bold bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900"
            />
          </div>

        </div>

        {/* Generate and Export Action Buttons */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-stone-200">
          <button
            onClick={fetchReport}
            disabled={isLoading}
            className="bg-[#064e3b] hover:bg-emerald-900 text-white font-black text-xs px-6 py-2.5 rounded-xl shadow-xs transition-all flex items-center space-x-2 cursor-pointer"
          >
            <Filter className="w-4 h-4 text-emerald-300" />
            <span>{isLoading ? t('admin.reportsCenter.generatingBtn', 'Generating Report...') : t('admin.reportsCenter.generatePreviewBtn', 'GENERATE REPORT PREVIEW')}</span>
          </button>

          {reportData && (
            <div className="flex items-center space-x-2">
              <button
                onClick={handleExportPDF}
                className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs px-4 py-2 rounded-xl shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>{t('admin.reportsCenter.exportPDF', 'Download PDF')}</span>
              </button>

              <button
                onClick={handleExportExcel}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-4 py-2 rounded-xl shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>{t('admin.reportsCenter.exportExcel', 'Export Excel (XLSX)')}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Report Preview Container */}
      {reportData && (
        <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-200">
            <div>
              <h3 className="font-black text-stone-900 text-lg uppercase tracking-tight">
                {reportList.find(r => r.id === selectedReport)?.name}
              </h3>
              <p className="text-xs text-stone-500 font-medium">
                {t('admin.reportsCenter.period', 'Period: {start} to {end}').replace('{start}', startDate).replace('{end}', endDate)}
              </p>
            </div>
            <div className="text-xs text-stone-400 font-mono">
              Harbuu Bakery Ethiopia
            </div>
          </div>

          {/* Specific rendering for Profit and Loss */}
          {selectedReport === 'profit_and_loss' && (
            <div className="bg-stone-50 rounded-2xl p-5 border border-stone-200 space-y-4">
              <h4 className="font-extrabold text-xs uppercase tracking-wider text-stone-700 border-b border-stone-200 pb-2">
                {t('admin.reportsCenter.incomeStatementSummary', 'Income Statement Summary')}
              </h4>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1.5 font-bold text-stone-900 border-b border-stone-200">
                  <span>{t('admin.reportsCenter.totalSalesRevenue', '1. TOTAL SALES REVENUE')}</span>
                  <span className="text-amber-800 text-sm font-black">{formatETB(reportData.total_revenue)}</span>
                </div>

                <div className="flex justify-between py-1.5 font-semibold text-stone-600">
                  <span className="pl-4">{t('admin.reportsCenter.lessCogs', 'Less: Cost of Goods Sold (COGS - Ingredients)')}</span>
                  <span className="text-rose-700 font-bold">-{formatETB(reportData.cost_of_goods_sold)}</span>
                </div>

                <div className="flex justify-between py-2 font-black text-emerald-800 bg-emerald-50 px-3 rounded-xl border border-emerald-200">
                  <span>{t('admin.reportsCenter.grossProfit', '2. GROSS PROFIT (Revenue - COGS)')}</span>
                  <span className="text-sm">{formatETB(reportData.gross_profit)}</span>
                </div>

                <div className="flex justify-between py-1.5 font-semibold text-stone-600">
                  <span className="pl-4">{t('admin.reportsCenter.lessVariable', 'Less: Variable Operating Expenses')}</span>
                  <span className="text-rose-700 font-bold">-{formatETB(reportData.variable_expenses)}</span>
                </div>

                <div className="flex justify-between py-1.5 font-semibold text-stone-600">
                  <span className="pl-4">{t('admin.reportsCenter.lessFixed', 'Less: Fixed Expenses & Monthly Salaries')}</span>
                  <span className="text-rose-700 font-bold">-{formatETB(reportData.fixed_expenses_allocated)}</span>
                </div>

                <div className="flex justify-between py-1.5 font-bold text-stone-700 border-t border-stone-200">
                  <span>{t('admin.reportsCenter.totalOperatingExpenses', 'TOTAL OPERATING EXPENSES')}</span>
                  <span className="text-rose-800 font-black">-{formatETB(reportData.total_operating_expenses)}</span>
                </div>

                <div className="flex justify-between py-3 font-black text-white bg-stone-900 px-4 rounded-2xl shadow-md mt-2">
                  <span className="text-sm">{t('admin.reportsCenter.netOperatingProfit', '3. NET OPERATING PROFIT')}</span>
                  <span className={`text-base ${reportData.net_profit >= 0 ? 'text-amber-400' : 'text-rose-400'}`}>
                    {formatETB(reportData.net_profit)}
                  </span>
                </div>
              </div>

              <div className="text-[11px] text-stone-400 font-medium pt-2">
                {t('admin.reportsCenter.pnlDisclaimer', '* Note: Produced bread is not counted as revenue until sold. Inventory purchases are accounted for in stock assets and flow through COGS upon production/sale.')}
              </div>
            </div>
          )}

          {/* Generic tabular preview for lists */}
          {Array.isArray(reportData.data) && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-100 text-stone-600 font-bold uppercase text-[10px] border-b border-stone-200">
                  <tr>
                    {Object.keys(reportData.data[0] || {}).filter(k => k !== '_id' && k !== 'id' && typeof reportData.data[0][k] !== 'object').slice(0, 6).map(k => (
                      <th key={k} className="py-2.5 px-3">{k.replace('_', ' ')}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {reportData.data.map((row, idx) => (
                    <tr key={idx} className="hover:bg-amber-50/20">
                      {Object.keys(row).filter(k => k !== '_id' && k !== 'id' && typeof row[k] !== 'object').slice(0, 6).map(k => (
                        <td key={k} className="py-2.5 px-3">
                          {typeof row[k] === 'number' && (k.includes('price') || k.includes('amount') || k.includes('cost') || k.includes('value'))
                            ? formatETB(row[k])
                            : String(row[k] ?? '-')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Ingredient consumption summary preview */}
          {selectedReport === 'ingredient_consumption' && typeof reportData.data === 'object' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-100 text-stone-600 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">{t('admin.reportsCenter.colIngredient', 'Ingredient')}</th>
                    <th className="py-2.5 px-3 text-right">{t('admin.reportsCenter.colQuantityConsumed', 'Quantity Consumed')}</th>
                    <th className="py-2.5 px-3">{t('admin.reportsCenter.colUnit', 'Unit')}</th>
                    <th className="py-2.5 px-3 text-right">{t('admin.reportsCenter.colTotalCost', 'Total Cost')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {Object.values(reportData.data).map((ing, i) => (
                    <tr key={i} className="hover:bg-amber-50/20">
                      <td className="py-2.5 px-3 font-bold text-stone-900">{ing.name}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">{ing.quantity}</td>
                      <td className="py-2.5 px-3 font-semibold text-stone-500">{ing.unit}</td>
                      <td className="py-2.5 px-3 text-right font-black text-amber-800">{formatETB(ing.total_cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
