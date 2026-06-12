import { getAnalyticsHeaders, getSessionId, getStoredUtm, getVisitorId } from '../analytics/session';
import { getResolvedStoreId } from '../store-id';

export type StorefrontTrackingEvent =
  | 'page_view'
  | 'view_item'
  | 'add_to_cart'
  | 'add_to_wishlist'
  | 'begin_checkout'
  | 'purchase'
  | 'search'
  | 'sign_up';

export interface StorefrontTrackingLineItem {
  productId?: string;
  id?: string;
  name?: string;
  price?: number;
  quantity?: number;
}

export interface StorefrontTrackingPayload {
  [key: string]: unknown;
  productId?: string;
  name?: string;
  value?: number;
  currency?: string;
  quantity?: number;
  orderId?: string;
  path?: string;
  title?: string;
  searchQuery?: string;
  lineItems?: StorefrontTrackingLineItem[];
  eventId?: string;
  trackingEventId?: string;
  fbp?: string;
  fbc?: string;
}

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
    ttq?: (...args: unknown[]) => void;
  }
}

const FACEBOOK_EVENT_NAMES: Record<StorefrontTrackingEvent, string> = {
  page_view: 'PageView',
  view_item: 'ViewContent',
  add_to_cart: 'AddToCart',
  add_to_wishlist: 'AddToWishlist',
  begin_checkout: 'InitiateCheckout',
  purchase: 'Purchase',
  search: 'Search',
  sign_up: 'CompleteRegistration',
};

const GOOGLE_EVENT_NAMES: Record<StorefrontTrackingEvent, string> = {
  page_view: 'page_view',
  view_item: 'view_item',
  add_to_cart: 'add_to_cart',
  add_to_wishlist: 'add_to_wishlist',
  begin_checkout: 'begin_checkout',
  purchase: 'purchase',
  search: 'search',
  sign_up: 'sign_up',
};

const TIKTOK_EVENT_NAMES: Record<StorefrontTrackingEvent, string> = {
  page_view: 'PageView',
  view_item: 'ViewContent',
  add_to_cart: 'AddToCart',
  add_to_wishlist: 'AddToWishlist',
  begin_checkout: 'InitiateCheckout',
  purchase: 'CompletePayment',
  search: 'Search',
  sign_up: 'CompleteRegistration',
};

const STOREFRONT_TRACKING_EVENTS = new Set<StorefrontTrackingEvent>(Object.keys(FACEBOOK_EVENT_NAMES) as StorefrontTrackingEvent[]);
const facebookTrackingToggles: Partial<Record<StorefrontTrackingEvent, boolean>> = {};
const tiktokTrackingToggles: Partial<Record<StorefrontTrackingEvent, boolean>> = {};
let useGoogleDataLayerMode = false;

export function configureGoogleTrackingMode(config: { useDataLayer?: boolean }): void {
  useGoogleDataLayerMode = config.useDataLayer === true;
}

export function configureFacebookTrackingToggles(config: {
  trackPageView?: unknown;
  trackViewItem?: unknown;
  trackAddToCart?: unknown;
  trackAddToWishlist?: unknown;
  trackBeginCheckout?: unknown;
  trackPurchase?: unknown;
  trackSearch?: unknown;
  trackSignUp?: unknown;
}): void {
  facebookTrackingToggles.page_view = config.trackPageView !== false;
  facebookTrackingToggles.view_item = config.trackViewItem !== false;
  facebookTrackingToggles.add_to_cart = config.trackAddToCart !== false;
  facebookTrackingToggles.add_to_wishlist = config.trackAddToWishlist !== false;
  facebookTrackingToggles.begin_checkout = config.trackBeginCheckout !== false;
  facebookTrackingToggles.purchase = config.trackPurchase !== false;
  facebookTrackingToggles.search = config.trackSearch !== false;
  facebookTrackingToggles.sign_up = config.trackSignUp !== false;
}

