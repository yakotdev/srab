/**
 * Storefront localization (language-first URLs), aligned with common theme patterns:
 * locale prefix on paths, host navigation when the theme runs in an iframe.
 * @see https://shopify.dev/docs/storefronts/themes/markets/multiple-currencies-languages
 */
import { localizePath, normalizeLocale, stripLocaleFromPath } from '../lib/locale-routing';
import { shouldUseThemeRuntimeBridge, themeRuntimeCall } from '../theme-runtime/theme-client';

export type StorefrontLocalizationEmitPayload = {
  languageCode: string;
  /** Logical storefront path from host payload (ThemeConfig.path) — required for correct switches inside iframe */
  storefrontPath?: string;
  /** Optional — reserved for country/market flows (host may ignore today) */
  countryCode?: string;
  currencyCode?: string;
  marketId?: string;
};

/**
 * Build same-origin path + query for a language switch (`/shop` → `/en/shop`, preserves `?storeId=`).
 */
export function buildLocalizedStorefrontPath(
  languageCode: string,
  options?: { storefrontPath?: string; pathname?: string; search?: string },
): string {
  const next = normalizeLocale(languageCode);
  const raw =
    (options?.storefrontPath && options.storefrontPath.startsWith('/') ? options.storefrontPath : null) ??
    (options?.pathname && options.pathname.startsWith('/') ? options.pathname : null) ??
    (typeof window !== 'undefined' && window.location.pathname ? window.location.pathname : '/') ??
    '/';
  const logical = stripLocaleFromPath(raw) || '/';
  const newPath = localizePath(logical, next).replace(/\/+/g, '/');
  const search =
    options?.search !== undefined
      ? options.search
      : typeof window !== 'undefined'
        ? window.location.search
        : '';
  return `${newPath}${search}`;
}

/**
 * When embedded: notify parent (runtime bridge or postMessage) so the **host** navigates (locale-aware URL).
 * When standalone: full navigation in the current window.
 */
export function emitStorefrontLocalization(payload: StorefrontLocalizationEmitPayload): void {
  const path = buildLocalizedStorefrontPath(payload.languageCode, {
    storefrontPath: payload.storefrontPath,
  });
  const body = {
    type: 'STORIFY_SET_LOCALIZATION' as const,
    languageCode: normalizeLocale(payload.languageCode),
    path,
    ...(payload.countryCode ? { countryCode: payload.countryCode } : {}),
    ...(payload.currencyCode ? { currencyCode: payload.currencyCode } : {}),
    ...(payload.marketId ? { marketId: payload.marketId } : {}),
  };

  if (typeof window !== 'undefined' && window.parent !== window) {
    if (shouldUseThemeRuntimeBridge()) {
      void themeRuntimeCall('setLocalization', {
        path,
        languageCode: body.languageCode,
        countryCode: payload.countryCode,
        currencyCode: payload.currencyCode,
        marketId: payload.marketId,
      }).catch(() => {});
      return;
    }
    window.parent.postMessage(body, '*');
    return;
  }

  if (typeof window !== 'undefined') {
    window.location.assign(path);
  }
}
