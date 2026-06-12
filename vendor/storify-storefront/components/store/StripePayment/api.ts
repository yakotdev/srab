/**
 * استدعاءات Stripe فقط — كل الـ endpoints الخاصة بسترايب في هذا الملف.
 */

import { fetchApi } from '../../../lib/api';
import type { Order } from '../../../types';

export function stripeCreatePaymentIntent(amount: number, currency: string): Promise<{ clientSecret: string; paymentIntentId: string }> {
  return fetchApi<{ clientSecret: string; paymentIntentId: string }>('/checkout/create-payment-intent', {
    method: 'POST',
    body: JSON.stringify({ amount, currency: currency || 'ILS' }),
  });
}

export function stripeConfirmOrder(payload: Record<string, unknown> & { paymentIntentId: string }): Promise<{ order: Order }> {
  return fetchApi<{ order: Order }>('/checkout/confirm-stripe-order', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
