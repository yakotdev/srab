import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBag, Trash2, ArrowRight, X } from 'lucide-react';
import { Product } from '../constants';
import { navigateStorefront } from '@storify/theme';
import { formatPrice } from '@storify/theme';
import { useThemeConfig } from '../ThemeContext';
import { productImageObjectFitClass } from '@storify/theme';

function cartLineUnitPrice(item: Product): number {
  const sv = item.selectedVariant;
  const vp = sv && typeof sv.price === 'number' && !Number.isNaN(sv.price) ? sv.price : undefined;
  const base = Number(item.price);
  const n = vp !== undefined ? vp : base;
  return Number.isFinite(n) ? n : 0;
}

interface CartSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  cart: Product[];
  onRemove: (item: Product) => void;
}

const CartSidebar: React.FC<CartSidebarProps> = ({ isOpen, onClose, cart, onRemove }) => {
  const { settings, store, isRtl, t } = useThemeConfig();
  const primary = String(settings?.primaryColor || '#0f172a').trim() || '#0f172a';
  const productFitClass = productImageObjectFitClass(settings as Record<string, unknown>);
  const currency = store?.currency;
  
  // Custom styles settings
  const cartStyle = settings?.cart_style || 'classic';

  const total = cart.reduce((sum, item) => {
    const qty = Number((item as Product & { quantity?: number }).quantity) || 1;
    return sum + cartLineUnitPrice(item) * qty;
  }, 0);

  const handleCheckout = () => {
    navigateStorefront('/checkout');
  };

  // Define layout structures based on selected style
  const isClassic = cartStyle === 'classic';
  const isFloatingGlass = cartStyle === 'floating_glass';
  const isBottomPanel = cartStyle === 'bottom_panel';

  // Animation variants
  const getSidebarAnimation = () => {
    if (isBottomPanel) {
      // Mobile slides up, desktop slides in smoothly
      return {
        initial: { y: '100%', opacity: 0.9 },
        animate: { y: 0, opacity: 1 },
        exit: { y: '100%', opacity: 0.9 },
        transition: { type: 'spring', damping: 30, stiffness: 250 }
      };
    }
    if (isFloatingGlass) {
      return {
        initial: { opacity: 0, scale: 0.92, x: isRtl ? -60 : 60 },
        animate: { opacity: 1, scale: 1, x: 0 },
        exit: { opacity: 0, scale: 0.92, x: isRtl ? -60 : 60 },
        transition: { type: 'spring', damping: 26, stiffness: 220 }
      };
    }
    // Classic sidebar
    return {
      initial: { x: isRtl ? '-100%' : '100%' },
      animate: { x: 0 },
      exit: { x: isRtl ? '-100%' : '100%' },
      transition: { type: 'spring', damping: 28, stiffness: 200 }
    };
  };

  const containerClass = () => {
    if (isFloatingGlass) {
      return "relative w-full max-w-md h-[calc(100vh-3rem)] my-6 mx-6 rounded-[2.5rem] bg-white/80 backdrop-blur-xl border border-white/40 shadow-2xl p-8 flex flex-col self-center";
    }
    if (isBottomPanel) {
      // Slides from bottom, aligns at bottom on mobile and elegant side panel on desktop
      return "relative w-full max-w-md md:max-w-lg h-[82vh] md:h-[calc(100vh-3rem)] rounded-t-[3rem] md:rounded-[2.5rem] bg-white border border-neutral-100/50 shadow-2xl p-8 flex flex-col self-end md:self-center md:my-6 md:mx-6";
    }
    // Classic
    return "relative w-full max-w-md h-full bg-white shadow-2xl p-8 flex flex-col";
  };

  const wrapperPlacementClass = () => {
    if (isBottomPanel) {
      return "fixed inset-0 z-[100] flex justify-center md:justify-end";
    }
    return "fixed inset-0 z-[100] flex justify-end";
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className={wrapperPlacementClass()} dir={isRtl ? 'rtl' : 'ltr'}>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />

          {/* Sidebar Panel Container */}
          <motion.div
            {...getSidebarAnimation()}
            className={containerClass()}
          >
            {/* Drag Handle Indicator for Bottom Panel on Mobile */}
            {isBottomPanel && (
              <div className="w-12 h-1 bg-neutral-200 rounded-full mx-auto mb-6 shrink-0 block md:hidden" />
            )}

            {/* Header */}
            <div className="flex justify-between items-center mb-8 shrink-0">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${
                  isFloatingGlass 
                    ? 'bg-brand-accent/10 border-brand-accent/20 text-brand-accent' 
                    : 'bg-slate-50 border-slate-100 text-slate-900'
                }`}>
                  <ShoppingBag size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-black tracking-tight text-slate-900">{t('cart_title')}</h2>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
                    {t('cart_items_count').replace('{{count}}', String(cart.length))}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2.5 rounded-full hover:bg-slate-50 transition-colors text-slate-400 hover:text-slate-900"
              >
                <X size={20} />
              </button>
            </div>

            {/* Items List */}
            <div className="flex-1 overflow-y-auto pr-2 space-y-6 scrollbar-hide">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40">
                  <ShoppingBag size={64} className="stroke-1" />
                  <p className="text-sm font-bold uppercase tracking-widest">{t('cart_empty')}</p>
                </div>
              ) : (
                cart.map((item, idx) => {
                  const sv = item.selectedVariant;
                  const variantLabel = sv?.title ?? sv?.name ?? '';
                  const displayImage = (sv?.image && String(sv.image).trim()) || item.image;
                  const qty = Number((item as Product & { quantity?: number }).quantity) || 1;
                  const unit = cartLineUnitPrice(item);
                  const compareAt = sv?.compareAtPrice ?? item.compareAtPrice;

                  return (
                    <div 
                      key={`${String(item.id)}-${sv?.id ?? sv?.title ?? idx}`} 
                      className={`flex gap-4 items-center p-3 rounded-2xl transition-all duration-300 ${
                        isFloatingGlass 
                          ? 'bg-white/50 border border-white/30 backdrop-blur-sm hover:bg-white/80' 
                          : 'hover:bg-neutral-50/50'
                      }`}
                    >
                      <div className="w-20 h-20 bg-slate-100 rounded-xl overflow-hidden shrink-0 border border-neutral-100">
                        {displayImage ? (
                          <img src={displayImage} className={`w-full h-full ${productFitClass}`} alt={item.name} referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full bg-slate-200 flex items-center justify-center text-slate-400 text-sm font-bold" aria-hidden>
                            {item.name?.charAt(0) || '?'}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 text-start">
                        <h4 className="font-bold text-slate-900 line-clamp-1 text-sm sm:text-base">{item.name}</h4>
                        {variantLabel ? (
                          <p className="text-xs text-brand-accent font-semibold mt-0.5">{variantLabel}</p>
                        ) : (
                          <p className="text-xs text-slate-400 mt-0.5">{item.category}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5 tabular-nums">
                          <span className="font-black text-slate-900 text-sm">{formatPrice(unit, currency)}</span>
                          {compareAt != null && compareAt > unit && (
                            <span className="text-xs text-slate-300 line-through">{formatPrice(compareAt, currency)}</span>
                          )}
                          {qty > 1 && (
                            <span className="text-slate-400 font-bold text-[10px] bg-slate-100 px-1.5 py-0.5 rounded-md ms-1">
                              × {qty}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemove(item)}
                        className="text-neutral-300 hover:text-red-500 p-2 shrink-0 transition-colors"
                        aria-label={t('cart_remove')}
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Subtotal and Checkout Section */}
            {cart.length > 0 && (
              <div className="border-t border-slate-100 pt-6 mt-4 space-y-4 shrink-0">
                <div className="flex justify-between items-center text-slate-900 gap-3">
                  <span className="text-xl font-black tabular-nums">{formatPrice(total, currency)}</span>
                  <span className="text-xs font-black uppercase tracking-widest text-slate-400 shrink-0">{t('cart_subtotal')}</span>
                </div>
                <p className="text-[10px] text-slate-400 text-center">{t('cart_shipping_taxes_note')}</p>
                <button
                  type="button"
                  onClick={handleCheckout}
                  className="w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-white shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 flex items-center justify-center gap-2"
                  style={{ 
                    backgroundColor: primary,
                    boxShadow: `0 10px 25px color-mix(in srgb, ${primary} 24%, transparent)`
                  }}
                >
                  <span>{t('checkout')}</span>
                  <ArrowRight size={15} className={`inline ${isRtl ? 'rotate-180' : ''}`} />
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CartSidebar;
