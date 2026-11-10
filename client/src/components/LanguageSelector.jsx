import React, { useState, useRef, useEffect } from 'react';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { useLanguage, AVAILABLE_LANGUAGES } from '../i18n';

export default function LanguageSelector({ variant = 'segmented', className = '', showDialect = false }) {
  const { language, setLanguage, currentLangMeta } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Card list variant (used in Settings panels)
  if (variant === 'card') {
    return (
      <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3 ${className}`}>
        {AVAILABLE_LANGUAGES.map((lang) => {
          const isSelected = language === lang.code;
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => setLanguage(lang.code)}
              className={`p-4 rounded-3xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'border-[#0E7452] bg-[#E8F6F2] shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl">{lang.flag}</span>
                {isSelected ? (
                  <span className="flex items-center space-x-1 text-xs font-black text-[#0E7452] bg-white px-2 py-0.5 rounded-full border border-[#0E7452]/20">
                    <Check className="w-3.5 h-3.5" />
                    <span>Active</span>
                  </span>
                ) : (
                  <span className="text-xs font-bold text-slate-400">Select</span>
                )}
              </div>
              <div className="mt-3">
                <div className="text-base font-black text-slate-900">{lang.label}</div>
                <div className="text-xs font-bold text-slate-500 mt-0.5">{lang.dialect}</div>
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  // Segmented inline switcher (default for header bar)
  if (variant === 'segmented' || variant === 'chips') {
    return (
      <div className={`inline-flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-2xs ${className}`}>
        {AVAILABLE_LANGUAGES.map((lang) => {
          const isSelected = language === lang.code;
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => setLanguage(lang.code)}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-xs font-black transition-all flex items-center space-x-1.5 cursor-pointer select-none ${
                isSelected
                  ? 'bg-[#0E7452] text-white shadow-xs scale-[1.02]'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/70 dark:hover:bg-slate-700'
              }`}
              title={`${lang.label} (${lang.dialect})`}
            >
              <span className="text-sm shrink-0">{lang.flag}</span>
              <span className="hidden sm:inline shrink-0">{lang.label}</span>
              <span className="sm:hidden shrink-0">{lang.short}</span>
              {showDialect && isSelected && (
                <span className="hidden xl:inline text-[10px] font-medium opacity-85 ml-1">
                  ({lang.dialect})
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // Dropdown / Pill variant
  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 border border-slate-200/80 dark:border-slate-700 px-3 py-1.5 rounded-2xl text-xs font-black text-slate-700 dark:text-slate-300 transition-colors cursor-pointer shadow-2xs"
        title="Select Language / Afaan Filadhaa / ቋንቋ ይምረጡ"
      >
        <Globe className="w-3.5 h-3.5 text-[#0E7452]" />
        <span>{currentLangMeta.flag}</span>
        <span className="hidden sm:inline">{currentLangMeta.label}</span>
        <span className="sm:hidden">{currentLangMeta.short}</span>
        <ChevronDown className="w-3 h-3 text-slate-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-[0_10px_30px_rgba(0,0,0,0.08)] p-2 z-50 animate-in fade-in slide-in-from-top-2">
          <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400">
            Language / Afaan / ቋንቋ
          </div>
          <div className="py-1 space-y-1">
            {AVAILABLE_LANGUAGES.map((lang) => {
              const isSelected = language === lang.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => {
                    setLanguage(lang.code);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-2xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-[#E8F6F2] text-[#0E7452] dark:bg-[#0E7452]/20 dark:text-emerald-400'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <span className="text-lg">{lang.flag}</span>
                    <div>
                      <div className="font-black leading-tight">{lang.label}</div>
                      <div className="text-[10px] font-medium text-slate-400">{lang.dialect}</div>
                    </div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-[#0E7452]" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
