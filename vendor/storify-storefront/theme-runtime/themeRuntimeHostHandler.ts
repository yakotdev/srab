import type { MutableRefObject } from 'react';
import {
  isStorefrontTrackingEvent,
  trackEvent,
  type StorefrontTrackingPayload,
} from '../lib/apps/trackEvent';
import { fetchApi, messagesApi, ordersApi, reviewsApi } from '../lib/api';
import type { ContactMessage } from '../types';
import { buildLocalizedStorefrontPath } from '../theme-template-lib/theme-localization';
import { normalizeLocale } from '../lib/locale-routing';
import type { ThemeRuntimeMethod } from './types';

/** Normalize product snapshot from uploaded theme iframe for host cart/checkout. */
export function productFromIframeCartMessage(raw: unknown, fallbackId: string): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const id = String(o.id ?? fallbackId).trim();
  if (!id) return null;
  const image = String(o.image ?? '');
  const images = Array.isArray(o.images) && o.images.length > 0 ? (o.images as string[]) : image ? [image] : [];
  return {
    id,
    name: String(o.name ?? ''),
    description: String(o.description ?? ''),
    image: image || '',
    images,
    category: String(o.category ?? ''),
    status: (typeof o.status === 'string' ? o.status : 'Active') as 'Active' | 'Draft' | 'Archived',
    price: typeof o.price === 'number' && !Number.isNaN(o.price) ? o.price : Number(o.price) || 0,
    stock: typeof o.stock === 'number' && !Number.isNaN(o.stock) ? o.stock : Number(o.stock) || 0,
    compareAtPrice: typeof o.compareAtPrice === 'number' ? o.compareAtPrice : undefined,
    sku: typeof o.sku === 'string' ? o.sku : undefined,
    hasVariants: Boolean(o.hasVariants),
    variants: Array.isArray(o.variants) ? o.variants : undefined,
    options: Array.isArray(o.options) ? o.options : undefined,
    selectedVariant: o.selectedVariant && typeof o.selectedVariant === 'object' ? o.selectedVariant : undefined,
  };
}

function normalizeListResponse<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object' && 'data' in data && Array.isArray((data as { data: unknown }).data)) {
    return (data as { data: T[] }).data;
  }
  return [];
}

const POLICY_SLUG_MAP: Record<string, { key: string }> = {
  'return-exchange': { key: 'returnExchange' },
  privacy: { key: 'privacy' },
  terms: { key: 'terms' },
  shipping: { key: 'shipping' },
  refund: { key: 'returnExchange' },
};

export type ThemeRuntimeHostHandlerContext = {
  products: Array<Record<string, unknown> & { id?: string }>;
  cart: Array<Record<string, unknown> & { id?: string }>;
  storeCurrency: string;
  storeLanguage?: string;
  storeDirection?: 'rtl' | 'ltr' | string;
  addToCart: (product: unknown, quantity?: number) => void;
  removeFromCart: (productId: string, variantId?: string) => void;
  openCart: () => void;
  toggleWishlist: (product: unknown) => void;
  addSubscriber: (email: string) => Promise<void>;
  lastTrackedProductViewRef: MutableRefObject<string | null>;
  lastTrackedSearchRef: MutableRefObject<string | null>;
  locationPathname: string;
  locationSearch: string;
  /** When set (ThemeDirectLoader / SPA), use React Router instead of full document reload. */
  navigateInternal?: (path: string) => void;
};

