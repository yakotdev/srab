import React, { useState, useEffect, useMemo } from 'react';
import { X, Mail, ArrowRight, Sparkles, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';
import { useThemeConfig } from '../ThemeContext';
import { 
  buildSchemeCssVariables, 
  buildThemeFontCssVariables, 
  resolveSchemeFromSettings,
} from '@storify/theme';

const NewsletterPopup: React.FC<{ section: any }> = ({ section }) => {
  const { isRtl, activeSectionId, settings, t } = useThemeConfig();
  const content = section?.content || {};
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);

  const isActive = activeSectionId === section.id;

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

    const hasShown = sessionStorage.getItem('newsletter_popup_shown');
    if (!hasShown) {
      const timer = setTimeout(() => {
        setIsOpen(true);
        sessionStorage.setItem('newsletter_popup_shown', 'true');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isActive]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setIsSubscribed(true);
      setTimeout(() => setIsOpen(false), 3000);
    }
  };

  if (typeof document === 'undefined') return null;

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
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
            className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
          />

          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.19, 1, 0.22, 1] }}
            className={`relative w-full shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[500px] ${
              content.layout_style === 'minimal' ? 'max-w-xl' : 'max-w-4xl'
            }`}
            dir={isRtl ? 'rtl' : 'ltr'}
            style={{ 
              background: content.layout_style === 'full_bg' ? 'transparent' : 'var(--storify-bg)',
              borderRadius: 'var(--brand-radius, 24px)'
            }}
          >
            {/* Close Button */}
            <button 
              onClick={() => setIsOpen(false)}
              className={`absolute top-6 z-30 p-2 opacity-50 hover:opacity-100 transition-opacity ${
                isRtl ? 'left-6' : 'right-6'
              }`}
              style={{ color: content.layout_style === 'full_bg' ? '#fff' : 'var(--storify-text)' }}
            >
              <X className="w-6 h-6" strokeWidth={1.2} />
            </button>

            {/* Image Section */}
            {content.layout_style !== 'minimal' && (
              <div className={`${content.layout_style === 'full_bg' ? 'absolute inset-0 w-full' : 'md:w-1/2'} relative bg-neutral-100 overflow-hidden`}>
                <motion.img 
                  initial={{ scale: 1.1 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 1.5 }}
                  src={content.image || "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=1200"} 
                  alt="Newsletter" 
                  className="absolute inset-0 w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className={`absolute inset-0 ${content.layout_style === 'full_bg' ? 'bg-black/40' : 'bg-black/5'}`} />
              </div>
            )}

            {/* Content Section */}
            <div className={`${content.layout_style === 'minimal' ? 'w-full' : content.layout_style === 'full_bg' ? 'w-full relative z-10' : 'md:w-1/2'} p-10 md:p-16 flex flex-col justify-center text-center`}>
              <div className="w-full">
                <motion.span 
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="inline-block text-[11px] font-bold uppercase tracking-[0.3em] mb-6"
                  style={{ color: content.layout_style === 'full_bg' ? '#fff' : 'var(--storify-primary)' }}
                >
                  {content.label || t('newsletter_popup_label')}
                </motion.span>
                
                <motion.h2 
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-3xl md:text-4xl mb-6 leading-tight font-light tracking-tight"
                  style={{ 
                    fontFamily: 'var(--storify-font-headings)',
                    color: content.layout_style === 'full_bg' ? '#fff' : 'var(--storify-headings)'
                  }}
                >
                  {content.title || t('newsletter_popup_title')}
                </motion.h2>

                <motion.p 
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-sm mb-10 leading-relaxed opacity-70 font-light"
                  style={{ color: content.layout_style === 'full_bg' ? '#fff' : 'var(--storify-text)' }}
                >
                  {content.subtitle || t('newsletter_popup_subtitle')}
                </motion.p>

                {isSubscribed ? (
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex flex-col items-center justify-center py-8"
                    style={{ color: content.layout_style === 'full_bg' ? '#fff' : 'var(--storify-primary)' }}
                  >
                    <CheckCircle2 className="w-12 h-12 mb-4" strokeWidth={1} />
                    <p className="text-lg font-light tracking-wide">{t('newsletter_popup_thanks')}</p>
                  </motion.div>
                ) : (
                  <motion.form 
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    onSubmit={handleSubmit} 
                    className="space-y-6"
                  >
                    <div className="relative">
                      <input 
                        type="email" 
                        required
                        placeholder={t('shop_newsletter_email_placeholder')}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-0 py-4 border-b focus:border-black focus:outline-none transition-colors bg-transparent text-sm text-center font-light tracking-wide"
                        style={{ 
                          borderColor: content.layout_style === 'full_bg' ? 'rgba(255,255,255,0.3)' : 'var(--storify-border)',
                          color: content.layout_style === 'full_bg' ? '#fff' : 'var(--storify-text)'
                        }}
                      />
                    </div>
                    
                    <button 
                      type="submit"
                      className="w-full py-5 font-bold uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3 text-[11px] hover:opacity-90 active:scale-[0.98]"
                      style={{ 
                        background: content.layout_style === 'full_bg' ? '#fff' : 'var(--storify-btn-primary-bg)',
                        color: content.layout_style === 'full_bg' ? '#000' : 'var(--storify-btn-primary-fg)',
                        borderRadius: 'var(--brand-radius, 24px)'
                      }}
                    >
                      <span>{content.buttonText || t('newsletter_popup_button')}</span>
                      <ArrowRight className={`w-4 h-4 ${isRtl ? 'rotate-180' : ''}`} strokeWidth={1.5} />
                    </button>

                    <a 
                      href={content.link || '#'}
                      onClick={(e) => {
                        if (!content.link || content.link === '#') {
                          e.preventDefault();
                          setIsOpen(false);
                        }
                      }}
                      className="text-[10px] uppercase tracking-[0.2em] opacity-40 hover:opacity-100 transition-opacity mt-4 inline-block"
                      style={{ color: content.layout_style === 'full_bg' ? '#fff' : 'var(--storify-text)' }}
                    >
                      {t('newsletter_popup_no_thanks')}
                    </a>
                  </motion.form>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};

export default NewsletterPopup;
