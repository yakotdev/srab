import React, { useState, useEffect } from 'react';
import { useThemeConfig, LayoutSection } from '../ThemeContext';
import { isInternalStorefrontPath, navigateStorefront, normalizeLinkPath } from '@storify/theme';
import { isStorifyThemeEmbedded } from '@storify/theme';
import { notifyNewsletterSubscribe } from '@storify/theme';
import { useMenu } from '@storify/theme';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { motion } from 'motion/react';
import { 
  MapPin, 
  Phone, 
  Mail, 
  Facebook, 
  Instagram, 
  Twitter, 
  Youtube,
  Send,
  ArrowLeft,
  ArrowUp,
  CreditCard,
  ShieldCheck
} from 'lucide-react';

type SocialIconProps = { size?: number };

const LinkedinIcon: React.FC<SocialIconProps> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M4.98 3.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM3 9h4v12H3zM9 9h3.8v1.7h.1c.5-1 1.8-2 3.8-2 4 0 4.7 2.6 4.7 6V21h-4v-5.1c0-1.2 0-2.9-1.8-2.9s-2 1.4-2 2.8V21H9z" />
  </svg>
);

const PinterestIcon: React.FC<SocialIconProps> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M12 2a10 10 0 0 0-3.6 19.3c0-.8 0-2 .3-2.9l1.1-4.5s-.3-.7-.3-1.8c0-1.7 1-3 2.2-3 1 0 1.5.8 1.5 1.7 0 1-.7 2.6-1.1 4-.3 1.1.6 2 1.8 2 2.2 0 3.8-2.3 3.8-5.5 0-2.8-2-4.8-5-4.8-3.4 0-5.4 2.6-5.4 5.2 0 1 .4 2.1 1 2.7.1.1.1.2.1.3l-.4 1.5c-.1.2-.2.3-.4.2-1.6-.7-2.6-2.8-2.6-4.5 0-3.7 2.7-7.2 7.8-7.2 4.1 0 7.3 2.9 7.3 6.8 0 4.1-2.6 7.3-6.1 7.3-1.2 0-2.3-.6-2.7-1.4l-.7 2.7c-.3 1-.9 2.1-1.3 2.8A10 10 0 1 0 12 2z" />
  </svg>
);

const TiktokIcon: React.FC<SocialIconProps> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M14.5 3h2.8c.2 1.2 1 2.3 2.2 2.9.7.4 1.5.6 2.3.6v2.8c-1.6 0-3.2-.5-4.5-1.4V15a6 6 0 1 1-6-6c.4 0 .8 0 1.2.1v2.9a3.2 3.2 0 1 0 2 3V3z" />
  </svg>
);

const STORIFY_URL = 'http://storify.it.com/';
const POWERED_BY_LOGO = 'https://cdn.storify.it.com/powerdbystorify-black.svg';

