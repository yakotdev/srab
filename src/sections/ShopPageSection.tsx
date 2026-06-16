import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Filter,
  X,
  ChevronDown,
  ChevronRight,
  Search,
  ArrowRight,
  ArrowLeft,
  Plus,
} from 'lucide-react';
import type { Product } from '../constants';
import { PRODUCTS, CATEGORIES as MOCK_CATEGORIES } from '../constants';
import ProductCard from '../components/ProductCard';
import { useThemeConfig } from '../ThemeContext';
import { useCategories, useResolvedLanguage, useResolvedStoreId, useSectionProducts, formatPrice } from '@storify/theme';
import { toStorefrontUrl } from '@storify/theme';
import { isStorifyThemeEmbedded } from '@storify/theme';
import { notifyNewsletterSubscribe } from '@storify/theme';
import { applyCategoryScope, parseCategoryScope } from '@storify/theme';
import { interpolateTheme } from '../locales';

type SortKey = 'featured' | 'newest' | 'price_asc' | 'price_desc';

function productMatchesCategory(
  p: Product,
  categoryId: string | null,
  categories: { id: string; name: string }[],
): boolean {
  if (categoryId == null || categoryId === '') return true;
  const idStr = String(categoryId);

  if (p.categoryId != null && String(p.categoryId) === idStr) return true;
  const pivotIds = (p as Product & { categoryIds?: string[] }).categoryIds;
  if (Array.isArray(pivotIds) && pivotIds.some((x) => String(x) === idStr)) return true;

  const cat = categories.find((c) => String(c.id) === idStr);
  if (!cat) return false;

  if (p.categoryId != null && String(p.categoryId) === String(cat.id)) return true;
  if (p.category && cat.name && String(p.category) === String(cat.name)) return true;
  const subs = p.categories;
  if (Array.isArray(subs)) {
    for (const x of subs) {
      if (typeof x === 'string') {
        if (x === cat.id || x === cat.name) return true;
      } else if (x?.id && String(x.id) === String(cat.id)) return true;
    }
  }
  return false;
}

function sortProducts(list: Product[], sort: SortKey): Product[] {
  const copy = [...list];
  switch (sort) {
    case 'newest':
      return copy.sort((a, b) => String(b.id).localeCompare(String(a.id), undefined, { numeric: true }));
    case 'price_asc':
      return copy.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
    case 'price_desc':
      return copy.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
    case 'featured':
    default:
      return copy;
  }
}

