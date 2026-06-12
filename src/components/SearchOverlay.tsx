import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Search, ArrowRight, TrendingUp } from 'lucide-react';
import { PRODUCTS } from '../constants';
import { useThemeConfig } from '../ThemeContext';
import { navigateStorefront } from '@storify/theme';
import { formatProductPriceLabel } from '@storify/theme';
import { interpolateTheme } from '../locales';
import { getMaxOrderableQuantity } from '@storify/theme';
import { productImageAspectClass, productImageObjectFitClass } from '@storify/theme';

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const SearchOverlay: React.FC<SearchOverlayProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const { products: configProducts, store, isRtl, settings, t } = useThemeConfig();
  const productAspectClass = productImageAspectClass(settings as Record<string, unknown>);
  const productFitClass = productImageObjectFitClass(settings as Record<string, unknown>);
  const catalog = useMemo(() => {
    if (Array.isArray(configProducts) && configProducts.length > 0) return configProducts;
    return PRODUCTS;
  }, [configProducts]);

  const results =
    query.length > 2
      ? catalog
          .filter(
            (p) =>
              p.name.toLowerCase().includes(query.toLowerCase()) ||
              (p.category && String(p.category).toLowerCase().includes(query.toLowerCase())),
          )
          .slice(0, 4)
      : [];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[150] flex flex-col">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-white/95 backdrop-blur-md"
          />

          <div className="relative z-10 w-full max-w-5xl mx-auto px-6 pt-32">
            <div className="flex justify-between items-center mb-12">
              <h2 className="text-4xl font-extrabold tracking-tighter uppercase text-brand-primary">{t('search_title')}</h2>
              <button
                type="button"
                onClick={onClose}
                className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center hover:bg-brand-primary hover:text-white transition-all"
              >
                <X size={24} />
              </button>
            </div>

            <div className="relative mb-20">
              <input
                autoFocus
                type="text"
                placeholder={t('search_placeholder_full')}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-transparent border-b-4 border-neutral-100 pb-6 text-4xl md:text-6xl font-black tracking-tighter focus:outline-none focus:border-brand-primary transition-colors text-brand-primary placeholder:text-neutral-100"
              />
              <Search className="absolute start-0 bottom-8 text-neutral-200" size={40} />
            </div>

            <div className="grid md:grid-cols-2 gap-20">
              <div className="space-y-10">
                <h4 className="text-xs font-bold uppercase tracking-[0.3em] text-neutral-400">{t('search_suggested_results')}</h4>
                {results.length > 0 ? (
                  <div className="space-y-6">
                    {results.map((product) => {
                      const isOutOfStock = getMaxOrderableQuantity(product as any, undefined) <= 0;
                      return (
                        <button
                          type="button"
                          key={product.id}
                          onClick={() => {
                            navigateStorefront(`/product/${product.id}`);
                            onClose();
                          }}
                          className="flex gap-6 group"
                        >
                          <div className={`w-20 bg-neutral-50 rounded-2xl overflow-hidden flex-shrink-0 relative ${productAspectClass}`}>
                            <img
                              src={product.image}
                              alt={product.name}
                              className={`w-full h-full ${productFitClass} ${isOutOfStock ? 'opacity-50 grayscale' : ''}`}
                              referrerPolicy="no-referrer"
                            />
                            {isOutOfStock && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="bg-black/70 text-white text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter">{t('product_out_of_stock_short')}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col justify-center text-start">
                            <h5 className="font-bold uppercase tracking-tight text-brand-primary group-hover:text-brand-accent transition-colors">
                              {product.name}
                            </h5>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mt-1">
                              {product.category}
                            </p>
                            <div className="flex items-center justify-start gap-2 mt-2">
                              {isOutOfStock ? (
                                <span className="text-xs font-bold text-red-500">{t('product_out_of_stock_short')}</span>
                              ) : (
                                <p className="text-sm font-black text-brand-primary">
                                  {formatProductPriceLabel(product, store?.currency, {
                                    formatRange: (min, max) =>
                                      interpolateTheme(t('product_price_range'), { min, max }),
                                  })}
                                </p>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-neutral-400 italic">{t('search_start_typing')}</p>
                )}
              </div>

              <div className="space-y-10 hidden md:block">
                <h4 className="text-xs font-bold uppercase tracking-[0.3em] text-neutral-400">{t('search_trending_now')}</h4>
                <div className="space-y-6">
                  {[t('search_trending_tables'), t('search_trending_lighting'), t('search_trending_chairs')].map((term) => (
                    <button
                      type="button"
                      key={term}
                      onClick={() => setQuery(term)}
                      className="w-full flex items-center justify-between group text-start"
                    >
                      <ArrowRight size={18} className={`text-neutral-200 group-hover:text-brand-primary ${isRtl ? 'rotate-180' : ''}`} />
                      <span className="font-bold text-brand-primary group-hover:text-brand-accent transition-colors">
                        {term}
                      </span>
                      <TrendingUp size={18} className="text-brand-accent" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default SearchOverlay;
