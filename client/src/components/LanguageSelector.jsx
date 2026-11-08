import React, { useState, useRef, useEffect } from 'react';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { useLanguage, AVAILABLE_LANGUAGES } from '../i18n';

export default function LanguageSelector({ variant = 'pill', className = '' }) {
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

  if (variant === 'chips') {
    return (
      <div className={`inline-flex items-center p-1 bg-gray-100/90 rounded-2xl border border-gray-200/80 shadow-xs ${className}`}>
        {AVAILABLE_LANGUAGES.map((lang) => {
          const isSelected = language === lang.code;
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => setLanguage(lang.code)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                isSelected
                  ? 'bg-[#0E7452] text-white shadow-xs scale-[1.02]'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
              }`}
              title={`${lang.label} (${lang.dialect})`}
            >
              <span>{lang.flag}</span>
              <span>{lang.short}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200/80 px-3 py-1.5 rounded-full text-xs font-bold text-gray-700 transition-colors cursor-pointer"
        title="Select Language / Afaan Filadhaa / ቋንቋ ይምረጡ"
      >
        <Globe className="w-3.5 h-3.5 text-[#0E7452]" />
        <span>{currentLangMeta.flag}</span>
        <span>{currentLangMeta.short}</span>
        <ChevronDown className="w-3 h-3 text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl border border-gray-100 shadow-[0_10px_30px_rgba(0,0,0,0.08)] p-2 z-50 animate-in fade-in slide-in-from-top-2">
          <div className="px-3 py-1.5 border-b border-gray-100 text-[10px] font-bold uppercase tracking-wider text-gray-400">
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
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-[#E8F6F2] text-[#0E7452]'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-base">{lang.flag}</span>
                    <div>
                      <div className="leading-tight">{lang.label}</div>
                      <div className="text-[10px] font-normal text-gray-400">{lang.dialect}</div>
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
