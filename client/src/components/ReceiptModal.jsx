import React from 'react';
import { Printer, X, CheckCircle, Wheat } from 'lucide-react';
import { formatETB } from '../utils/formatters';
import { useTranslation } from '../i18n/LanguageContext';

export default function ReceiptModal({ sale, onClose }) {
  const { t } = useTranslation();
  if (!sale) return null;

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full max-h-[92vh] overflow-y-auto animate-in zoom-in-95 duration-200">
        
        {/* Receipt Printable Area */}
        <div id="printable-receipt" className="p-4 sm:p-6 bg-white text-stone-800">
          
          {/* Header */}
          <div className="text-center pb-4 border-b border-dashed border-stone-300">
            <img 
              src="/logo.png" 
              alt="Harbuu Bakery" 
              className="h-12 sm:h-14 w-auto max-w-[120px] sm:max-w-[140px] object-contain mx-auto mb-2" 
            />
            <h2 className="text-lg font-black text-stone-900 tracking-tight">HARBUU BAKERY</h2>
            <p className="text-[11px] text-stone-500 font-medium">Bole Medhanialem, Addis Ababa</p>
            <p className="text-[10px] text-stone-400">Tel: +251 911 223 344</p>
            <div className="mt-2 inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-black border border-emerald-200">
              <CheckCircle className="w-3 h-3 text-emerald-600" />
              <span>{t('modals.receipt.officialReceipt', 'OFFICIAL SALES RECEIPT')}</span>
            </div>
          </div>

          {/* Meta Details */}
          <div className="py-3 text-xs space-y-1 border-b border-dashed border-stone-300 font-mono text-stone-600">
            <div className="flex justify-between">
              <span>{t('modals.receipt.receiptNo', 'Receipt #:')}</span>
              <span className="font-bold text-stone-900">{sale.receipt_number}</span>
            </div>
            <div className="flex justify-between">
              <span>{t('modals.receipt.dateTime', 'Date & Time:')}</span>
              <span>{sale.sale_date} {sale.sale_time}</span>
            </div>
            <div className="flex justify-between">
              <span>{t('modals.receipt.cashier', 'Cashier:')}</span>
              <span>{sale.cashier_name}</span>
            </div>
            {sale.customer_name && (
              <div className="flex justify-between">
                <span>{t('modals.receipt.customer', 'Customer:')}</span>
                <span>{sale.customer_name}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>{t('modals.receipt.payment', 'Payment:')}</span>
              <span className="uppercase font-semibold text-stone-800">{sale.payment_method}</span>
            </div>
          </div>

          {/* Line Items */}
          <div className="py-3 border-b border-dashed border-stone-300">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-stone-400 font-semibold text-left pb-2">
                  <th>{t('modals.receipt.colItem', 'Item')}</th>
                  <th className="text-center">{t('modals.receipt.colQty', 'Qty')}</th>
                  <th className="text-right">{t('modals.receipt.colPrice', 'Price')}</th>
                  <th className="text-right">{t('modals.receipt.colTotal', 'Total')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {sale.items?.map((item, idx) => (
                  <tr key={idx} className="py-1">
                    <td className="py-1.5 font-medium text-stone-800 break-words max-w-[130px]">{item.product_name}</td>
                    <td className="py-1.5 text-center text-stone-600">{item.quantity}</td>
                    <td className="py-1.5 text-right text-stone-600">{item.unit_price}</td>
                    <td className="py-1.5 text-right font-bold text-stone-900">{item.total_price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="pt-3 pb-4 space-y-1 text-xs">
            <div className="flex justify-between text-base font-extrabold text-stone-900 pt-1">
              <span>{t('modals.receipt.grandTotal', 'GRAND TOTAL:')}</span>
              <span className="text-amber-700">{formatETB(sale.total_amount)}</span>
            </div>
          </div>

          {/* Footer Note */}
          <div className="text-center pt-2 text-[10px] text-stone-400 font-medium">
            <p>{t('modals.receipt.thankYou', 'Thank you for choosing Harbuu Bakery!')}</p>
            <p className="font-mono mt-0.5">{t('modals.receipt.freshlyBaked', 'Freshly baked with care every day')}</p>
          </div>

        </div>

        {/* Modal Buttons (not printed) */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between no-print">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 hover:bg-stone-200/60 rounded-xl transition-colors cursor-pointer"
          >
            {t('modals.receipt.close', 'Close')}
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center space-x-2 bg-[#064e3b] hover:bg-emerald-900 text-white font-black text-xs px-5 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4 text-emerald-300" />
            <span>{t('modals.receipt.printReceipt', 'Print Receipt')}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
