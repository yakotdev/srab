import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShoppingBag, Heart, Star, Share2 } from 'lucide-react';
import { Product, ProductVariant } from '../constants';
import { formatPrice, formatProductPriceLabel, resolveProductDetailPrice } from '@storify/theme';
import { getMaxOrderableQuantity } from '@storify/theme';
import {
  findSelectedVariant,
  getOptionValueFromVariant,
  isOptionValueAvailable,
  normalizeOptionValue,
  selectedOptionsFromVariant,
} from '@storify/theme';
import { useThemeConfig } from '../ThemeContext';
import { productImageAspectClass, productImageObjectFitClass } from '@storify/theme';
import { prepareHtmlContent } from '@storify/theme';
import { interpolateTheme } from '../locales';

const COLOR_META_OPTION_NAME = '__color_meta__';
const COLOR_OPTION_NAMES = ['color', 'colour', 'اللون', 'لون', 'الوان', 'ألوان'];

const isColorOptionName = (name?: string) => {
  const normalized = String(name || '').trim().toLowerCase();
  return COLOR_OPTION_NAMES.some((candidate) => normalized.includes(candidate.toLowerCase()));
};

const extractProductColorMap = (product?: Product | null): Record<string, string> => {
  try {
    const options = Array.isArray(product?.options) ? product!.options! : [];
    const metaOption = options.find((o) => String(o?.name || '').trim() === COLOR_META_OPTION_NAME);
    const raw = metaOption?.values?.[0];
    if (!raw || typeof raw !== 'string') return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out: Record<string, string> = {};
    Object.entries(parsed).forEach(([key, value]) => {
      if (typeof value === 'string' && value.trim() !== '') out[String(key)] = value.trim();
    });
    return out;
  } catch {
    return {};
  }
};

const resolveColorValue = (optionValue: string, colorMap: Record<string, string>) => {
  const mapped =
    colorMap[optionValue] ??
    colorMap[String(optionValue || '').trim().toLowerCase()] ??
    colorMap[String(optionValue || '').trim()];
  if (mapped && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(mapped)) return mapped;
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(optionValue)) return optionValue;
  return mapped || '';
};

const QUICK_VIEW_VARIANTS_SCROLL_ID = 'storify-quick-view-variants';

const pulseScrollToElement = (id: string) => {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.classList.remove('animate-pulse');
  void el.offsetWidth;
  el.classList.add('animate-pulse');
};

interface QuickViewModalProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (product: Product) => void;
  onToggleWishlist: (product: Product) => void;
  wishlist: Product[];
}

