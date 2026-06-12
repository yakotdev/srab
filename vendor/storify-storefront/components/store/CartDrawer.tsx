import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { ShoppingBag, Trash, Tag } from '../ui/Icons';
import { useNavigate } from 'react-router-dom';
import { usePreserveSearch } from '../../lib/usePreserveSearch';

interface CartDrawerProps {
    isOpen: boolean;
    onClose: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ isOpen, onClose }) => {
    const { theme, cart, removeFromCart, updateQuantity, discounts, t, formatPrice, language } = useStore();
    const [couponCode, setCouponCode] = useState('');
    const [appliedDiscount, setAppliedDiscount] = useState<{ code: string, percentage: number } | null>(null);
    const [couponError, setCouponError] = useState('');
    const navigate = useNavigate();
    const to = usePreserveSearch();

    const primaryStyle = { backgroundColor: theme.primaryColor, color: '#ffffff' };

    const cartSubtotal = cart.reduce((acc, item) => acc + item.price * (item.quantity || 1), 0);
    const discountAmount = appliedDiscount ? (cartSubtotal * appliedDiscount.percentage) / 100 : 0;
    const cartTotal = cartSubtotal - discountAmount;

    const handleApplyCoupon = () => {
        setCouponError('');
        const discount = discounts.find(d => d.code === couponCode && d.status === 'Active');
        if (discount) {
            setAppliedDiscount({ code: discount.code, percentage: discount.percentage });
            setCouponCode('');
        } else {
            setCouponError(language === 'ar' ? 'الكود غير صالح' : 'Invalid code');
        }
    };

    const handleCheckout = () => {
        onClose();
        navigate(to('/checkout'));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex justify-end">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md transition-opacity duration-500" onClick={onClose}></div>
            <div className="relative w-full max-w-md bg-white h-full shadow-[0_0_100px_rgba(0,0,0,0.1)] flex flex-col animate-slide-in-right z-[101] font-sans">
                <div className="p-8 pb-6 flex justify-between items-center border-b border-slate-50">
                    <div className="flex flex-col">
                        <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">{t('cart_title')}</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <div className="w-1 h-1 rounded-full bg-slate-300" />
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                {cart.length} {cart.length === 1 ? (language === 'ar' ? 'منتج' : 'Item') : (language === 'ar' ? 'منتجات' : 'Items')}
                            </span>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all active:scale-95">
                        <span className="text-lg">✕</span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar px-8 py-6 space-y-6">
                    {cart.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-32 text-center">
                            <div className="w-20 h-20 rounded-3xl bg-slate-50 flex items-center justify-center mb-6">
                                <ShoppingBag className="w-8 h-8 text-slate-200" />
                            </div>
                            <p className="text-sm font-black text-slate-300 uppercase tracking-widest">{t('cart_empty')}</p>
                            <button 
                                onClick={onClose}
                                className="mt-8 text-xs font-black text-slate-900 underline underline-offset-4 hover:text-slate-600 transition-colors uppercase tracking-widest"
                            >
                                {language === 'ar' ? 'ابدأ التسوق الآن' : 'Start Shopping'}
                            </button>
                        </div>
                    ) : (
                        cart.map((item, idx) => (
                            <div key={`${item.id}-${idx}`} className="group flex gap-5 items-start animate-fade-in">
                                <div className="w-24 h-24 bg-slate-50 rounded-2xl overflow-hidden shrink-0 border border-slate-100 shadow-sm relative group-hover:shadow-md transition-shadow">
                                    {(item.selectedVariant?.image || item.image) && String(item.selectedVariant?.image || item.image).trim() !== '' ? (
                                      <img src={item.selectedVariant?.image || item.image} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt={item.name} />
                                    ) : (
                                      <div className="w-full h-full bg-slate-50 flex items-center justify-center text-slate-200 text-xl font-black" aria-hidden>{item.name?.charAt(0) || '?'}</div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0 flex flex-col py-1">
                                    <h4 className="font-black text-slate-900 text-sm line-clamp-1 mb-0.5 group-hover:text-slate-700 transition-colors">{item.name}</h4>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate mb-2">{item.selectedVariant?.title || item.category}</p>
                                    <p className="font-black text-slate-900 text-base mb-3">{formatPrice(item.price)}</p>
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-3 bg-slate-50 rounded-lg px-2 py-1 border border-slate-100/50">
                                            <button
                                                onClick={() => updateQuantity(item.id, (item.quantity || 1) - 1, item.selectedVariant?._id)}
                                                className="w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-900 hover:bg-white transition-all active:scale-90 font-black"
                                            >
                                                -
                                            </button>
                                            <span className="text-[11px] font-black w-4 text-center text-slate-900">{item.quantity || 1}</span>
                                            <button
                                                onClick={() => updateQuantity(item.id, (item.quantity || 1) + 1, item.selectedVariant?._id)}
                                                className="w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-900 hover:bg-white transition-all active:scale-90 font-black"
                                            >
                                                +
                                            </button>
                                        </div>
                                        <button 
                                            onClick={() => removeFromCart(item.id, item.selectedVariant?._id)} 
                                            className="text-[9px] font-black text-slate-300 hover:text-red-500 px-2 py-1 uppercase tracking-widest transition-colors"
                                        >
                                            {language === 'ar' ? 'حذف' : 'Remove'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {cart.length > 0 && (
                    <div className="p-8 bg-slate-50/50 border-t border-slate-100">
                        {/* Coupon Section */}
                        <div className="mb-8">
                            <div className="flex items-center gap-2 mb-3">
                                <Tag className="w-3.5 h-3.5 text-slate-900" />
                                <span className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">{t('promo_code')}</span>
                            </div>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={couponCode}
                                    onChange={(e) => setCouponCode(e.target.value)}
                                    placeholder={language === 'ar' ? 'أدخل الكود...' : 'PROMO10'}
                                    className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all placeholder:text-slate-200"
                                />
                                <button
                                    onClick={handleApplyCoupon}
                                    className="bg-slate-900 text-white px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-200"
                                >
                                    {language === 'ar' ? 'تطبيق' : 'Apply'}
                                </button>
                            </div>
                            {couponError && <p className="text-red-500 text-[10px] mt-2 font-bold uppercase tracking-wider">{couponError}</p>}
                            {appliedDiscount && (
                                <div className="flex justify-between items-center text-[10px] text-emerald-600 font-black mt-3 bg-white border border-emerald-100 p-3 rounded-xl shadow-sm uppercase tracking-wider">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        <span>{appliedDiscount.code} (-{appliedDiscount.percentage}%)</span>
                                    </div>
                                    <button onClick={() => setAppliedDiscount(null)} className="text-emerald-800 hover:underline">{t('remove_label')}</button>
                                </div>
                            )}
                        </div>

                        <div className="space-y-3 mb-8">
                            <div className="flex justify-between text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                                <span>{t('subtotal')}</span>
                                <span className="text-slate-900">{formatPrice(cartSubtotal)}</span>
                            </div>
                            {appliedDiscount && (
                                <div className="flex justify-between text-[11px] font-black text-emerald-600 uppercase tracking-widest">
                                    <span>{t('discount_label')}</span>
                                    <span>-{formatPrice(discountAmount)}</span>
                                </div>
                            )}
                            <div className="flex justify-between items-end pt-5 border-t border-slate-200/50">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] mb-0.5">{t('total')}</span>
                                    {language === 'ar' && <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">المجموع النهائي</span>}
                                </div>
                                <span className="text-3xl font-black text-slate-900 tracking-tighter leading-none">{formatPrice(cartTotal)}</span>
                            </div>
                        </div>
                        
                        <button
                            onClick={handleCheckout}
                            className="w-full py-5 rounded-2xl bg-slate-900 text-white text-[13px] font-black uppercase tracking-[0.25em] shadow-2xl shadow-slate-200 hover:bg-slate-800 transition-all transform hover:-translate-y-1 active:scale-[0.98] flex items-center justify-center gap-3"
                        >
                            <span>{t('checkout')}</span>
                            <div className="w-1.5 h-1.5 rounded-full bg-white/30" />
                        </button>

                        <p className="mt-6 text-[9px] font-bold text-slate-300 uppercase tracking-[0.15em] text-center leading-relaxed">
                            {language === 'ar' ? 'الطلب آمن ومعالج بالكامل' : 'Your order is secure and fully processed'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};