export function configureTikTokTrackingToggles(config: {
  trackPageView?: unknown;
  trackViewItem?: unknown;
  trackAddToCart?: unknown;
  trackAddToWishlist?: unknown;
  trackBeginCheckout?: unknown;
  trackPurchase?: unknown;
  trackSearch?: unknown;
  trackSignUp?: unknown;
}): void {
  tiktokTrackingToggles.page_view = config.trackPageView !== false;
  tiktokTrackingToggles.view_item = config.trackViewItem !== false;
  tiktokTrackingToggles.add_to_cart = config.trackAddToCart !== false;
  tiktokTrackingToggles.add_to_wishlist = config.trackAddToWishlist !== false;
  tiktokTrackingToggles.begin_checkout = config.trackBeginCheckout !== false;
  tiktokTrackingToggles.purchase = config.trackPurchase !== false;
  tiktokTrackingToggles.search = config.trackSearch !== false;
  tiktokTrackingToggles.sign_up = config.trackSignUp !== false;
}

function canSendFacebookEvent(eventName: StorefrontTrackingEvent): boolean {
  const value = facebookTrackingToggles[eventName];
  return value !== false;
}

function canSendTikTokEvent(eventName: StorefrontTrackingEvent): boolean {
  const value = tiktokTrackingToggles[eventName];
  return value !== false;
}

function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match && match[1] ? decodeURIComponent(match[1]) : undefined;
}

export function getFacebookBrowserIdentifiers(): { fbp?: string; fbc?: string } {
  const fbp = readCookie('_fbp');
  const fbc = readCookie('_fbc');
  return {
    ...(fbp ? { fbp } : {}),
    ...(fbc ? { fbc } : {}),
  };
}