const QuickViewModal: React.FC<QuickViewModalProps> = ({ 
  product, 
  onClose, 
  onAddToCart, 
  onToggleWishlist,
  wishlist 
}) => {
  const { store, isRtl, settings, t } = useThemeConfig();
  const productAspectClass = productImageAspectClass(settings as Record<string, unknown>);
  const productFitClass = productImageObjectFitClass(settings as Record<string, unknown>);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const visibleOptions = React.useMemo(
    () => (Array.isArray(product?.options) ? product.options.filter((opt) => String(opt?.name || '').trim() !== COLOR_META_OPTION_NAME) : []),
    [product?.options]
  );
  const productColorMap = React.useMemo(() => extractProductColorMap(product), [product]);

  // Initialize options when product changes - do NOT auto-select
  useEffect(() => {
    setSelectedOptions({});
    setError(null);
  }, [product?.id, visibleOptions]);

  const selectedVariant = React.useMemo((): ProductVariant | null => {
    if (!product || !Array.isArray(product.variants) || product.variants.length === 0) return null;
    const hasOptionDefs = visibleOptions.length > 0;
    if (hasOptionDefs) {
      const allSelected = visibleOptions.every((opt) => opt.name && selectedOptions[opt.name]);
      if (!allSelected) return null;
      return findSelectedVariant(product, selectedOptions) as unknown as ProductVariant | null;
    }
    return (product.variants[0] as ProductVariant) ?? null;
  }, [product, selectedOptions, visibleOptions]);

  if (!product) return null;

  const isWishlisted = wishlist.some(p => p && p.id === product.id);
  const detailPrice = resolveProductDetailPrice(product, selectedVariant);
  const formatPriceRange = (min: string, max: string) =>
    interpolateTheme(t('product_price_range'), { min, max });
  const priceLabel = selectedVariant
    ? formatPrice(detailPrice.price, store?.currency)
    : formatProductPriceLabel(product, store?.currency, { formatRange: formatPriceRange });
  const currentPrice = detailPrice.price;
  const currentCompareAtPrice = detailPrice.showCompareAt ? detailPrice.compareAtPrice : undefined;

  const hasVariants = Array.isArray(product.variants) && product.variants.length > 0;
  const needsVariantSelection = hasVariants && visibleOptions.length > 0;
  const variantsSelected =
    !needsVariantSelection ||
    (visibleOptions.every((opt) => opt.name && selectedOptions[opt.name]) && !!selectedVariant);
  const maxQty = getMaxOrderableQuantity(
    product as Parameters<typeof getMaxOrderableQuantity>[0],
    hasVariants ? selectedVariant?.id : undefined
  );
  const canAddToCart = variantsSelected && maxQty > 0;

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/product/${product.id}`;
    if (navigator.share) {
      navigator.share({
        title: product.name,
        text: product.description,
        url: shareUrl,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(shareUrl);
      // Removed alert as per iframe restrictions
    }
  };

  const handleAddToCart = () => {
    const hasVariants = Array.isArray(product.variants) && product.variants.length > 0;
    if (hasVariants && visibleOptions.length > 0) {
      const missingOptions = visibleOptions.filter(opt => opt.name && !selectedOptions[opt.name]);
      if (missingOptions.length > 0) {
        setError(t('quick_view_select_variants'));
        pulseScrollToElement(QUICK_VIEW_VARIANTS_SCROLL_ID);
        return;
      }
      if (!selectedVariant) {
        setError(t('quick_view_select_variants'));
        return;
      }
    }
    const maxQty = getMaxOrderableQuantity(product as Parameters<typeof getMaxOrderableQuantity>[0], hasVariants ? selectedVariant?.id : undefined);
    if (maxQty <= 0) {
      setError(t('product_unavailable'));
      return;
    }
    setError(null);

    const sv = selectedVariant;
    const normalizedVariant = sv
      ? {
          ...sv,
          id: sv.id != null && String(sv.id).trim() !== '' ? String(sv.id).trim() : sv.id,
        }
      : undefined;
    const productToAdd = {
      ...product,
      price: currentPrice,
      compareAtPrice: currentCompareAtPrice,
      selectedVariant: normalizedVariant,
      selectedOptions: Object.keys(selectedOptions).length > 0 ? selectedOptions : undefined,
    };
    onAddToCart(productToAdd as any);
  };

  return (
    <AnimatePresence>
      {product && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 overflow-y-auto">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-5xl bg-white rounded-3xl md:rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col md:flex-row z-10 max-h-[90vh] md:max-h-none"
          >
            <button 
              onClick={onClose}
              className="absolute top-4 end-4 md:top-6 md:end-6 z-30 w-10 h-10 bg-white/80 backdrop-blur-md rounded-full flex items-center justify-center text-brand-primary hover:bg-brand-accent hover:text-white transition-all shadow-lg"
            >
              <X size={20} />
            </button>

            {/* Image Section */}
            <div className={`w-full md:w-1/2 relative bg-neutral-50 border-b md:border-b-0 md:border-e border-neutral-100 ${productAspectClass} shrink-0`}>
              <img 
                src={selectedVariant?.image || product.image} 
                alt={product.name} 
                className={`w-full h-full ${productFitClass}`}
                referrerPolicy="no-referrer"
              />
              {detailPrice.showDiscount && (
                <div className="absolute top-6 start-6 bg-red-500 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
                  {interpolateTheme(t('product_save_pct'), { percent: detailPrice.discountPercentage })}
                </div>
              )}
            </div>

            {/* Content Section */}
            <div className={`w-full md:w-1/2 p-6 md:p-12 flex flex-col justify-start md:justify-center ${isRtl ? 'text-start' : 'text-start'} bg-white overflow-y-auto`}>
              <div className="space-y-6 md:space-y-8">
                <div className="space-y-3 md:space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1 text-amber-400">
                      <Star size={14} fill="currentColor" />
                      <Star size={14} fill="currentColor" />
                      <Star size={14} fill="currentColor" />
                      <Star size={14} fill="currentColor" />
                      <Star size={14} fill="currentColor" />
                      <span className="text-[10px] font-black me-2 text-neutral-400 uppercase tracking-widest">
                        {t('quick_view_reviews_count').replace('{{count}}', '24')}
                      </span>
                    </div>
                    <span className="px-3 py-1 bg-brand-accent/10 text-brand-accent text-[10px] font-black uppercase tracking-widest rounded-full">
                      {product.category || t('product_featured_badge')}
                    </span>
                  </div>
                  <h2 className="text-2xl md:text-4xl font-black tracking-tighter leading-tight text-brand-primary">
                    {selectedVariant?.name || product.name}
                  </h2>
                  <div className="flex items-center justify-end gap-3 md:gap-4">
                    {detailPrice.showCompareAt && currentCompareAtPrice != null && (
                      <span className="text-lg md:text-xl text-neutral-300 line-through font-bold">{formatPrice(currentCompareAtPrice, store?.currency)}</span>
                    )}
                    <span className="text-2xl md:text-3xl font-black text-brand-accent">{priceLabel}</span>
                  </div>
                </div>

                {product.description && (
                  <div 
                    className="text-neutral-500 text-sm leading-relaxed line-clamp-4 prose prose-sm prose-neutral"
                    dangerouslySetInnerHTML={{ __html: prepareHtmlContent(product.description) }}
                  />
                )}

                {/* Variants Selection */}
                {visibleOptions.length > 0 && (
                  <div id={QUICK_VIEW_VARIANTS_SCROLL_ID} className="space-y-8 py-6 border-t border-neutral-100">
                    {visibleOptions.map((option) => {
                      if (!option || !option.name) return null;
                      const optionIsColor = isColorOptionName(option.name);
                      return (
                        <div key={option.name} className="space-y-3">
                          <div className="flex justify-between items-baseline">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                              {option.name}
                            </span>
                            <span className="text-[10px] font-medium text-neutral-900">{selectedOptions[option.name]}</span>
                          </div>
                          <div className="flex flex-wrap gap-2 justify-start">
                            {Array.isArray(option.values) && option.values.map((value) => {
                              const isAvailable = isOptionValueAvailable(product, option.name, value);
                              const isSelected = selectedOptions[option.name] === value;

                              const handleOptionClick = () => {
                                if (!isAvailable) return;
                                const newOptions = { ...selectedOptions, [option.name]: value };
                                const isMatchingAvailable = (v: any) => {
                                  if (!v) return false;
                                  const s = v.stock ?? v.inventory_quantity ?? v.inventoryQuantity ?? v.quantity;
                                  const a = v.available ?? v.is_available;
                                  if (a === false) return false;
                                  return s === undefined || s === null || Number(s) > 0;
                                };
                                const matchingVariant = findSelectedVariant(product, newOptions);
                                if (matchingVariant && isMatchingAvailable(matchingVariant)) {
                                  setSelectedOptions(newOptions);
                                } else {
                                  const availableVariantsWithValue =
                                    product.variants?.filter((v) => {
                                      if (!v || !isMatchingAvailable(v)) return false;
                                      const vv = getOptionValueFromVariant(product, v, option.name);
                                      return vv !== undefined && normalizeOptionValue(vv) === normalizeOptionValue(value);
                                    }) ?? [];
                                  if (availableVariantsWithValue.length > 0) {
                                    const bestMatch = availableVariantsWithValue.reduce((prev, curr) => {
                                      const score = (variant: any) =>
                                        Object.entries(selectedOptions).filter(([n, val]) => {
                                          if (n === option.name) return false;
                                          const got = getOptionValueFromVariant(product, variant, n);
                                          return got !== undefined && normalizeOptionValue(got) === normalizeOptionValue(String(val));
                                        }).length;
                                      return score(curr) > score(prev) ? curr : prev;
                                    });
                                    const parsed = selectedOptionsFromVariant(product, bestMatch);
                                    if (parsed) setSelectedOptions(parsed);
                                    else setSelectedOptions(newOptions);
                                  } else {
                                    setSelectedOptions(newOptions);
                                  }
                                }
                                setError(null);
                              };

                              if (optionIsColor) {
                                const hexColor = resolveColorValue(value, productColorMap);
                                return (
                                  <button
                                    key={value}
                                    type="button"
                                    onClick={handleOptionClick}
                                    disabled={!isAvailable}
                                    title={`${value}${!isAvailable ? ` (${t('product_out_of_stock_short')})` : ''}`}
                                    className={`relative p-0.5 rounded-full border transition-all duration-300 ${
                                      isSelected 
                                        ? 'border-neutral-900 scale-105' 
                                        : 'border-transparent hover:border-neutral-200'
                                    } ${!isAvailable ? 'opacity-30 cursor-not-allowed' : ''}`}
                                  >
                                    <span 
                                      className="block w-7 h-7 rounded-full border border-black/5"
                                      style={{ backgroundColor: hexColor || '#ffffff' }}
                                    />
                                    {!isAvailable && (
                                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <div className="w-full h-px bg-neutral-400 -rotate-45" />
                                      </div>
                                    )}
                                  </button>
                                );
                              }

                              return (
                                <button
                                  key={value}
                                  type="button"
                                  disabled={!isAvailable}
                                  onClick={handleOptionClick}
                                  className={`min-w-[2.5rem] h-9 px-3 rounded-full text-[10px] font-medium transition-all border flex items-center justify-center ${
                                    isSelected
                                      ? 'border-neutral-900 bg-neutral-900 text-white'
                                      : isAvailable
                                        ? 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-400'
                                        : 'border-neutral-50 bg-neutral-50 text-neutral-300 cursor-not-allowed opacity-50'
                                  }`}
                                >
                                  <span className="relative z-10">{value}</span>
                                  {!isAvailable && (
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                      <div className="w-full h-px bg-neutral-300 -rotate-12" />
                                    </div>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                    {error && (
                      <motion.p 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-red-500 text-[10px] font-bold text-start"
                      >
                        {error}
                      </motion.p>
                    )}
                  </div>
                )}

                <div className="flex gap-2 md:gap-4 pt-4">
                  <button 
                    onClick={handleAddToCart}
                    disabled={!canAddToCart}
                    className={`flex-1 h-12 md:h-14 rounded-2xl font-black uppercase text-[10px] md:text-xs tracking-widest transition-all flex items-center justify-center gap-2 md:gap-3 shadow-xl ${
                      !canAddToCart
                        ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                        : 'bg-brand-primary text-white hover:bg-brand-accent hover:-translate-y-1 shadow-brand-accent/20'
                    }`}
                  >
                    <ShoppingBag size={18} />
                    {!canAddToCart && variantsSelected ? t('product_out_of_stock_short') : t('product_add_to_cart')}
                  </button>
                  <div className="flex gap-2 md:gap-3">
                    <button 
                      onClick={() => onToggleWishlist(product)}
                      className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl border flex items-center justify-center transition-all shrink-0 ${isWishlisted ? 'bg-red-50 border-red-100 text-red-500' : 'border-neutral-100 text-neutral-400 hover:text-red-500 hover:border-red-100'}`}
                    >
                      <Heart size={20} fill={isWishlisted ? "currentColor" : "none"} />
                    </button>
                    <button 
                      onClick={handleShare}
                      className="w-12 h-12 md:w-14 md:h-14 rounded-2xl border border-neutral-100 flex items-center justify-center text-neutral-400 hover:text-brand-accent hover:border-brand-accent/20 transition-all shrink-0"
                    >
                      <Share2 size={20} />
                    </button>
                  </div>
                </div>

                <div className="pt-6 md:pt-8 border-t border-neutral-100 flex flex-wrap items-center justify-between gap-2 text-[10px] font-black uppercase tracking-widest text-neutral-400">
                  <div className="flex flex-wrap items-center gap-4 md:gap-6">
                    <span>SKU: {selectedVariant?.id || String(product.id).slice(-6).toUpperCase()}</span>
                    <span>{t('product_category_label')}: {product.category || t('category_uncategorized')}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default QuickViewModal;
