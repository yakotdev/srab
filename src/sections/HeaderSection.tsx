import React, { useEffect, useState, useMemo } from 'react';
import { ShoppingBag, Heart, Search, Menu, X, User, ChevronLeft, Facebook, Instagram, Twitter, Youtube } from 'lucide-react';
import { useThemeConfig } from '../ThemeContext';
import { navigateStorefront, normalizeLinkPath } from '@storify/theme';
import { useMenu } from '@storify/theme';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { motion, AnimatePresence } from 'motion/react';

type NavItem = { name: string; href: string };
type SocialIconProps = { size?: number };

const LinkedinIcon: React.FC<SocialIconProps> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M4.98 3.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM3 9h4v12H3zM9 9h3.8v1.7h.1c.5-1 1.8-2 3.8-2 4 0 4.7 2.6 4.7 6V21h-4v-5.1c0-1.2 0-2.9-1.8-2.9s-2 1.4-2 2.8V21H9z" />
  </svg>
);

const PinterestIcon: React.FC<SocialIconProps> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M12 2a10 10 0 0 0-3.6 19.3c0-.8 0-2 .3-2.9l1.1-4.5s-.3-.7-.3-1.8c0-1.7 1-3 2.2-3 1 0 1.5.8 1.5 1.7 0 1-.7 2.6-1.1 4-.3 1.1.6 2 1.8 2 2.2 0 3.8-2.3 3.8-5.5 0-2.8-2-4.8-5-4.8-3.4 0-5.4 2.6-5.4 5.2 0 1 .4 2.1 1 2.7.1.1.1.2.1.3l-.4 1.5c-.1.2-.2.3-.4.2-1.6-.7-2.6-2.8-2.6-4.5 0-3.7 2.7-7.2 7.8-7.2 4.1 0 7.3 2.9 7.3 6.8 0 4.1-2.6 7.3-6.1 7.3-1.2 0-2.3-.6-2.7-1.4l-.7 2.7c-.3 1-.9 2.1-1.3 2.8A10 10 0 1 0 12 2z" />
  </svg>
);

const TiktokIcon: React.FC<SocialIconProps> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M14.5 3h2.8c.2 1.2 1 2.3 2.2 2.9.7.4 1.5.6 2.3.6v2.8c-1.6 0-3.2-.5-4.5-1.4V15a6 6 0 1 1-6-6c.4 0 .8 0 1.2.1v2.9a3.2 3.2 0 1 0 2 3V3z" />
  </svg>
);

const asBool = (value: unknown, fallback = true) => {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  return Boolean(value);
};

