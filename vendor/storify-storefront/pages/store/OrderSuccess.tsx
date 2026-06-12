import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useStore } from '../../context/StoreContext';
import { usePreserveSearch } from '../../lib/usePreserveSearch';
import { ShoppingBag, UserCheck } from '../../components/ui/Icons';
import { useStripeReturnFrom3DS } from '../../components/store/StripePayment';

const OrderSuccess: React.FC = () => {
  const navigate = useNavigate();
  const to = usePreserveSearch();
  const { t, theme, clearCart, storeConfig, language } = useStore();
  const { orderId, paymentFailed, resolving, error } = useStripeReturnFrom3DS();

  useEffect(() => {
    if (orderId && !paymentFailed) clearCart();
  }, [orderId, paymentFailed, clearCart]);

  const primaryStyle = { backgroundColor: theme.primaryColor, color: '#ffffff' };
  const primaryHex = theme.primaryColor || '#0f172a';

  const storeName = storeConfig.name?.trim() || 'Store';

  const loadingLabel = language === 'ar' ? 'جاري تأكيد الطلب...' : 'Confirming your order…';

  if (resolving) {
    return (
      <div
        className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-16"
        style={{
          background: `linear-gradient(165deg, ${primaryHex}12 0%, #f8fafc 42%, #ffffff 100%)`,
        }}
      >
        <div className="w-full max-w-md rounded-[2rem] border border-slate-200/80 bg-white/90 p-10 shadow-xl shadow-slate-200/50 backdrop-blur-sm text-center">
          <div
            className="mx-auto mb-6 h-14 w-14 rounded-2xl border-4 border-slate-100 border-t-transparent animate-spin"
            style={{ borderTopColor: primaryHex }}
            aria-hidden
          />
          <p className="text-sm font-bold text-slate-600">{loadingLabel}</p>
          <p className="mt-2 text-xs text-slate-400">
            {language === 'ar' ? 'لحظات فقط — لا تغلق الصفحة.' : 'Just a moment — please keep this page open.'}
          </p>
        </div>
      </div>
    );
  }

  if (error || paymentFailed) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-4 py-12 animate-fade-in font-sans"
        style={{
          background: 'radial-gradient(circle at 10% 20%, #fff1f2 0%, #fcfcfd 100%)',
        }}
      >
        <div className="mb-12 flex items-center justify-center">
          <Link to={to('/shop')} className="active:scale-95 transition-transform">
            {storeConfig.logo && String(storeConfig.logo).trim() !== '' ? (
              <img src={storeConfig.logo} alt={storeName} className="h-10 w-auto object-contain" />
            ) : (
              <span className="text-xl font-black tracking-tighter text-slate-900">{storeName}</span>
            )}
          </Link>
        </div>

        <div className="w-full max-w-xl rounded-[2.5rem] border border-slate-200/60 bg-white p-8 text-center shadow-[0_32px_64px_-16px_rgba(0,0,0,0.06)] md:p-16">
          <div className="mx-auto mb-10 flex h-24 w-24 items-center justify-center rounded-3xl bg-slate-900 text-white shadow-2xl shadow-slate-200 -rotate-3 group hover:rotate-0 transition-transform duration-500">
            <div className="h-10 w-10 bg-red-500 rounded-full flex items-center justify-center">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full bg-red-50 px-4 py-1.5 mb-6">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-red-800">
              {language === 'ar' ? 'حدث خطأ في الدفع' : 'Payment Processing Error'}
            </span>
          </div>

          <h1 className="text-3xl font-black tracking-tight text-slate-900 md:text-4xl lg:text-5xl leading-tight">
            {t('payment_failed') || 'فشل الدفع'}
          </h1>
          
          <div className="mt-6 space-y-4">
            <p className="text-base font-bold text-slate-500 leading-relaxed max-w-md mx-auto">
              {error || t('payment_failed_msg') || 'لم تكتمل عملية الدفع. لم يتم إنشاء طلب.'}
            </p>
            <p className="text-sm font-medium text-slate-400">
              {t('payment_failed_try_again') || 'يمكنك العودة إلى الدفع والمحاولة مرة أخرى.'}
            </p>
          </div>

          <div className="mt-12 flex flex-col gap-4 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => navigate(to('/checkout'))}
              className="inline-flex items-center justify-center gap-3 rounded-2xl bg-slate-900 px-10 py-5 text-[13px] font-black text-white uppercase tracking-[0.2em] shadow-xl shadow-slate-200 transition-all hover:bg-slate-800 hover:-translate-y-0.5 active:scale-[0.98]"
            >
              <ShoppingBag className="h-4 w-4 shrink-0" />
              {t('back_to_checkout') || 'العودة للدفع'}
            </button>
            <Link
              to={to('/shop')}
              replace
              className="inline-flex items-center justify-center gap-3 rounded-2xl border-2 border-slate-100 bg-white px-10 py-5 text-[13px] font-black text-slate-900 uppercase tracking-[0.2em] transition-all hover:border-slate-200 hover:bg-slate-50 active:scale-[0.98]"
            >
              {language === 'ar' ? 'تصفح المتجر' : 'Browse shop'}
            </Link>
          </div>
          
          <div className="mt-16 pt-8 border-t border-slate-50">
            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest leading-relaxed text-center max-w-xs mx-auto">
              {language === 'ar'
                ? 'إذا استمرت المشكلة، يرجى الاتصال بفريق الدعم الفني لدينا'
                : 'If problems persist, please contact our support team'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen animate-fade-in px-4 py-12 md:py-24 font-sans selection:bg-emerald-500 selection:text-white"
      style={{
        background: `radial-gradient(circle at 10% 20%, ${primaryHex}08 0%, #fcfcfd 100%)`,
      }}
    >
      <div className="mx-auto max-w-2xl">
        <div className="mb-12 flex items-center justify-center">
          <Link to={to('/shop')} className="active:scale-95 transition-transform">
            {storeConfig.logo && String(storeConfig.logo).trim() !== '' ? (
              <img src={storeConfig.logo} alt={storeName} className="h-10 md:h-12 w-auto object-contain" />
            ) : (
              <span className="text-xl font-black tracking-tighter text-slate-900">{storeName}</span>
            )}
          </Link>
        </div>

        <div className="relative overflow-hidden rounded-[2.5rem] border border-slate-200/60 bg-white p-8 text-center shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] md:p-16">
          <div className="relative z-10">
            <div className="mx-auto mb-10 flex h-24 w-24 items-center justify-center rounded-3xl bg-slate-900 text-white shadow-2xl shadow-slate-200 rotate-3 group hover:rotate-0 transition-transform duration-500">
              <div className="h-10 w-10 bg-emerald-500 rounded-full flex items-center justify-center animate-pulse">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-1.5 mb-6">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-800">
                {language === 'ar' ? 'تم تأكيد طلبك بنجاح' : 'Order Confirmed Successfully'}
              </span>
            </div>

            <h1 className="text-4xl font-black tracking-tight text-slate-900 md:text-5xl lg:text-6xl leading-[1.1]">
              {language === 'ar' ? 'شكراً لثقتك بنا' : t('thank_you')}
            </h1>
            
            <div className="mt-8 space-y-4">
              <p className="text-lg font-bold text-slate-600 leading-relaxed">
                {t('order_confirmed')}
              </p>
              <p className="mx-auto max-w-md text-sm font-medium leading-relaxed text-slate-400">
                {t('order_confirmed_msg')}
              </p>
            </div>

            {orderId && (
              <div className="mt-12 group">
                <div className="inline-flex flex-col items-center gap-2 rounded-3xl border-2 border-slate-50 bg-slate-50/50 px-10 py-6 transition-colors group-hover:bg-slate-50 group-hover:border-slate-100">
                  <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
                    {language === 'ar' ? 'رقم الطلب الخاص بك' : 'Your Order Reference'}
                  </span>
                  <span className="font-mono text-2xl font-black text-slate-900 tracking-wider">#{orderId}</span>
                </div>
              </div>
            )}

            <div className="mt-16 flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Link
                to={to('/shop')}
                replace
                className="inline-flex items-center justify-center gap-3 rounded-2xl bg-slate-900 px-12 py-5 text-[13px] font-black text-white uppercase tracking-[0.2em] shadow-xl shadow-slate-200 transition-all hover:bg-slate-800 hover:-translate-y-0.5 active:scale-[0.98]"
              >
                <ShoppingBag className="h-4 w-4 shrink-0" />
                {t('continue_shopping')}
              </Link>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderSuccess;
