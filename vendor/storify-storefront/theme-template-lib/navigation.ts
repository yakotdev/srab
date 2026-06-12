import { getLocaleFromPath, localizePath, stripLocaleFromPath } from '../lib/locale-routing';
import { themeRuntimeCall, shouldUseThemeRuntimeBridge } from '../theme-runtime/theme-client';
import { getHostOrigin } from './host-origin';
import { isStorifyThemeEmbedded } from './theme-embedded';

/**
 * Uploaded themes run at `.../index.html?path=/ar/shop&...` while `window.location.pathname` is `/index.html`.
 * Use the parent-synced storefront path from `path=` so locale prefixes match the real storefront URL.
 */
export function getStorefrontPathFromThemeFrame(): string {
  if (typeof window === 'undefined') return '/';
  try {
    const q = new URLSearchParams(window.location.search);
    const raw = q.get('path');
    if (raw && raw.trim()) {
      const decoded = decodeURIComponent(raw.trim());
      if (decoded.startsWith('/')) {
        const noHash = decoded.split('#')[0] ?? decoded;
        return (noHash.split('?')[0] || '/').replace(/\/{2,}/g, '/') || '/';
      }
    }
  } catch {
    /* ignore */
  }
  const p = window.location.pathname || '/';
  return p.startsWith('/') ? p : `/${p}`;
}

const getStoreIdFromSearch = (search: string): string | undefined => {
  try {
    const params = new URLSearchParams(search);
    const fromQuery = params.get('storeId') || params.get('store_id');
    if (fromQuery && fromQuery.trim()) return fromQuery.trim();
  } catch {
    /* ignore */
  }
  return undefined;
};

const getActiveStoreId = (): string | undefined => {
  const fromCurrent = getStoreIdFromSearch(window.location.search);
  if (fromCurrent) return fromCurrent;
  try {
    if (document.referrer) {
      const ref = new URL(document.referrer);
      return getStoreIdFromSearch(ref.search);
    }
  } catch {
    /* ignore */
  }
  return undefined;
};

/** Absolute URL on the storefront host so navigation breaks out of the theme iframe (`target="_top"`). */
/** Normalize manifest `link` field (string or { url }) to a path or absolute URL. */
export function normalizeLinkPath(link: unknown, fallback = '/'): string {
  if (typeof link === 'string' && link.trim()) {
    const u = link.trim();
    if (u.startsWith('http')) return u;
    return u.startsWith('/') ? u : `/${u}`;
  }
  if (link && typeof link === 'object' && 'url' in link && typeof (link as { url?: string }).url === 'string') {
    const u = (link as { url: string }).url.trim();
    if (u.startsWith('http')) return u;
    return u.startsWith('/') ? u : `/${u}`;
  }
  return fallback;
}

export const toStorefrontUrl = (path: string): string => {
  const raw = path.startsWith('http') ? path : path.startsWith('/') ? path : `/${path}`;
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    return raw;
  }
  const url = new URL(raw, getHostOrigin());
  const storeId = getActiveStoreId();
  if (storeId && !url.searchParams.get('storeId') && !url.searchParams.get('store_id')) {
    url.searchParams.set('storeId', storeId);
  }
  return url.toString();
};

const isAbsoluteHttp = (url: string): boolean => /^https?:\/\//i.test(url);

export const isInternalStorefrontPath = (path: string): boolean => {
  if (!path) return false;
  if (isAbsoluteHttp(path)) return false;
  return path.startsWith('/');
};

/** When the storefront URL uses `/:locale/...`, keep that prefix on theme links (`/shop` → `/ar/shop`). */
function applyLocalePrefixFromHostPath(internalPath: string): string {
  if (typeof window === 'undefined') return internalPath;
  try {
    const hostLike = getStorefrontPathFromThemeFrame();
    const locale =
      getLocaleFromPath(hostLike) || getLocaleFromPath(window.location.pathname || '/');
    if (!locale) return internalPath;
    const stripped = stripLocaleFromPath(internalPath);
    return localizePath(stripped, locale);
  } catch {
    return internalPath;
  }
}

/**
 * Navigate without forcing full page reload when theme is embedded.
 * Falls back to hard navigation for external URLs.
 */
export const navigateStorefront = (path: string): void => {
  const normalized = normalizeLinkPath(path, '/');
  const target =
    isInternalStorefrontPath(normalized) ? applyLocalePrefixFromHostPath(normalized) : normalized;

  if (isInternalStorefrontPath(target) && isStorifyThemeEmbedded()) {
    if (shouldUseThemeRuntimeBridge()) {
      void themeRuntimeCall('navigate', { path: target }).catch(() => {});
      return;
    }
    window.parent?.postMessage?.({ type: 'STORIFY_NAVIGATE', path: target }, '*');
    return;
  }

  const url = toStorefrontUrl(target);
  window.location.assign(url);
};
