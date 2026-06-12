/**
 * هوك معالجة العودة من Stripe (3DS) — كل منطق سترايب للصفحة order-success في هذا الملف.
 */

import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useStore } from '../../../context/StoreContext';
import { getStripePendingKey } from './StripePaymentStep';
import { stripeConfirmOrder } from './api';

export function useStripeReturnFrom3DS() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { clearCart } = useStore();
  const orderId = searchParams.get('id');
  const paymentFailed = searchParams.get('payment') === 'failed';
  const paymentIntentFromStripe = searchParams.get('payment_intent');
  const redirectStatus = searchParams.get('redirect_status');
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!paymentIntentFromStripe || resolving || orderId) return;
    if (redirectStatus && redirectStatus !== 'succeeded') {
      setError(redirectStatus);
      return;
    }
    let cancelled = false;
    setResolving(true);
    const key = getStripePendingKey(paymentIntentFromStripe);
    const raw = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(key) : null;
    if (!raw) {
      setResolving(false);
      return;
    }
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(raw);
    } catch {
      setResolving(false);
      return;
    }
    stripeConfirmOrder({ ...payload, paymentIntentId: paymentIntentFromStripe })
      .then(({ order }) => {
        if (cancelled) return;
        try {
          sessionStorage.removeItem(key);
        } catch (_) {}
        clearCart();
        setSearchParams({ id: order.id });
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Failed to create order');
      })
      .finally(() => {
        if (!cancelled) setResolving(false);
      });
    return () => {
      cancelled = true;
    };
  }, [paymentIntentFromStripe, redirectStatus, clearCart, setSearchParams]);

  return { orderId, paymentFailed, resolving, error };
}
