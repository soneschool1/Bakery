import React from 'react';
import { AlertCircle, Landmark, ArrowRight } from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext';

export default function FlourAlertBanner({ flourTracker, onOpenDepositModal }) {
  const { t } = useTranslation();
  if (!flourTracker?.deposit_reminder_active) {
    return null;
  }

  return (
    <div className="bg-[#0E7452] text-white border-b border-[#0A573D] shadow-sm animate-in slide-in-from-top">
      <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <span className="flex p-2 rounded-xl bg-white/10 text-emerald-200 border border-white/20">
              <AlertCircle className="w-5 h-5 animate-pulse text-amber-300" />
            </span>
            <div>
              <p className="text-sm font-bold text-white tracking-wide">
                {t('modals.flourAlert.title', '1 Quintal (100 kg) Flour Consumed in Production!')}
              </p>
              <p className="text-xs text-emerald-100 font-medium">
                {t('modals.flourAlert.desc', 'Total {current} kg flour consumed. Cashier deposit reminder triggered: Please complete the bank deposit.').replace('{current}', flourTracker.current_cumulative_kg)}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <button
              type="button"
              onClick={onOpenDepositModal}
              className="flex items-center space-x-2 bg-white text-[#0E7452] hover:bg-emerald-50 px-5 py-2 rounded-full font-bold text-xs shadow-xs transition-all hover:scale-102 cursor-pointer"
            >
              <Landmark className="w-4 h-4 text-[#0E7452]" />
              <span>{t('modals.flourAlert.recordDepositNow', 'Record Bank Deposit Now')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