export function processIframeAddToCartMessage(
  eventData: Record<string, unknown>,
  ctx: Pick<ThemeRuntimeHostHandlerContext, 'products' | 'addToCart' | 'openCart' | 'cart'>,
): void {
  const productId = String(eventData.productId ?? '').trim();
  const quantity = Math.max(1, Number(eventData.quantity) || 1);
  if (!productId) return;

  const shouldOpenHostCart = eventData?.suppressHostCartOpen !== true;

  const iframeProduct = productFromIframeCartMessage(eventData.product, productId);

  const explicitVariantId =
    typeof eventData.variantId === 'string' && eventData.variantId.trim()
      ? eventData.variantId.trim()
      : undefined;
  const selectedVariantObj = iframeProduct?.selectedVariant as Record<string, unknown> | undefined;
  const payloadVariantId =
    selectedVariantObj?.id != null ? String(selectedVariantObj.id).trim() : undefined;
  const resolvedVariantId = explicitVariantId || payloadVariantId;

  let resolvedSelectedVariant: Record<string, unknown> | undefined;
  if (resolvedVariantId && iframeProduct) {
    const fromVariants = Array.isArray(iframeProduct.variants)
      ? (iframeProduct.variants as any[]).find((v: any) => String(v.id) === resolvedVariantId)
      : undefined;
    resolvedSelectedVariant = fromVariants ?? (iframeProduct.selectedVariant as Record<string, unknown> | undefined);
  } else if (iframeProduct?.selectedVariant) {
    resolvedSelectedVariant = iframeProduct.selectedVariant as Record<string, unknown>;
  }

  const localProduct = ctx.products.find((p) => String(p.id) === productId);
  const baseProduct: Record<string, unknown> = iframeProduct
    ? { ...iframeProduct }
    : localProduct
      ? { ...(localProduct as Record<string, unknown>) }
      : { id: productId };

  if (localProduct) {
    const local = localProduct as Record<string, unknown>;
    if (!baseProduct.name && local.name) baseProduct.name = local.name;
    if (!baseProduct.image && local.image) baseProduct.image = local.image;
    if (!baseProduct.images && local.images) baseProduct.images = local.images;
    if (!baseProduct.category && local.category) baseProduct.category = local.category;
    if (!Array.isArray(baseProduct.variants) && Array.isArray(local.variants)) {
      baseProduct.variants = local.variants;
    }
  }

  if (resolvedSelectedVariant) {
    baseProduct.selectedVariant = resolvedSelectedVariant;
    if (resolvedSelectedVariant.price !== undefined && resolvedSelectedVariant.price !== null) {
      baseProduct.price = resolvedSelectedVariant.price;
    }
    if (resolvedSelectedVariant.compareAtPrice !== undefined && resolvedSelectedVariant.compareAtPrice !== null) {
      baseProduct.compareAtPrice = resolvedSelectedVariant.compareAtPrice;
    }
  }

  ctx.addToCart(baseProduct as any, quantity);
  if (shouldOpenHostCart) ctx.openCart();
}

