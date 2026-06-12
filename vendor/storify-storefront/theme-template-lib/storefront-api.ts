import { useEffect, useMemo, useState } from 'react';
import type { Category, Product } from '@srab/constants';
import { useThemeConfig } from '@srab/ThemeContext';
import { getLocaleFromPath, normalizeLocale } from '../lib/locale-routing';
import { getStoreId, getStoreSdkConfig } from '../lib/sdk/config';
import { themeRuntimeCall, shouldUseThemeRuntimeBridge } from '../theme-runtime/theme-client';
import { getCachedCategoriesList, getCachedProductById, getCachedProductsList } from './catalog-fetch-cache';
import { getHostOrigin } from './host-origin';
import { getStorifySDK } from './sdk-runtime';

export { getStorifySDK } from './sdk-runtime';

/**
 * Prefetched data cache — populated from parent postMessage to avoid
 * Chrome Private Network Access blocking cross-origin iframe → localhost fetches.
 */
const _prefetchedMenus: Record<string, unknown[]> = {};
let _prefetchedReviews: unknown[] = [];

export function setPrefetchedMenus(menus: Record<string, unknown[]>): void {
  for (const [handle, items] of Object.entries(menus)) {
    if (Array.isArray(items)) _prefetchedMenus[handle] = items;
  }
}

export function setPrefetchedReviews(reviews: unknown[]): void {
  _prefetchedReviews = Array.isArray(reviews) ? reviews : [];
}

export interface MenuItem {
  id?: string;
  label?: string;
  name?: string;
  title?: string;
  url?: string;
  href?: string;
}

/** Iframe themes get ?storeId= on the URL even when React config loses storeId briefly. */
function getStoreIdFromLocation(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const q = new URLSearchParams(window.location.search);
    const id = q.get('storeId') ?? q.get('store_id');
    return id && id.trim() ? id.trim() : undefined;
  } catch {
    return undefined;
  }
}

function normalizeOptionalStoreId(value?: string | null): string | undefined {
  if (value == null) return undefined;
  const t = String(value).trim();
  return t || undefined;
}

/**
 * Single resolution order for theme API calls: explicit hook arg → ThemeContext.storeId
 * → SDK `setStoreConfig` / `getStoreId()` → URL query (?storeId=).
 */
export function resolveThemeStoreId(explicit?: string | null, contextStoreId?: string | null): string | undefined {
  return (
    normalizeOptionalStoreId(explicit)
    ?? normalizeOptionalStoreId(contextStoreId)
    ?? normalizeOptionalStoreId(getStoreId())
    ?? getStoreIdFromLocation()
  );
}

/** Same resolution as {@link resolveThemeStoreId} for sections that only need “is there a store?” without passing `storeId` into every hook. */
export function useResolvedStoreId(override?: string | null): string | undefined {
  const { storeId: themeStoreId } = useThemeConfig();
  return resolveThemeStoreId(override, themeStoreId);
}

function normalizeOptionalLangCode(value?: string | null): string | undefined {
  if (value == null) return undefined;
  const t = String(value).trim();
  if (!t) return undefined;
  return normalizeLocale(t);
}

function getLanguageFromPathSegment(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const loc = getLocaleFromPath(window.location.pathname);
  return loc ? normalizeLocale(loc) : undefined;
}

function getLanguageFromLocationQuery(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const q = new URLSearchParams(window.location.search);
    const raw = q.get('language') ?? q.get('lang') ?? q.get('locale');
    return normalizeOptionalLangCode(raw);
  } catch {
    return undefined;
  }
}

const RTL_PRIMARY_LANGS = new Set(['ar', 'he', 'fa', 'ur']);

/** RTL when primary language subtag is ar/he/fa/ur (same rule as ThemeApp). */
export function isRtlLocale(language: string): boolean {
  return RTL_PRIMARY_LANGS.has(normalizeLocale(language));
}

