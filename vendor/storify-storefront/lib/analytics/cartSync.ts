import { getAnalyticsHeaders, getSessionId, getStoredUtm, getVisitorId } from './session';

export interface CartSyncLineItem {
  productId?: string;
  id?: string;
  name?: string;
  price?: number;
  quantity?: number;
  image?: string;
  variantTitle?: string;
}

export interface CartSyncOptions {
  lineItems: CartSyncLineItem[];
  status?: 'browsing' | 'cart' | 'checkout';
  subtotal?: number;
  currency?: string;
  checkoutStep?: string;
  email?: string;
  phone?: string;
  customerName?: string;
  beginCheckout?: boolean;
}

export function syncCartToAnalytics(options: CartSyncOptions): void {
  if (typeof window === 'undefined' || typeof fetch !== 'function') return;

  const utm = getStoredUtm();
  const body = {
    sessionId: getSessionId(),
    visitorId: getVisitorId(),
    lineItems: options.lineItems,
    status: options.status,
    subtotal: options.subtotal,
    currency: options.currency,
    checkoutStep: options.checkoutStep,
    email: options.email,
    phone: options.phone,
    customerName: options.customerName,
    beginCheckout: options.beginCheckout === true,
    ...utm,
  };

  void fetch('/api/public/analytics/cart-sync', {
    method: 'POST',
    credentials: 'include',
    keepalive: true,
    headers: getAnalyticsHeaders(),
    body: JSON.stringify(body),
  }).catch(() => {});
}
