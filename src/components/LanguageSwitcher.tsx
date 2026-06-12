import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Check } from 'lucide-react';
import { emitStorefrontLocalization, normalizeLocale, useResolvedLanguage } from '@storify/theme';
import { useThemeConfig } from '../ThemeContext';
import { getLanguageDisplay } from '../constants/languageDisplay';

function languageCodesFromStore(raw: unknown): string[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  const out: string[] = [];
  for (const entry of raw) {
    if (typeof entry === 'string' && entry.trim()) {
      out.push(normalizeLocale(entry));
      continue;
    }
    if (entry && typeof entry === 'object') {
      const row = entry as { code?: string; isActive?: boolean };
      if (row.isActive === false) continue;
      if (typeof row.code === 'string' && row.code.trim()) {
        out.push(normalizeLocale(row.code));
      }
    }
  }
  return Array.from(new Set(out));
}

function findStoreLanguageRow(
  store: unknown,
  code: string,
): { name?: string; nativeName?: string | null } | null {
  const list = (store as { enabledLanguages?: unknown })?.enabledLanguages;
  if (!Array.isArray(list)) return null;
  const n = normalizeLocale(code);
  for (const entry of list) {
    if (entry && typeof entry === 'object' && typeof (entry as { code?: string }).code === 'string') {
      if (normalizeLocale((entry as { code: string }).code) === n) {
        return entry as { name?: string; nativeName?: string | null };
      }
    }
  }
  return null;
}

