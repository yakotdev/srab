import { getStorifySDK } from './sdk-runtime';

declare global {
  interface Window {
    StorifySDK?: {
      setStoreConfig: (config: {
        id?: string;
        currency?: string;
        currencyFormat?: { symbol?: string | null; decimalPlaces?: number | null };
        language?: string;
        baseLocale?: string;
        direction?: string;
        apiBaseUrl?: string;
      } | null) => void;
      getProducts?: (query?: { limit?: number }) => Promise<unknown[]>;
      getProduct?: (id: string) => Promise<unknown>;
      getCategories?: () => Promise<unknown[]>;
      getMenu?: (handle: string) => Promise<unknown[]>;
      getPolicy?: (slug: string) => Promise<{ slug?: string; body?: string } | null>;
      getReviews?: (productId: string) => Promise<unknown[]>;
      addReview?: (
        productId: string,
        input: { customerName: string; rating: number; comment: string },
      ) => Promise<unknown>;
      getOrderById?: (id: string) => Promise<unknown>;
      formatPrice?: (amount: number) => string;
      requiresVariantSelection?: (product: unknown) => boolean;
      assertVariantRequiredForAddToCart?: (product: unknown, variantId?: string) => void;
      getMaxOrderableQuantity?: (product: unknown, variantId?: string) => number;
      isPurchasable?: (product: unknown, variantId?: string) => boolean;
      checkCanAddQuantity?: (
        product: unknown,
        quantity: number,
        variantId?: string,
        existingCartQty?: number,
      ) => { ok: true } | { ok: false; message: string };
      checkLineQuantityAllowed?: (
        product: unknown,
        quantity: number,
        variantId?: string,
      ) => { ok: true } | { ok: false; message: string };
      quickAddToCart?: (
        product: unknown,
        quantity?: number,
        variantId?: string,
      ) => { ok: true } | { ok: false; code?: string; message?: string };
      buildStorifyAddToCartMessage?: (
        product: unknown,
        explicitQuantity?: number,
      ) => Record<string, unknown> | null;
      VARIANT_REQUIRED_CODE?: string;
      OUT_OF_STOCK_CODE?: string;
      findSelectedVariant?: (product: unknown, selectedOptions: Record<string, string>) => unknown | null;
      getOptionValueFromVariant?: (product: unknown, v: unknown, optionName: string) => string | undefined;
      isOptionValueAvailable?: (product: unknown, optionName: string, value: string) => boolean;
      normalizeOptionValue?: (s: string) => string;
      selectedOptionsFromVariant?: (product: unknown, v: unknown) => Record<string, string> | null;
      prepareProductDescription?: (html: string) => string;
      getWishlist?: () => unknown[];
      toggleWishlist?: (product: unknown) => void;
      isInWishlist?: (productId: string) => boolean;
    };
  }
}

let loadPromise: Promise<void> | null = null;
let lastLoadedUrl: string | null = null;
const failedSdkUrls = new Set<string>();

/** Admin SPA used to expose /sdk/*.js as index.html — always prefer the API static route. */
export function normalizePlatformSdkScriptUrl(scriptUrl: string): string {
  const t = typeof scriptUrl === 'string' ? scriptUrl.trim() : '';
  if (!t) return t;
  try {
    const u = new URL(t);
    if (u.pathname === '/sdk/storefront-sdk.js') {
      u.pathname = '/api/sdk/storefront-sdk.js';
      return u.toString();
    }
  } catch {
    /* ignore */
  }
  return t;
}

/**
 * Injects the platform storefront SDK script once. Caller must then call StorifySDK.setStoreConfig.
 */
export function loadStorifySdk(scriptUrl: string): Promise<void> {
  const url = normalizePlatformSdkScriptUrl(typeof scriptUrl === 'string' ? scriptUrl.trim() : '');
  if (!url) return Promise.resolve();

  if (typeof window !== 'undefined' && getStorifySDK()?.setStoreConfig) {
    return Promise.resolve();
  }

  if (failedSdkUrls.has(url)) {
    return Promise.reject(new Error(`Failed to load Storify SDK: ${url}`));
  }

  if (loadPromise && lastLoadedUrl === url) return loadPromise;

  lastLoadedUrl = url;
  loadPromise = new Promise((resolve, reject) => {
    const safeKey = encodeURIComponent(url);
    const existing = document.querySelector(`script[data-storify-sdk="${safeKey}"]`) as HTMLScriptElement | null;
    if (existing) {
      if (getStorifySDK()?.setStoreConfig) {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener(
        'error',
        () => {
          failedSdkUrls.add(url);
          loadPromise = null;
          lastLoadedUrl = null;
          reject(new Error(`Failed to load Storify SDK: ${url}`));
        },
        { once: true },
      );
      queueMicrotask(() => {
        if (getStorifySDK()?.setStoreConfig) resolve();
      });
      return;
    }

    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    script.setAttribute('data-cfasync', 'false');
    script.setAttribute('data-storify-sdk', safeKey);
    script.onload = () => resolve();
    script.onerror = () => {
      failedSdkUrls.add(url);
      loadPromise = null;
      lastLoadedUrl = null;
      reject(new Error(`Failed to load Storify SDK: ${url}`));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}

let editorBridgeLoadPromise: Promise<void> | null = null;
let lastEditorBridgeUrl: string | null = null;

/** يحمّل theme-editor-bridge.js من أصل المنصة (مرة واحدة لكل URL). */
export function loadStorifyEditorBridge(scriptUrl: string): Promise<void> {
  const url = typeof scriptUrl === 'string' ? scriptUrl.trim() : '';
  if (!url) return Promise.resolve();

  if (editorBridgeLoadPromise && lastEditorBridgeUrl === url) return editorBridgeLoadPromise;

  lastEditorBridgeUrl = url;
  editorBridgeLoadPromise = new Promise((resolve, reject) => {
    const safeKey = encodeURIComponent(url);
    const existing = document.querySelector(
      `script[data-storify-editor-bridge="${safeKey}"]`,
    ) as HTMLScriptElement | null;
    if (existing) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    script.setAttribute('data-storify-editor-bridge', safeKey);
    script.onload = () => resolve();
    script.onerror = () => {
      editorBridgeLoadPromise = null;
      lastEditorBridgeUrl = null;
      reject(new Error(`Failed to load Storify editor bridge: ${url}`));
    };
    document.head.appendChild(script);
  });

  return editorBridgeLoadPromise;
}

export function applyStorifyStoreConfig(payload: {
  storeId?: string;
  store?: {
    currency?: string;
    currencyFormat?: { symbol?: string | null; decimalPlaces?: number | null };
    language?: string;
    baseLocale?: string;
    direction?: string;
  };
  apiBaseUrl?: string;
}): void {
  const sdk = getStorifySDK();
  if (!sdk?.setStoreConfig) return;
  sdk.setStoreConfig({
    id: payload.storeId,
    currency: payload.store?.currency,
    currencyFormat: payload.store?.currencyFormat,
    language: payload.store?.language,
    baseLocale: payload.store?.baseLocale,
    direction: payload.store?.direction,
    apiBaseUrl: payload.apiBaseUrl,
  });
}
