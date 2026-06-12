/**
 * SDK config: API base URL, store id resolution, and store config for theme iframe.
 * Themes running in iframe must call setStoreConfig(payload.storeId, payload.store) when receiving STORIFY_THEME_CONFIG.
 */

import type { StoreSdkConfig } from './types';
import { getResolvedStoreId } from '../store-id';

const DEFAULT_API_URL = typeof import.meta !== 'undefined' && (import.meta as unknown as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL
  ? (import.meta as unknown as { env: { VITE_API_URL: string } }).env.VITE_API_URL
  : '/api';

/** Global store config set by host or by theme (from postMessage payload). */
const STORE_CONFIG_KEY = '__STORE_CONFIG__';

/** Dispatched on `window` after `setStoreConfig` so embedded themes can re-render (SDK reads globals; React does not). */
export const STORIFY_SDK_STORE_CONFIG_APPLIED = 'storify-sdk-store-config-applied';

function getRuntimeStoreConfig(): Partial<StoreSdkConfig> | null {
  if (typeof window === 'undefined') return null;
  try {
    const win = window as unknown as Window & {
      __STORIFY_THEME_CONFIG__?: {
        type?: string;
        payload?: {
          storeId?: string;
          store?: Partial<StoreSdkConfig> | null;
          apiBaseUrl?: string;
        } | null;
      };
    };
    const payload = win.__STORIFY_THEME_CONFIG__?.payload;
    const store = payload?.store && typeof payload.store === 'object' ? payload.store : null;
    if (!store) return null;
    return {
      ...store,
      id: payload?.storeId ?? store.id,
      apiBaseUrl: payload?.apiBaseUrl ?? store.apiBaseUrl,
    };
  } catch {
    return null;
  }
}

export function getApiUrl(): string {
  if (typeof window === 'undefined') return DEFAULT_API_URL;
  const win = window as unknown as Window & { [key: string]: unknown };
  const config = win[STORE_CONFIG_KEY] as StoreSdkConfig | undefined;
  if (config?.apiBaseUrl && typeof config.apiBaseUrl === 'string' && config.apiBaseUrl.trim())
    return config.apiBaseUrl.trim().replace(/\/?$/, '');
  return DEFAULT_API_URL;
}

/**
 * Resolve current store id: from global __STORE_CONFIG__ (set by host or theme), or from env in dev.
 */
export function getStoreId(): string | null {
  return getResolvedStoreId();
}

/**
 * Get store config (currency, language) for formatters. Used by formatPrice.
 */
export function getStoreSdkConfig(): StoreSdkConfig | null {
  if (typeof window === 'undefined') return null;
  const win = window as unknown as Window & { [key: string]: unknown };
  const config = win[STORE_CONFIG_KEY] as StoreSdkConfig | undefined;
  return config && typeof config === 'object' ? config : null;
}

/**
 * Call this from theme when receiving STORIFY_THEME_CONFIG so SDK can use storeId and formatPrice with correct currency/language.
 * Example: setStoreConfig({ id: payload.storeId, currency: payload.store?.currency, language: payload.store?.language, apiBaseUrl: payload.apiBaseUrl });
 */
export function setStoreConfig(config: StoreSdkConfig | null): void {
  if (typeof window === 'undefined') return;
  const win = window as unknown as Window & { [key: string]: unknown };
  const runtimeConfig = getRuntimeStoreConfig();
  win[STORE_CONFIG_KEY] =
    config || runtimeConfig
      ? {
          ...(runtimeConfig ?? {}),
          ...(config ?? {}),
          currencyFormat: config?.currencyFormat ?? runtimeConfig?.currencyFormat ?? null,
        }
      : undefined;
  try {
    window.dispatchEvent(new CustomEvent(STORIFY_SDK_STORE_CONFIG_APPLIED));
  } catch {
    /* ignore */
  }
}
