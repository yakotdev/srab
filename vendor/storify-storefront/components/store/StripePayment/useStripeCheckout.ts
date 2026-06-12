/**
 * هوك حالة وعرض Stripe في صفحة الدفع — كل حالة وتأثير سترايب في Checkout هنا.
 */

import { useState, useEffect } from 'react';
import { stripeCreatePaymentIntent } from './api';

const STRIPE_APP_KEY = 'stripe';

export interface PendingStripePayment {
  order: null;
  clientSecret: string;
  publishableKey: string;
  paymentIntentId?: string;
}

export function useStripeCheckout(options: {
  storeConfig: { payment?: { methods?: Array<{ id: string; publishableKey?: string }> }; currency?: string };
  paymentMethod: string;
  step: number;
  total: number;
}) {
  const { storeConfig, paymentMethod, step, total } = options;
  const [pendingStripePayment, setPendingStripePayment] = useState<PendingStripePayment | null>(null);
  const [stripePaymentData, setStripePaymentData] = useState<{ clientSecret: string; paymentIntentId: string } | null>(null);
  const [stripePaymentLoading, setStripePaymentLoading] = useState(false);

  const stripeMethod = storeConfig.payment?.methods?.find((m: any) => m.id === STRIPE_APP_KEY);
  const stripePublishableKey = stripeMethod?.publishableKey;

  useEffect(() => {
    if (paymentMethod !== STRIPE_APP_KEY || step !== 3) {
      setStripePaymentData(null);
      return;
    }
    const pubKey = stripePublishableKey;
    if (!pubKey || !Number.isFinite(total) || total <= 0) return;
    let cancelled = false;
    setStripePaymentLoading(true);
    stripeCreatePaymentIntent(total, storeConfig.currency || 'ILS')
      .then((data) => {
        if (!cancelled) setStripePaymentData({ clientSecret: data.clientSecret, paymentIntentId: data.paymentIntentId });
      })
      .catch(() => {
        if (!cancelled) setStripePaymentData(null);
      })
      .finally(() => {
        if (!cancelled) setStripePaymentLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [step, paymentMethod, total, storeConfig.currency, stripePublishableKey]);

  const showStripeForm = !!(pendingStripePayment || (paymentMethod === STRIPE_APP_KEY && stripePublishableKey));
  const hasStripeData = !!(stripePaymentData || pendingStripePayment);
  const stripeLoading = stripePaymentLoading && !stripePaymentData && !pendingStripePayment;

  const clientSecret = pendingStripePayment?.clientSecret || stripePaymentData?.clientSecret;
  const paymentIntentId = stripePaymentData?.paymentIntentId || pendingStripePayment?.paymentIntentId;
  const publishableKey = pendingStripePayment?.publishableKey || stripePublishableKey;

  function setPendingFromOrderResult(result: any) {
    if (typeof result !== 'object' || result === null || !(result.clientSecret)) return;
    const pubKey = stripePublishableKey;
    if (!pubKey) return;
    setPendingStripePayment({
      order: null,
      clientSecret: result.clientSecret,
      publishableKey: pubKey,
      ...(result.paymentIntentId ? { paymentIntentId: result.paymentIntentId } : {}),
    });
  }

  function clearStripe() {
    setPendingStripePayment(null);
    setStripePaymentData(null);
  }

  return {
    STRIPE_APP_KEY,
    showStripeForm,
    hasStripeData,
    stripeLoading,
    stripeProps: clientSecret && publishableKey ? { clientSecret, paymentIntentId, publishableKey } : null,
    setPendingFromOrderResult,
    clearStripe,
    isStripeSelected: paymentMethod === STRIPE_APP_KEY,
  };
}