const ShopPageSection: React.FC<{ section: { content?: Record<string, unknown> } }> = ({ section }) => {
  const {
    store,
    categories: configCategories,
    onAddToCart,
    onQuickView,
    onToggleWishlist,
    wishlist,
    settings,
    isRtl,
    t,
  } = useThemeConfig();
  const resolvedStoreId = useResolvedStoreId();
  const resolvedLanguage = useResolvedLanguage();
  const content = section?.content || {};

  const kicker = (content.kicker as string) || t('shop_kicker_default');
  const title = (content.title as string) || t('shop_title_default');
  const subtitle = (content.subtitle as string) || t('shop_subtitle_default');
  const itemsPerRow = Number(content.items_per_row) || 4;
  const showNewsletter =
    content.show_newsletter === true || String(content.show_newsletter).toLowerCase() === 'true';
  const newsletterTitle = (content.newsletter_title as string) || t('shop_newsletter_title');
  const newsletterSubtitle = (content.newsletter_subtitle as string) || t('shop_newsletter_subtitle');
  
  const showCategoryNav = content.show_category_nav !== 'false';
  const categoryNavMobileLayout = (content.category_nav_mobile_layout as string) || 'scroll';
  const navScope = parseCategoryScope(content.category_nav_scope);



  const currencyLabel = useMemo(() => {
    const code = (store?.currency || 'SAR').trim();
    const locale = resolvedLanguage;
    try {
      const parts = new Intl.NumberFormat(locale, { style: 'currency', currency: code, currencyDisplay: 'narrowSymbol' }).formatToParts(1);
      const sym = parts.find(p => p.type === 'currency')?.value;
      return sym || code;
    } catch {
      return code;
    }
  }, [store?.currency, resolvedLanguage]);

  const fromCatalog = useSectionProducts({ limit: 200, preferHostPayload: true });
  const apiCategories = useCategories(undefined, 100);

  const baseProducts: Product[] = useMemo(() => {
    if (fromCatalog.length > 0) return fromCatalog;
    if (!resolvedStoreId) return PRODUCTS;
    return fromCatalog;
  }, [fromCatalog, resolvedStoreId]);

  const categories = useMemo((): { id: string; name: string }[] => {
    if (Array.isArray(configCategories) && configCategories.length > 0) {
      return configCategories.map((c: { id?: string; name?: string }) => ({
        id: String(c.id ?? ''),
        name: String(c.name ?? ''),
      })).filter((c) => c.id && c.name);
    }
    if (apiCategories.length > 0) {
      return apiCategories.map((c) => ({ id: String(c.id), name: String(c.name ?? '') })).filter((c) => c.name);
    }
    return MOCK_CATEGORIES.map((c) => ({ id: String(c.id), name: c.name }));
  }, [configCategories, apiCategories]);

  const navCategories = useMemo(() => {
    return applyCategoryScope(categories, navScope);
  }, [categories, navScope]);

  const sortLabels = useMemo(
    (): Record<SortKey, string> => ({
      featured: t('sort_featured'),
      newest: t('sort_newest'),
      price_asc: t('sort_price_asc'),
      price_desc: t('sort_price_desc'),
    }),
    [t],
  );

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('featured');
  const [priceMaxCap, setPriceMaxCap] = useState(5000);
  const [priceRange, setPriceRange] = useState(5000);
  const [visibleCount, setVisibleCount] = useState(8);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState<'idle' | 'sent' | 'error'>('idle');

  useEffect(() => {
    const maxP = Math.max(500, ...baseProducts.map((p) => Number(p.price) || 0));
    const cap = Math.ceil(maxP / 50) * 50;
    setPriceMaxCap(cap);
    setPriceRange((r) => (r > cap ? cap : r));
  }, [baseProducts]);

  useEffect(() => {
    setVisibleCount(8);
  }, [activeCategoryId, sortKey, priceRange, searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const u = new URL(window.location.href);
        if (searchQuery) u.searchParams.set('q', searchQuery);
        else u.searchParams.delete('q');
        window.history.replaceState({}, '', u.pathname + u.search + u.hash);
      } catch {
        /* noop */
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const syncFromUrl = useCallback(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      
      // Sync Category
      const catQ = params.get('category');
      if (!catQ) {
        setActiveCategoryId(null);
      } else {
        const decoded = decodeURIComponent(catQ.trim());
        const byId = categories.find((c) => String(c.id) === decoded);
        if (byId) setActiveCategoryId(String(byId.id));
        else {
          const byName = categories.find((c) => c.name === decoded);
          if (byName) setActiveCategoryId(String(byName.id));
          else setActiveCategoryId(decoded);
        }
      }

      // Sync Search Query
      const searchQ = params.get('q') || params.get('search') || '';
      setSearchQuery(searchQ);
    } catch {
      /* noop */
    }
  }, [categories]);

  useEffect(() => {
    syncFromUrl();
    window.addEventListener('popstate', syncFromUrl);
    return () => window.removeEventListener('popstate', syncFromUrl);
  }, [syncFromUrl]);

  const setCategoryAndUrl = (id: string | null) => {
    setActiveCategoryId(id);
    try {
      const u = new URL(window.location.href);
      if (id) u.searchParams.set('category', id);
      else u.searchParams.delete('category');
      window.history.replaceState({}, '', u.pathname + u.search + u.hash);
    } catch {
      /* noop */
    }
  };

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = baseProducts.filter((p) => {
      if (q && !(String(p.name || '').toLowerCase().includes(q))) return false;
      return productMatchesCategory(p, activeCategoryId, categories) && (Number(p.price) || 0) <= priceRange;
    });
    list = sortProducts(list, sortKey);
    return list;
  }, [baseProducts, activeCategoryId, categories, priceRange, sortKey, searchQuery]);

  const showAdvancedToolbar =
    content.show_advanced_toolbar === true || 
    String(content.show_advanced_toolbar).toLowerCase() === 'true' ||
    !!searchQuery;

  const displayedProducts = showAdvancedToolbar
    ? filteredProducts.slice(0, visibleCount)
    : filteredProducts;

  /** Mobile: 2 cols | tablet: 3 | desktop: per items_per_row */
  const gridColsLg =
    {
      2: 'lg:grid-cols-2',
      3: 'lg:grid-cols-3',
      4: 'lg:grid-cols-4',
    }[itemsPerRow] || 'lg:grid-cols-4';

  const embedded = isStorifyThemeEmbedded();

  const onNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newsletterEmail.trim();
    if (!trimmed) return;
    if (embedded) {
      notifyNewsletterSubscribe(trimmed);
      setNewsletterStatus('sent');
      setNewsletterEmail('');
      return;
    }
    setNewsletterStatus('error');
  };

  const resetFilters = () => {
    setSearchQuery('');
    setActiveCategoryId(null);
    setSortKey('featured');
    setPriceRange(priceMaxCap);
    try {
      const u = new URL(window.location.href);
      u.searchParams.delete('category');
      u.searchParams.delete('q');
      u.searchParams.delete('search');
      window.history.replaceState({}, '', u.pathname + u.search + u.hash);
    } catch {
      /* noop */
    }
  };

  const primaryRgb = settings?.primaryColor || '#0f172a';
  const accentRgb = settings?.accentColor || '#f27d26';

  return (
    <div className="pt-8 pb-24" style={{ background: 'var(--storify-bg)', color: 'var(--storify-text)' }}>
      {/* Matches themes/tempcode Shop: title, description, search, category filter pills */}
      <section className="max-w-7xl mx-auto px-6 py-12">
        <div className="text-center mb-16">
          {searchQuery ? (
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest opacity-60" style={{ background: 'var(--storify-bg)', boxShadow: 'inset 0 0 0 1px var(--storify-border)' }}>
                <Search size={12} /> {t('shop_search_results')}
              </div>
              <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase leading-none" style={{ color: 'var(--storify-headings)' }}>
                "{searchQuery}"
              </h1>
              <p className="max-w-2xl mx-auto text-lg opacity-60">
                {interpolateTheme(t('shop_search_found'), { count: filteredProducts.length })}
              </p>
              <button
                onClick={resetFilters}
                className="inline-flex items-center gap-2 text-sm font-bold border-b-2 pb-1 hover:opacity-70 transition-opacity"
                style={{ color: 'var(--storify-headings)', borderColor: 'var(--storify-headings)' }}
              >
                <X size={16} /> {t('shop_show_all_products')}
              </button>
            </div>
          ) : (
            <>
              <h1 className="text-4xl md:text-6xl font-black mb-6 tracking-tighter uppercase leading-none" style={{ color: 'var(--storify-headings)' }}>{title}</h1>
              <p className="max-w-2xl mx-auto text-lg opacity-60">{subtitle}</p>
            </>
          )}
          <div className="max-w-md mx-auto relative mt-12">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('shop_search_placeholder')}
              className="w-full py-3 px-6 pe-12 rounded-full border shadow-sm focus:outline-none transition"
              style={{ background: 'var(--storify-bg)', color: 'var(--storify-text)', borderColor: 'var(--storify-border)' }}
            />
            <div className="absolute end-4 top-3.5 opacity-40 pointer-events-none">
              <Search size={20} strokeWidth={2} />
            </div>
          </div>
        </div>

        {showCategoryNav && (
          <div className="mb-12">
            <div className={`
              ${categoryNavMobileLayout === 'scroll' 
                ? 'flex overflow-x-auto pb-4 no-scrollbar -mx-6 px-6 sm:overflow-visible sm:pb-0 sm:mx-0 sm:px-0 sm:flex-wrap sm:justify-center' 
                : 'flex flex-wrap justify-center'
              } gap-3 sm:gap-4
            `}>
              <button
                type="button"
                onClick={() => setCategoryAndUrl(null)}
                className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all shrink-0 ${
                  activeCategoryId == null
                    ? 'shadow-lg scale-105'
                    : 'opacity-60 hover:opacity-100 hover:scale-105'
                }`}
                style={{ 
                  background: activeCategoryId == null ? 'var(--storify-primary)' : 'var(--storify-bg)',
                  color: activeCategoryId == null ? '#fff' : 'var(--storify-text)',
                  boxShadow: activeCategoryId == null ? 'none' : 'inset 0 0 0 1px var(--storify-border)'
                }}
              >
                {t('shop_all')}
              </button>
              
              {navCategories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategoryAndUrl(c.id)}
                  className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all shrink-0 ${
                    activeCategoryId === c.id
                      ? 'shadow-lg scale-105'
                      : 'opacity-60 hover:opacity-100 hover:scale-105'
                  }`}
                  style={{ 
                    background: activeCategoryId === c.id ? 'var(--storify-primary)' : 'var(--storify-bg)',
                    color: activeCategoryId === c.id ? '#fff' : 'var(--storify-text)',
                    boxShadow: activeCategoryId === c.id ? 'none' : 'inset 0 0 0 1px var(--storify-border)'
                  }}
                >
                  {c.name}
                </button>
              ))}

            </div>
          </div>
        )}


        {showAdvancedToolbar ? (
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-10 text-sm opacity-60">
            <p>{interpolateTheme(t('shop_products_count'), { count: filteredProducts.length })}</p>
            <div className="flex items-center gap-4 flex-wrap justify-center">
              <button
                type="button"
                onClick={() => setIsFilterOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border font-bold text-xs uppercase tracking-wide hover:opacity-70"
                style={{ borderColor: 'var(--storify-border)', color: 'var(--storify-text)' }}
              >
                <Filter size={16} /> {t('shop_advanced_filters')}
              </button>
              <div className="relative group">
                <div className="flex items-center gap-2 cursor-pointer py-1">
                  <span className="text-xs font-bold">
                    {t('shop_sort_prefix')} {sortLabels[sortKey]}
                  </span>
                  <ChevronDown size={14} className="shrink-0" />
                </div>
                <div className="absolute top-full end-0 mt-2 w-56 shadow-xl rounded-xl p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 border" style={{ background: 'var(--storify-bg)', borderColor: 'var(--storify-border)' }}>
                  {(Object.keys(sortLabels) as SortKey[]).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setSortKey(k)}
                      className={`w-full text-start py-2 px-3 rounded-lg text-xs font-bold transition-colors ${
                        sortKey === k ? 'opacity-100' : 'opacity-60 hover:opacity-100'
                      }`}
                      style={{ background: sortKey === k ? 'var(--storify-primary)' : 'transparent', color: sortKey === k ? '#fff' : 'var(--storify-text)' }}
                    >
                      {sortLabels[k]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      {/* Grid */}
      <section className="max-w-7xl mx-auto px-6 min-h-[400px]">
        {displayedProducts.length > 0 ? (
          <div className={`grid grid-cols-2 sm:grid-cols-2 ${gridColsLg} gap-4 sm:gap-10`}>

            {showAdvancedToolbar ? (
              <AnimatePresence mode="popLayout">
                {displayedProducts.map((product) => (
                  <motion.div
                    key={product.id}
                    layout
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.35 }}
                  >
                    <ProductCard
                      product={product}
                      onQuickView={onQuickView || (() => {})}
                      onAddToCart={onAddToCart || (() => {})}
                      onToggleWishlist={onToggleWishlist || (() => {})}
                      isWishlisted={wishlist?.some((p) => p.id === product.id) || false}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            ) : (
              displayedProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onQuickView={onQuickView || (() => {})}
                  onAddToCart={onAddToCart || (() => {})}
                  onToggleWishlist={onToggleWishlist || (() => {})}
                  isWishlisted={wishlist?.some((p) => p.id === product.id) || false}
                />
              ))
            )}
          </div>
        ) : (
          <div className="text-center py-20 text-slate-400">
            <p>{showAdvancedToolbar ? t('shop_no_products_filtered') : t('shop_no_products')}</p>
            {showAdvancedToolbar ? (
              <button
                type="button"
                onClick={resetFilters}
                className="mt-4 text-sm font-bold text-slate-700 underline underline-offset-4"
              >
                {t('shop_reset_filters')}
              </button>
            ) : null}
          </div>
        )}

        {showAdvancedToolbar && visibleCount < filteredProducts.length && (
          <div className="mt-24 flex justify-center">
            <button
              type="button"
              onClick={() => setVisibleCount((n) => n + 8)}
              className="group flex flex-col items-center gap-4"
            >
              <div className="w-16 h-16 rounded-full border border-neutral-200 flex items-center justify-center text-brand-primary transition-all duration-500 group-hover:bg-brand-primary group-hover:border-brand-primary group-hover:text-white">
                <Plus size={24} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-[0.3em]">{t('shop_load_more')}</span>
            </button>
          </div>
        )}
      </section>

      {/* Newsletter */}
      {showNewsletter && (
        <section className="max-w-7xl mx-auto px-6 mt-32">
          <div
            className="rounded-[3rem] p-12 md:p-24 relative overflow-hidden text-white"
            style={{ backgroundColor: primaryRgb }}
          >
            <div className={`absolute top-0 end-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 ${isRtl ? 'translate-x-1/2' : 'translate-x-1/2'} blur-3xl pointer-events-none`} />
            <div
              className={`absolute bottom-0 start-0 w-64 h-64 rounded-full translate-y-1/2 ${isRtl ? '-translate-x-1/2' : '-translate-x-1/2'} blur-3xl pointer-events-none opacity-40`}
              style={{ backgroundColor: accentRgb }}
            />

            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
              <div className="space-y-6 max-w-xl text-center md:text-start">
                <p className="text-xs font-bold uppercase tracking-[0.3em] opacity-90" style={{ color: accentRgb }}>
                  {t('shop_newsletter_heading')}
                </p>
                <h2 className="text-4xl md:text-6xl font-extrabold tracking-tighter uppercase leading-none">
                  {newsletterTitle}
                </h2>
                <p className="text-white/70 text-lg">{newsletterSubtitle}</p>
              </div>
              <div className="w-full max-w-md">
                <form className="relative group" onSubmit={onNewsletterSubmit}>
                  <input
                    type="email"
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    placeholder={t('shop_newsletter_email_placeholder')}
                    className="w-full bg-white/10 border border-white/20 rounded-full py-5 px-8 md:py-6 md:px-10 text-white placeholder:text-white/40 focus:outline-none focus:bg-white/15 focus:border-white/40 transition-all"
                  />
                  <button
                    type="submit"
                    className="absolute start-2 top-2 bottom-2 bg-white text-brand-primary px-6 md:px-8 rounded-full font-bold uppercase text-[10px] tracking-widest transition-all flex items-center gap-2 hover:opacity-95"
                    style={{ color: primaryRgb }}
                  >
                    {t('shop_newsletter_subscribe')} {isRtl ? <ArrowLeft size={14} /> : <ArrowRight size={14} />}
                  </button>
                </form>
                {newsletterStatus === 'sent' ? (
                  <p className="text-[11px] text-white/90 mt-4 text-center md:text-right">{t('shop_newsletter_subscribed')}</p>
                ) : null}
                <p className="text-[10px] text-white/40 mt-6 text-center md:text-right font-bold uppercase tracking-widest">
                  {t('shop_newsletter_privacy')}
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Filter drawer */}
      <AnimatePresence>
        {isFilterOpen && (
          <div className={`fixed inset-0 z-[110] flex ${isRtl ? 'justify-end' : 'justify-start'}`}>
            <motion.button
              type="button"
              aria-label={t('shop_close_filters')}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFilterOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm border-0 cursor-pointer p-0"
            />
            <motion.div
              initial={{ x: isRtl ? '100%' : '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: isRtl ? '100%' : '-100%' }}
              transition={{ type: 'spring', damping: 32, stiffness: 320 }}
              className="relative w-full max-w-md bg-white h-full p-8 md:p-10 shadow-2xl overflow-y-auto text-brand-primary"
            >
              <div className="flex justify-between items-center mb-10">
                <h2 className="text-2xl font-extrabold tracking-tighter uppercase">{t('shop_filters_title')}</h2>
                <button
                  type="button"
                  onClick={() => setIsFilterOpen(false)}
                  className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-10">
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-widest">{t('shop_categories_heading')}</h4>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setCategoryAndUrl(null)}
                      className={`px-5 py-2 border rounded-full text-xs font-bold transition-all ${
                        activeCategoryId == null
                          ? 'bg-brand-primary text-white border-transparent'
                          : 'border-neutral-200 hover:bg-neutral-50'
                      }`}
                      style={activeCategoryId == null ? { backgroundColor: primaryRgb } : undefined}
                    >
                      {t('shop_all')}
                    </button>
                    {navCategories.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setCategoryAndUrl(c.id)}
                        className={`px-5 py-2 border rounded-full text-xs font-bold transition-all ${
                          activeCategoryId === c.id
                            ? 'text-white border-transparent'
                            : 'border-neutral-200 hover:bg-neutral-50'
                        }`}
                        style={
                          activeCategoryId === c.id
                            ? { backgroundColor: primaryRgb, borderColor: primaryRgb }
                            : undefined
                        }
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-widest">
                    {interpolateTheme(t('shop_price_range'), {
                      amount: Math.min(priceRange, priceMaxCap),
                      currency: currencyLabel,
                    })}
                  </h4>
                  <input
                    type="range"
                    min={0}
                    max={priceMaxCap}
                    step={priceMaxCap > 2000 ? 100 : 50}
                    value={Math.min(priceRange, priceMaxCap)}
                    onChange={(e) => setPriceRange(parseInt(e.target.value, 10))}
                    className="w-full accent-brand-primary h-1.5 bg-neutral-100 rounded-lg appearance-none cursor-pointer"
                    style={{ accentColor: accentRgb }}
                  />
                  <div className="flex justify-between text-[11px] font-bold text-neutral-500">
                    <span>0</span>
                    <span>
                      {interpolateTheme(t('shop_price_max'), { amount: priceMaxCap, currency: currencyLabel })}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-widest">{t('shop_sort_heading')}</h4>
                  {(Object.keys(sortLabels) as SortKey[]).map((k) => (
                    <label
                      key={k}
                      className="flex items-center gap-3 cursor-pointer group"
                      onClick={() => setSortKey(k)}
                    >
                      <div
                        className={`w-4 h-4 border-2 rounded-full shrink-0 transition-colors ${
                          sortKey === k ? 'border-brand-accent bg-brand-accent' : 'border-neutral-200 group-hover:border-brand-accent'
                        }`}
                        style={
                          sortKey === k
                            ? { borderColor: accentRgb, backgroundColor: accentRgb }
                            : undefined
                        }
                      />
                      <span
                        className={`text-sm transition-colors ${
                          sortKey === k ? 'text-brand-primary font-bold' : 'text-neutral-600 group-hover:text-brand-primary'
                        }`}
                      >
                        {sortLabels[k]}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="mt-10 pt-8 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setIsFilterOpen(false)}
                  className="w-full text-white py-4 rounded-full font-bold uppercase text-xs tracking-widest transition-all hover:opacity-95"
                  style={{ backgroundColor: primaryRgb }}
                >
                  {t('shop_apply_filters')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ShopPageSection;
