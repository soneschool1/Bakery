import React, { useState, useEffect, useRef } from 'react';
import { 
  Wheat, 
  Store, 
  ShieldCheck, 
  Bell, 
  Scale,
  LogOut,
  ChevronDown,
  ArrowLeft,
  UserCheck
} from 'lucide-react';
import { useTranslation } from '../i18n';
import LanguageSelector from './LanguageSelector';

export default function Navbar({ 
  authUser,
  currentUser, 
  setCurrentUser, 
  allUsers, 
  flourTracker, 
  notifications, 
  onOpenNotifications,
  sseConnected,
  onLogout
}) {
  const { t } = useTranslation();
  const [time, setTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Close profile menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;
  const isAdmin = authUser?.role === 'admin';
  const isImpersonating = isAdmin && currentUser?.role !== 'admin';

  function switchRole(roleName) {
    if (!isAdmin) return; // Only Admin can switch roles
    const target = allUsers.find(u => u.role === roleName) || {
      role: roleName,
      full_name: roleName === 'baker' ? 'Dawit Alemu (Head Baker)' : roleName === 'cashier' ? 'Tigist Haile (Cashier)' : 'Abebe Kebede (Manager)',
      username: roleName,
    };
    setCurrentUser(target);
  }

  function returnToAdmin() {
    const adminUser = allUsers.find(u => u.role === 'admin') || authUser;
    setCurrentUser(adminUser);
  }

  // Initials for avatar
  const initials = currentUser?.full_name 
    ? currentUser.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'HB';

  return (
    <>
      {isImpersonating && (
        <div className="bg-amber-600 text-white px-4 sm:px-8 py-2 text-xs font-black flex items-center justify-between shadow-xs sticky top-0 z-50">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-amber-200 shrink-0" />
            <span>Admin Inspection: Currently testing <strong>{currentUser?.role === 'baker' ? '🥖 Baker Production Desk' : '🏪 Cashier POS Desk'}</strong></span>
          </div>
          <button
            type="button"
            onClick={returnToAdmin}
            className="bg-white text-amber-900 px-3 py-1 rounded-xl text-xs font-black hover:bg-amber-50 cursor-pointer shadow-xs transition-transform active:scale-95 shrink-0"
          >
            ← Return to Admin Portal
          </button>
        </div>
      )}
      <header className="sticky top-0 z-40 h-16 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-4 sm:px-6 lg:px-8 shadow-xs">
      <div className="max-w-7xl mx-auto h-full flex items-center justify-between gap-4">
        
        {/* Brand Logo & SINO Badges */}
        <div className="flex items-center space-x-3 shrink-0">
          <img 
            src="/logo.png" 
            alt="Harbuu Bakery" 
            className="h-9 sm:h-10 w-auto max-w-[95px] object-contain shrink-0 drop-shadow-2xs" 
          />
          <div className="flex items-center space-x-2">
            <span className="font-extrabold text-lg sm:text-xl tracking-tight text-slate-900 dark:text-white">Harbuu</span>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-[#E8F6F2] text-[#0E7452] border border-[#CDEAE1] px-2 py-0.5 rounded-full">
              Bakery
            </span>
          </div>
        </div>

        {/* Center Navigation: ONLY Administrator sees the multi-user role switcher */}
        {isAdmin ? (
          <div className="hidden md:flex items-center space-x-2">
            <nav className="flex items-center p-1 bg-slate-100 dark:bg-slate-800/90 rounded-2xl border border-slate-200/70 dark:border-slate-700 shadow-xs">
              <button
                type="button"
                onClick={() => switchRole('admin')}
                className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  currentUser?.role === 'admin'
                    ? 'bg-[#0E7452] text-white shadow-xs scale-[1.02]'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Executive Admin Portal"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{t('nav.admin', 'Admin / Owner')}</span>
              </button>

              <button
                type="button"
                onClick={() => switchRole('baker')}
                className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  currentUser?.role === 'baker'
                    ? 'bg-[#0E7452] text-white shadow-xs scale-[1.02]'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Inspect Baker Production Desk"
              >
                <Wheat className="w-3.5 h-3.5" />
                <span>{t('nav.baker', 'Baker')}</span>
              </button>

              <button
                type="button"
                onClick={() => switchRole('cashier')}
                className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  currentUser?.role === 'cashier'
                    ? 'bg-[#0E7452] text-white shadow-xs scale-[1.02]'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Inspect Cashier POS"
              >
                <Store className="w-3.5 h-3.5" />
                <span>{t('nav.cashier', 'Cashier')}</span>
              </button>
            </nav>

            {/* Impersonation Banner if Admin is viewing another account */}
            {isImpersonating && (
              <button
                type="button"
                onClick={returnToAdmin}
                className="flex items-center space-x-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                title="Return to Administrator Dashboard"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{t('nav.returnToAdmin', 'Return to Admin')}</span>
              </button>
            )}
          </div>
        ) : (
          /* Regular users see ONLY their isolated workstation badge */
          <div className="hidden md:flex items-center space-x-2 bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 px-3.5 py-1.5 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-300">
            {currentUser?.role === 'baker' && (
              <>
                <Wheat className="w-4 h-4 text-[#0E7452]" />
                <span>{t('nav.bakerDesk', '🥖 Head Baker Production Desk')}</span>
              </>
            )}
            {currentUser?.role === 'cashier' && (
              <>
                <Store className="w-4 h-4 text-[#0E7452]" />
                <span>{t('nav.cashierDesk', '🏪 Point of Sale & Cashier Desk')}</span>
              </>
            )}
          </div>
        )}

        {/* Right Status, Flour Milestone, Language Selector, Notifications & Profile Menu */}
        <div className="flex items-center space-x-2.5 shrink-0">
          {/* Language Selector Dropdown */}
          <LanguageSelector />

          {/* Live System Indicator */}
          <div className="hidden sm:flex items-center space-x-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 px-2.5 py-1.5 rounded-2xl text-xs font-semibold text-slate-700 dark:text-slate-300">
            <span className={`w-2 h-2 rounded-full ${sseConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
            <span className="text-[11px] font-bold">{sseConnected ? t('common.live', 'Online') : t('common.connecting', 'Connecting')}</span>
          </div>

          {/* Notification Bell */}
          <button
            type="button"
            onClick={onOpenNotifications}
            className="relative w-9 h-9 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 border border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer shadow-xs"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#0E7452] text-[10px] font-bold text-white shadow-xs">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* User Profile Pill & Dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="flex items-center space-x-2 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 pl-1.5 pr-2.5 py-1 rounded-2xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors shadow-xs"
            >
              <div className="w-7 h-7 rounded-xl bg-[#0E7452] text-white flex items-center justify-center text-[11px] font-bold shadow-xs">
                {initials}
              </div>
              <div className="hidden sm:block text-left text-xs">
                <div className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[105px]">
                  {currentUser?.full_name ? currentUser.full_name.split(' ')[0] : 'User'}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Profile Dropdown Menu */}
            {isProfileMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-[0_10px_30px_rgba(0,0,0,0.08)] p-2 z-50">
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {currentUser?.full_name}
                  </p>
                  <p className="text-[10px] font-bold text-[#0E7452] uppercase tracking-wider mt-0.5">
                    Role: {currentUser?.role}
                  </p>
                  {isAdmin && (
                    <p className="text-[10px] text-slate-400 mt-1 flex items-center space-x-1">
                      <UserCheck className="w-3 h-3 text-emerald-500" />
                      <span>{t('nav.adminPrivileges', 'Admin Privileges Active')}</span>
                    </p>
                  )}
                </div>

                {/* Workspace Switcher inside Menu */}
                {isAdmin && (
                  <div className="py-2 border-b border-slate-100 dark:border-slate-800 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 px-2 uppercase tracking-wider block">
                      Switch Workplace Desk:
                    </span>
                    <button
                      type="button"
                      onClick={() => { switchRole('admin'); setIsProfileMenuOpen(false); }}
                      className={`w-full text-left px-2.5 py-1.5 text-xs font-bold rounded-xl transition-colors flex items-center space-x-2 cursor-pointer ${
                        currentUser?.role === 'admin' ? 'bg-[#0E7452] text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Admin Management</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { switchRole('baker'); setIsProfileMenuOpen(false); }}
                      className={`w-full text-left px-2.5 py-1.5 text-xs font-bold rounded-xl transition-colors flex items-center space-x-2 cursor-pointer ${
                        currentUser?.role === 'baker' ? 'bg-[#0E7452] text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <Wheat className="w-3.5 h-3.5" />
                      <span>🥖 Head Baker Desk</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { switchRole('cashier'); setIsProfileMenuOpen(false); }}
                      className={`w-full text-left px-2.5 py-1.5 text-xs font-bold rounded-xl transition-colors flex items-center space-x-2 cursor-pointer ${
                        currentUser?.role === 'cashier' ? 'bg-[#0E7452] text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <Store className="w-3.5 h-3.5" />
                      <span>🏪 Cashier POS Desk</span>
                    </button>
                  </div>
                )}

                {/* If Admin is impersonating, option to return */}
                {isImpersonating && (
                  <button
                    type="button"
                    onClick={() => {
                      returnToAdmin();
                      setIsProfileMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-bold text-amber-800 hover:bg-amber-50 rounded-xl transition-colors flex items-center space-x-2 cursor-pointer mt-1"
                  >
                    <ArrowLeft className="w-4 h-4 text-amber-600" />
                    <span>{t('nav.returnToAdmin', 'Return to Admin Portal')}</span>
                  </button>
                )}

                {/* Sign Out Button */}
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    onLogout();
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition-colors flex items-center space-x-2 cursor-pointer mt-1"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  <span>{t('common.logout', 'Sign Out')}</span>
                </button>
              </div>
            )}
          </div>

        </div>

      </div>
    </header>
  </>
  );
}
