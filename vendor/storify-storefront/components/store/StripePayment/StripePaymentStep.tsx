/**
 * خطوة الدفع عبر Stripe — الطلب لا يُنشأ إلا بعد نجاح الدفع.
 */

import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { stripeConfirmOrder } from './api';

const STRIPE_PENDING_PREFIX = 'stripe_pending_';

const stripePromiseCache: Record<string, Promise<any>> = {};
function getStripePromise(publishableKey: string) {
  if (!stripePromiseCache[publishableKey]) {
    stripePromiseCache[publishableKey] = loadStripe(publishableKey);
  }
  return stripePromiseCache[publishableKey];
}

export function getStripePendingKey(paymentIntentId: string) {
  return `${STRIPE_PENDING_PREFIX}${paymentIntentId}`;
}

function StripeConfirmForm({
  paymentIntentId,
  buildOrderPayload,
  onSuccess,
  onCancel,
  primaryStyle,
  t,
  language,
}: {
  paymentIntentId?: string;
  buildOrderPayload: () => Record<string, unknown>;
  onSuccess: (orderId?: string) => void;
  onCancel: () => void;
  primaryStyle: React.CSSProperties;
  t: (key: string) => string | undefined;
  language: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (!stripe || !elements || !paymentIntentId) return;
    setLoading(true);
    setError(null);
    const payload = buildOrderPayload();
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(getStripePendingKey(paymentIntentId), JSON.stringify(payload));
      }
    } catch (_) {}
    const returnUrl = `${window.location.origin}/order-success`;
    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
    });
    setLoading(false);
    if (confirmError) {
      setError(confirmError.message || 'Payment failed');
      return;
    }
    try {
      const { order } = await stripeConfirmOrder({ ...payload, paymentIntentId });
      onSuccess(order.id);
    } catch (e: any) {
      setError(e?.message || 'Failed to create order');
    }
  };

  return (
    <div className="space-y-6">
      <PaymentElement />
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <div className="flex gap-4">
        <button type="button" onClick={onCancel} className="px-6 py-3 rounded-2xl border-2 border-slate-200 font-bold hover:bg-slate-50">
          {language === 'ar' ? 'إلغاء' : 'Cancel'}
        </button>
        <button type="button" disabled={!stripe || loading} onClick={handleConfirm} className="px-8 py-3 rounded-2xl text-white font-black" style={primaryStyle}>
          {loading ? (language === 'ar' ? 'جاري الدفع...' : 'Processing...') : t('complete_payment') || 'Complete payment'}
        </button>
      </div>
    </div>
  );
}

export interface StripePaymentStepProps {
  clientSecret: string;
  paymentIntentId?: string;
  publishableKey: string;
  loading?: boolean;
  buildOrderPayload: () => Record<string, unknown>;
  onSuccess: (orderId?: string) => void;
  onCancel: () => void;
  primaryStyle: React.CSSProperties;
  t: (key: string) => string | undefined;
  language: string;
}

export function StripePaymentStep({
  clientSecret,
  paymentIntentId,
  publishableKey,
  loading: externalLoading = false,
  buildOrderPayload,
  onSuccess,
  onCancel,
  primaryStyle,
  t,
  language,
}: StripePaymentStepProps) {
  if (externalLoading) {
    return (
      <div className="p-8 text-center text-slate-500 rounded-2xl border border-slate-200">
        {language === 'ar' ? 'جاري تحميل نموذج الدفع...' : 'Loading payment form...'}
      </div>
    );
  }

  return (
    <>
      <p className="text-slate-500">
        {t('enter_card_details') || 'Enter your card details below'}
      </p>
      <Elements
        stripe={getStripePromise(publishableKey)}
        options={{ clientSecret, appearance: { theme: 'stripe' as const } }}
      >
        <StripeConfirmForm
          paymentIntentId={paymentIntentId}
          buildOrderPayload={buildOrderPayload}
          onSuccess={onSuccess}
          onCancel={onCancel}
          primaryStyle={primaryStyle}
          t={t}
          language={language}
        />
      </Elements>
    </>
  );
}
