import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus,
  Minus,
  ShoppingBag,
  Heart,
  Share2,
  CheckCircle,
  HelpCircle,
  ArrowRight,
  ArrowLeft,
  Star,
  History,
  ChevronRight,
  ChevronLeft,
  Truck,
  Shield,
  Award,
  Zap,
  Gift,
  Tag,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useThemeConfig } from '../ThemeContext';
import {
  useProduct,
  useSectionProducts,
  formatPrice,
  fetchProductReviews,
  formatProductPriceLabel,
  resolveProductDetailPrice,
} from '@storify/theme';
import { getMaxOrderableQuantity } from '@storify/theme';
import {
  findSelectedVariant,
  getOptionValueFromVariant,
  isOptionValueAvailable,
  normalizeOptionValue,
  selectedOptionsFromVariant,
} from '@storify/theme';
import { navigateStorefront, toStorefrontUrl } from '@storify/theme';
import { prepareHtmlContent } from '@storify/theme';
import { normalizeProductForHostCart } from '@storify/theme';
import { notifyHostTrackEvent } from '@storify/theme';
import ProductCard from '../components/ProductCard';
import { Product, ProductVariant } from '../constants';
import { buildSchemeCssVariables, resolveSchemeFromSettings } from '@storify/theme';
import { productImageAspectClass, productImageObjectFitClass } from '@storify/theme';
import { interpolateTheme } from '../locales';

const isVideoUrl = (url?: string | null) => !!url && /\.(mp4|webm|ogg|mov|mkv|avi|m4v)(\?.*)?$/i.test(url);
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

const BADGE_ICON_MAP: Record<string, React.FC<{ size?: number; className?: string }>> = {
  CheckCircle,
  HelpCircle,
  Star,
  Truck,
  Shield,
  Award,
  Zap,
  Gift,
  Tag,
};

const DynamicIcon = ({ name, ...props }: { name: string; [key: string]: unknown }) => {
  const Icon = BADGE_ICON_MAP[name] || CheckCircle;
  return <Icon {...props} />;
};

const PRODUCT_VARIANTS_SCROLL_ID = 'storify-product-variants';

const pulseScrollToElement = (id: string) => {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.classList.remove('animate-pulse');
  void el.offsetWidth;
  el.classList.add('animate-pulse');
};

