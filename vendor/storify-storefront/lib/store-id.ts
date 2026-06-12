const STORE_CONFIG_KEY = '__STORE_CONFIG__';
const STORE_ID_STORAGE_KEY = 'active_store_id';

const RESERVED_PATH_SEGMENTS = new Set([
  'admin',
  'api',
  'store',
  'checkout',
  'order-success',
  '404',
  '500',
  '403',
  '503',
  'health',
  'metrics',
  '_stats',
  'static',
  'assets',
  'favicon.ico',
  'product',
  'shop',
  'collection',
  'cart',
  'wishlist',
  'track-order',
  'profile',
  'policies',
  'about',
  'contact',
  'blog',
  'lookbook',
  'search',
  'login',
  'register',
  'account',
]);

function readMalformedUnnamedStoreId(search: string): string | null {
  try {
    if (!search.startsWith('?')) return null;
    const first = search.slice(1).split('&')[0] || '';
    if (!first.startsWith('=') || first.length <= 1) return null;
    const value = decodeURIComponent(first.slice(1)).trim();
    return value || null;
  } catch {
    return null;
  }
}

function readStoreIdFromSearch(search: string): string | null {
  const params = new URLSearchParams(search);
  const raw =
    params.get('storeId') ??
    params.get('store_id') ??
    readMalformedUnnamedStoreId(search);
  const normalized = typeof raw === 'string' ? raw.trim() : '';
  return normalized || null;
}

function isLocalHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

function readStoreIdFromPath(pathname: string): string | null {
  const pathSegment = pathname.replace(/^\/+|\/+$/g, '').split('/')[0];
  if (!pathSegment) return null;
  if (RESERVED_PATH_SEGMENTS.has(pathSegment.toLowerCase())) return null;
  return pathSegment;
}

function readStoreIdFromSubdomain(hostname: string): string | null {
  const match = hostname.match(/^([^.]+)\.storify\.it\.com$/);
  return match ? match[1] : null;
}

function persistStoreId(storeId: string): void {
  try {
    localStorage.setItem(STORE_ID_STORAGE_KEY, storeId);
  } catch {
    // ignore storage failures
  }
}

function readStoredStoreId(): string | null {
  try {
    const stored = localStorage.getItem(STORE_ID_STORAGE_KEY);
    const normalized = typeof stored === 'string' ? stored.trim() : '';
    return normalized || null;
  } catch {
    return null;
  }
}

export function getResolvedStoreId(): string | null {
  if (typeof window === 'undefined') return null;

  const win = window as Window & { [STORE_CONFIG_KEY]?: { id?: string } };
  const globalStoreId = win[STORE_CONFIG_KEY]?.id?.trim();
  if (globalStoreId) return globalStoreId;

  const queryStoreId = readStoreIdFromSearch(window.location.search || '');
  if (queryStoreId) {
    persistStoreId(queryStoreId);
    return queryStoreId;
  }

  const pathStoreId = readStoreIdFromPath(window.location.pathname || '/');
  if (pathStoreId) {
    persistStoreId(pathStoreId);
    return pathStoreId;
  }

  const storedStoreId = readStoredStoreId();
  if (storedStoreId) return storedStoreId;

  const hostname = window.location.hostname;
  const env = (import.meta as unknown as { env?: { VITE_DEV_STORE_ID?: string } }).env;
  if (isLocalHost(hostname) && env?.VITE_DEV_STORE_ID && env.VITE_DEV_STORE_ID.trim()) {
    return env.VITE_DEV_STORE_ID.trim();
  }
  if (isLocalHost(hostname)) return 'demo-dev-store';

  return readStoreIdFromSubdomain(hostname);
}

export function withStoreIdInGetPath(endpoint: string, storeId?: string | null): string {
  const sid = (storeId ?? getResolvedStoreId())?.trim();
  if (!sid) return endpoint;
  if (/[?&]storeId=/.test(endpoint) || /[?&]store_id=/.test(endpoint)) return endpoint;
  const trimmed = endpoint.replace(/\?$/, '');
  const separator = trimmed.includes('?') ? '&' : '?';
  return `${trimmed}${separator}storeId=${encodeURIComponent(sid)}`;
}