export async function handleThemeRuntimeRequest(
  method: ThemeRuntimeMethod,
  params: unknown,
  ctx: ThemeRuntimeHostHandlerContext,
): Promise<unknown> {
  switch (method) {
    case 'track': {
      const p = params as { eventName?: unknown; payload?: unknown };
      const eventName = p.eventName;
      if (!isStorefrontTrackingEvent(eventName)) {
        throw new Error('Invalid tracking event name');
      }
      const payload =
        p.payload && typeof p.payload === 'object' && !Array.isArray(p.payload)
          ? (p.payload as StorefrontTrackingPayload)
          : {};
      if (eventName === 'view_item' && typeof payload.productId === 'string') {
        if (ctx.lastTrackedProductViewRef.current === payload.productId) {
          return { skipped: true };
        }
        ctx.lastTrackedProductViewRef.current = payload.productId;
      }
      if (eventName === 'search' && typeof payload.searchQuery === 'string') {
        const key = `${ctx.locationPathname}:${payload.searchQuery.trim()}`;
        if (ctx.lastTrackedSearchRef.current === key) {
          return { skipped: true };
        }
        ctx.lastTrackedSearchRef.current = key;
      }
      trackEvent(eventName, {
        ...payload,
        currency: typeof payload.currency === 'string' ? payload.currency : ctx.storeCurrency,
        language: typeof payload.language === 'string' ? payload.language : ctx.storeLanguage,
        direction: typeof payload.direction === 'string' ? payload.direction : ctx.storeDirection,
      });
      return { ok: true };
    }
    case 'getProducts': {
      const p = (params || {}) as { limit?: number; search?: string; category?: string; status?: string };
      const cap = Math.min(typeof p.limit === 'number' && p.limit > 0 ? p.limit : 12, 100);
      const query = new URLSearchParams();
      query.append('limit', String(cap));
      if (p.search) query.append('search', p.search);
      if (p.category) query.append('category', p.category);
      if (p.status) query.append('status', p.status);
      const data = await fetchApi<unknown>(`/products?${query.toString()}`);
      const list = normalizeListResponse<unknown>(data);
      return list.slice(0, cap);
    }
    case 'getProduct': {
      const p = params as { id?: string };
      const id = typeof p?.id === 'string' ? p.id.trim() : '';
      if (!id) throw new Error('Missing product id');
      return await fetchApi<unknown>(`/products/${encodeURIComponent(id)}`);
    }
    case 'getCategories': {
      const p = (params || {}) as { limit?: number };
      const cap = Math.min(typeof p.limit === 'number' && p.limit > 0 ? p.limit : 12, 100);
      const url = cap > 0 ? `/categories?limit=${cap}` : '/categories';
      const data = await fetchApi<unknown>(url);
      const list = normalizeListResponse<unknown>(data);
      return cap > 0 ? list.slice(0, cap) : list;
    }
    case 'getMenu': {
      const p = params as { handle?: string };
      const handle = typeof p?.handle === 'string' ? p.handle.trim() : '';
      if (!handle) throw new Error('Missing menu handle');
      const data = await fetchApi<{ items?: unknown[] }>(
        `/menus/by-handle?handle=${encodeURIComponent(handle)}`,
      );
      return Array.isArray(data?.items) ? data.items : [];
    }
    case 'getReviews': {
      const p = params as { productId?: string };
      const productId = typeof p?.productId === 'string' ? p.productId.trim() : '';
      if (!productId) throw new Error('Missing productId');
      const query = new URLSearchParams();
      query.append('productId', productId);
      query.append('status', 'Approved');
      const data = await fetchApi<unknown>(`/reviews?${query.toString()}`);
      return normalizeListResponse<unknown>(data);
    }
    case 'getStoreReviews': {
      const p = params as { limit?: number };
      const limit = Number.isFinite(Number(p?.limit)) ? Math.max(1, Number(p?.limit)) : 50;
      const query = new URLSearchParams();
      query.append('status', 'Approved');
      const data = await fetchApi<unknown>(`/reviews?${query.toString()}`);
      return normalizeListResponse<unknown>(data).slice(0, limit);
    }
    case 'getPolicy': {
      const p = params as { slug?: string };
      const slug = typeof p?.slug === 'string' ? p.slug.trim() : '';
      if (!slug) throw new Error('Missing policy slug');
      const def = POLICY_SLUG_MAP[slug];
      if (!def) return null;
      const cfg = await fetchApi<{ policies?: Record<string, string> }>('/store-config');
      const policies = cfg?.policies;
      if (!policies) return null;
      const key = def.key;
      const body =
        key === 'returnExchange'
          ? (policies.returnExchange ?? (policies as Record<string, string>).refund ?? '')
          : String((policies as Record<string, string>)[key] ?? '');
      return body ? { slug, body } : null;
    }
    case 'getOrderById': {
      const p = params as { orderId?: string };
      const orderId = typeof p?.orderId === 'string' ? p.orderId.trim().replace(/^#/, '') : '';
      if (!orderId) throw new Error('Missing order id');
      return await ordersApi.getById(orderId);
    }
    case 'submitContact': {
      const p = params as { name?: string; email?: string; message?: string };
      const name = typeof p.name === 'string' ? p.name.trim() : '';
      const email = typeof p.email === 'string' ? p.email.trim() : '';
      const message = typeof p.message === 'string' ? p.message.trim() : '';
      if (!name || !email || !message) throw new Error('Invalid contact payload');
      const payload: Omit<ContactMessage, 'id' | 'date' | 'read'> = { name, email, message };
      return await messagesApi.create(payload);
    }
    case 'submitReview': {
      const p = params as {
        productId?: string;
        review?: { customerName: string; rating: number; comment: string };
      };
      const productId = typeof p?.productId === 'string' ? p.productId.trim() : '';
      if (!productId || !p.review) throw new Error('Invalid review payload');
      return await reviewsApi.create({
        productId,
        customerName: p.review.customerName,
        rating: p.review.rating,
        comment: p.review.comment ?? '',
      });
    }
    case 'addToCart': {
      const p = (params || {}) as Record<string, unknown>;
      processIframeAddToCartMessage(p, ctx);
      return { ok: true };
    }
    case 'removeFromCart': {
      const p = params as { productId?: string; variantId?: string };
      const productId = String(p?.productId ?? '').trim();
      const variantId =
        typeof p?.variantId === 'string' && p.variantId.trim() ? p.variantId.trim() : undefined;
      if (!productId) throw new Error('Missing productId');
      if (variantId) {
        ctx.removeFromCart(productId, variantId);
        return { ok: true };
      }
      const candidates = (ctx.cart || []).filter((item) => String(item.id) === productId);
      for (const item of candidates) {
        const vid = (item as { selectedVariant?: { id?: string } }).selectedVariant?.id;
        ctx.removeFromCart(productId, typeof vid === 'string' && vid.trim() ? vid.trim() : undefined);
      }
      return { ok: true };
    }
    case 'navigate': {
      const p = params as { path?: string };
      const nextPath = typeof p?.path === 'string' ? p.path.trim() : '';
      if (!nextPath || !nextPath.startsWith('/')) {
        return { ok: true };
      }
      const current = `${ctx.locationPathname}${ctx.locationSearch || ''}`;
      if (nextPath !== current) {
        if (ctx.navigateInternal) ctx.navigateInternal(nextPath);
        else window.location.assign(nextPath);
      }
      return { ok: true };
    }
    case 'setLocalization': {
      const p = params as {
        path?: string;
        languageCode?: string;
        countryCode?: string;
        currencyCode?: string;
        marketId?: string;
      };
      void p.countryCode;
      void p.currencyCode;
      void p.marketId;
      const current = `${ctx.locationPathname}${ctx.locationSearch || ''}`;
      const explicit = typeof p?.path === 'string' ? p.path.trim() : '';
      if (explicit && explicit.startsWith('/')) {
        if (explicit !== current) {
          if (ctx.navigateInternal) ctx.navigateInternal(explicit);
          else window.location.assign(explicit);
        }
        return { ok: true };
      }
      const lang = typeof p?.languageCode === 'string' ? p.languageCode.trim() : '';
      if (lang) {
        const full = buildLocalizedStorefrontPath(normalizeLocale(lang), {
          pathname: ctx.locationPathname || '/',
          search: ctx.locationSearch || '',
        });
        if (full !== current) {
          if (ctx.navigateInternal) ctx.navigateInternal(full);
          else window.location.assign(full);
        }
      }
      return { ok: true };
    }
    case 'newsletterSubscribe': {
      const p = params as { email?: string };
      const email = typeof p?.email === 'string' ? p.email.trim() : '';
      if (!email) throw new Error('Missing email');
      await ctx.addSubscriber(email);
      return { ok: true };
    }
    case 'openCart': {
      ctx.openCart();
      return { ok: true };
    }
    case 'toggleWishlist': {
      const p = params as { product?: unknown };
      if (p.product && typeof p.product === 'object') {
        ctx.toggleWishlist(p.product);
      }
      return { ok: true };
    }
    default: {
      const _exhaustive: never = method;
      void _exhaustive;
      throw new Error(`Unknown runtime method`);
    }
  }
}
