import React from 'react';
import { ShoppingBag, Heart, Eye, Plus } from 'lucide-react';
import { motion } from 'motion/react';
import { Product } from '../constants';
import { useThemeConfig } from '../ThemeContext';
import { navigateStorefront } from '@storify/theme';
import {
  formatProductCompareAtPriceLabel,
  formatProductPriceLabel,
  getProductDiscountPercentage,
  getProductPriceDisplay,
  needsVariantSelectionForProduct,
} from '@storify/theme';
import { interpolateTheme } from '../locales';
import { isPurchasable, getMaxOrderableQuantity } from '@storify/theme';
import { productImageAspectClass, productImageObjectFitClass } from '@storify/theme';

interface ProductCardProps {
  product: Product;
  onQuickView?: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  onToggleWishlist: (product: Product) => void;
  isWishlisted: boolean;
}

function toRadiusCss(value: unknown): string {
  if (value == null || value === '') return '16px';
  if (typeof value === 'number') return `${value}px`;
  const s = String(value).trim();
  if (s === 'none' || s === '0px') return '0px';
  if (s === 'sm' || s === '4px') return '4px';
  if (s === 'md' || s === '8px') return '8px';
  if (s === 'lg' || s === '16px') return '16px';
  if (s === 'full' || s === '24px') return '24px';
  return s || '16px';
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onAddToCart,
  onToggleWishlist,
  onQuickView,
  isWishlisted,
}) => {
  const { settings, store, isRtl, t } = useThemeConfig();
  const radius = toRadiusCss(settings?.borderRadius);
  const currency = store?.currency || 'SAR';
  const productAspectClass = productImageAspectClass(settings as Record<string, unknown>);
  const productFitClass = productImageObjectFitClass(settings as Record<string, unknown>);

  // Read card style setting
  const cardStyle = settings?.product_card_style || 'classic';

  const stop = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const needPdpForVariants =
    needsVariantSelectionForProduct(product) ||
    Boolean((product as Product & { hasVariants?: boolean }).hasVariants) ||
    (Array.isArray(product.options) && product.options.length > 0);

  const maxOrderable = !needPdpForVariants ? getMaxOrderableQuantity(product as any, undefined) : 1;
  const isOutOfStock = !needPdpForVariants && maxOrderable <= 0;
  const priceDisplay = getProductPriceDisplay(product);
  const formatPriceRange = (min: string, max: string) =>
    interpolateTheme(t('product_price_range'), { min, max });
  const priceLabel = formatProductPriceLabel(product, currency, { formatRange: formatPriceRange });
  const compareAtLabel = formatProductCompareAtPriceLabel(product, currency, {
    formatRange: formatPriceRange,
  });
  const hasDiscount = priceDisplay.hasDiscount && !priceDisplay.isRange && !priceDisplay.compareAtIsRange;
  const discountPercentage = getProductDiscountPercentage(product);

  const goProduct = () => {
    navigateStorefront(`/product/${product.id}`);
  };

  // 1. MINIMALIST SCANDINAVIAN STYLE
  if (cardStyle === 'minimal') {
    return (
      <div className="group relative flex flex-col h-full bg-transparent text-start font-sans">
        {/* Image Box */}
        <div
          className={`relative overflow-hidden cursor-pointer rounded-2xl bg-neutral-50/50 border border-neutral-100 ${productAspectClass}`}
          onClick={goProduct}
        >
          {/* Discount tag inside image */}
          {hasDiscount && !isOutOfStock && (
            <span className="absolute top-3 start-3 z-10 bg-amber-500/10 backdrop-blur-md text-amber-600 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg">
              -{discountPercentage}%
            </span>
          )}
          {isOutOfStock && (
            <span className="absolute top-3 start-3 z-10 bg-neutral-900/10 backdrop-blur-md text-neutral-800 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg">
              {t('featured_out_of_stock') || 'نفدت'}
            </span>
          )}

          {/* Main Image */}
          {product.image && String(product.image).trim() !== '' ? (
            <img
              src={product.image}
              alt={product.name}
              className={`w-full h-full ${productFitClass} transition-all duration-700 group-hover:scale-105 ${isOutOfStock ? 'opacity-30 grayscale' : ''}`}
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center font-bold text-5xl opacity-15">
              {product.name?.charAt(0) || '?'}
            </div>
          )}

          {/* Quick-add floating round button at bottom corner */}
          {!isOutOfStock && (
            <button
              type="button"
              onClick={(e) => {
                stop(e);
                if (needPdpForVariants) { goProduct(); return; }
                onAddToCart(product);
              }}
              className="absolute bottom-3 end-3 z-20 w-11 h-11 rounded-full bg-slate-950 text-white flex items-center justify-center shadow-lg transition-transform duration-300 hover:scale-110 active:scale-95 hover:bg-brand-accent focus:outline-none"
              title={needPdpForVariants ? t('product_view_options') : t('featured_add_to_cart')}
            >
              <Plus size={18} strokeWidth={2.5} />
            </button>
          )}

          {/* Mini Wishlist corner button */}
          <button
            type="button"
            onClick={(e) => { stop(e); onToggleWishlist(product); }}
            className={`absolute top-3 end-3 z-20 w-8 h-8 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
              isWishlisted ? 'opacity-100 text-red-500' : 'text-neutral-400 hover:text-red-500'
            }`}
          >
            <Heart size={14} fill={isWishlisted ? 'currentColor' : 'none'} strokeWidth={2.5} />
          </button>
        </div>

        {/* Minimal details */}
        <div className="mt-4 flex flex-col flex-grow">
          <span className="text-[9px] font-black uppercase tracking-widest text-neutral-400 mb-1">
            {product.category || t('category_uncategorized')}
          </span>
          <h3 
            className="font-bold text-slate-800 text-sm leading-tight hover:text-slate-950 transition-colors cursor-pointer line-clamp-1"
            onClick={goProduct}
          >
            {product.name}
          </h3>

          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-sm font-black text-slate-900">
              {priceLabel}
            </span>
            {compareAtLabel && (
              <span className="text-[11px] line-through font-bold text-neutral-300">
                {compareAtLabel}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 2. GLASSMORPHISM & MODERN STYLE
  if (cardStyle === 'glass_modern') {
    return (
      <motion.div
        whileHover={{ y: -6 }}
        transition={{ duration: 0.3 }}
        className="group relative flex flex-col h-full overflow-hidden bg-white/70 backdrop-blur-md border border-neutral-100/80 shadow-lg hover:shadow-2xl hover:border-brand-accent/20 transition-all p-3"
        style={{ borderRadius: radius }}
      >
        {/* Image Box */}
        <div
          className={`relative overflow-hidden cursor-pointer rounded-2xl bg-neutral-50/50 ${productAspectClass}`}
          onClick={goProduct}
        >
          {/* Tag */}
          {hasDiscount && !isOutOfStock && (
            <span className="absolute top-3 start-3 z-15 bg-gradient-to-r from-red-500 to-rose-600 text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shadow-md shadow-red-500/10">
              خصم {discountPercentage}%
            </span>
          )}
          {isOutOfStock && (
            <span className="absolute top-3 start-3 z-15 bg-neutral-800 text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shadow-md">
              نفدت
            </span>
          )}

          {/* Main Image */}
          {product.image && String(product.image).trim() !== '' ? (
            <img
              src={product.image}
              alt={product.name}
              className={`w-full h-full ${productFitClass} transition-transform duration-700 group-hover:scale-105 ${isOutOfStock ? 'opacity-35 grayscale' : ''}`}
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center font-bold text-5xl opacity-15">
              {product.name?.charAt(0) || '?'}
            </div>
          )}

          {/* Glass Actions Overlay */}
          <div className="absolute top-3 end-3 z-15 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <button
              type="button"
              onClick={(e) => { stop(e); onToggleWishlist(product); }}
              className={`w-8 h-8 rounded-full bg-white/95 backdrop-blur-md flex items-center justify-center shadow-md transition-colors ${
                isWishlisted ? 'text-red-500' : 'text-neutral-500 hover:text-red-500'
              }`}
            >
              <Heart size={14} fill={isWishlisted ? 'currentColor' : 'none'} strokeWidth={2.5} />
            </button>
            {onQuickView && (
              <button
                type="button"
                onClick={(e) => { stop(e); onQuickView(product); }}
                className="w-8 h-8 rounded-full bg-white/95 backdrop-blur-md flex items-center justify-center shadow-md text-neutral-500 hover:text-brand-accent transition-colors"
              >
                <Eye size={14} strokeWidth={2.5} />
              </button>
            )}
          </div>
        </div>

        {/* Content details */}
        <div className="mt-4 flex flex-col flex-grow text-start px-1">
          <span className="text-[9px] font-black uppercase tracking-widest text-brand-accent mb-1">
            {product.category || t('category_uncategorized')}
          </span>
          <h3 
            className="font-black text-slate-800 text-base leading-tight hover:text-brand-primary transition-colors cursor-pointer line-clamp-1"
            onClick={goProduct}
          >
            {product.name}
          </h3>

          <div className="mt-2 flex items-baseline gap-2 mb-4">
            <span className="text-base font-black text-slate-900">
              {priceLabel}
            </span>
            {compareAtLabel && (
              <span className="text-xs line-through font-bold text-neutral-300">
                {compareAtLabel}
              </span>
            )}
          </div>

          {/* Full-width elegant primary add to cart button */}
          {!isOutOfStock && (
            <button
              type="button"
              onClick={(e) => {
                stop(e);
                if (needPdpForVariants) { goProduct(); return; }
                onAddToCart(product);
              }}
              className="w-full py-2.5 mt-auto rounded-xl font-black text-[10px] uppercase tracking-widest text-white transition-all duration-300 flex items-center justify-center gap-2 active:translate-y-0.5"
              style={{
                backgroundColor: 'var(--storify-btn-primary-bg)',
                boxShadow: `0 6px 15px color-mix(in srgb, var(--storify-btn-primary-bg) 18%, transparent)`
              }}
            >
              <ShoppingBag size={13} />
              <span>{needPdpForVariants ? t('product_view_options') : t('featured_add_to_cart')}</span>
            </button>
          )}
        </div>
      </motion.div>
    );
  }

  // 3. CLASSIC PREMIUM STYLE (DEFAULT)
  return (
    <motion.div
      layout
      whileHover={{ y: -8 }}
      transition={{ duration: 0.3 }}
      className="group relative flex flex-col h-full transition-all hover:shadow-2xl hover:shadow-neutral-200/50"
      style={{ borderRadius: radius, background: 'var(--storify-bg)' }}
    >
      {/* Image Container */}
      <div
        className={`relative overflow-hidden cursor-pointer ${productAspectClass}`}
        style={{ borderRadius: radius, background: 'var(--storify-bg)' }}
        onClick={goProduct}
      >
        {/* Badges */}
        <div className="absolute top-4 start-4 z-20 flex flex-col gap-2">
          {hasDiscount && !isOutOfStock && (
            <span className="bg-red-500 text-white text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shadow-lg">
              خصم {discountPercentage}%
            </span>
          )}
          {isOutOfStock && (
            <span className="text-white text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shadow-lg" style={{ background: 'var(--storify-headings)' }}>
              نفدت الكمية
            </span>
          )}
        </div>

        {/* Product Image */}
        {product.image && String(product.image).trim() !== '' ? (
          <img
            src={product.image}
            alt={product.name}
            className={`w-full h-full ${productFitClass} transition-transform duration-1000 group-hover:scale-110 ${isOutOfStock ? 'opacity-40 grayscale' : ''}`}
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center font-black text-6xl select-none opacity-20" style={{ color: 'var(--storify-text)' }}>
            {product.name?.charAt(0) || '?'}
          </div>
        )}

        {/* Overlay Actions */}
        <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={(e) => { stop(e); onToggleWishlist(product); }}
            className={`p-3 rounded-full shadow-xl transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 delay-[0ms] ${
              isWishlisted ? 'bg-white text-red-500' : 'bg-white text-slate-900 hover:text-red-500'
            }`}
          >
            <Heart className="w-5 h-5" fill={isWishlisted ? 'currentColor' : 'none'} strokeWidth={2.5} />
          </button>
          
          {onQuickView && (
            <button
              type="button"
              onClick={(e) => { stop(e); onQuickView(product); }}
              className="p-3 bg-white text-slate-900 rounded-full shadow-xl transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 delay-[50ms] hover:bg-slate-900 hover:text-white"
            >
              <Eye className="w-5 h-5" strokeWidth={2.5} />
            </button>
          )}
        </div>

        {/* Quick Add Button */}
        {!isOutOfStock && (
          <div className="absolute bottom-0 left-0 right-0 p-4 md:translate-y-full group-hover:translate-y-0 transition-transform duration-300 z-20">
            <button
              type="button"
              onClick={(e) => {
                stop(e);
                if (needPdpForVariants) { goProduct(); return; }
                onAddToCart(product);
              }}
              className="w-full py-3 font-black text-[10px] md:text-xs uppercase tracking-[0.1em] md:tracking-[0.2em] rounded-xl shadow-2xl transition-colors duration-300 flex items-center justify-center gap-2"
              style={{ 
                background: 'var(--storify-btn-primary-bg)', 
                color: 'var(--storify-btn-primary-fg)' 
              }}
            >
              <ShoppingBag className="w-3.5 h-3.5 md:w-4 md:h-4" />
              <span>{needPdpForVariants ? t('product_view_options') : t('featured_add_to_cart')}</span>
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className={`mt-4 md:mt-6 flex flex-col flex-grow text-start px-1`}>
        <div className="flex justify-between items-start gap-4 mb-2">
          <div className={`flex flex-col items-start w-full`}>
            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest mb-1 opacity-40" style={{ color: 'var(--storify-text)' }}>
              {product.category || t('category_uncategorized')}
            </span>
            <h3 
              className="font-black text-base md:text-lg leading-tight transition-colors line-clamp-2 w-full"
              style={{ color: 'var(--storify-headings)' }}
              onClick={goProduct}
              role="button"
            >
              {product.name}
            </h3>
          </div>
        </div>

        <div className={`mt-auto pt-3 md:pt-4 flex items-center ${isRtl ? 'justify-start' : 'justify-start'} gap-2 md:gap-3`}>
          {compareAtLabel && (
            <span className="text-xs md:text-sm line-through font-bold opacity-30" style={{ color: 'var(--storify-text)' }}>
              {compareAtLabel}
            </span>
          )}
          <span className="text-lg md:text-xl font-black" style={{ color: 'var(--storify-primary)' }}>
            {priceLabel}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export default ProductCard;