const ProductDetailsSettingsSection: React.FC<{ section: any }> = ({ section }) => {
  const {
    productId,
    currentProduct: configProduct,
    onAddToCart,
    onToggleWishlist,
    wishlist,
    store,
    settings,
    sdkReady,
    isRtl,
    t,
  } = useThemeConfig();
  const { product: apiProduct, loading } = useProduct(productId);
  const allProducts = useSectionProducts({ limit: 20, preferHostPayload: true });
  
  const product = apiProduct ?? configProduct;
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState<string | undefined>(undefined);
  const [isAdded, setIsAdded] = useState(false);
  const [recentlyViewed, setRecentlyViewed] = useState<Product[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [direction, setDirection] = useState(0);
  const [isAddToCartHover, setIsAddToCartHover] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [reviewsData, setReviewsData] = useState({ average: 0, count: 0 });

  useEffect(() => {
    if (!productId) return;
    fetchProductReviews(productId).then(list => {
      const arr = Array.isArray(list) ? (list as { rating?: number }[]) : [];
      if (arr.length === 0) {
        setReviewsData({ average: 0, count: 0 });
        return;
      }
      const sum = arr.reduce((acc, r) => acc + (r.rating || 0), 0);
      const average = Math.round((sum / arr.length) * 10) / 10;
      setReviewsData({ average, count: arr.length });
    }).catch(() => {
      setReviewsData({ average: 0, count: 0 });
    });
  }, [productId, sdkReady]);

  const content = section?.content || {};
  const productAspectClass = productImageAspectClass(settings as Record<string, unknown>);
  const productFitClass = productImageObjectFitClass(settings as Record<string, unknown>);
  const sectionSchemeId = content?.color_scheme;
  const sectionSchemeVars = buildSchemeCssVariables(
    resolveSchemeFromSettings((settings ?? {}) as Record<string, unknown>, sectionSchemeId),
  );

  const productColorMap = useMemo(() => extractProductColorMap(product as Product), [product]);
  const visibleOptions = useMemo(
    () => (Array.isArray(product?.options) ? product.options.filter((opt) => String(opt?.name || '').trim() !== COLOR_META_OPTION_NAME) : []),
    [product?.options]
  );

  useEffect(() => {
    if (!product) {
      setSelectedVariantId(null);
      setSelectedOptions({});
      setError(null);
      return;
    }
    const variants = Array.isArray(product.variants) ? product.variants : [];
    if (variants.length === 0) {
      setSelectedVariantId(null);
      setSelectedOptions({});
      setError(null);
      return;
    }
    // Do NOT auto-select the first variant
    setSelectedVariantId(null);
    setSelectedOptions({});
    setError(null);
  }, [product?.id, apiProduct]);

  const selectedVariant = useMemo((): ProductVariant | null => {
    if (!product || !Array.isArray(product.variants) || product.variants.length === 0) return null;
    const raw = selectedVariantId != null ? String(selectedVariantId).trim() : '';
    if (raw) {
      const found = product.variants.find((v) => String(v?.id).trim() === raw);
      if (found) return found as ProductVariant;
    }
    
    // If we have options, wait until all are selected
    if (visibleOptions.length > 0) {
      const allSelected = visibleOptions.every((opt) => opt.name && selectedOptions[opt.name]);
      if (!allSelected) return null;
      return findSelectedVariant(product, selectedOptions) as unknown as ProductVariant | null;
    }

    return (product.variants[0] as ProductVariant) ?? null;
  }, [product, selectedVariantId, selectedOptions, visibleOptions]);

  useEffect(() => {
    const trackedProductId = String(product?.id ?? productId ?? '').trim();
    if (!product || !trackedProductId) return;
    notifyHostTrackEvent('view_item', {
      productId: trackedProductId,
      name: product.name,
      value: selectedVariant?.price ?? product.price,
      currency: store?.currency,
      quantity: 1,
    });
  }, [product?.id, product?.name, product?.price, productId, selectedVariant?.price, store?.currency]);

  useEffect(() => {
    if (!selectedVariant || !product) return;
    const parsed = selectedOptionsFromVariant(product as never, selectedVariant as never);
    setSelectedOptions(parsed ?? {});
  }, [product?.id, selectedVariant?.id]);

  const maxOrderable = useMemo(() => {
    if (!product) return 0;
    const hasVariants = Array.isArray(product.variants) && product.variants.length > 0;
    return getMaxOrderableQuantity(product as Parameters<typeof getMaxOrderableQuantity>[0], hasVariants ? selectedVariant?.id : undefined);
  }, [product, selectedVariant?.id]);

  useEffect(() => {
    if (maxOrderable <= 0 || maxOrderable >= Number.MAX_SAFE_INTEGER) return;
    setQuantity((q) => Math.min(q, maxOrderable));
  }, [maxOrderable]);

  useEffect(() => {
    if (product?.id) {
      try {
        const stored = localStorage.getItem('recently_viewed');
        let list: string[] = stored ? JSON.parse(stored) : [];
        if (!Array.isArray(list)) list = [];
        list = [String(product.id), ...list.filter((id) => id !== String(product.id))].slice(0, 10);
        localStorage.setItem('recently_viewed', JSON.stringify(list));
      } catch (e) {
        console.error('Error updating recently viewed:', e);
      }
    }
  }, [product?.id]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('recently_viewed');
      if (stored && allProducts.length > 0) {
        const ids: string[] = JSON.parse(stored);
        if (Array.isArray(ids)) {
          const filtered = ids
            .map((id) => allProducts.find((p) => String(p.id) === id))
            .filter((p): p is Product => !!p && p.id !== product?.id)
            .slice(0, 4);
          setRecentlyViewed(filtered);
        }
      }
    } catch (e) {
      console.error('Error loading recently viewed:', e);
    }
  }, [allProducts, product?.id]);

  // Settings parsing
  const asBool = (val: any, def: boolean) => (val === 'true' || val === true) ? true : (val === 'false' || val === false) ? false : def;

  const layout = content.layout || 'image_left';
  const showThumbnails = asBool(content.show_thumbnails, true);
  const showDescription = asBool(content.show_description, true);
  const showQuantity = asBool(content.show_quantity, true);
  const showAddToCart = asBool(content.show_add_to_cart, true);
  const showWishlist = asBool(content.show_wishlist, true);
  const showShare = asBool(content.show_share, true);
  const showRecentlyViewed = asBool(content.show_recently_viewed, true);
  const trustBadges = Array.isArray(content.trust_badges) ? content.trust_badges : [];
  
  const relatedTitle = (content.related_products_title as string) || t('product_related_title');
  const recentlyViewedTitle = (content.recently_viewed_title as string) || t('recently_viewed_default');

  const relatedProducts = useMemo(() => {
    if (!product || !allProducts) return [];
    return allProducts
      .filter((p) => p && p.id !== product.id && (p.category === product.category || p.categoryId === product.categoryId))
      .slice(0, 4);
  }, [product, allProducts]);

  useEffect(() => {
    if (product?.image) setSelectedImage(product.image);
  }, [product?.image]);

  const isLoading = Boolean(productId?.trim()) && loading && !apiProduct;
  if (isLoading) {
    return (
      <section className="py-16 px-6 max-w-7xl mx-auto">
        <div className="animate-pulse flex flex-col md:flex-row gap-12">
          <div className={`w-full md:w-1/2 bg-neutral-100 rounded-3xl ${productAspectClass}`} />
          <div className="w-full md:w-1/2 space-y-6">
            <div className="h-4 bg-neutral-100 rounded w-1/4" />
            <div className="h-12 bg-neutral-100 rounded w-3/4" />
            <div className="h-8 bg-neutral-100 rounded w-1/2" />
            <div className="h-24 bg-neutral-100 rounded w-full" />
            <div className="h-12 bg-neutral-100 rounded w-1/3" />
          </div>
        </div>
      </section>
    );
  }

  if (!product) {
    const hasProductId = Boolean(productId || (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('productId')));
    return (
      <section className="py-16 px-6 max-w-7xl mx-auto text-center text-brand-primary/70">
        <p className="text-lg font-medium">
          {hasProductId ? t('product_page_missing') : t('product_page_select_hint')}
        </p>
        <button
          type="button"
          onClick={() => navigateStorefront('/shop')}
          className="inline-block mt-4 text-brand-accent font-bold uppercase text-sm tracking-widest border-b border-brand-accent pb-1"
        >
          {t('product_back_to_shop')}
        </button>
      </section>
    );
  }

  const images = (Array.isArray(product.images) && product.images.length > 0 ? product.images : product.image ? [product.image] : []) as string[];
  const mainImage = selectedImage || images[0] || '';
  const isWishlisted = wishlist?.some((p) => p && p.id === product.id) || false;

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
  const canAddToCart = variantsSelected && maxOrderable > 0;

  const handleAddToCart = () => {
    const hasVariants = Array.isArray(product.variants) && product.variants.length > 0;
    if (hasVariants && visibleOptions.length > 0) {
      const missingOptions = visibleOptions.filter(opt => opt.name && !selectedOptions[opt.name]);
      if (missingOptions.length > 0) {
        setError(t('quick_view_select_variants'));
        pulseScrollToElement(PRODUCT_VARIANTS_SCROLL_ID);
        return;
      }
      if (!selectedVariantId || !selectedVariant) {
        setError(t('product_variant_resolve_error'));
        return;
      }
    } else if (hasVariants && (!selectedVariantId || !selectedVariant)) {
      setError(t('product_variant_resolve_error'));
      return;
    }
    if (maxOrderable <= 0) {
      setError(t('product_unavailable'));
      return;
    }
    if (maxOrderable < Number.MAX_SAFE_INTEGER && quantity > maxOrderable) {
      setError(interpolateTheme(t('product_quantity_available'), { max: maxOrderable }));
      return;
    }
    setError(null);
    if (onAddToCart) {
      const sv = selectedVariant;
      const normalizedVariant = sv
        ? {
          ...sv,
          id: selectedVariantId ?? (sv.id != null && String(sv.id).trim() !== '' ? String(sv.id).trim() : sv.id),
          title: String((sv as { title?: string }).title ?? sv.name ?? '').trim() || undefined,
        }
        : undefined;
      const productToAdd = {
        ...product,
        quantity,
        price: currentPrice,
        compareAtPrice: currentCompareAtPrice,
        selectedVariant: normalizedVariant,
        selectedOptions: Object.keys(selectedOptions).length > 0 ? selectedOptions : undefined,
      };
      const normalizedForHost = normalizeProductForHostCart(productToAdd as Product & { quantity?: number });
      onAddToCart(normalizedForHost as any);
      setIsAdded(true);
      setTimeout(() => setIsAdded(false), 3000);
    }
  };

  const paginate = (newDirection: number) => {
    const currentIndex = images.indexOf(mainImage);
    let nextIndex = currentIndex + newDirection;
    if (nextIndex < 0) nextIndex = images.length - 1;
    if (nextIndex >= images.length) nextIndex = 0;
    setDirection(newDirection);
    setSelectedImage(images[nextIndex]);
  };

  const handleShare = () => {
    const url = toStorefrontUrl(`/product/${productId}`);
    if (navigator.share) {
      navigator.share({ title: product.name, text: product.description, url }).catch(console.error);
    } else {
      navigator.clipboard.writeText(url);
      alert(t('product_copy_link_done'));
    }
  };

  const imageBlock = (
    <div className="space-y-6">
      <div className={`relative group rounded-[2rem] overflow-hidden bg-neutral-50 border border-neutral-100 touch-pan-y ${productAspectClass}`}>
        {isVideoUrl(mainImage) ? (
          <video key={mainImage} src={mainImage} className={`w-full h-full ${productFitClass} bg-black`} controls playsInline preload="metadata" />
        ) : (
          <AnimatePresence initial={false} custom={direction}>
            <motion.img
              key={mainImage} src={mainImage} custom={direction}
              initial={{ opacity: 0, x: direction > 0 ? (isRtl ? -100 : 100) : (isRtl ? 100 : -100) }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction > 0 ? (isRtl ? 100 : -100) : (isRtl ? -100 : 100) }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={1}
              onDragEnd={(e, { offset, velocity }) => {
                const swipeThreshold = 50;
                const velocityThreshold = 500;
                if (Math.abs(offset.x) > swipeThreshold && Math.abs(velocity.x) > velocityThreshold || Math.abs(offset.x) > 100) {
                  const dir = offset.x > 0 ? -1 : 1;
                  paginate(isRtl ? -dir : dir);
                }
              }}
              className={`w-full h-full ${productFitClass} cursor-grab active:cursor-grabbing`}
              referrerPolicy="no-referrer"
            />
          </AnimatePresence>
        )}
        {images.length > 1 && (
          <>
            <button onClick={() => paginate(-1)} className="absolute start-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center text-brand-primary shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10">
              {isRtl ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            </button>
            <button onClick={() => paginate(1)} className="absolute end-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center text-brand-primary shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10">
              {isRtl ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
            </button>
          </>
        )}
        {detailPrice.showDiscount && (
          <div className="absolute top-6 start-6 bg-red-500 text-white px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest shadow-lg z-10">
            {interpolateTheme(t('product_save_pct'), {
              percent: detailPrice.discountPercentage,
            })}
          </div>
        )}
      </div>
      {showThumbnails && images.length > 1 && (
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
          {images.map((img, i) => (
            <button
              key={i} type="button"
              onClick={() => {
                const currentIndex = images.indexOf(mainImage);
                setDirection(i > currentIndex ? 1 : -1);
                setSelectedImage(img);
              }}
              className={`flex-shrink-0 w-24 aspect-square rounded-2xl overflow-hidden border-2 transition-all duration-300 ${mainImage === img ? 'border-brand-accent scale-95' : 'border-transparent opacity-60 hover:opacity-100'}`}
            >
              {isVideoUrl(img) ? <video src={img} className={`w-full h-full ${productFitClass} bg-black`} muted playsInline preload="metadata" /> : <img src={img} alt="" className={`w-full h-full ${productFitClass}`} referrerPolicy="no-referrer" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const detailsBlock = (
    <div className="space-y-10 text-brand-primary">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 bg-brand-accent/10 text-brand-accent text-[10px] font-black uppercase tracking-widest rounded-full">
            {product.category || t('product_featured_badge')}
          </span>
          <div className={`flex items-center gap-1 ${reviewsData.count > 0 || (product as any)?.rating ? 'text-amber-400' : 'text-neutral-300'}`}>
            <Star size={14} fill={reviewsData.count > 0 || (product as any)?.rating ? 'currentColor' : 'none'} />
            <span className="text-xs font-bold text-neutral-500">
              {reviewsData.count > 0
                ? interpolateTheme(t('product_reviews_line'), {
                    avg: reviewsData.average,
                    count: reviewsData.count,
                    reviews_word: t('product_reviews_word'),
                  })
                : (product as any)?.rating
                  ? interpolateTheme(t('product_reviews_line'), {
                      avg: (product as any).rating,
                      count: (product as any).reviewsCount || 0,
                      reviews_word: t('product_reviews_word'),
                    })
                  : t('product_reviews_none_short')}
            </span>
          </div>
        </div>
        <h1 className="text-4xl md:text-6xl font-black tracking-tighter leading-none">{product.name}</h1>
      </div>

      <div className="flex items-baseline gap-4">
        <span className="text-4xl font-black text-brand-accent">{priceLabel}</span>
        {detailPrice.showCompareAt && currentCompareAtPrice != null && (
          <span className="text-neutral-300 line-through text-xl font-bold">{formatPrice(currentCompareAtPrice, store?.currency)}</span>
        )}
      </div>

      {showDescription && product.description && (
        <div className="text-neutral-500 leading-relaxed text-lg prose prose-neutral max-w-none" dangerouslySetInnerHTML={{ __html: prepareHtmlContent(product.description) }} />
      )}

      {visibleOptions.length > 0 && (
        <div id={PRODUCT_VARIANTS_SCROLL_ID} className="space-y-10 py-8 border-t border-neutral-100">
          {visibleOptions.map((option) => {
            if (!option || !option.name) return null;
            const optionIsColor = isColorOptionName(option.name);
            return (
              <div key={option.name} className="space-y-4">
                <div className="flex justify-between items-baseline">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-neutral-400">{option.name}</span>
                  <span className="text-xs font-medium text-neutral-900">{selectedOptions[option.name]}</span>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {Array.isArray(option.values) && option.values.map((value) => {
                    const isSelected = selectedOptions[option.name] === value;
                    const pickId = (v: any) => v?.id != null && String(v.id).trim() !== '' ? String(v.id).trim() : null;
                    const hypotheticalOptions = { ...selectedOptions, [option.name]: value };
                    const matchingHypotheticalVariant = findSelectedVariant(product, hypotheticalOptions);
                    let isOutOfStock = false;
                    if (matchingHypotheticalVariant) {
                      const vid = pickId(matchingHypotheticalVariant);
                      if (vid) isOutOfStock = getMaxOrderableQuantity(product, vid) <= 0;
                    }
                    const handleOptionClick = () => {
                      setSelectedOptions(hypotheticalOptions);
                      if (matchingHypotheticalVariant) {
                        const vid = pickId(matchingHypotheticalVariant);
                        if (vid) setSelectedVariantId(vid);
                        if (matchingHypotheticalVariant.image) setSelectedImage(matchingHypotheticalVariant.image);
                      } else {
                        const fallback = product.variants?.find((v) => {
                          const vv = getOptionValueFromVariant(product, v, option.name);
                          return vv !== undefined && normalizeOptionValue(vv) === normalizeOptionValue(value);
                        });
                        if (fallback) {
                          const vid = pickId(fallback);
                          if (vid) setSelectedVariantId(vid);
                          if (fallback.image) setSelectedImage(fallback.image);
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
                          title={
                            isOutOfStock
                              ? interpolateTheme(t('product_option_out_of_stock_title'), {
                                  value: String(value),
                                  label: t('product_option_out_of_stock'),
                                })
                              : String(value)
                          }
                          className={`relative p-0.5 rounded-full border transition-all duration-300 ${isSelected ? 'border-neutral-900 scale-105' : 'border-transparent hover:border-neutral-200'} ${isOutOfStock ? 'opacity-30' : ''}`}
                        >
                          <span className="block w-8 h-8 rounded-full border border-black/5" style={{ backgroundColor: hexColor || '#ffffff' }} />
                          {isOutOfStock && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><div className="w-full h-px bg-neutral-400 -rotate-45" /></div>}
                        </button>
                      );
                    }
                    return (
                      <button key={value} type="button" onClick={handleOptionClick} className={`min-w-[3rem] h-10 px-4 rounded-full text-xs font-medium transition-all border flex items-center justify-center ${isSelected ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-400'} ${isOutOfStock ? 'opacity-40 pointer-events-none' : ''}`}>
                        <span className="relative z-10">{value}</span>
                        {isOutOfStock && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><div className="w-full h-px bg-neutral-300 -rotate-12" /></div>}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {(visibleOptions.length === 0) && Array.isArray(product.variants) && product.variants.length >= 1 && (
        <div className="space-y-4 py-6 border-t border-neutral-100">
          <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400 block">{t('product_variant_label')}</span>
          <select className="w-full max-w-md rounded-xl border-2 border-neutral-100 px-4 py-3 font-bold text-brand-primary bg-white focus:border-brand-accent outline-none transition-colors" value={selectedVariantId ?? ''} onChange={(e) => { setSelectedVariantId(e.target.value.trim() || null); setError(null); }}>
            {product.variants.map((v) => <option key={String(v.id)} value={String(v.id)}>{String((v as any).title ?? v.name ?? v.id)}</option>)}
          </select>
        </div>
      )}

      {error && <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-red-500 text-xs font-bold">{error}</motion.p>}

      <div className="space-y-6 pt-6 border-t border-neutral-100">
        <div className="flex flex-wrap items-center gap-8">
          {showQuantity && (
            <div className="space-y-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400 block">{t('product_quantity_label')}</span>
              <div className="flex items-center bg-neutral-50 rounded-2xl p-1 border border-neutral-100">
                <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white hover:shadow-sm transition-all text-neutral-400 hover:text-brand-accent"><Minus size={18} /></button>
                <span className="w-12 text-center font-black text-lg">{quantity}</span>
                <button type="button" onClick={() => setQuantity((q) => maxOrderable >= Number.MAX_SAFE_INTEGER ? q + 1 : Math.min(q + 1, maxOrderable))} disabled={maxOrderable < Number.MAX_SAFE_INTEGER && quantity >= maxOrderable} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white hover:shadow-sm transition-all text-neutral-400 hover:text-brand-accent disabled:opacity-40 disabled:pointer-events-none"><Plus size={18} /></button>
              </div>
            </div>
          )}

          <div className="flex-1 flex items-end gap-3">
            {showAddToCart && (
              <button
                type="button" onClick={handleAddToCart} onMouseEnter={() => setIsAddToCartHover(true)} onMouseLeave={() => setIsAddToCartHover(false)}
                disabled={isAdded || !canAddToCart}
                className={`flex-1 h-14 rounded-2xl font-black uppercase text-xs tracking-widest transition-all flex items-center justify-center gap-3 shadow-xl ${isAdded ? 'bg-green-500 text-white scale-95 shadow-green-500/20' : !canAddToCart ? 'bg-neutral-200 text-neutral-500 shadow-none cursor-not-allowed' : 'hover:-translate-y-1 active:translate-y-0'}`}
                style={!isAdded && canAddToCart ? { background: isAddToCartHover ? 'var(--storify-btn-primary-hover-bg)' : 'var(--storify-btn-primary-bg)', color: isAddToCartHover ? 'var(--storify-btn-primary-hover-fg)' : 'var(--storify-btn-primary-fg)', boxShadow: isAddToCartHover ? '0 10px 25px color-mix(in srgb, var(--storify-btn-primary-hover-bg) 28%, transparent)' : '0 8px 20px color-mix(in srgb, var(--storify-btn-primary-bg) 24%, transparent)' } : undefined}
              >
                {isAdded ? (
                  <>
                    <CheckCircle size={20} /> {t('product_added')}
                  </>
                ) : !canAddToCart && variantsSelected ? (
                  <>{t('product_out_of_stock_short')}</>
                ) : (
                  <>
                    <ShoppingBag size={20} /> {t('product_add_to_cart')}
                  </>
                )}
              </button>
            )}

            {showWishlist && (
              <button type="button" onClick={() => onToggleWishlist?.(product as any)} className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-all ${isWishlisted ? 'bg-red-50 border-red-100 text-red-500' : 'bg-white border-neutral-100 text-neutral-400 hover:text-red-500 hover:border-red-100'}`}>
                <Heart size={22} fill={isWishlisted ? 'currentColor' : 'none'} />
              </button>
            )}

            {showShare && (
              <button type="button" onClick={handleShare} className="w-14 h-14 rounded-2xl flex items-center justify-center border border-neutral-100 text-neutral-400 hover:text-brand-accent hover:border-brand-accent/20 transition-all">
                <Share2 size={22} />
              </button>
            )}
          </div>
        </div>
      </div>

      {trustBadges.length > 0 && (
        <div className="grid grid-cols-2 gap-4 pt-6">
          {trustBadges.map((badge: any, i: number) => (
            <div key={i} className="flex items-center gap-3 p-4 rounded-2xl bg-neutral-50 border border-neutral-100">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-brand-accent shadow-sm">
                <DynamicIcon name={badge.icon || 'CheckCircle'} size={18} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">{badge.title}</p>
                <p className="text-xs font-bold">{badge.subtitle}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const isTop = layout === 'image_top';
  const isRight = layout === 'image_right';

  return (
    <div style={{ ...sectionSchemeVars, background: 'var(--storify-bg)', color: 'var(--storify-text)', ['--brand-primary' as string]: 'var(--storify-primary)', ['--brand-accent' as string]: 'var(--storify-link)', ['--color-brand-primary' as string]: 'var(--storify-primary)', ['--color-brand-accent' as string]: 'var(--storify-link)' }}>
      <section className="py-12 md:py-24 px-6 max-w-7xl mx-auto">
        <div className={`grid gap-12 md:gap-20 items-start ${isTop ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
          {isTop ? <>{imageBlock}{detailsBlock}</> : <>{isRight ? detailsBlock : imageBlock}{isRight ? imageBlock : detailsBlock}</>}
        </div>
      </section>

      {relatedProducts.length > 0 && (
        <section className="py-20 px-6 max-w-7xl mx-auto border-t" style={{ borderColor: 'var(--storify-border)' }}>
          <div className="flex items-end justify-between mb-12">
            <div className="space-y-2">
              <p className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: 'var(--storify-primary)' }}>{relatedTitle}</p>
              <h2 className="text-3xl md:text-4xl font-black tracking-tighter" style={{ color: 'var(--storify-headings)' }}>
                {t('product_related_title')}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => navigateStorefront('/shop')}
              className="flex items-center gap-2 text-sm font-black uppercase tracking-widest opacity-40 hover:opacity-100 transition-colors"
              style={{ color: 'var(--storify-text)' }}
            >
              {t('product_related_view_all')} {isRtl ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {relatedProducts.map((p) => <ProductCard key={p.id} product={p} onAddToCart={onAddToCart || (() => { })} onToggleWishlist={onToggleWishlist || (() => { })} isWishlisted={wishlist?.some((wp) => wp.id === p.id) || false} />)}
          </div>
        </section>
      )}

      {showRecentlyViewed && recentlyViewed.length > 0 && (
        <section className="py-20 px-6 max-w-7xl mx-auto border-t" style={{ borderColor: 'var(--storify-border)', background: 'var(--storify-bg)', opacity: 0.95 }}>
          <div className="flex items-end justify-between mb-12">
            <div className="space-y-2">
              <p className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: 'var(--storify-primary)' }}>
                {t('browse_history_kicker')}
              </p>
              <h2 className="text-3xl md:text-4xl font-black tracking-tighter flex items-center gap-3" style={{ color: 'var(--storify-headings)' }}>
                <History style={{ color: 'var(--storify-primary)' }} /> {recentlyViewedTitle}
              </h2>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {recentlyViewed.map((p) => <ProductCard key={p.id} product={p} onAddToCart={onAddToCart || (() => { })} onToggleWishlist={onToggleWishlist || (() => { })} isWishlisted={wishlist?.some((wp) => wp.id === p.id) || false} />)}
          </div>
        </section>
      )}
    </div>
  );
};

export default ProductDetailsSettingsSection;
