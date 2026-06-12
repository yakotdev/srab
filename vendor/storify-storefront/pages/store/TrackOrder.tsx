import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { Truck } from '../../components/ui/Icons';

const TrackOrder: React.FC = () => {
  const { orders, t, formatPrice, theme, language } = useStore();
  const [orderId, setOrderId] = useState('');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleTrack = (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      setResult(null);

      if (!orderId.trim()) return;

      const order = orders.find(o => o.id === orderId.trim() || o.id === `#${orderId.trim()}`);
      if (order) {
          setResult(order);
      } else {
          setError(t('order_not_found'));
      }
  };

  const steps = ['Pending', 'Processing', 'Shipped', 'Delivered'];
  const isCancelled = result?.status === 'Cancelled';
  const currentStepIndex = result && !isCancelled ? steps.indexOf(result.status) : -1;

  return (
    <div className="max-w-4xl mx-auto px-6 py-16 md:py-24 animate-fade-in min-h-[70vh] font-sans">
        <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-1.5 mb-6">
                <Truck className="w-3.5 h-3.5 text-slate-900" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900">
                    {language === 'ar' ? 'تتبع سير الطلب' : 'Post-Purchase Tracking'}
                </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-6 tracking-tight leading-none">{t('track_order')}</h1>
            <p className="text-sm font-medium text-slate-400 max-w-lg mx-auto leading-relaxed">{t('track_order_desc')}</p>
        </div>

        <div className="relative group max-w-xl mx-auto mb-20">
            <form onSubmit={handleTrack} className="flex gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-xl shadow-slate-100/50 focus-within:ring-4 focus-within:ring-slate-900/5 focus-within:border-slate-900 transition-all duration-300">
                <div className="flex-1 flex items-center px-4">
                    <span className="text-slate-400 font-black text-lg mr-3">#</span>
                    <input 
                        type="text" 
                        value={orderId}
                        onChange={e => setOrderId(e.target.value)}
                        placeholder={t('enter_order_id')}
                        className="w-full bg-transparent py-3 text-sm font-bold text-slate-900 placeholder:text-slate-200 outline-none"
                    />
                </div>
                <button 
                    type="submit" 
                    className="bg-slate-900 px-8 py-3.5 rounded-xl text-[11px] font-black text-white uppercase tracking-[0.2em] shadow-lg shadow-slate-200 hover:bg-slate-800 transition-all active:scale-[0.98] flex items-center gap-2"
                >
                    <span>{t('track')}</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-white/30" />
                </button>
            </form>
        </div>

        {error && (
            <div className="max-w-md mx-auto mb-12 animate-slide-up">
                <div className="bg-red-50/50 border border-red-100 rounded-2xl p-6 text-center">
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-red-600 font-black text-lg uppercase leading-none">!</span>
                    </div>
                    <p className="text-sm font-bold text-red-600 uppercase tracking-widest">{error}</p>
                </div>
            </div>
        )}

        {result && (
            <div className="bg-white rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.06)] border border-slate-100 animate-slide-up relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-slate-900" />
                
                <div className="p-8 md:p-12">
                    <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-12 border-b border-slate-50 pb-8">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none uppercase">Order #{result.id}</h3>
                                <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${isCancelled ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                    {result.status}
                                </div>
                            </div>
                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{language === 'ar' ? 'تاريخ الطلب' : 'Purchase Date'}: {result.date}</p>
                        </div>
                        <div className="flex flex-col md:items-end">
                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">{t('total')}</span>
                            <span className="text-3xl font-black text-slate-900 tracking-tighter leading-none">{formatPrice(result.total)}</span>
                        </div>
                    </div>

                    {isCancelled && (
                        <div className="mb-12 p-6 rounded-2xl bg-red-50/50 border border-red-100 flex items-center gap-4">
                            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                                <span className="text-red-600 font-black text-lg leading-none">!</span>
                            </div>
                            <p className="text-sm font-bold text-red-800 leading-relaxed uppercase tracking-wider">{t('order_cancelled') || 'THIS ORDER HAS BEEN CANCELLED'}</p>
                        </div>
                    )}

                    {(result.trackingNumber || result.trackingUrl) && (
                        <div className="mb-12 p-8 rounded-3xl bg-slate-50 border border-slate-100 transition-all hover:shadow-lg group">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center">
                                    <Truck className="w-5 h-5 text-slate-900" />
                                </div>
                                <h4 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">
                                    {t('tracking') || 'Shipment Tracking'}
                                </h4>
                            </div>
                            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                                {result.trackingNumber && (
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{t('tracking_number') || 'Tracking number'}</span>
                                        <span className="text-base font-black text-slate-900 font-mono tracking-wider">{result.trackingNumber}</span>
                                    </div>
                                )}
                                {result.trackingUrl && (
                                    <a
                                        href={result.trackingUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center justify-center px-6 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-slate-200 transition-all hover:bg-slate-800 active:scale-95 group-hover:-translate-y-1"
                                    >
                                        {t('track_shipment') || 'Track Live Location'}
                                    </a>
                                )}
                            </div>
                        </div>
                    )}

                    {!isCancelled && (
                    <div className="mb-16 px-4">
                        <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-12 text-center">{t('order_status')}</h4>
                        <div className="relative flex justify-between">
                            <div className="absolute top-[16px] left-0 w-full h-[2px] bg-slate-50 z-0"></div>
                            <div 
                                className="absolute top-[16px] left-0 h-[2px] bg-emerald-500 z-0 transition-all duration-1000 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                                style={{ width: `${(currentStepIndex >= 0 ? currentStepIndex / (steps.length - 1) : 0) * 100}%` }}
                            ></div>

                            {steps.map((step, idx) => {
                                const isCompleted = idx <= currentStepIndex;
                                const isCurrent = idx === currentStepIndex;
                                
                                return (
                                    <div key={step} className="relative z-10 flex flex-col items-center gap-6">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-500 shadow-sm
                                            ${isCompleted ? 'bg-emerald-500 border-emerald-500 text-white scale-110 shadow-emerald-100' : 'bg-white border-slate-100 text-slate-200'}
                                            ${isCurrent ? 'ring-8 ring-emerald-50' : ''}
                                        `}>
                                            {isCompleted ? (
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                            ) : (
                                                <div className="w-1.5 h-1.5 rounded-full bg-slate-100"></div>
                                            )}
                                        </div>
                                        <div className="flex flex-col items-center gap-1">
                                            <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${isCompleted ? 'text-slate-900' : 'text-slate-300'}`}>
                                                {step}
                                            </span>
                                            {isCurrent && (
                                                <div className="w-1 h-1 rounded-full bg-emerald-500 animate-ping" />
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    )}

                    <div className="bg-slate-50/50 border border-slate-100 rounded-[2rem] p-8 md:p-10">
                        <div className="flex items-center gap-3 mb-8">
                            <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">{t('items')}</h4>
                            <div className="h-[2px] flex-1 bg-slate-100" />
                        </div>
                        <div className="space-y-6">
                            {result.lineItems?.map((item: any, idx: number) => (
                                <div key={idx} className="flex gap-6 items-center group/item">
                                    <div className="w-16 h-16 bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm group-hover/item:shadow-md transition-shadow">
                                        {item.image && String(item.image).trim() !== '' ? (
                                          <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover/item:scale-110 transition-transform duration-500" />
                                        ) : (
                                          <div className="w-full h-full bg-slate-50 flex items-center justify-center text-slate-300 text-sm font-black uppercase" aria-hidden>{item.name?.charAt(0) || '?'}</div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-black text-sm text-slate-900 line-clamp-1 mb-1">{item.name}</p>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'الكمية' : 'Qty'}: {item.quantity}</span>
                                            {item.variantTitle && (
                                                <>
                                                    <div className="w-1 h-1 rounded-full bg-slate-200" />
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{item.variantTitle}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <span className="font-black text-slate-900 text-sm">{formatPrice(item.price)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <div className="mt-12 flex flex-col items-center gap-4 text-center">
                        <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest leading-relaxed">
                            {language === 'ar'
                                ? 'شكراً لاختيارك متجرنا. نحن نعمل جاهدين لتسليم طلبك في أسرع وقت ممكن.'
                                : 'Thank you for choosing us. We are working hard to deliver your order as soon as possible.'}
                        </p>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default TrackOrder;