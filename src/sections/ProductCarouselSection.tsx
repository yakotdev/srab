import React, { useMemo, useRef } from 'react';
import { ChevronRight, ChevronLeft, ShoppingBag } from 'lucide-react';
import { motion } from 'motion/react';
import type { Product } from '../constants';
import { PRODUCTS } from '../constants';
import { useThemeConfig } from '../ThemeContext';
import { useCategories, useResolvedStoreId, useSectionProducts } from '@storify/theme';
import { filterProductsByCategoryScope, parseCategoryScope } from '@storify/theme';

import ProductCard from '../components/ProductCard';

const ProductCarouselSection: React.FC<{ section: any }> = ({ section }) => {
  const {
    categories: configCategories,
    onAddToCart,
    onQuickView,
    onToggleWishlist,
    wishlist,
    isRtl,
    t,
  } = useThemeConfig();
  const resolvedStoreId = useResolvedStoreId();
  
  const content = section?.content || {};
  const paddingTop = content.padding_top || '100px';
  const paddingBottom = content.padding_bottom || '100px';
  const scrollRef = useRef<HTMLDivElement>(null);

  const fromCatalog = useSectionProducts({ limit: 24, preferHostPayload: true });
  const apiCategories = useCategories(undefined, 100);
  const categoriesMaster =
    Array.isArray(configCategories) && configCategories.length > 0 ? configCategories : apiCategories;

  const products = useMemo(() => {
    const rawProducts = fromCatalog.length > 0 ? fromCatalog : !resolvedStoreId ? PRODUCTS : fromCatalog;
    const scope = parseCategoryScope(content.category_scope);
    return filterProductsByCategoryScope(rawProducts, scope, categoriesMaster);
  }, [fromCatalog, resolvedStoreId, content.category_scope, categoriesMaster]);

  const scroll = (direction: 'next' | 'prev') => {
    const container = scrollRef.current;
    if (container) {
      const card = container.querySelector('div') as HTMLElement;
      if (!card) return;
      
      const cardWidth = card.offsetWidth;
      const gap = window.innerWidth >= 768 ? 32 : 16;
      const step = cardWidth + gap;
      
      // In RTL, scrollBy({ left: step }) moves left (next)
      // and scrollBy({ left: -step }) moves right (previous)
      const delta = direction === 'next' ? step : -step;
      container.scrollBy({ left: delta, behavior: 'smooth' });
    }
  };

  const isEmpty = products.length === 0;

  return (
    <section 
      className="relative overflow-hidden" 
      style={{ 
        paddingTop, 
        paddingBottom,
        background: 'var(--storify-bg)'
      }}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="flex flex-col md:flex-row justify-between items-center md:items-end gap-6 mb-12">
          <div className="text-center md:text-start">
            <span className="inline-block text-[10px] md:text-xs font-black uppercase tracking-[0.2em] mb-2" style={{ color: 'var(--storify-primary)' }} dir="auto">
              {content.subtitle || t('carousel_subtitle_default')}
            </span>
            <h2
              className="text-3xl md:text-5xl font-black tracking-tight leading-tight"
              style={{ color: 'var(--storify-headings)' }}
              dir="auto"
            >
              {content.title || t('carousel_title_default')}
            </h2>
          </div>
          
          <div className="flex gap-3">
            <button 
              onClick={() => scroll('prev')}
              className="p-3 rounded-full border-2 transition-all hover:bg-black hover:text-white active:scale-90 bg-white/50 backdrop-blur-sm"
              style={{ borderColor: 'var(--storify-border)', color: 'var(--storify-headings)' }}
              aria-label={t('carousel_prev')}
            >
              {isRtl ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </button>
            <button 
              onClick={() => scroll('next')}
              className="p-3 rounded-full border-2 transition-all hover:bg-black hover:text-white active:scale-90 bg-white/50 backdrop-blur-sm"
              style={{ borderColor: 'var(--storify-border)', color: 'var(--storify-headings)' }}
              aria-label={t('carousel_next')}
            >
              {isRtl ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {isEmpty ? (
          <div className="py-24 text-center border-2 border-dashed rounded-3xl" style={{ borderColor: 'var(--storify-border)' }}>
            <ShoppingBag className="w-12 h-12 mx-auto mb-4 opacity-20" style={{ color: 'var(--storify-primary)' }} />
            <p className="text-lg font-bold uppercase tracking-widest opacity-60" style={{ color: 'var(--storify-headings)' }}>{t('carousel_no_products')}</p>
          </div>
        ) : (
          <div 
            ref={scrollRef}
            className="flex gap-4 md:gap-8 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-8"
            style={{ scrollbarWidth: 'none' }}
            dir={isRtl ? 'rtl' : 'ltr'}
          >
            {products.map((product) => (
              <div key={product.id} className="min-w-[calc(50%-8px)] md:min-w-[320px] snap-start">
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
        )}
      </div>
    </section>
  );
};

export default ProductCarouselSection;