/**
 * Active storefront language: explicit override → URL path prefix (`/en/...`) → query (`?lang=`)
 * → ThemeContext `store.language` → SDK `setStoreConfig` (language / baseLocale) → `ar`.
 *
 * Path and query beat `store.language` so embedded themes (ThemeDirectLoader) stay aligned with
 * the storefront URL when `store.language` from bootstrap still reflects the store default
 * (e.g. `ar` while the customer browses `/en/...`). That mismatch previously caused host
 * translation overrides (`messagesLanguage`) to be dropped in the theme translator.
 */
export function resolveThemeLanguage(explicit?: string | null, contextLanguage?: string | null): string {
  const sdk = getStoreSdkConfig();
  const raw =
    normalizeOptionalLangCode(explicit)
    ?? getLanguageFromPathSegment()
    ?? getLanguageFromLocationQuery()
    ?? normalizeOptionalLangCode(contextLanguage)
    ?? normalizeOptionalLangCode(sdk?.language)
    ?? normalizeOptionalLangCode(sdk?.baseLocale)
    ?? 'ar';
  return normalizeLocale(raw);
}

export function useResolvedLanguage(override?: string | null): string {
  const { store } = useThemeConfig();
  return resolveThemeLanguage(override, store?.language ?? null);
}

/**
 * Append storeId as a query-parameter instead of a custom header.
 * Custom headers (X-Store-Id) force a CORS preflight OPTIONS request
 * which the storefront API doesn't always handle — causing every
 * request to fail with net::ERR_FAILED.
 */
function appendStoreId(url: string, storeId?: string): string {
  if (!storeId) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}storeId=${encodeURIComponent(storeId)}`;
}

function appendLanguage(url: string, language?: string): string {
  if (!language) return url;
  const normalized = String(language).trim().toLowerCase().split('-')[0];
  if (!normalized) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}language=${encodeURIComponent(normalized)}`;
}

/**
 * Detect if we're in a cross-origin iframe where direct API calls will fail.
 * When SDK is not available and we're in an iframe, skip the API fallback
 * because the parent storefront already passes data via postMessage.
 */
function isCrossOriginIframe(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.parent === window) return false; // not in iframe
  try {
    // If we can access parent.location.origin, we're same-origin
    void window.parent.location.origin;
    return false;
  } catch {
    // SecurityError = cross-origin iframe
    return true;
  }
}

async function fetchPublicApi<T>(path: string, storeId?: string, language?: string): Promise<T> {
  const safePath = path.startsWith('/') ? path : `/${path}`;
  const lang = language ?? resolveThemeLanguage(undefined, null);
  const url = appendLanguage(appendStoreId(`${getHostOrigin()}/api${safePath}`, storeId), lang);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Request failed (${res.status}) for ${path}`);
  }
  return (await res.json()) as T;
}

async function postPublicApi<T>(path: string, body: unknown, storeId?: string, language?: string): Promise<T> {
  const safePath = path.startsWith('/') ? path : `/${path}`;
  const lang = language ?? resolveThemeLanguage(undefined, null);
  const url = appendLanguage(appendStoreId(`${getHostOrigin()}/api${safePath}`, storeId), lang);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Request failed (${res.status}) for ${path}`);
  }
  return (await res.json()) as T;
}


function normalizeListResponse<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object' && 'data' in data && Array.isArray((data as { data: unknown }).data)) {
    return (data as { data: T[] }).data;
  }
  return [];
}

/** Align with SDK `requiresVariantSelection` when loaded; else infer from `variants` length. See docs/theme/CONTRACT_V1.md */
export function needsVariantSelectionForProduct(product: Product): boolean {
  const sdk = getStorifySDK();
  if (sdk?.requiresVariantSelection) {
    return sdk.requiresVariantSelection(product as never);
  }
  const v = (product as { variants?: unknown[] }).variants;
  return Array.isArray(v) && v.length > 0;
}

