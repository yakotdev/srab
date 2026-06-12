import React, { useState, useEffect, useMemo } from 'react';
import { X, Tag, ShoppingBag, Megaphone, Copy, Check, ArrowRight, Star, ArrowUpRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';
import { useThemeConfig } from '../ThemeContext';
import { 
  buildSchemeCssVariables, 
  buildThemeFontCssVariables, 
  resolveSchemeFromSettings,
} from '@storify/theme';

const PromoPopup: React.FC<{ section: any }> = ({ section }) => {
  const { isRtl, activeSectionId, settings, t } = useThemeConfig();
  const content = section?.content || {};
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const isActive = activeSectionId === section.id;

  const delay = (content.delay || 3) * 1000;

  // Calculate scheme styles to ensure compatibility with the theme's color system
  const schemeStyle = useMemo(() => {
    const schemeId = content.color_scheme || content.colorScheme;
    const scheme = resolveSchemeFromSettings(settings as any, schemeId);
    const fontVars = buildThemeFontCssVariables(settings as any);
    const schemeVars = buildSchemeCssVariables(scheme);
    return { ...schemeVars, ...fontVars };
  }, [settings, content.color_scheme, content.colorScheme]);

  useEffect(() => {
    if (isActive) {
      setIsOpen(true);
      return;
    }

    const hasShown = sessionStorage.getItem(`promo_popup_${section.id}_shown`);
    if (!hasShown) {
      const timer = setTimeout(() => {
        setIsOpen(true);
        sessionStorage.setItem(`promo_popup_${section.id}_shown`, 'true');
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [delay, section.id, isActive]);

  const handleCopy = () => {
    if (content.code) {
      navigator.clipboard.writeText(content.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (typeof document === 'undefined') return null;

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 storify-scheme-scope"
          style={{ 
            ...schemeStyle as any,
            fontFamily: 'var(--storify-font-body)',
          }}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
          />

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className={`relative w-full shadow-xl overflow-hidden flex flex-col md:flex-row ${
              content.layout_style === 'side_image' ? 'max-w-2xl' : 'max-w-md'
            }`}
            dir={isRtl ? 'rtl' : 'ltr'}
            style={{ 
              background: 'var(--storify-bg)',
              color: 'var(--storify-text)',
              borderRadius: 'var(--brand-radius, 24px)'
            }}
          >
            {/* Close Button */}
            <button 
              onClick={() => setIsOpen(false)}
              className={`absolute top-4 z-30 p-2 opacity-40 hover:opacity-100 transition-opacity ${
                isRtl ? 'left-4' : 'right-4'
              }`}
              style={{ color: 'var(--storify-text)' }}
            >
              <X className="w-5 h-5" strokeWidth={1.2} />
            </button>

            {/* Side Image */}
            {content.layout_style === 'side_image' && (
              <div className="md:w-5/12 relative min-h-[200px] md:min-h-full bg-neutral-100">
                <img 
                  src={content.image || "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&q=80&w=800"} 
                  alt="Promo" 
                  className="absolute inset-0 w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            )}

            <div className={`${content.layout_style === 'side_image' ? 'md:w-7/12' : 'w-full'} p-8 md:p-10 text-center flex flex-col justify-center`}>
              <div className="max-w-xs mx-auto w-full">
                {content.layout_style !== 'minimal' && (
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-6 border"
                    style={{ 
                      borderColor: 'var(--storify-border)',
                      background: 'var(--storify-bg)',
                      borderRadius: 'var(--brand-radius, 24px)'
                    }}
                  >
                    {content.type === 'announcement' ? (
                      <Megaphone className="w-5 h-5" style={{ color: 'var(--storify-primary)' }} strokeWidth={1.2} />
                    ) : (
                      <Tag className="w-5 h-5" style={{ color: 'var(--storify-primary)' }} strokeWidth={1.2} />
                    )}
                  </div>
                )}

              <span 
                className="inline-block text-[10px] font-bold uppercase tracking-[0.2em] mb-3"
                style={{ color: 'var(--storify-primary)' }}
              >
                {content.badge || t('promo_popup_badge')}
              </span>
              
              <h2 
                className="text-2xl mb-4 leading-tight"
                style={{ 
                  fontFamily: 'var(--storify-font-headings)',
                  color: 'var(--storify-headings)'
                }}
              >
                {content.title || t('promo_popup_title')}
              </h2>

              <p className="text-sm mb-8 leading-relaxed opacity-70">
                {content.subtitle || t('promo_popup_subtitle')}
              </p>

                {content.code && content.type !== 'announcement' && (
                  <div className="mb-8">
                    <div 
                      className="flex items-center justify-between p-1 border"
                      style={{ 
                        borderColor: 'var(--storify-border)',
                        background: 'var(--storify-bg)',
                        borderRadius: 'var(--brand-radius, 24px)'
                      }}
                    >
                      <div 
                        className="flex-1 font-mono font-bold text-lg tracking-widest py-2 px-4 uppercase"
                        style={{ color: 'var(--storify-text)' }}
                      >
                        {content.code}
                      </div>
                      <button 
                        onClick={handleCopy}
                        className="px-5 py-2.5 text-white text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2"
                        style={{ 
                          background: copied ? '#22c55e' : 'var(--storify-btn-primary-bg)',
                          color: 'var(--storify-btn-primary-fg)',
                          borderRadius: 'var(--brand-radius, 24px)'
                        }}
                      >
                        {copied ? <Check className="w-4 h-4" strokeWidth={2} /> : <Copy className="w-4 h-4" strokeWidth={1.5} />}
                        <span>{copied ? t('promo_popup_copied') : t('promo_popup_copy')}</span>
                      </button>
                    </div>
                  </div>
                )}

              <div className="space-y-3">
                <a 
                  href={content.link || '#'}
                  className="block w-full py-4 font-bold uppercase tracking-[0.2em] transition-all text-center"
                  style={{ 
                    background: 'var(--storify-btn-primary-bg)',
                    color: 'var(--storify-btn-primary-fg)',
                    borderRadius: 'var(--brand-radius, 24px)'
                  }}
                >
                  {content.button_text || content.buttonText || t('mock_hero_cta')}
                </a>

                {content.secondary_link && (
                  <button
                    onClick={() => {
                      const path = content.secondary_link;
                      window.location.href = path;
                    }}
                    className="text-[10px] uppercase tracking-widest opacity-60 hover:opacity-100 transition-opacity border-b"
                    style={{ color: 'var(--storify-text)', borderColor: 'var(--storify-border)' }}
                  >
                    {content.secondary_link_text || t('hero_slide_cta_explore')}
                  </button>
                )}

                <button 
                  onClick={() => setIsOpen(false)}
                  className="text-[10px] uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity"
                  style={{ color: 'var(--storify-text)' }}
                >
                  {t('promo_popup_dismiss')}
                </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};

export default PromoPopup;
