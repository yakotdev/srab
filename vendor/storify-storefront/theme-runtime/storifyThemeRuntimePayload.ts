/**
 * Typed contract for STORIFY_THEME_CONFIG / __STORIFY_THEME_CONFIG__ between storefront host and uploaded themes.
 * @see buildThemeRuntimePayload
 */

/** Bump when breaking shape or semantics; themes may branch on this. */
export const THEME_RUNTIME_PAYLOAD_VERSION = 1 as const;

export type ThemeRuntimeLayoutRowPayload = {
  id: string;
  type?: string;
  group: string;
  manifestId?: string;
  customName: string;
  content: Record<string, unknown>;
  order: number;
  enabled: boolean;
};

export type ThemeRuntimeStorePayload = Record<string, unknown> & {
  language?: string;
  baseLocale?: string;
  direction?: 'rtl' | 'ltr';
};

/**
 * Full runtime envelope sent to uploaded themes (ThemeDirectLoader + postMessage).
 * Unknown keys may still appear for backward compatibility; prefer typed fields for new code.
 */
export type StorifyThemeRuntimePayload = {
  payloadVersion: typeof THEME_RUNTIME_PAYLOAD_VERSION;
  layout: ThemeRuntimeLayoutRowPayload[];
  settings: Record<string, unknown>;
  storeId?: string;
  store?: ThemeRuntimeStorePayload;
  products: unknown[];
  cart: unknown[];
  categories: Array<{
    id: string;
    name: string;
    slug: string;
    description?: string;
    image: string;
    count: number;
  }>;
  path: string;
  productId?: string;
  currentProduct?: unknown;
  sdkScriptUrl: string;
  apiBaseUrl: string;
  storefrontOrigin?: string;
  prefetchedMenus: Record<string, unknown[]>;
  prefetchedReviews: unknown[];
  /**
   * Host-supplied translations for the active language. Themes should overlay these on top of
   * their bundled locale messages so merchants can translate or override theme keys from the
   * admin (Translations) without rebuilding the theme.
   */
  messages?: Record<string, string>;
  /** ISO code (e.g. `ar`, `en`) of the language the `messages` dictionary belongs to. */
  messagesLanguage?: string;
};