export function createTrackingEventId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `evt-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function dispatchServerSideTracking(eventName: StorefrontTrackingEvent, payload: StorefrontTrackingPayload): void {
  if (typeof window === 'undefined' || typeof fetch !== 'function') return;
  const requestBody = JSON.stringify({
    eventName,
    payload,
  });
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const storeId = getResolvedStoreId();
  if (storeId?.trim()) {
    headers['X-Store-Id'] = storeId.trim();
  }
  void fetch('/api/integrations/facebook/track', {
    method: 'POST',
    credentials: 'include',
    keepalive: true,
    headers,
    body: requestBody,
  }).catch(() => {
    // Best-effort tracking endpoint; ignore network errors.
  });
}

function dispatchFirstPartyAnalytics(eventName: StorefrontTrackingEvent, payload: StorefrontTrackingPayload): void {
  if (typeof window === 'undefined' || typeof fetch !== 'function') return;
  const utm = getStoredUtm();
  const body = {
    sessionId: getSessionId(),
    visitorId: getVisitorId(),
    eventType: eventName,
    payload,
    currentPath: payload.path || `${window.location.pathname}${window.location.search}`,
    ...utm,
  };
  void fetch('/api/public/analytics/events', {
    method: 'POST',
    credentials: 'include',
    keepalive: true,
    headers: getAnalyticsHeaders(),
    body: JSON.stringify(body),
  }).catch(() => {});
}

function dispatchServerSideTikTokTracking(eventName: StorefrontTrackingEvent, payload: StorefrontTrackingPayload): void {
  if (typeof window === 'undefined' || typeof fetch !== 'function') return;
  const requestBody = JSON.stringify({
    eventName,
    payload,
  });
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const storeId = getResolvedStoreId();
  if (storeId?.trim()) {
    headers['X-Store-Id'] = storeId.trim();
  }
  void fetch('/api/integrations/tiktok/track', {
    method: 'POST',
    credentials: 'include',
    keepalive: true,
    headers,
    body: requestBody,
  }).catch(() => {
    // Best-effort tracking endpoint; ignore network errors.
  });
}

/** Meta / gtag expect numeric value; API and JSON often return strings. */
function coerceFiniteNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function compactPayload(payload: StorefrontTrackingPayload = {}): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined && value !== null && value !== '') out[key] = value;
  }
  return out;
}

function compactVendorPayload(payload: StorefrontTrackingPayload): Record<string, unknown> {
  const {
    lineItems: _lineItems,
    searchQuery: _searchQuery,
    eventId: _eventId,
    trackingEventId: _trackingEventId,
    ...rest
  } = payload;
  return compactPayload(rest);
}

function normalizedTrackingItems(payload: StorefrontTrackingPayload): StorefrontTrackingLineItem[] {
  const rawItems = Array.isArray(payload.lineItems) && payload.lineItems.length > 0
    ? payload.lineItems
    : payload.productId || payload.name
        ? [{
          productId: payload.productId,
          name: payload.name,
          price: coerceFiniteNumber(payload.value),
          quantity: payload.quantity,
        }]
      : [];

  return rawItems
    .map((item) => {
      const productId = String(item.productId ?? item.id ?? '').trim();
      const qN = coerceFiniteNumber(item.quantity);
      const quantity = qN !== undefined && qN > 0 ? qN : 1;
      const price = coerceFiniteNumber(item.price);
      return {
        productId: productId || undefined,
        name: typeof item.name === 'string' ? item.name : undefined,
        price,
        quantity,
      };
    })
    .filter((item) => item.productId || item.name);
}

function toFacebookContents(items: StorefrontTrackingLineItem[]): Array<Record<string, unknown>> | undefined {
  const contents = items
    .filter((item) => item.productId)
    .map((item) => compactPayload({
      id: item.productId,
      quantity: item.quantity ?? 1,
      item_price: item.price,
    }));
  return contents.length > 0 ? contents : undefined;
}

function toGoogleItems(items: StorefrontTrackingLineItem[]): Array<Record<string, unknown>> | undefined {
  const googleItems = items.map((item) => compactPayload({
    item_id: item.productId,
    item_name: item.name,
    price: item.price,
    quantity: item.quantity,
  }));
  return googleItems.length > 0 ? googleItems : undefined;
}

function totalQuantity(items: StorefrontTrackingLineItem[]): number | undefined {
  if (items.length === 0) return undefined;
  return items.reduce((sum, item) => sum + (item.quantity ?? 1), 0);
}

function toFacebookPayload(eventName: StorefrontTrackingEvent, payload: StorefrontTrackingPayload): Record<string, unknown> {
  const base = compactVendorPayload(payload);
  const rawPid = payload.productId;
  const productId =
    typeof rawPid === 'string' && rawPid.trim() !== '' ? rawPid : rawPid != null ? String(rawPid).trim() : undefined;
  const value = coerceFiniteNumber(payload.value);
  const quantity = (() => {
    const n = coerceFiniteNumber(payload.quantity);
    return n !== undefined && n > 0 ? n : 1;
  })();
  const currency = typeof payload.currency === 'string' && payload.currency.trim() !== '' ? payload.currency : undefined;
  const items = normalizedTrackingItems(payload);
  const contentIds = items.map((item) => item.productId).filter(Boolean);
  const contents = toFacebookContents(items);

  if (eventName === 'add_to_cart' || eventName === 'view_item' || eventName === 'add_to_wishlist') {
    return compactPayload({
      ...base,
      content_ids: contentIds.length > 0 ? contentIds : productId ? [productId] : undefined,
      content_name: payload.name,
      content_type: 'product',
      contents: contents ?? (productId ? [{ id: productId, quantity }] : undefined),
      value,
      currency,
    });
  }

  if (eventName === 'begin_checkout' || eventName === 'purchase') {
    return compactPayload({
      ...base,
      order_id: payload.orderId,
      content_ids: contentIds.length > 0 ? contentIds : undefined,
      content_type: contentIds.length > 0 ? 'product' : undefined,
      contents,
      num_items: totalQuantity(items),
      value,
      currency,
    });
  }

  if (eventName === 'search') {
    return compactPayload({
      ...base,
      search_string: payload.searchQuery,
    });
  }

  return base;
}

function toGooglePayload(payload: StorefrontTrackingPayload): Record<string, unknown> {
  const base = compactVendorPayload(payload);
  const items = normalizedTrackingItems(payload);
  return compactPayload({
    ...base,
    transaction_id: payload.orderId,
    search_term: payload.searchQuery,
    items: toGoogleItems(items),
  });
}

function toGoogleDataLayerPayload(eventName: StorefrontTrackingEvent, payload: StorefrontTrackingPayload): Record<string, unknown> {
  const googlePayload = toGooglePayload(payload);
  const items = Array.isArray(googlePayload.items) ? googlePayload.items : undefined;
  const event = GOOGLE_EVENT_NAMES[eventName];
  const ecommerce = compactPayload({
    items,
    value: coerceFiniteNumber(payload.value),
    currency: payload.currency,
    transaction_id: payload.orderId,
  });

  if (eventName === 'page_view') {
    return compactPayload({
      event,
      page_title: payload.title,
      page_location: payload.path,
    });
  }

  if (eventName === 'search') {
    return compactPayload({
      event,
      search_term: payload.searchQuery,
    });
  }

  return compactPayload({
    event,
    ...(Object.keys(ecommerce).length > 0 ? { ecommerce } : {}),
  });
}

function toTikTokPayload(eventName: StorefrontTrackingEvent, payload: StorefrontTrackingPayload): Record<string, unknown> {
  const items = normalizedTrackingItems(payload);
  const contents = items.map((item) =>
    compactPayload({
      content_id: item.productId,
      content_name: item.name,
      quantity: item.quantity,
      price: item.price,
    })
  );
  return compactPayload({
    event_id: payload.trackingEventId,
    value: coerceFiniteNumber(payload.value),
    currency: payload.currency,
    query: payload.searchQuery,
    content_type: contents.length > 0 ? 'product' : undefined,
    contents: contents.length > 0 ? contents : undefined,
    order_id: payload.orderId,
    page_title: eventName === 'page_view' ? payload.title : undefined,
    page_location: eventName === 'page_view' ? payload.path : undefined,
  });
}

export function isStorefrontTrackingEvent(value: unknown): value is StorefrontTrackingEvent {
  return typeof value === 'string' && STOREFRONT_TRACKING_EVENTS.has(value as StorefrontTrackingEvent);
}

export function trackEvent(eventName: StorefrontTrackingEvent, payload: StorefrontTrackingPayload = {}): string | undefined {
  if (typeof window === 'undefined') return;
  const eventId =
    (typeof payload.eventId === 'string' && payload.eventId.trim()) ||
    (typeof payload.trackingEventId === 'string' && payload.trackingEventId.trim()) ||
    createTrackingEventId();
  const identifiers = getFacebookBrowserIdentifiers();
  const payloadWithMeta = {
    ...payload,
    ...identifiers,
    trackingEventId: eventId,
  };

  if (useGoogleDataLayerMode) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(toGoogleDataLayerPayload(eventName, payloadWithMeta));
  } else if (typeof window.gtag === 'function') {
    window.gtag('event', GOOGLE_EVENT_NAMES[eventName], toGooglePayload(payloadWithMeta));
  }

  const shouldSendFacebook = canSendFacebookEvent(eventName);
  if (typeof window.fbq === 'function' && shouldSendFacebook) {
    window.fbq('track', FACEBOOK_EVENT_NAMES[eventName], toFacebookPayload(eventName, payloadWithMeta), { eventID: eventId });
  }
  if (shouldSendFacebook) {
    dispatchServerSideTracking(eventName, payloadWithMeta);
  }

  const shouldSendTikTok = canSendTikTokEvent(eventName);
  if (typeof window.ttq === 'function' && shouldSendTikTok) {
    window.ttq('track', TIKTOK_EVENT_NAMES[eventName], toTikTokPayload(eventName, payloadWithMeta));
  }
  if (shouldSendTikTok) {
    dispatchServerSideTikTokTracking(eventName, payloadWithMeta);
  }
  dispatchFirstPartyAnalytics(eventName, payloadWithMeta);
  return eventId;
}
