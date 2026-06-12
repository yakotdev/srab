/**
 * Normalize host STORIFY_THEME_CONFIG payloads for uploaded themes.
 * Keeps ThemeApp thin: one place for direct-settings keys and product id resolution.
 */

import { normalizeColorSchemesList } from './themeColorSchemes';

const DIRECT_THEME_SETTINGS_DEFAULTS: Record<string, string> = {
  primaryColor: '#0f172a',
  accentColor: '#6366f1',
  borderRadius: '16px',
  fontFamily: 'Almarai',
  fontFamilyHeadings: 'Almarai',
};

/** Same logic as theme bootstrap — applied on first paint and on every config message. */
export function normalizeDirectThemeSettings(value: unknown): Record<string, unknown> {
  const raw = value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  const merged: Record<string, unknown> = { ...raw };
  const empty = (x: unknown) => x == null || (typeof x === 'string' && x.trim() === '');
  if (empty(merged.primaryColor)) {
    const pc = merged.primary_color ?? merged.primaryColour;
    if (!empty(pc)) merged.primaryColor = pc;
  }
  if (empty(merged.accentColor)) {
    const ac = merged.accent_color ?? merged.secondaryColor ?? merged.secondary_color;
    if (!empty(ac)) merged.accentColor = ac;
  }
  if (empty(merged.fontFamily)) {
    const ff = merged.font_family;
    if (!empty(ff)) merged.fontFamily = ff;
  }
  if (empty(merged.fontFamilyHeadings)) {
    const ffh = merged.font_family_headings ?? merged.headingFontFamily ?? merged.heading_font_family;
    if (!empty(ffh)) merged.fontFamilyHeadings = ffh;
  }
  if (empty(merged.borderRadius)) {
    const br = merged.border_radius;
    if (!empty(br)) merged.borderRadius = br;
  }
  const out = { ...DIRECT_THEME_SETTINGS_DEFAULTS, ...merged } as Record<string, unknown>;
  let csRaw = out.color_schemes ?? out.colorSchemes;
  if (typeof csRaw === 'string') {
    try {
      csRaw = JSON.parse(csRaw);
    } catch {
      csRaw = undefined;
    }
  }
  out.color_schemes = normalizeColorSchemesList(csRaw);
  delete out.colorSchemes;
  return out;
}

/** On live storefront the product id may live in /product/:id rather than ?productId=. */
export function resolveDirectProductIdFromWindow(payloadProductId?: string): string | undefined {
  const fromPayload = typeof payloadProductId === 'string' && payloadProductId.trim() ? payloadProductId.trim() : undefined;
  if (fromPayload) return fromPayload;
  try {
    const q = new URLSearchParams(window.location.search);
    const fromQuery = q.get('productId') || q.get('product_id');
    if (fromQuery && String(fromQuery).trim()) return String(fromQuery).trim();
  } catch {
    /* ignore */
  }
  try {
    const m = window.location.pathname.match(/^\/product\/([^/]+)\/?$/);
    if (m && m[1]) return decodeURIComponent(m[1]);
  } catch {
    /* ignore */
  }
  return undefined;
}

export type DerivedThemeRuntimeState<TLayout> = {
  storefrontOrigin: string;
  layout: TLayout[];
  settings: Record<string, unknown>;
  storeId?: string;
  store?: unknown;
  products: unknown[];
  cart: unknown[];
  categories: unknown[];
  path?: string;
  productId?: string;
  currentProduct?: unknown;
  editorPreview: boolean;
  prefetchedMenus?: Record<string, unknown[]>;
  prefetchedReviews?: unknown[];
  sdkScriptUrl: string;
  apiBaseUrl: string;
  /** Host-supplied translations for the active language (admin Translations editor). */
  messages?: Record<string, string>;
  /** ISO code of the language `messages` belongs to. */
  messagesLanguage?: string;
};

/**
 * Pure derivation from a runtime payload record. Caller supplies `normalizeLayout` because it is manifest-specific.
 */