/** Same idea as HeaderSection.pickMenuHandle — menu fields may be string handle or editor object. */
function resolveMenuHandle(raw: unknown): string {
  if (typeof raw === 'string') {
    const t = raw.trim();
    if (!t) return '';
    if (t.startsWith('{')) {
      try {
        return resolveMenuHandle(JSON.parse(t) as unknown);
      } catch {
        return '';
      }
    }
    return t.startsWith('/') ? '' : t;
  }
  if (!raw || typeof raw !== 'object') return '';
  const o = raw as Record<string, unknown>;
  const candidates: unknown[] = [o.handle, o.menuHandle, o.value, o.slug, o.id, o.ar, o.en];
  const value = candidates.find((v) => typeof v === 'string' && String(v).trim()) as string | undefined;
  if (!value) return '';
  const handle = value.trim();
  return handle && !handle.startsWith('/') ? handle : '';
}

export function useProducts(storeIdOverride?: string, limit = 12) {
  const { sdkReady, storeId: themeStoreId, store } = useThemeConfig();
  const resolvedLang = resolveThemeLanguage(undefined, store?.language ?? null);
  const [products, setProducts] = useState<Product[]>([]);
  const effectiveStoreId = resolveThemeStoreId(storeIdOverride, themeStoreId);

  useEffect(() => {
    let mounted = true;
    const cap = Math.min(limit, 100);
    const bridge = shouldUseThemeRuntimeBridge();
    const cacheKey = `products:${(effectiveStoreId || '').trim()}:${resolvedLang}:${cap}:${sdkReady ? 1 : 0}:${bridge ? 'rt' : 'dir'}`;

    const run = async () => {
      try {
        const list = await getCachedProductsList(cacheKey, async (): Promise<unknown[]> => {
          const sdk = getStorifySDK();
          if (bridge) {
            const r = await themeRuntimeCall<unknown[]>('getProducts', { limit: cap });
            return Array.isArray(r) ? r.slice(0, cap) : [];
          }
          if (!effectiveStoreId?.trim()) {
            return [];
          }
          if (sdkReady && sdk?.getProducts) {
            const r = await sdk.getProducts({ limit: cap });
            return Array.isArray(r) ? r.slice(0, cap) : [];
          }
          if (isCrossOriginIframe()) {
            return [];
          }
          const url = cap > 0 ? `/products?limit=${cap}` : '/products';
          const data = await fetchPublicApi<unknown>(url, effectiveStoreId, resolvedLang);
          const normalized = normalizeListResponse<Product>(data);
          return cap > 0 ? normalized.slice(0, cap) : normalized;
        });
        if (!mounted) return;
        setProducts(Array.isArray(list) ? list.map((x) => x as Product) : []);
      } catch {
        if (mounted) setProducts([]);
      }
    };

    void run();
    return () => {
      mounted = false;
    };
  }, [effectiveStoreId, limit, sdkReady, resolvedLang]);

  return products;
}

export function useCategories(storeIdOverride?: string, limit = 12) {
  const { sdkReady, storeId: themeStoreId, store } = useThemeConfig();
  const resolvedLang = resolveThemeLanguage(undefined, store?.language ?? null);
  const [categories, setCategories] = useState<Category[]>([]);
  const effectiveStoreId = resolveThemeStoreId(storeIdOverride, themeStoreId);

  useEffect(() => {
    let mounted = true;
    const cap = Math.min(limit, 100);
    const bridge = shouldUseThemeRuntimeBridge();
    const cacheKey = `categories:${(effectiveStoreId || '').trim()}:${resolvedLang}:${cap}:${sdkReady ? 1 : 0}:${bridge ? 'rt' : 'dir'}`;

    const run = async () => {
      try {
        const list = await getCachedCategoriesList(cacheKey, async (): Promise<unknown[]> => {
          const sdk = getStorifySDK();
          if (bridge) {
            const r = await themeRuntimeCall<unknown[]>('getCategories', { limit: cap });
            const arr = Array.isArray(r) ? r : [];
            return cap > 0 ? arr.slice(0, cap) : arr;
          }
          if (!effectiveStoreId?.trim()) {
            return [];
          }
          if (sdkReady && sdk?.getCategories) {
            const r = await sdk.getCategories();
            const arr = Array.isArray(r) ? r : [];
            return cap > 0 ? arr.slice(0, cap) : arr;
          }
          if (isCrossOriginIframe()) {
            return [];
          }
          const url = cap > 0 ? `/categories?limit=${cap}` : '/categories';
          const data = await fetchPublicApi<unknown>(url, effectiveStoreId, resolvedLang);
          const normalized = normalizeListResponse<Category>(data);
          return cap > 0 ? normalized.slice(0, cap) : normalized;
        });
        if (!mounted) return;
        setCategories(Array.isArray(list) ? list.map((x) => x as Category) : []);
      } catch {
        if (mounted) setCategories([]);
      }
    };

    void run();
    return () => {
      mounted = false;
    };
  }, [effectiveStoreId, limit, sdkReady, resolvedLang]);

  return categories;
}