export const LanguageSwitcher: React.FC<{ variant?: 'header' | 'footer' }> = ({ variant = 'header' }) => {
  const { store, isRtl, path: storefrontPath, t } = useThemeConfig();
  const resolvedLanguage = useResolvedLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const availableLanguages = useMemo(() => {
    const fromEnabled = languageCodesFromStore((store as { enabledLanguages?: unknown })?.enabledLanguages);
    if (fromEnabled.length > 0) return fromEnabled;
    const fromShipping = languageCodesFromStore(store?.shipping?.localizationLanguages as unknown);
    if (fromShipping.length > 0) return fromShipping;
    const fromStore = languageCodesFromStore((store as { localizationLanguages?: unknown })?.localizationLanguages);
    if (fromStore.length > 0) return fromStore;
    const fallback = resolvedLanguage;
    return Array.from(new Set([fallback, 'ar', 'en', 'fr']));
  }, [store, resolvedLanguage]);
  const currentLangCode = resolvedLanguage;

  const currentLang = useMemo(
    () => getLanguageDisplay(currentLangCode, findStoreLanguageRow(store, currentLangCode)),
    [store, currentLangCode],
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLanguageChange = (code: string) => {
    const next = normalizeLocale(code);
    if (next === currentLangCode) {
      setIsOpen(false);
      return;
    }

    /** Host navigates when embedded (locale-aware URL); same tab when standalone. */
    emitStorefrontLocalization({
      languageCode: next,
      storefrontPath: storefrontPath && storefrontPath.startsWith('/') ? storefrontPath : undefined,
    });
    setIsOpen(false);
  };

  if (availableLanguages.length <= 1) return null;

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group flex items-center gap-3 px-4 py-2.5 rounded-full transition-all duration-500 active:scale-95 border border-current/10 bg-current/[0.03] hover:bg-current/[0.08] backdrop-blur-md shadow-sm"
        style={{ color: 'inherit' }}
      >
        <div className="flex items-center gap-3">
          <span className="text-xl leading-none filter drop-shadow-sm group-hover:scale-110 transition-transform duration-500">
            {currentLang.flag}
          </span>
          <div className="flex flex-col items-start leading-none gap-1">
            <span className="font-bold text-[11px] uppercase tracking-[0.1em] opacity-90">
              {currentLang.nativeName}
            </span>
            <span className="hidden sm:inline text-[8px] opacity-40 font-mono tracking-tighter">
              {currentLang.codeLabel.toUpperCase()}
            </span>
          </div>
        </div>
        <ChevronDown 
          size={14} 
          className={`transition-transform duration-500 ${isOpen ? 'rotate-180 opacity-100' : 'opacity-40'}`} 
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop for Mobile */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[140] sm:hidden"
            />

            <motion.div
              initial={typeof window !== 'undefined' && window.innerWidth < 640 
                ? { y: '100%' } 
                : { opacity: 0, y: 10, scale: 0.95 }
              }
              animate={typeof window !== 'undefined' && window.innerWidth < 640 
                ? { y: 0 } 
                : { opacity: 1, y: 0, scale: 1 }
              }
              exit={typeof window !== 'undefined' && window.innerWidth < 640 
                ? { y: '100%' } 
                : { opacity: 0, y: 8, scale: 0.95 }
              }
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className={`fixed sm:absolute z-[150] inset-x-0 bottom-0 sm:bottom-auto sm:inset-x-auto mt-3 overflow-hidden shadow-[0_-20px_50px_rgba(0,0,0,0.3)] sm:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.4)] border-t sm:border border-current/10 sm:w-80 ${
                isRtl ? 'sm:left-0 sm:origin-top-left' : 'sm:right-0 sm:origin-top-right'
              }`}
              style={{ 
                backgroundColor: 'var(--storify-bg, #ffffff)', 
                color: 'var(--storify-text, #0f172a)',
                borderColor: 'var(--storify-border, #e2e8f0)',
                borderTopLeftRadius: '2rem',
                borderTopRightRadius: '2rem',
                borderBottomLeftRadius: typeof window !== 'undefined' && window.innerWidth < 640 ? '0' : '2rem',
                borderBottomRightRadius: typeof window !== 'undefined' && window.innerWidth < 640 ? '0' : '2rem',
              }}
            >
              {/* Drag Handle for Mobile */}
              <div className="flex justify-center pt-3 pb-1 sm:hidden">
                <div className="w-12 h-1.5 rounded-full bg-current/10" />
              </div>

              <div className="px-6 py-5 border-b border-current/5 bg-current/[0.02]">
                <div className="flex items-center justify-between">
                  <p className="text-[12px] font-black opacity-30 uppercase tracking-[0.25em]">
                    {t('language_store_label')}
                  </p>
                  <button 
                    onClick={() => setIsOpen(false)}
                    className="sm:hidden p-2 -me-2 opacity-40 hover:opacity-100 transition-opacity"
                  >
                    <Check size={20} className="rotate-45" />
                  </button>
                </div>
              </div>
              
              <div className="p-3 space-y-2 max-h-[70vh] overflow-y-auto custom-scrollbar">
                {availableLanguages.map((codeRaw) => {
                  const code = normalizeLocale(codeRaw);
                  const lang = getLanguageDisplay(codeRaw, findStoreLanguageRow(store, codeRaw));
                  const isSelected = code === currentLangCode;
                  
                  return (
                    <button
                      key={code}
                      onClick={() => handleLanguageChange(code)}
                      className={`w-full group/item flex items-center justify-between px-5 py-4.5 rounded-[1.5rem] transition-all duration-300 border ${
                        isSelected 
                          ? 'bg-brand-accent/10 border-brand-accent/20 text-brand-accent font-bold shadow-sm' 
                          : 'bg-transparent border-transparent text-current opacity-70 hover:opacity-100 hover:bg-current/[0.04]'
                      }`}
                    >
                      <div className="flex items-center gap-5">
                        <span className={`text-3xl leading-none transition-transform duration-500 ${isSelected ? 'scale-110' : 'group-hover/item:scale-110'}`}>
                          {lang.flag}
                        </span>
                        <div className="flex flex-col items-start gap-1">
                          <span className="leading-tight text-[16px] font-bold tracking-tight">{lang.nativeName}</span>
                          <div className="flex items-center gap-2.5">
                            <span className="text-[11px] font-medium uppercase tracking-[0.15em] opacity-40">
                              {lang.name}
                            </span>
                            <span className="text-[10px] font-mono opacity-25 px-1.5 py-0.5 rounded bg-current/5">{lang.codeLabel}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-center w-8 h-8">
                        {isSelected && (
                          <motion.div 
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-7 h-7 rounded-full flex items-center justify-center shadow-xl"
                            style={{ backgroundColor: 'var(--brand-accent)' }}
                          >
                            <Check size={14} className="text-white" />
                          </motion.div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
              
              <div className="h-6 w-full bg-current/[0.01]" />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
