import React, { useState, useEffect, useMemo } from 'react';
import { X, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useThemeConfig } from '../ThemeContext';
import { navigateStorefront } from '@storify/theme';
import { 
  buildSchemeCssVariables, 
  buildThemeFontCssVariables, 
  resolveSchemeFromSettings,
} from '@storify/theme';

const FloatingPromoSection: React.FC<{ section: any }> = ({ section }) => {
  const { isRtl, activeSectionId, settings, t } = useThemeConfig();
  const content = section?.content || {};
  const [isVisible, setIsVisible] = useState(false);

  const schemeStyle = useMemo(() => {
    const schemeId = content.color_scheme || content.colorScheme;
    const scheme = resolveSchemeFromSettings(settings as any, schemeId);
    const fontVars = buildThemeFontCssVariables(settings as any);
    const schemeVars = buildSchemeCssVariables(scheme);
    return { ...schemeVars, ...fontVars };
  }, [settings, content.color_scheme, content.colorScheme]);

  const isActive = activeSectionId === section.id;

  useEffect(() => {
    if (isActive) {
      setIsVisible(true);
      return;
    }

    const timer = setTimeout(() => setIsVisible(true), 2000);
    return () => clearTimeout(timer);
  }, [isActive]);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-6 left-6 right-6 md:left-auto md:right-8 md:w-96 z-[100] pointer-events-auto storify-scheme-scope"
          dir={isRtl ? 'rtl' : 'ltr'}
          style={schemeStyle as any}
        >
          <div 
            className="relative p-5 rounded-3xl shadow-2xl border backdrop-blur-xl flex items-start gap-4 overflow-hidden group"
            style={{ 
              background: 'var(--storify-bg)',
              borderColor: 'var(--storify-border)',
              color: 'var(--storify-text)'
            }}
          >
            {/* Decorative background element */}
            <div 
              className="absolute -right-4 -top-4 w-24 h-24 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity"
              style={{ background: 'var(--storify-primary)' }}
            />

            <div 
              className="flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg"
              style={{ background: 'var(--storify-primary)' }}
            >
              <Bell className="w-6 h-6 animate-bounce" />
            </div>

            <div className="flex-1">
              <h4 className="font-bold text-sm mb-1" style={{ color: 'var(--storify-headings)' }}>
                {content.title || t('floating_promo_title')}
              </h4>
              <p className="text-xs opacity-70 leading-relaxed" style={{ color: 'var(--storify-text)' }}>
                {content.text || t('floating_promo_text')}
              </p>
              {content.button_text && (
                <button 
                  onClick={() => {
                    const path = content.link || '/shop';
                    navigateStorefront(path);
                  }}
                  className="mt-3 text-[10px] font-black uppercase tracking-widest py-2 px-4 rounded-full transition-all hover:scale-105 active:scale-95 shadow-sm"
                  style={{ 
                    background: 'var(--storify-btn-primary-bg)',
                    color: 'var(--storify-btn-primary-fg)'
                  }}
                >
                  {content.button_text}
                </button>
              )}
            </div>

            <button 
              onClick={() => setIsVisible(false)}
              className="absolute top-3 right-3 p-1 rounded-full hover:bg-black/5 transition-colors"
              style={{ color: 'var(--storify-text)' }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FloatingPromoSection;