export function useProduct(productId: string | undefined, storeIdOverride?: string) {
  const { sdkReady, storeId: themeStoreId, store } = useThemeConfig();
  const resolvedLang = resolveThemeLanguage(undefined, store?.language ?? null);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const effectiveStoreId = resolveThemeStoreId(storeIdOverride, themeStoreId);

  useEffect(() => {
    let mounted = true;
    if (!productId) {
      setProduct(null);
      setLoading(false);
      return () => {
        mounted = false;
      };
    }
    if (!shouldUseThemeRuntimeBridge() && !effectiveStoreId?.trim()) {
      setProduct(null);
      setLoading(false);
      return () => {
        mounted = false;
      };
    }

    const bridge = shouldUseThemeRuntimeBridge();
    const cacheKey = `product:${productId}:${(effectiveStoreId || '').trim()}:${resolvedLang}:${sdkReady ? 1 : 0}:${bridge ? 'rt' : 'dir'}`;

    const run = async () => {
      setLoading(true);
      try {
        const p = await getCachedProductById(cacheKey, async (): Promise<unknown | null> => {
          const sdk = getStorifySDK();
          if (bridge) {
            const r = await themeRuntimeCall<unknown>('getProduct', { id: productId });
            return r && typeof r === 'object' ? r : null;
          }
          if (sdkReady && sdk?.getProduct) {
            const r = await sdk.getProduct(productId);
            return r && typeof r === 'object' ? r : null;
          }
          if (isCrossOriginIframe()) {
            return null;
          }
          const data = await fetchPublicApi<Product>(`/products/${encodeURIComponent(productId)}`, effectiveStoreId, resolvedLang);
          return data && typeof data === 'object' ? data : null;
        });
        if (!mounted) return;
        setProduct(p && typeof p === 'object' ? (p as Product) : null);
      } catch {
        if (mounted) setProduct(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void run();
    return () => {
      mounted = false;
    };
  }, [productId, effectiveStoreId, sdkReady, resolvedLang]);

  return { product, loading };
}

export function useMenu(menuHandle: unknown, storeIdOverride?: string) {
  const handle = resolveMenuHandle(menuHandle);
  const { sdkReady, storeId: themeStoreId, store } = useThemeConfig();
  const resolvedLang = resolveThemeLanguage(undefined, store?.language ?? null);
  const [items, setItems] = useState<MenuItem[]>([]);
  const effectiveStoreId = resolveThemeStoreId(storeIdOverride, themeStoreId);

  useEffect(() => {
    let mounted = true;
    if (!handle) {
      setItems([]);
      return () => {
        mounted = false;
      };
    }

    const run = async () => {
      // Use prefetched menu data from parent postMessage FIRST (avoids PNA block)
      if (_prefetchedMenus[handle] && _prefetchedMenus[handle].length > 0) {
        if (!mounted) return;
        setItems(_prefetchedMenus[handle] as MenuItem[]);
        return;
      }
      if (shouldUseThemeRuntimeBridge()) {
        try {
          const list = await themeRuntimeCall<unknown[]>('getMenu', { handle });
          if (!mounted) return;
          setItems(Array.isArray(list) ? (list as MenuItem[]) : []);
        } catch {
          if (mounted) setItems([]);
        }
        return;
      }
      if (isCrossOriginIframe()) {
        return;
      }
      const sdk = getStorifySDK();
      try {
        if (sdkReady && sdk?.getMenu) {
          const list = await sdk.getMenu(handle);
          if (!mounted) return;
          setItems(Array.isArray(list) ? (list as MenuItem[]) : []);
          return;
        }
        if (!effectiveStoreId?.trim()) {
          if (mounted) setItems([]);
          return;
        }
        const data = await fetchPublicApi<{ items?: MenuItem[] }>(
          `/menus/by-handle?handle=${encodeURIComponent(handle)}`,
          effectiveStoreId,
          resolvedLang,
        );
        if (!mounted) return;
        setItems(Array.isArray(data?.items) ? data.items : []);
      } catch {
        if (mounted) setItems([]);
      }
    };

    void run();
    return () => {
      mounted = false;
    };
  }, [handle, effectiveStoreId, sdkReady, resolvedLang]);

  return useMemo(() => items, [items]);
}

export function formatPrice(price: number | string | undefined, currency?: string): string {
  if (price === undefined || price === null) return '';
  const num = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(num)) return String(price);

  const sdk = getStorifySDK();
  if (sdk?.formatPrice) {
    return sdk.formatPrice(num);
  }

  const safeCurrency = currency && currency.trim() !== '' ? currency.trim() : 'SAR';
  const locale = resolveThemeLanguage(undefined, null);
  
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: safeCurrency,
    }).format(num);
  } catch (e) {
    const symbol = currency || safeCurrency;
    return locale.startsWith('ar') ? `${num.toLocaleString(locale)} ${symbol}` : `${symbol} ${num.toLocaleString(locale)}`;
  }
}