export function deriveThemeStateFromRuntimePayload<TLayout>(
  p: Record<string, unknown>,
  normalizeLayout: (rows: TLayout[]) => TLayout[],
  eventOrigin: string,
): DerivedThemeRuntimeState<TLayout> {
  const storefrontFromPayload =
    typeof p.storefrontOrigin === 'string' ? String(p.storefrontOrigin).trim() : '';
  const platformOrigin =
    typeof p.platformOrigin === 'string' ? String(p.platformOrigin).trim() : '';
  const storefrontOrigin =
    (storefrontFromPayload &&
      (storefrontFromPayload.startsWith('http://') || storefrontFromPayload.startsWith('https://'))
      ? storefrontFromPayload
      : '') ||
    (platformOrigin.startsWith('http://') || platformOrigin.startsWith('https://')
      ? platformOrigin
      : '') ||
    (typeof eventOrigin === 'string' &&
    eventOrigin &&
    (eventOrigin.startsWith('http://') || eventOrigin.startsWith('https://'))
      ? eventOrigin
      : '');

  const incomingLayout = normalizeLayout(Array.isArray(p.layout) ? (p.layout as TLayout[]) : []);
  const payloadProducts = Array.isArray(p.products) ? p.products : [];
  const payloadCart = Array.isArray(p.cart) ? p.cart : [];
  const payloadCategories = Array.isArray(p.categories) ? p.categories : [];
  const productIdFromPayload = typeof p.productId === 'string' ? p.productId : undefined;
  const currentProductPayload = p.currentProduct && typeof p.currentProduct === 'object' ? p.currentProduct : undefined;

  let prefetchedMenus: Record<string, unknown[]> | undefined;
  if (p.prefetchedMenus && typeof p.prefetchedMenus === 'object' && !Array.isArray(p.prefetchedMenus)) {
    prefetchedMenus = p.prefetchedMenus as Record<string, unknown[]>;
  }
  const prefetchedReviews = Array.isArray(p.prefetchedReviews) ? p.prefetchedReviews : undefined;

  const sdkFromPayload = p.sdkScriptUrl && typeof p.sdkScriptUrl === 'string' ? String(p.sdkScriptUrl).trim() : '';
  /** Never derive SDK from theme CDN; admin /sdk/ returns SPA HTML — use /api/sdk/ on platform host. */
  const sdkScriptUrl =
    sdkFromPayload ||
    (platformOrigin.startsWith('http://') || platformOrigin.startsWith('https://')
      ? `${platformOrigin.replace(/\/$/, '')}/api/sdk/storefront-sdk.js`
      : '');
  const apiBaseUrl =
    typeof p.apiBaseUrl === 'string' && p.apiBaseUrl.trim() ? String(p.apiBaseUrl).trim() : '';

  let messages: Record<string, string> | undefined;
  if (p.messages && typeof p.messages === 'object' && !Array.isArray(p.messages)) {
    const raw = p.messages as Record<string, unknown>;
    const cleaned: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw)) {
      if (typeof v === 'string' && v.trim()) cleaned[k] = v;
    }
    if (Object.keys(cleaned).length > 0) messages = cleaned;
  }
  const messagesLanguage =
    typeof p.messagesLanguage === 'string' && p.messagesLanguage.trim()
      ? String(p.messagesLanguage).trim().toLowerCase().split('-')[0] || undefined
      : undefined;

  return {
    storefrontOrigin,
    layout: incomingLayout,
    settings: normalizeDirectThemeSettings(p.settings),
    storeId: typeof p.storeId === 'string' ? p.storeId : undefined,
    store: p.store,
    products: payloadProducts,
    cart: payloadCart,
    categories: payloadCategories,
    path: typeof p.path === 'string' ? p.path : undefined,
    productId: resolveDirectProductIdFromWindow(productIdFromPayload),
    currentProduct: currentProductPayload ?? undefined,
    editorPreview: Boolean(p.editorPreview),
    prefetchedMenus,
    prefetchedReviews,
    sdkScriptUrl,
    apiBaseUrl,
    messages,
    messagesLanguage,
  };
}
