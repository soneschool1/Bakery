import React from 'react';
import { ShieldAlert, Clock, User } from 'lucide-react';
import { formatDateTime } from '../../utils/formatters';
import { useTranslation } from '../../i18n/LanguageContext';

export default function AuditLogViewer({ auditLogs }) {
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-stone-200 bg-stone-50 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <ShieldAlert className="w-5 h-5 text-[#064e3b]" />
          <h2 className="font-black text-stone-900 text-sm">
            {t('admin.auditTrail.title', 'System Activity Audit Trail & Compliance Log')}
          </h2>
        </div>
        <span className="text-xs text-stone-500">
          {t('admin.auditTrail.loggedEvents', '{count} logged events').replace('{count}', auditLogs.length)}
        </span>
      </div>

      <div className="overflow-x-auto scrollbar-none">
        <table className="w-full min-w-[600px] text-left text-xs">
          <thead className="bg-stone-100 text-stone-600 font-bold uppercase text-[10px] border-b border-stone-200">
            <tr>
              <th className="py-3 px-4">{t('admin.auditTrail.colTimestamp', 'Timestamp')}</th>
              <th className="py-3 px-4">{t('admin.auditTrail.colUser', 'User')}</th>
              <th className="py-3 px-4">{t('admin.auditTrail.colAction', 'Action')}</th>
              <th className="py-3 px-4">{t('admin.auditTrail.colEntity', 'Entity')}</th>
              <th className="py-3 px-4">{t('admin.auditTrail.colDetails', 'Details & Reason')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {auditLogs.length === 0 ? (
              <tr>
                <td colSpan="5" className="py-10 text-center text-stone-400">
                  {t('admin.auditTrail.noEntries', 'No audit log entries recorded yet.')}
                </td>
              </tr>
            ) : (
              auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-amber-50/20">
                  <td className="py-3 px-4 text-stone-500 font-mono text-[11px] whitespace-nowrap">
                    {formatDateTime(log.created_at)}
                  </td>
                  <td className="py-3 px-4 font-bold text-stone-900">{log.user_name || 'System'}</td>
                  <td className="py-3 px-4">
                    <span className="font-mono font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded text-[10px]">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-stone-600 capitalize">{log.entity_type}</td>
                  <td className="py-3 px-4 text-stone-700 max-w-md">{log.details}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
