import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ShoppingBag, Heart, Users } from '../ui/Icons';
import { usePreserveSearch, pathWithSearch } from '../../lib/usePreserveSearch';
import { normalizeMenuNavUrl } from '../../lib/internalNavUrl';
import { localizePath, stripLocaleFromPath } from '../../lib/locale-routing';

interface StoreHeaderProps {
    onCartClick: () => void;
}

const DEFAULT_HEADER_SETTINGS = {
  sticky: true,
  backgroundColor: '',
  showWishlist: true,
  showCart: true,
  height: 'normal' as const,
  showLogo: true,
  navAlign: 'left' as const,
};

export const StoreHeader: React.FC<StoreHeaderProps> = ({ onCartClick }) => {
    const { theme, cart, wishlist, currentUser, t, language, setLanguage, currency, storeConfig, headerMenu, enabledLanguages } = useStore();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const to = usePreserveSearch();
    const [searchParams] = useSearchParams();
    const searchString = searchParams.toString();

    const headerSettings = { ...DEFAULT_HEADER_SETTINGS, ...(theme.headerSettings || {}) };
    const isSticky = headerSettings.sticky !== false;
    const bgColor = headerSettings.backgroundColor || undefined;
    const showWishlist = headerSettings.showWishlist !== false;
    const showCart = headerSettings.showCart !== false;
    const heightClass = headerSettings.height === 'compact' ? 'h-16' : headerSettings.height === 'large' ? 'h-24' : 'h-20';
    const showLogo = headerSettings.showLogo !== false;
    const navLinksJustify = headerSettings.navAlign === 'center' ? 'justify-center' : headerSettings.navAlign === 'right' ? 'justify-end' : 'justify-start';

    const textPrimaryStyle = { color: theme.primaryColor };
    const navLinkClass = (path: string) =>
        `hover:text-black transition ${stripLocaleFromPath(location.pathname) === path ? 'text-black font-bold' : ''}`;

    const handleUserIconClick = () => {
        navigate(to('/profile'));
    };

    const handleLanguageChange = (nextLanguage: string) => {
        setLanguage(nextLanguage);
        navigate(pathWithSearch(localizePath(location.pathname, nextLanguage), searchString));
    };

    const navItems = headerMenu?.items?.length ? headerMenu.items.filter((i) => i.label?.trim()) : null;

    const renderNavLink = (item: { label: string; url: string; openInNewTab?: boolean }, closeMobile?: () => void) => {
        const normalized = normalizeMenuNavUrl(item.url);
        const pathForClass = normalized.mode === 'internal' ? normalized.path : item.url;
        const className = navLinkClass(normalized.mode === 'external' ? location.pathname : pathForClass);
        if (normalized.mode === 'external') {
            return (
                <a href={normalized.href} target={item.openInNewTab ? '_blank' : undefined} rel={item.openInNewTab ? 'noopener noreferrer' : undefined} className={className} onClick={closeMobile}>
                    {item.label}
                </a>
            );
        }
        return (
            <Link to={to(normalized.path)} className={className} onClick={() => closeMobile?.()}>
                {item.label}
            </Link>
        );
    };

    return (
        <>
            {/* Top Bar */}
            {/* <div className="bg-slate-900 text-white text-xs py-2 px-6">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <p className="hidden md:block opacity-70">Free Shipping on all orders over $200</p>
                    <div className="flex gap-4 items-center w-full md:w-auto justify-between md:justify-end">
                        <div className="flex gap-2">
                            <button onClick={() => setLanguage('en')} className={`hover:text-white transition ${language === 'en' ? 'text-white font-bold' : 'text-slate-400'}`}>ENG</button>
                            <span className="text-slate-600">|</span>
                            <button onClick={() => setLanguage('ar')} className={`hover:text-white transition ${language === 'ar' ? 'text-white font-bold' : 'text-slate-400'}`}>عربي</button>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setCurrency('USD')} className={`hover:text-white transition ${currency === 'USD' ? 'text-white font-bold' : 'text-slate-400'}`}>$ USD</button>
                            <button onClick={() => setCurrency('SAR')} className={`hover:text-white transition ${currency === 'SAR' ? 'text-white font-bold' : 'text-slate-400'}`}>SAR</button>
                            <button onClick={() => setCurrency('EGP')} className={`hover:text-white transition ${currency === 'EGP' ? 'text-white font-bold' : 'text-slate-400'}`}>EGP</button>
                        </div>
                    </div>
                </div>
            </div> */}

            {/* Navbar */}
            <nav
                className={`${isSticky ? 'sticky top-0' : ''} z-40 border-b border-slate-100 shadow-sm ${!bgColor ? 'bg-white/90 backdrop-blur-md' : ''}`}
                style={bgColor ? { backgroundColor: bgColor } : undefined}
            >
                <div className={`max-w-7xl mx-auto px-6 ${heightClass} flex items-center justify-between`}>
                    {/* Mobile Menu Button */}
                    <button
                        type="button"
                        className="md:hidden text-slate-800"
                        onClick={() => setIsMobileMenuOpen(true)}
                        aria-label={t('menu_label') || 'Open menu'}
                        aria-expanded={isMobileMenuOpen}
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                    </button>

                    {showLogo && (
                    <div className="flex items-center cursor-pointer" onClick={() => navigate(to('/'))}>
                        {storeConfig.logo && String(storeConfig.logo).trim() !== '' ? (
                            <img
                                src={storeConfig.logo.trim()}
                                alt={storeConfig.name || 'Store'}
                                width={160}
                                height={40}
                                className="h-10 w-auto max-w-[160px] object-contain"
                                decoding="async"
                            />
                        ) : (
                            <span className="text-3xl font-black tracking-tighter" style={textPrimaryStyle}>
                                {storeConfig.name || 'STORE.'}
                            </span>
                        )}
                    </div>
                    )}

                    <div className={`hidden md:flex flex-1 ${navLinksJustify} space-x-10 rtl:space-x-reverse font-bold text-sm uppercase tracking-wide text-slate-500`}>
                        {navItems ? navItems.map((item) => (
                            <React.Fragment key={item.id}>{renderNavLink(item)}</React.Fragment>
                        )) : (
                            <>
                                <Link to={to('/')} className={navLinkClass('/')}>{t('home')}</Link>
                                <Link to={to('/shop')} className={navLinkClass('/shop')}>{t('shop')}</Link>
                                <Link to={to('/contact')} className={navLinkClass('/contact')}>{t('contact')}</Link>
                            </>
                        )}
                    </div>

                    <div className="flex items-center gap-6">
                        {enabledLanguages.length > 1 && (
                            <select
                                value={language}
                                onChange={(event) => handleLanguageChange(event.target.value)}
                                className="hidden sm:block rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold uppercase text-slate-600"
                                aria-label={t('language') || 'Language'}
                            >
                                {enabledLanguages.filter((item) => item.isActive !== false).map((item) => (
                                    <option key={item.code} value={item.code}>
                                        {item.nativeName || item.name || item.code.toUpperCase()}
                                    </option>
                                ))}
                            </select>
                        )}
                        {showWishlist && (
                        <Link to={to('/wishlist')} className="relative group cursor-pointer" aria-label={t('wishlist_label') || 'Wishlist'}>
                            <Heart className="w-7 h-7 text-slate-800 transition transform group-hover:scale-110" aria-hidden />
                            {wishlist.length > 0 && (
                                <span className="absolute -top-1 -right-1 w-5 h-5 bg-indigo-600 text-white text-[10px] flex items-center justify-center rounded-full font-bold shadow-sm ring-2 ring-white">
                                    {wishlist.length}
                                </span>
                            )}
                        </Link>
                        )}
                        {showCart && (
                        <button
                            type="button"
                            className="relative group cursor-pointer"
                            onClick={onCartClick}
                            aria-label={t('cart') || 'Shopping cart'}
                        >
                            <ShoppingBag className="w-7 h-7 text-slate-800 transition transform group-hover:scale-110" aria-hidden />
                            {cart.length > 0 && (
                                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white text-[10px] flex items-center justify-center rounded-full font-bold shadow-sm ring-2 ring-white">
                                    {cart.length}
                                </span>
                            )}
                        </button>
                        )}
                    </div>
                </div>
            </nav>

            {/* Mobile Menu Drawer */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 z-50 flex">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>
                    <div className={`relative w-64 bg-white h-full shadow-2xl p-6 flex flex-col ${language === 'ar' ? 'animate-slide-in-right' : 'animate-slide-in-left'}`}>
                        <div className="flex justify-between items-center mb-8">
                            {storeConfig.logo && String(storeConfig.logo).trim() !== '' ? (
                                <img
                                    src={storeConfig.logo.trim()}
                                    alt={storeConfig.name || t('store_label')}
                                    width={128}
                                    height={32}
                                    className="h-8 w-auto max-w-[128px] object-contain"
                                    decoding="async"
                                />
                            ) : (
                                <span className="text-2xl font-black" style={textPrimaryStyle}>{t('menu_label')}</span>
                            )}
                            <button type="button" onClick={() => setIsMobileMenuOpen(false)} className="text-slate-400 text-2xl" aria-label={t('close') || 'Close menu'}>✕</button>
                        </div>
                        <div className="flex flex-col space-y-4 font-bold text-lg text-slate-800">
                            {navItems ? navItems.map((item) => (
                                <React.Fragment key={item.id}>{renderNavLink(item, () => setIsMobileMenuOpen(false))}</React.Fragment>
                            )) : (
                                <>
                                    <Link to={to('/')} onClick={() => setIsMobileMenuOpen(false)}>{t('home')}</Link>
                                    <Link to={to('/shop')} onClick={() => setIsMobileMenuOpen(false)}>{t('shop')}</Link>
                                    <Link to={to('/wishlist')} onClick={() => setIsMobileMenuOpen(false)}>{t('wishlist_label')}</Link>
                                    <Link to={to('/track-order')} onClick={() => setIsMobileMenuOpen(false)}>{t('track_order')}</Link>
                                    <button onClick={() => { setIsMobileMenuOpen(false); handleUserIconClick(); }} className="text-left">{currentUser ? t('profile') : t('login')}</button>
                                    <Link to={to('/about')} onClick={() => setIsMobileMenuOpen(false)}>{t('about')}</Link>
                                    <Link to={to('/contact')} onClick={() => setIsMobileMenuOpen(false)}>{t('contact')}</Link>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
