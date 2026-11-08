import React from 'react';
import { 
  X, 
  CheckCheck, 
  Wheat, 
  AlertTriangle, 
  Landmark, 
  Truck, 
  DollarSign, 
  Info,
  Calendar
} from 'lucide-react';
import { formatDateTime } from '../utils/formatters';
import { useTranslation } from '../i18n/LanguageContext';

export default function NotificationDrawer({ 
  isOpen, 
  onClose, 
  notifications, 
  onMarkRead, 
  onMarkAllRead 
}) {
  const { t } = useTranslation();
  if (!isOpen) return null;

  function getIcon(type, severity) {
    switch (type) {
      case 'production':
        return <Wheat className="w-4 h-4 text-amber-600" />;
      case 'deposit_reminder':
      case 'deposit':
        return <Landmark className="w-4 h-4 text-emerald-600" />;
      case 'low_stock':
        return <AlertTriangle className="w-4 h-4 text-rose-600" />;
      case 'branch_transfer':
        return <Truck className="w-4 h-4 text-blue-600" />;
      case 'cash_closing':
        return <DollarSign className="w-4 h-4 text-purple-600" />;
      default:
        return <Info className="w-4 h-4 text-stone-500" />;
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-stone-900/40 backdrop-blur-xs flex justify-end animate-in fade-in">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col">
        
        {/* Drawer Header */}
        <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between bg-stone-50">
          <div className="flex items-center space-x-2">
            <h2 className="text-base font-bold text-stone-900">
              {t('modals.notifications.title', 'Notifications Center')}
            </h2>
            <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
              {t('modals.notifications.newCount', '{count} new').replace('{count}', notifications.filter(n => !n.read).length)}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={onMarkAllRead}
              className="text-xs text-amber-700 hover:text-amber-800 font-semibold flex items-center space-x-1 p-1 hover:bg-amber-50 rounded cursor-pointer"
              title={t('modals.notifications.markAllRead', 'Mark all read')}
            >
              <CheckCheck className="w-4 h-4" />
              <span>{t('modals.notifications.markAllRead', 'Mark all read')}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-200 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto divide-y divide-stone-100 p-2">
          {notifications.length === 0 ? (
            <div className="text-center py-16 text-stone-400">
              <Info className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium">
                {t('modals.notifications.noNotifications', 'No notifications yet')}
              </p>
            </div>
          ) : (
            notifications.map((n) => (
              <div 
                key={n.id}
                onClick={() => !n.read && onMarkRead(n.id)}
                className={`p-3.5 rounded-xl transition-all cursor-pointer flex items-start space-x-3 ${
                  n.read ? 'bg-white hover:bg-stone-50 opacity-75' : 'bg-amber-50/50 hover:bg-amber-50 border-l-4 border-amber-500'
                }`}
              >
                <div className="p-2 rounded-lg bg-stone-100 shrink-0">
                  {getIcon(n.type, n.severity)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className={`text-xs font-bold ${n.read ? 'text-stone-800' : 'text-stone-950'}`}>
                      {n.title}
                    </p>
                    <span className="text-[10px] text-stone-400 flex items-center space-x-1">
                      <Calendar className="w-2.5 h-2.5" />
                      <span>{formatDateTime(n.created_at)}</span>
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 mt-0.5 leading-relaxed">
                    {n.message}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}