/** Matches the footer pattern in themes/tempcode/components/store/StoreLayout.tsx */
const FooterSection = ({ section }: { section: LayoutSection }) => {
  const { store, settings, isRtl, t } = useThemeConfig();
  const content = section.content || {};
  
  const asBool = (value: any, fallback = true) => {
    if (value === undefined || value === null || value === '') return fallback;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value.toLowerCase() === 'true';
    return Boolean(value);
  };

  const showSocial = asBool(content.show_social, true);
  const showNewsletter = asBool(content.show_newsletter, true);
  
  const [footerEmail, setFooterEmail] = useState('');
  const [footerSubStatus, setFooterSubStatus] = useState<'idle' | 'sent'>('idle');
  const [showScrollTop, setShowScrollTop] = useState(false);
  const embedded = isStorifyThemeEmbedded();

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const defaultQuickLinks = [
    { name: t('nav_home'), href: '/' },
    { name: t('nav_shop'), href: '/shop' },
    { name: t('footer_wishlist'), href: '/wishlist' },
  ];
  
  const defaultSupportLinks = [
    { name: t('footer_faq'), href: '/contact' },
    { name: t('footer_shipping_delivery'), href: '/contact' },
    { name: t('footer_returns_policy'), href: '/contact' },
  ];

  const defaultLegalLinks = [
    { name: t('policy_slug_privacy'), href: '/policies/privacy' },
    { name: t('policy_slug_terms'), href: '/policies/terms' },
  ];

  // Menus from section content (current schema)
  const sectionFooterMenu = useMenu(content.footer_menu);
  const sectionSupportMenu = useMenu(content.support_menu);
  const sectionLegalMenu = useMenu(content.legal_menu);

  // Legacy menu keys (backward compatibility)
  const globalFooterCol1 = useMenu(settings?.footer_col_1);
  const primaryMenuItems = useMenu(settings?.nav_primary);
  
  const quickLinks =
    sectionFooterMenu.length > 0
      ? sectionFooterMenu
      : globalFooterCol1.length > 0
        ? globalFooterCol1
        : primaryMenuItems.length > 0
          ? primaryMenuItems
          : defaultQuickLinks;

  const supportLinks = 
    sectionSupportMenu.length > 0 
      ? sectionSupportMenu 
      : defaultSupportLinks;

  const legalLinks = 
    sectionLegalMenu.length > 0 
      ? sectionLegalMenu 
      : defaultLegalLinks;

  const storeName = store?.name || t('store_name');

  const socialLinks = [
    { icon: Facebook, url: settings?.social_facebook, label: 'فيسبوك' },
    { icon: Instagram, url: settings?.social_instagram, label: 'انستقرام' },
    { icon: Twitter, url: settings?.social_twitter, label: 'تويتر' },
    { icon: Youtube, url: settings?.social_youtube, label: 'يوتيوب' },
    { icon: LinkedinIcon, url: settings?.social_linkedin, label: 'لينكدان' },
    { icon: PinterestIcon, url: settings?.social_pinterest, label: 'بانترست' },
    { icon: TiktokIcon, url: settings?.social_tiktok, label: 'تيكتوك' },
  ].filter(link => link.url);
  const isExternal = (url: string) => /^https?:\/\//i.test(url);

  return (
    <footer className="relative pt-24 pb-12 px-6 mt-auto border-t" style={{ background: 'var(--storify-bg)', color: 'var(--storify-text)', borderColor: 'var(--storify-border)' }}>
      
      {/* Back to Top Button */}
      <button
        onClick={scrollToTop}
        className={`fixed bottom-8 end-8 z-50 p-4 rounded-2xl shadow-2xl transition-all duration-500 hover:scale-110 active:scale-95 ${
          showScrollTop ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'
        }`}
        style={{ background: 'var(--storify-bg)', color: 'var(--storify-headings)', border: '1px solid var(--storify-border)' }}
        aria-label={t('footer_back_to_top')}
      >
        <ArrowUp size={24} />
      </button>

      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-16 mb-20">
        
        {/* Store Info Column */}
        <div className={`space-y-8 ${showNewsletter ? 'md:col-span-4' : 'md:col-span-6'}`}>
          <div>
            {store?.logo && String(store.logo).trim() !== '' ? (
              <img
                src={String(store.logo).trim()}
                alt={storeName}
                width={200}
                height={56}
                className="h-14 w-auto max-w-[200px] object-contain mb-8"
                referrerPolicy="no-referrer"
                decoding="async"
              />
            ) : (
              <h2 className="text-3xl font-black mb-8 tracking-tighter uppercase italic" style={{ color: 'var(--storify-headings)' }}>{storeName}</h2>
            )}
            <p className="text-sm opacity-60 leading-relaxed max-w-xs">
              {content.store_description || store?.description || t('footer_store_description')}
            </p>

          </div>
          
          <div className="space-y-5">
            {store?.address && (
              <div className="flex items-start gap-4 opacity-70 group cursor-default">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors" style={{ background: 'var(--storify-border)', opacity: 0.3 }}>
                  <MapPin size={16} />
                </div>
                <p className="text-sm leading-relaxed">{store.address}</p>
              </div>
            )}
            
            {store?.email && (
              <div className="flex items-center gap-4 opacity-70 group">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors" style={{ background: 'var(--storify-border)', opacity: 0.3 }}>
                  <Mail size={16} />
                </div>
                <a href={`mailto:${store.email}`} className="text-sm transition-colors" style={{ color: 'var(--storify-text)' }}>
                  {store.email}
                </a>
              </div>
            )}
            
            {store?.phone && (
              <div className="flex items-center gap-4 opacity-70 group">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors" style={{ background: 'var(--storify-border)', opacity: 0.3 }}>
                  <Phone size={16} />
                </div>
                <a href={`tel:${store.phone}`} className="text-sm transition-colors" dir="ltr" style={{ color: 'var(--storify-text)' }}>
                  {store.phone}
                </a>
              </div>
            )}
          </div>

          {showSocial && socialLinks.length > 0 && (
            <div className="flex items-center gap-4 pt-4">
              {socialLinks.map((social, idx) => (
                <a 
                  key={idx}
                  href={social.url} 
                  target="_blank" 
                  rel="noreferrer"
                  className="w-11 h-11 rounded-xl border flex items-center justify-center transition-all duration-300"
                  style={{ 
                    background: 'var(--storify-bg)', 
                    color: 'var(--storify-headings)',
                    borderColor: 'var(--storify-border)'
                  }}
                  aria-label={social.label}
                >
                  <social.icon size={20} aria-hidden />
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Quick Links Column */}
        <div className={showNewsletter ? 'md:col-span-2' : 'md:col-span-3'}>
          <h3 className="font-black text-xs uppercase tracking-[0.2em] mb-10 relative inline-block" style={{ color: 'var(--storify-headings)' }}>
            {content.footer_menu_title || t('footer_quick_links')}
            <span className="absolute -bottom-3 end-0 w-12 h-1 rounded-full" style={{ background: 'var(--storify-primary)' }} />
          </h3>
          <ul className="space-y-5">
            {quickLinks.map((item: any, idx: number) => (
              <li key={`${item?.name || 'link'}-${idx}`}>
                <button
                  type="button"
                  onClick={() => {
                    const path = normalizeLinkPath(item?.href || item?.url || '/', '/');
                    if (isExternal(path)) {
                      window.open(path, '_blank', 'noopener,noreferrer');
                      return;
                    }
                    navigateStorefront(path);
                  }}
                  className="text-sm opacity-60 hover:opacity-100 hover:translate-x-[var(--translate-x-hover)] inline-flex items-center gap-3 transition-all duration-300 group"
                  style={{ color: 'var(--storify-text)', '--translate-x-hover': isRtl ? '8px' : '-8px' } as any}
                >
                  <ArrowLeft size={14} className={`opacity-0 ${isRtl ? '-me-4 group-hover:me-0' : '-me-4 group-hover:me-0 rotate-180'} transition-all`} />
                  {item?.name || item?.label || item?.title || t('nav_link_default')}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Support Links Column */}
        <div className={showNewsletter ? 'md:col-span-2' : 'md:col-span-3'}>
          <h3 className="font-black text-xs uppercase tracking-[0.2em] mb-10 relative inline-block" style={{ color: 'var(--storify-headings)' }}>
            {content.support_menu_title || t('footer_support_center')}
            <span className="absolute -bottom-3 end-0 w-12 h-1 rounded-full" style={{ background: 'var(--storify-primary)' }} />
          </h3>
          <ul className="space-y-5">
            {supportLinks.map((item: any, idx: number) => (
              <li key={`${item?.name || 'link'}-${idx}`}>
                <button
                  type="button"
                  onClick={() => {
                    const path = normalizeLinkPath(item?.href || item?.url || '/', '/');
                    if (isExternal(path)) {
                      window.open(path, '_blank', 'noopener,noreferrer');
                      return;
                    }
                    navigateStorefront(path);
                  }}
                  className="text-sm opacity-60 hover:opacity-100 hover:translate-x-[var(--translate-x-hover)] inline-flex items-center gap-3 transition-all duration-300 group"
                  style={{ color: 'var(--storify-text)', '--translate-x-hover': isRtl ? '8px' : '-8px' } as any}
                >
                  <ArrowLeft size={14} className={`opacity-0 ${isRtl ? '-me-4 group-hover:me-0' : '-me-4 group-hover:me-0 rotate-180'} transition-all`} />
                  {item?.name || item?.label || item?.title || t('nav_link_default')}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Newsletter Column */}
        {showNewsletter && (
          <div className="md:col-span-4">
            <div className="rounded-[2rem] p-10 border relative overflow-hidden group" style={{ background: 'var(--storify-bg)', borderColor: 'var(--storify-border)' }}>
              <div
                className="absolute top-0 end-0 w-32 h-32 blur-3xl -me-16 -mt-16 transition-colors"
                style={{ background: 'var(--storify-primary)', opacity: 0.1 }}
              />
              
              <div className="relative z-10">
                <h3 className="font-black text-xl mb-3 tracking-tight" style={{ color: 'var(--storify-headings)' }}>{content.newsletter_title || t('shop_newsletter_heading')}</h3>
                <p className="text-sm opacity-60 mb-8 leading-relaxed">
                  {content.newsletter_desc || t('footer_newsletter_desc')}
                </p>
                
                <form
                  className="relative space-y-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const trimmed = footerEmail.trim();
                    if (!trimmed) return;
                    if (embedded) {
                      notifyNewsletterSubscribe(trimmed);
                      setFooterSubStatus('sent');
                      setFooterEmail('');
                    }
                  }}
                >
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={footerEmail}
                      onChange={(e) => {
                        setFooterEmail(e.target.value);
                        setFooterSubStatus('idle');
                      }}
                      placeholder={t('shop_newsletter_email_placeholder')}
                      className="w-full rounded-2xl ps-10 pe-32 py-5 border text-sm focus:outline-none focus:ring-2 transition-all"
                      style={{ 
                        background: 'var(--storify-bg)', 
                        color: 'var(--storify-text)',
                        borderColor: 'var(--storify-border)',
                        '--tw-ring-color': 'var(--storify-primary)'
                      } as any}
                    />
                    <button
                      type="submit"
                      className="absolute end-2 top-2 bottom-2 px-6 rounded-xl font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2 active:scale-95"
                      style={{ 
                        background: 'var(--storify-btn-primary-bg)', 
                        color: 'var(--storify-btn-primary-fg)' 
                      }}
                      aria-label={t('shop_newsletter_subscribe')}
                    >
                      <span>{t('shop_newsletter_subscribe')}</span>
                      <Send size={16} />
                    </button>
                  </div>
                </form>
                
                {footerSubStatus === 'sent' && (
                  <motion.p 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 text-xs flex items-center gap-2 font-bold"
                    style={{ color: 'var(--storify-primary)' }}
                  >
                    <ShieldCheck size={14} />
                    {t('shop_newsletter_subscribed')}
                  </motion.p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Bar */}
      <div className="max-w-7xl mx-auto pt-12 border-t flex flex-col md:flex-row justify-between items-center gap-8" style={{ borderColor: 'var(--storify-border)' }}>
        <div className="flex flex-col items-center md:items-start gap-3 w-full md:w-auto">
          <a
            href={STORIFY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 cursor-pointer"
            aria-label="Powered by Storify"
          >
            <img
              src={POWERED_BY_LOGO}
              alt="Powered by Storify"
              width={200}
              height={80}
              className="h-12 sm:h-14 w-auto object-contain"
              decoding="async"
            />
          </a>

          <LanguageSwitcher variant="footer" />
        </div>
        
        <div className="flex flex-wrap gap-x-10 gap-y-4 justify-center md:justify-end text-sm font-bold">
          {legalLinks.map((item: any, idx: number) => (
            (() => {
              const path = normalizeLinkPath(item?.href || item?.url || '/', '/');
              if (isInternalStorefrontPath(path)) {
                return (
                  <button
                    key={`${item?.name || 'legal'}-${idx}`}
                    type="button"
                    onClick={() => navigateStorefront(path)}
                    className="opacity-85 hover:opacity-100 transition-opacity underline-offset-8 hover:underline decoration-2"
                    style={{ textDecorationColor: 'var(--storify-primary)' }}
                  >
                    {item?.name || item?.label || item?.title || t('nav_link_default')}
                  </button>
                );
              }
              return (
                <a
                  key={`${item?.name || 'legal'}-${idx}`}
                  href={path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="opacity-85 hover:opacity-100 transition-opacity underline-offset-8 hover:underline decoration-2"
                  style={{ textDecorationColor: 'var(--storify-primary)' }}
                >
                  {item?.name || item?.label || item?.title || t('nav_link_default')}
                </a>
              );
            })()
          ))}
        </div>
      </div>
    </footer>
  );
};

export default FooterSection;
