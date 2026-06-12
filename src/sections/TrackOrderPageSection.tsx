import React, { useState } from 'react';
import { Truck } from 'lucide-react';
import { useThemeConfig } from '../ThemeContext';
import { shouldUseThemeRuntimeBridge, themeRuntimeCall } from '@storify/theme';
import { getStorifySDK, formatPrice } from '@storify/theme';
import { interpolateTheme } from '../locales';

type OrderResult = {
  id?: string;
  date?: string;
  status?: string;
  total?: number;
  trackingNumber?: string;
  trackingUrl?: string;
};

const steps = ['Pending', 'Processing', 'Shipped', 'Delivered'];

const TrackOrderPageSection: React.FC<{ section: { content?: Record<string, unknown> } }> = ({ section }) => {
  const { sdkReady, t, store } = useThemeConfig();
  const content = section?.content || {};
  const title = (content.title as string) || t('track_order');
  const desc = (content.subtitle as string) || t('track_order_desc');

  const [orderId, setOrderId] = useState('');
  const [result, setResult] = useState<OrderResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const formatMoney = (n: number | undefined) => {
    if (n == null || Number.isNaN(n)) return '—';
    return formatPrice(n, store?.currency);
  };

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResult(null);
    const id = orderId.trim().replace(/^#/, '');
    if (!id) return;

    setLoading(true);
    try {
      if (shouldUseThemeRuntimeBridge()) {
        const order = await themeRuntimeCall<unknown>('getOrderById', { orderId: id });
        if (order && typeof order === 'object') {
          setResult(order as OrderResult);
        } else {
          setError(t('order_not_found'));
        }
      } else {
        const sdk = getStorifySDK();
        if (sdkReady && sdk?.getOrderById) {
          const order = await sdk.getOrderById(id);
          if (order && typeof order === 'object') {
            setResult(order as OrderResult);
          } else {
            setError(t('order_not_found'));
          }
        } else {
          setError(t('order_not_found_sdk'));
        }
      }
    } catch {
      setError(t('order_not_found_fetch'));
    } finally {
      setLoading(false);
    }
  };

  const isCancelled = result?.status === 'Cancelled';
  const currentStepIndex = result && !isCancelled ? steps.indexOf(String(result.status)) : -1;

  return (
    <section className="py-16 md:py-24 min-h-[60vh]" style={{ background: 'var(--storify-bg)', color: 'var(--storify-text)' }}>
      <div className="max-w-3xl mx-auto px-6">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-black mb-2" style={{ color: 'var(--storify-headings)' }}>{title}</h1>
          <p className="opacity-60 text-sm">{desc}</p>
        </div>

        <form onSubmit={handleTrack} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto mb-10">
          <input
            type="text"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            placeholder={t('enter_order_id')}
            className="flex-1 px-4 py-3 rounded-2xl border focus:outline-none transition-all"
            style={{ background: 'var(--storify-bg)', color: 'var(--storify-text)', borderColor: 'var(--storify-border)' }}
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 rounded-2xl font-bold disabled:opacity-50 transition-all"
            style={{ background: 'var(--storify-btn-primary-bg)', color: 'var(--storify-btn-primary-fg)' }}
          >
            {loading ? '...' : t('track')}
          </button>
        </form>

        {error ? (
          <div className="p-4 rounded-2xl text-center text-sm font-bold mb-8" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>{error}</div>
        ) : null}

        {result ? (
          <div className="p-8 rounded-3xl border space-y-6 shadow-sm" style={{ background: 'var(--storify-bg)', borderColor: 'var(--storify-border)' }}>
            <div className="flex flex-wrap justify-between gap-4 border-b pb-6" style={{ borderColor: 'var(--storify-border)' }}>
              <div>
                <h3 className="text-xl font-bold" style={{ color: 'var(--storify-headings)' }}>
                  {interpolateTheme(t('order_number'), { id: String(result.id ?? '') })}
                </h3>
                {result.date ? <p className="opacity-60 text-sm mt-1">{result.date}</p> : null}
              </div>
              <div className="text-start sm:text-end">
                <p className="text-xs font-bold uppercase opacity-40">{t('total')}</p>
                <p className="text-xl font-black" style={{ color: 'var(--storify-primary)' }}>{formatMoney(result.total)}</p>
              </div>
            </div>

            {isCancelled ? (
              <div className="p-4 rounded-2xl font-bold text-sm" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                {t('order_cancelled')}
              </div>
            ) : null}

            {(result.trackingNumber || result.trackingUrl) && (
              <div className="p-4 rounded-2xl border" style={{ background: 'rgba(99, 102, 241, 0.05)', borderColor: 'rgba(99, 102, 241, 0.1)' }}>
                <h4 className="font-bold flex items-center gap-2 mb-2" style={{ color: 'var(--storify-primary)' }}>
                  <Truck className="w-5 h-5" />
                  {t('tracking')}
                </h4>
                {result.trackingNumber ? (
                  <p className="text-sm opacity-80">
                    <span className="font-semibold">{t('tracking_number')}:</span> {result.trackingNumber}
                  </p>
                ) : null}
                {result.trackingUrl ? (
                  <a
                    href={result.trackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-2 text-sm font-bold underline"
                    style={{ color: 'var(--storify-primary)' }}
                  >
                    {t('track_shipment')}
                  </a>
                ) : null}
              </div>
            )}

            {!isCancelled && currentStepIndex >= 0 && (
              <div className="flex justify-between gap-2 pt-4">
                {steps.map((step, i) => (
                  <div key={step} className="flex-1 text-center">
                    <div
                      className={`h-2 rounded-full mb-2 ${i <= currentStepIndex ? '' : 'opacity-20'}`}
                      style={{ background: i <= currentStepIndex ? 'var(--storify-primary)' : 'var(--storify-text)' }}
                    />
                    <span className="text-[10px] font-bold uppercase opacity-40">{step}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
};

export default TrackOrderPageSection;