const HeaderSection: React.FC<{ section: any }> = ({ section }) => {
  const { store, settings, onOpenCart, onOpenSearch, wishlist, cart, isRtl, t } = useThemeConfig();
  const content = section?.content || {};

  const [pathname, setPathname] = useState('/');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [scrolled, setScrolled] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;
    navigateStorefront(`/shop?q=${encodeURIComponent(query)}`);
    setIsSearchOpen(false);
  };

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const sync = () => {
      try {
        setPathname(window.location.pathname || '/');
      } catch {
        setPathname('/');
      }
    };
    sync();
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);

  const headerSettings = {
    sticky: asBool(content.sticky, true),
    showTopBar: asBool(content.show_top_bar, true),
    topBarText: String(content.top_bar_text || t('header_top_bar_default')).trim(),
    showWishlist: asBool(content.show_wishlist, true),
    showCart: asBool(content.show_cart, true),
    height: (String(content.height || 'normal') as 'compact' | 'normal' | 'large') || 'normal',
    showLogo: asBool(content.show_logo, true),
  };

  const isSticky = headerSettings.sticky !== false;
  const showWishlist = headerSettings.showWishlist !== false;
  const showCart = headerSettings.showCart !== false;
  const heightClass = headerSettings.height === 'compact' ? 'h-16' : headerSettings.height === 'large' ? 'h-24' : 'h-20';
  const showLogo = headerSettings.showLogo !== false;

  const defaultLinks: NavItem[] = [
    { name: t('nav_home'), href: '/' },
    { name: t('nav_shop'), href: '/shop' },
    { name: t('nav_contact'), href: '/contact' },
  ];

  const sectionMenuItems = useMenu(content.menu);
  
  const navLinks = useMemo(() => {
    if (sectionMenuItems && sectionMenuItems.length > 0) {
      return sectionMenuItems.map((item: any) => ({
        name: item.name || item.label || item.title || t('nav_link_default'),
        href: item.href || item.url || '/'
      }));
    }
    return defaultLinks;
  }, [sectionMenuItems, t]);

  const displayName = String((store as any)?.name ?? settings?.store_name ?? 'STORE.').trim() || 'STORE.';
  const displayLogo = String((store as any)?.logo ?? settings?.store_logo ?? settings?.logo ?? '').trim();
  const cartCount = cart?.reduce((n, p) => n + (Number((p as any).quantity) || 1), 0) ?? 0;
  const isExternal = (url: string) => url.startsWith('http://') || url.startsWith('https://');

  const socialLinks = [
    { icon: Facebook, url: settings?.social_facebook },
    { icon: Instagram, url: settings?.social_instagram },
    { icon: Twitter, url: settings?.social_twitter },
    { icon: Youtube, url: settings?.social_youtube },
    { icon: LinkedinIcon, url: settings?.social_linkedin },
    { icon: PinterestIcon, url: settings?.social_pinterest },
    { icon: TiktokIcon, url: settings?.social_tiktok },
  ].filter(link => link.url);

  return (
    <>
      <AnimatePresence>
        {headerSettings.showTopBar && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-visible"
            style={{ backgroundColor: 'var(--storify-primary)', color: '#ffffff' }}
          >
            <div className="max-w-7xl mx-auto px-6 py-2 flex items-center justify-between text-[10px] font-bold tracking-wide">
              <div className="hidden md:flex items-center gap-4">
                {socialLinks.map((social, idx) => (
                  <a key={idx} href={social.url} target="_blank" rel="noreferrer" className="hover:opacity-70 transition-opacity">
                    <social.icon size={14} />
                  </a>
                ))}
              </div>
              <p className="flex-1 text-center">{headerSettings.topBarText}</p>
              <div className="hidden md:flex items-center justify-end min-w-[100px]">
                <LanguageSwitcher variant="header" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <header
        className={`${isSticky ? 'sticky top-0' : ''} z-40 transition-all duration-500 ${scrolled ? 'shadow-xl py-0' : 'py-2'} border-b`}
        style={{ background: 'var(--storify-bg)', color: 'var(--storify-text)', borderColor: 'var(--storify-border)' }}
      >
        <div className={`max-w-7xl mx-auto px-6 ${heightClass} flex items-center justify-between gap-4`}>
          <div className="flex items-center gap-8 flex-1">
            <button
              type="button"
              className="md:hidden p-2.5 -ms-2 hover:opacity-70 rounded-full transition-all active:scale-95"
              onClick={() => setIsMobileMenuOpen(true)}
              style={{ color: 'var(--storify-headings)' }}
            >
              <Menu size={24} />
            </button>

            <div className="flex-shrink-0">
              {showLogo && (
                <button
                  type="button"
                  onClick={() => navigateStorefront('/')}
                  className="flex items-center group transition-transform hover:scale-105"
                >
                  {displayLogo ? (
                    <img src={displayLogo} alt={displayName} className="h-10 w-auto object-contain" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="text-2xl font-black tracking-tighter uppercase" style={{ color: 'var(--storify-headings)' }}>{displayName}</span>
                  )}
                </button>
              )}
            </div>
          </div>

          <nav className="hidden md:flex items-center justify-center gap-x-8 font-bold text-[11px] uppercase tracking-[0.2em] flex-initial">
            {navLinks.map((item) => {
              const active = pathname === (item.href.startsWith('/') ? item.href : `/${item.href}`);
              return (
                <button
                  key={`${item.name}-${item.href}`}
                  type="button"
                  onClick={() => navigateStorefront(normalizeLinkPath(item.href, '/'))}
                  className={`relative group py-2 transition-all duration-300 ${active ? '' : 'opacity-60 hover:opacity-100'}`}
                  style={{ color: active ? 'var(--storify-primary)' : 'var(--storify-text)' }}
                >
                  {item.name}
                  <span className={`absolute -bottom-1 end-0 h-[2px] transition-all duration-500 ${active ? 'w-full' : 'w-0 group-hover:w-full'}`} style={{ background: 'var(--storify-primary)' }}></span>
                </button>
              );
            })}
          </nav>

          <div className="flex items-center justify-end gap-4 flex-1">
            <div className="flex items-center gap-1.5 md:gap-3">
              <button onClick={() => setIsSearchOpen(true)} className="p-2.5 hover:opacity-70 rounded-full transition-all hover:scale-110 active:scale-90" style={{ color: 'var(--storify-text)' }}>
                <Search size={20} />
              </button>

              {showWishlist && (
                <button type="button" onClick={() => navigateStorefront('/wishlist')} className="relative p-2.5 hover:opacity-70 rounded-full transition-all hover:scale-110 active:scale-90 group" style={{ color: 'var(--storify-text)' }}>
                  <Heart size={20} className={wishlist?.length ? 'fill-red-500 text-red-500' : ''} />
                  {(wishlist?.length ?? 0) > 0 && (
                    <span className="absolute top-1.5 end-1.5 w-4 h-4 text-white text-[9px] flex items-center justify-center rounded-full font-bold shadow-sm ring-2 ring-white" style={{ background: 'var(--storify-primary)' }}>
                      {wishlist!.length > 9 ? '9+' : wishlist!.length}
                    </span>
                  )}
                </button>
              )}

              {showCart && (
                <button type="button" className="relative p-2.5 hover:opacity-70 rounded-full transition-all hover:scale-110 active:scale-90 group" onClick={() => onOpenCart?.()} style={{ color: 'var(--storify-text)' }}>
                  <ShoppingBag size={20} />
                  {cartCount > 0 && (
                    <span className="absolute top-1.5 end-1.5 w-4 h-4 text-white text-[9px] flex items-center justify-center rounded-full font-bold shadow-sm ring-2 ring-white" style={{ background: 'var(--storify-primary)' }}>
                      {cartCount > 9 ? '9+' : cartCount}
                    </span>
                  )}
                </button>
              )}

              {!headerSettings.showTopBar && (
                <div className="hidden md:flex items-center ps-2 border-s border-current/10">
                  <LanguageSwitcher variant="footer" />
                </div>
              )}
            </div>
          </div>
        </div>

        <AnimatePresence>
          {isSearchOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute inset-x-0 top-full border-b shadow-2xl p-4 md:p-8 z-50"
              style={{ background: 'var(--storify-bg)', borderColor: 'var(--storify-border)' }}
            >
              <form onSubmit={handleSearch} className="max-w-3xl mx-auto flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute end-4 top-1/2 -translate-y-1/2 opacity-40" size={20} style={{ color: 'var(--storify-text)' }} />
                  <input 
                    autoFocus
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('shop_search_placeholder')} 
                    className="w-full border-none rounded-2xl py-4 pe-12 ps-4 transition-all"
                    style={{ background: 'var(--storify-bg)', color: 'var(--storify-text)', boxShadow: 'inset 0 0 0 1px var(--storify-border)' }}
                  />
                </div>
                <button type="button" onClick={() => setIsSearchOpen(false)} className="p-3 hover:opacity-70 rounded-2xl transition-colors" style={{ color: 'var(--storify-text)' }}>
                  <X size={24} />
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-[150] flex" dir={isRtl ? 'rtl' : 'ltr'}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsMobileMenuOpen(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div
              initial={{ x: isRtl ? '100%' : '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: isRtl ? '100%' : '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className={`relative w-full max-w-xs bg-white h-full shadow-2xl flex flex-col ${isRtl ? 'ms-auto' : 'me-auto'}`}
            >
              <div className="p-6 flex items-center justify-between border-b border-slate-100">
                <span className="font-bold text-slate-900 uppercase tracking-widest text-xs opacity-40">{t('header_menu')}</span>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20} /></button>
              </div>
              <div className="flex-1 overflow-y-auto py-6 px-6">
                <nav className="space-y-1">
                  {navLinks.map((item) => (
                    <button
                      key={item.href}
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        navigateStorefront(normalizeLinkPath(item.href, '/'));
                      }}
                      className={`w-full flex items-center justify-between py-4 text-lg font-medium transition-colors ${isRtl ? 'text-right' : 'text-left'} hover:text-brand-accent`}
                    >
                      {item.name}
                      <ChevronLeft size={18} className={`opacity-20 ${isRtl ? '' : 'rotate-180'}`} />
                    </button>
                  ))}
                </nav>
                <div className="mt-8 pt-8 border-t border-slate-100">
                  <p className={`text-[10px] text-slate-400 mb-4 tracking-[0.2em] uppercase font-black ${isRtl ? 'text-right' : 'text-left'}`}>{t('language_store_label')}</p>
                  <LanguageSwitcher variant="header" />
                </div>
              </div>
              <div className="p-8 bg-slate-50 border-t border-slate-100">
                <div className="flex items-center gap-4 mb-8">
                  {socialLinks.map((social, idx) => (
                    <a key={idx} href={social.url} target="_blank" rel="noreferrer" className="w-10 h-10 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-600 hover:text-brand-accent hover:border-brand-accent transition-all shadow-sm">
                      <social.icon size={18} />
                    </a>
                  ))}
                </div>
                <p className={`text-xs text-slate-400 mb-4 tracking-wide uppercase font-bold ${isRtl ? 'text-right' : 'text-left'}`}>{t('contact_title')}</p>
                <div className={`space-y-2 ${isRtl ? 'text-right' : 'text-left'}`}>
                  {store?.email && <p className="text-sm font-bold text-slate-600">{store.email}</p>}
                  {store?.phone && <p className="text-sm font-bold text-slate-600" dir="ltr">{store.phone}</p>}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default HeaderSection;