export async function fetchProductReviews(productId: string, storeIdOverride?: string): Promise<unknown[]> {
  const effectiveStoreId = resolveThemeStoreId(storeIdOverride, null);

  // Use prefetched reviews from parent postMessage FIRST (avoids PNA block in cross-origin iframe)
  if (_prefetchedReviews.length > 0) {
    return _prefetchedReviews;
  }

  if (shouldUseThemeRuntimeBridge()) {
    try {
      const list = await themeRuntimeCall<unknown[]>('getReviews', { productId });
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  }

  if (isCrossOriginIframe()) {
    return [];
  }

  const sdk = getStorifySDK();
  try {
    if (sdk?.getReviews) {
      const list = await sdk.getReviews(productId);
      return Array.isArray(list) ? list : [];
    }
  } catch (e) {
    console.warn("SDK getReviews failed, using fallback endpoint.", e);
  }

  if (!effectiveStoreId) return [];
  const query = new URLSearchParams();
  query.append('productId', productId);
  query.append('status', 'Approved');
  const url = `/reviews?${query.toString()}`;
  try {
    const data = await fetchPublicApi<unknown>(url, effectiveStoreId, resolveThemeLanguage(undefined, null));
    return normalizeListResponse(data);
  } catch (err) {
    console.error('Error in fetchProductReviews fallback:', err);
    return [];
  }
}

export async function submitProductReview(productId: string, review: { customerName: string; rating: number; comment: string }, storeIdOverride?: string): Promise<any> {
  const effectiveStoreId = resolveThemeStoreId(storeIdOverride, null);
  if (shouldUseThemeRuntimeBridge()) {
    return await themeRuntimeCall('submitReview', { productId, review });
  }
  const sdk = getStorifySDK();
  try {
    if (sdk?.addReview) {
      return await sdk.addReview(productId, review);
    }
  } catch (e) {
    console.warn("SDK addReview failed, using fallback endpoint.", e);
  }

  if (!effectiveStoreId) throw new Error("No store configuration available for review submission");
  
  const payload = {
    ...review,
    productId,
  };
  return await postPublicApi<any>('/reviews', payload, effectiveStoreId, resolveThemeLanguage(undefined, null));
}
