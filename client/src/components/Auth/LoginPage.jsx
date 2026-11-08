import React, { useState } from 'react';
import { 
  Lock, 
  User, 
  Phone,
  ArrowRight, 
  Eye, 
  EyeOff, 
  AlertCircle
} from 'lucide-react';
import { api } from '../../services/api';
import { useTranslation } from '../../i18n';
import LanguageSelector from '../LanguageSelector';

export default function LoginPage({ onLoginSuccess }) {
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLoginWith(userVal, passVal) {
    const u = (userVal || '').trim();
    const p = (passVal || '').trim();
    if (!u || !p) {
      setError(t('auth.fillFields', 'Please enter both username/phone and password.'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await api.login({ username: u, identifier: u, phone: u, password: p });
      if (res?.user) {
        onLoginSuccess(res.user);
      } else {
        throw new Error(t('auth.authError', 'Authentication failed'));
      }
    } catch (err) {
      setError(err.message || t('auth.invalidCredentials', 'Invalid username, phone number, or password. Please try again.'));
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(e) {
    if (e) e.preventDefault();
    await handleLoginWith(username, password);
  }

  // Detect whether current input is phone or username
  const isPhoneInput = /[0-9+]/.test(username.trim());

  return (
    <div className="min-h-screen bg-[#F0F2F5] flex flex-col justify-center items-center p-4 sm:p-6 antialiased font-sans">
      
      {/* Language Selector Bar at top of login page */}
      <div className="mb-4">
        <LanguageSelector variant="chips" />
      </div>

      {/* Container Card */}
      <div className="w-full max-w-md bg-white rounded-2xl sm:rounded-[32px] border border-gray-100 shadow-[0_12px_40px_rgba(0,0,0,0.04)] p-6 sm:p-10 relative overflow-hidden">
        
        {/* Top Decorative Forest Green Accents */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#0E7452] via-[#34A87C] to-[#0E7452]" />
        
        {/* Brand Header */}
        <div className="text-center pt-2">
          <img 
            src="/logo.png" 
            alt="Harbuu Bakery" 
            className="mx-auto h-20 sm:h-28 w-auto max-w-[180px] sm:max-w-[220px] object-contain drop-shadow-sm mb-3 sm:mb-4 transition-transform hover:scale-105" 
          />
          <div className="inline-flex items-center space-x-2">
            <span className="font-extrabold text-2xl tracking-tight text-gray-900">{t('common.brand', 'Harbuu')}</span>
            <span className="text-[11px] font-bold uppercase tracking-wider bg-[#E8F6F2] text-[#0E7452] border border-[#CDEAE1] px-2.5 py-0.5 rounded-full">
              {t('common.bakery', 'Bakery')}
            </span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight mt-2">
            {t('auth.loginTitle', 'Sign In to System')}
          </h2>
          <p className="text-xs text-gray-400 font-medium mt-1">
            {t('auth.loginSubtitle', 'Integrated Operations & Multi-User Bakery Platform')}
          </p>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mt-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-start space-x-2.5 text-xs text-rose-800 break-words">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="font-medium break-words">{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5 ml-1">
              {t('auth.usernameLabel', 'Username or Phone Number')}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                {isPhoneInput ? (
                  <Phone className="w-4 h-4 text-[#0E7452]" />
                ) : (
                  <User className="w-4 h-4" />
                )}
              </div>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t('auth.usernamePlaceholder', 'Username or Phone (e.g. 0911223344 / admin)')}
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-[#F7F8FA] border border-gray-200/90 text-sm font-semibold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0E7452] focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5 ml-1">
              {t('auth.passwordLabel', 'Password')}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-3 rounded-2xl bg-[#F7F8FA] border border-gray-200/90 text-sm font-semibold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0E7452] focus:border-transparent transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
                title={showPassword ? t('auth.hidePassword', 'Hide password') : t('auth.showPassword', 'Show password')}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Sign In Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3.5 px-4 rounded-full bg-[#0E7452] hover:bg-[#0A573D] text-white text-sm font-bold shadow-[0_4px_16px_rgba(14,116,82,0.25)] hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-60"
          >
            <span>{loading ? t('auth.signingIn', 'Authenticating...') : t('auth.signIn', 'Sign In')}</span>
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        {/* Security Note */}
        <p className="mt-8 text-center text-[11px] text-gray-400 font-medium">
          🔒 Enter your assigned employee username or registered phone number to access your workspace.
        </p>

      </div>



    </div>
  );
}
