import React, { useMemo, useRef, useState } from 'react';
import { ShoppingBag, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import type { Product } from '../constants';
import { PRODUCTS } from '../constants';
import { useThemeConfig } from '../ThemeContext';
import { navigateStorefront } from '@storify/theme';
import {
  formatProductPriceLabel,
  useCategories,
  useResolvedStoreId,
  useSectionProducts,
} from '@storify/theme';
import { filterProductsByCategoryScope, parseCategoryScope } from '@storify/theme';
import { interpolateTheme } from '../locales';

import ProductCard from '../components/ProductCard';

const FeaturedProductsSection: React.FC<{ section: any }> = ({ section }) => {
  const {
    categories: configCategories,
    store,
    onAddToCart,
    onQuickView,
    onToggleWishlist,
    wishlist,
    isRtl,
    t,
  } = useThemeConfig();
  const resolvedStoreId = useResolvedStoreId();
  const content = section?.content || {};
  const itemsPerRow = Number(content.items_per_row) || 4;
  const layoutStyle = content.layout_style || 'grid';
  const paddingTop = content.padding_top || '100px';
  const paddingBottom = content.padding_bottom || '100px';
  const scrollRef = useRef<HTMLDivElement>(null);

  const limit = Math.max(itemsPerRow * 4, 24);
  const fromCatalog = useSectionProducts({ limit, preferHostPayload: true });
  const apiCategories = useCategories(undefined, 100);
  const categoriesMaster =
    Array.isArray(configCategories) && configCategories.length > 0 ? configCategories : apiCategories;

  const baseProducts = useMemo((): Product[] => {
    if (fromCatalog.length > 0) return fromCatalog;
    if (!resolvedStoreId) return PRODUCTS;
    return fromCatalog;
  }, [fromCatalog, resolvedStoreId]);

  const products = useMemo(
    () =>
      filterProductsByCategoryScope(
        baseProducts,
        parseCategoryScope(content.category_scope),
        categoriesMaster,
      ),
    [baseProducts, content.category_scope, categoriesMaster],
  );

  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const showCategoryTabs = content.show_category_tabs === 'true';

  const availableCategories = useMemo(() => {
    if (!showCategoryTabs) return [];
    const cats = products.map((p) => p.category || t('category_uncategorized'));
    const unique = Array.from(new Set(cats));
    return unique.length > 1 ? unique : [];
  }, [products, showCategoryTabs, t]);

  const filteredProducts = useMemo(() => {
    if (!activeCategory || !showCategoryTabs) return products;
    return products.filter((p) => (p.category || t('category_uncategorized')) === activeCategory);
  }, [products, activeCategory, showCategoryTabs, t]);

  const gridCols = {
    2: 'lg:grid-cols-2',
    3: 'lg:grid-cols-3',
    4: 'lg:grid-cols-4'
  }[itemsPerRow] || 'lg:grid-cols-4';

  const productsToRender = filteredProducts.slice(0, Math.max(itemsPerRow * 2, 4));
  const isEmpty = productsToRender.length === 0;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  const scroll = (direction: 'next' | 'prev') => {
    const container = scrollRef.current;
    if (container) {
      const card = container.querySelector('div') as HTMLElement;
      if (!card) return;
      
      const cardWidth = card.offsetWidth;
      const gap = window.innerWidth >= 768 ? 32 : 16;
      const step = cardWidth + gap;
      
      const delta = direction === 'next' ? step : -step;
      container.scrollBy({ left: delta, behavior: 'smooth' });
    }
  };

  const renderProducts = () => {
    switch (layoutStyle) {
      case 'carousel':
        return (
          <div 
            ref={scrollRef}
            className="flex gap-4 md:gap-8 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-8"
            style={{ scrollbarWidth: 'none' }}
            dir={isRtl ? 'rtl' : 'ltr'}
          >
            {productsToRender.map((product) => (
              <div key={product.id} className="min-w-[calc(80%-16px)] md:min-w-[320px] snap-start">
                <ProductCard
                  product={product as Product}
                  onQuickView={onQuickView || (() => {})}
                  onAddToCart={onAddToCart || (() => {})}
                  onToggleWishlist={onToggleWishlist || (() => {})}
                  isWishlisted={wishlist?.some((p) => p.id === product.id) || false}
                />
              </div>
            ))}
          </div>
        );

      case 'masonry':
        return (
          <div className="columns-2 md:columns-3 lg:columns-4 gap-4 md:gap-8 space-y-4 md:space-y-8">
            {productsToRender.map((product, i) => (
              <motion.div 
                key={product.id} 
                variants={itemVariants} 
                initial={false}
                className="break-inside-avoid"
              >
                <ProductCard
                  product={product as Product}
                  onQuickView={onQuickView || (() => {})}
                  onAddToCart={onAddToCart || (() => {})}
                  onToggleWishlist={onToggleWishlist || (() => {})}
                  isWishlisted={wishlist?.some((p) => p.id === product.id) || false}
                />
              </motion.div>
            ))}
          </div>
        );

      case 'minimal_list':
        return (
          <div className="max-w-4xl mx-auto flex flex-col gap-4">
            {productsToRender.map((product) => (
              <motion.div 
                key={product.id} 
                variants={itemVariants} 
                initial={false}
                className="group flex items-center gap-6 p-4 md:p-6 border-b border-dashed transition-colors hover:bg-slate-50/50"
                style={{ borderColor: 'var(--storify-border)' }}
              >
                <div 
                  className="w-20 h-20 md:w-32 md:h-32 shrink-0 overflow-hidden cursor-pointer"
                  style={{ borderRadius: '12px' }}
                  onClick={() => navigateStorefront(`/product/${product.id}`)}
                >
                  <img src={product.image} alt={product.name} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1 block" style={{ color: 'var(--storify-text)' }}>
                    {product.category || t('category_uncategorized')}
                  </span>
                  <h3 
                    className="font-black text-lg md:text-2xl leading-tight truncate cursor-pointer hover:opacity-70 transition-opacity"
                    style={{ color: 'var(--storify-headings)' }}
                    onClick={() => navigateStorefront(`/product/${product.id}`)}
                  >
                    {product.name}
                  </h3>
                  <div className="mt-2 flex items-center gap-4">
                    <span className="text-xl font-black" style={{ color: 'var(--storify-primary)' }}>
                      {formatProductPriceLabel(product, store?.currency ?? product.currency, {
                        formatRange: (min, max) =>
                          interpolateTheme(t('product_price_range'), { min, max }),
                      })}
                    </span>
                    <button 
                      onClick={() => onAddToCart && onAddToCart(product as Product)}
                      className="text-[10px] font-black uppercase tracking-widest border-b-2 transition-all hover:opacity-50"
                      style={{ color: 'var(--storify-headings)', borderColor: 'var(--storify-primary)' }}
                    >
                      {t('featured_add_to_cart')}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        );

      case 'grid':
      default:
        return (
          <motion.div
            variants={containerVariants}
            initial={false}
            animate="visible"
            className={`grid grid-cols-2 ${gridCols} gap-x-4 md:gap-x-8 gap-y-8 md:gap-y-12`}
          >
            {productsToRender.map((product) => (
              <motion.div key={product.id} variants={itemVariants} initial={false}>
                <ProductCard
                  product={product as Product}
                  onQuickView={onQuickView || (() => {})}
                  onAddToCart={onAddToCart || (() => {})}
                  onToggleWishlist={onToggleWishlist || (() => {})}
                  isWishlisted={wishlist?.some((p) => p.id === product.id) || false}
                />
              </motion.div>
            ))}
          </motion.div>
        );
    }
  };

  return (
    <section style={{ background: 'var(--storify-bg)', paddingTop, paddingBottom }} className="overflow-hidden" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="flex flex-col md:flex-row justify-between items-center md:items-end gap-6 md:gap-8 mb-10 md:mb-16 text-center md:text-start">
          <motion.div
            initial={false}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="flex-1"
          >
            <span className="inline-block text-[10px] md:text-xs font-black uppercase tracking-[0.2em] md:tracking-[0.3em] mb-2 md:mb-4" style={{ color: 'var(--storify-primary)' }}>
              {content.subtitle || t('featured_subtitle_default')}
            </span>
            <h2
              className="text-3xl md:text-6xl font-black tracking-tight leading-tight"
              style={{ color: 'var(--storify-headings)' }}
            >
              {content.title || t('featured_title_default')}
            </h2>
          </motion.div>
          
          <motion.div
            initial={false}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="hidden md:flex items-center gap-6"
          >
            {layoutStyle === 'carousel' && (
              <div className="flex gap-2">
                <button 
                  onClick={() => scroll('prev')}
                  className="p-3 rounded-full border-2 transition-all hover:bg-black hover:text-white active:scale-90"
                  style={{ borderColor: 'var(--storify-border)', color: 'var(--storify-headings)' }}
                >
                  {isRtl ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
                </button>
                <button 
                  onClick={() => scroll('next')}
                  className="p-3 rounded-full border-2 transition-all hover:bg-black hover:text-white active:scale-90"
                  style={{ borderColor: 'var(--storify-border)', color: 'var(--storify-headings)' }}
                >
                  {isRtl ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={() => navigateStorefront('/shop')}
              className="group flex items-center gap-3 font-black text-sm uppercase tracking-widest transition-all hover:gap-5"
              style={{ color: 'var(--storify-headings)' }}
            >
              <span>{t('featured_view_all')}</span>
              {isRtl ? (
                <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
              ) : (
                <ArrowLeft className="w-5 h-5 transition-transform group-hover:translate-x-1 rotate-180" />
              )}
            </button>
          </motion.div>
        </div>

        {showCategoryTabs && availableCategories.length > 0 && (
          <div className="flex flex-wrap justify-center md:justify-start gap-3 mb-12">
            <button
              onClick={() => setActiveCategory(null)}
              style={!activeCategory ? { background: 'var(--storify-headings)', color: 'var(--storify-bg)' } : { borderColor: 'var(--storify-border)', color: 'var(--storify-headings)' }}
              className={`px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border-2 ${!activeCategory ? 'border-transparent' : 'bg-transparent hover:border-black'}`}
            >
              {t('featured_all')}
            </button>
            {availableCategories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={activeCategory === cat ? { background: 'var(--storify-headings)', color: 'var(--storify-bg)' } : { borderColor: 'var(--storify-border)', color: 'var(--storify-headings)' }}
                className={`px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border-2 ${activeCategory === cat ? 'border-transparent' : 'bg-transparent hover:border-black'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {isEmpty ? (
          <motion.div
            initial={false}
            animate={{ opacity: 1 }}
            className="py-16 md:py-24 text-center border-2 border-dashed rounded-2xl md:rounded-3xl"
            style={{ borderColor: 'var(--storify-border)' }}
          >
            <ShoppingBag className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-4 opacity-20" style={{ color: 'var(--storify-primary)' }} />
            <p className="text-base md:text-lg font-bold uppercase tracking-widest opacity-60" style={{ color: 'var(--storify-headings)' }}>
              {t('featured_empty')}
            </p>
            <p className="text-xs md:text-sm mt-2 opacity-40" style={{ color: 'var(--storify-text)' }}>{t('featured_empty_hint')}</p>
          </motion.div>
        ) : renderProducts()}

        <div className="mt-12 text-center md:hidden">
          <button
            type="button"
            onClick={() => navigateStorefront('/shop')}
            className="inline-flex items-center gap-2 font-black text-xs uppercase tracking-widest py-3 px-6 border-2 rounded-full"
            style={{ color: 'var(--storify-headings)', borderColor: 'var(--storify-border)' }}
          >
            <span>{t('featured_view_all')}</span>
            <ArrowLeft className={`w-4 h-4 ${isRtl ? '' : 'rotate-180'}`} />
          </button>
        </div>
      </div>
    </section>
  );
};

export default FeaturedProductsSection;
