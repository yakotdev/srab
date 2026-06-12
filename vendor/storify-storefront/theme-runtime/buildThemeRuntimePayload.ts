import type { LayoutSection } from '../types';
import { extractMenuHandleFromSetting, resolveHeaderMenuHandleFromTheme } from '../lib/menu-handle';
import {
  applyThemeRowAppearanceFallback,
  canonicalizeThemeSettingsForDirectPayload,
  flattenLocalizedThemeSettings,
} from '../lib/theme-iframe-settings';
import {
  THEME_RUNTIME_PAYLOAD_VERSION,
  type StorifyThemeRuntimePayload,
  type ThemeRuntimeLayoutRowPayload,
} from './storifyThemeRuntimePayload';

/** Normalize section type from manifest/DB (e.g. header, HEADER, Header). */
function sectionTypeToken(type: unknown): string {
  return String(type ?? '')
    .trim()
    .toUpperCase()
    .replace(/-/g, '_');
}

function isEmptyThemeSettingValue(v: unknown): boolean {
  if (v === undefined || v === null) return true;
  if (typeof v === 'string') return v.trim() === '';
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === 'object') return Object.keys(v as object).length === 0;
  return false;
}

const THEME_SETTINGS_NOT_FROM_LANG = new Set([
  'primaryColor',
  'accentColor',
  'secondaryColor',
  'borderRadius',
  'fontFamily',
  'grayscale',
  'primary_color',
  'secondary_color',
  'accent_color',
  'fontFamilyHeadings',
  'headingFontFamily',
  'color_schemes',
  'colorSchemes',
]);

function assignThemeSettings(
  target: Record<string, unknown>,
  source: Record<string, unknown> | null | undefined,
): void {
  if (!source || typeof source !== 'object' || Array.isArray(source)) return;
  for (const [k, v] of Object.entries(source)) {
    if (v === null || v === undefined || isEmptyThemeSettingValue(v)) continue;
    target[k] = v;
  }
}

function mergeLangThemeSettings(base: Record<string, unknown>, langS: Record<string, unknown>): void {
  for (const [k, v] of Object.entries(langS)) {
    if (THEME_SETTINGS_NOT_FROM_LANG.has(k)) continue;
    if (!isEmptyThemeSettingValue(base[k])) continue;
    base[k] = v;
  }
}

type LayoutSectionWithMeta = LayoutSection & { manifestId?: string; customName?: string };

function mergeLocalizedValue(base: unknown, localized: unknown): unknown {
  if (Array.isArray(localized)) {
    const baseArray = Array.isArray(base) ? [...base] : [];
    localized.forEach((item, index) => {
      if (item === undefined || item === null || isEmptyThemeSettingValue(item)) return;
      baseArray[index] = mergeLocalizedValue(baseArray[index], item);
    });
    return baseArray;
  }
  if (localized && typeof localized === 'object') {
    const baseObject =
      base && typeof base === 'object' && !Array.isArray(base) ? { ...(base as Record<string, unknown>) } : {};
    for (const [key, value] of Object.entries(localized as Record<string, unknown>)) {
      if (value === undefined || value === null || isEmptyThemeSettingValue(value)) continue;
      baseObject[key] = mergeLocalizedValue(baseObject[key], value);
    }
    return baseObject;
  }
  return localized;
}

function shouldOverlayLocalizedField(path: string): boolean {
  const key = String(path || '').trim().toLowerCase();
  if (!key) return false;
  // Only overlay textual/localizable fields; keep media/layout/style values from DB layout.
  // This prevents language payload defaults (e.g. demo slide images) from overriding merchant edits.
  return /(title|subtitle|text|label|description|button|caption|message|placeholder|heading|html|content|copy)/i.test(
    key,
  );
}

function normalizeLangCode(code: unknown): string {
  const s = String(code ?? '').trim().toLowerCase();
  if (!s) return '';
  return s.split('-')[0] || s;
}

function getNestedFieldValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = String(path || '').split('.').filter(Boolean);
  if (parts.length === 0) return undefined;
  let cursor: unknown = obj;
  for (const part of parts) {
    if (!cursor || typeof cursor !== 'object' || Array.isArray(cursor)) return undefined;
    cursor = (cursor as Record<string, unknown>)[part];
  }
  return cursor;
}

export type MergeLangSectionsIntoLayoutOptions = {
  /** Language the customer is viewing (URL / store config). */
  storefrontLanguage?: string | null;
  /** Theme default language — `uploadedThemeLayout` rows are authored for this locale. */
  defaultLanguage?: string | null;
};

function setNestedValue(target: Record<string, unknown>, path: string, value: unknown): void {
  const parts = String(path || '').split('.').filter(Boolean);
  if (parts.length === 0) return;
  let cursor: any = target;
  parts.forEach((part, index) => {
    const isLast = index === parts.length - 1;
    const nextPart = parts[index + 1];
    if (isLast) {
      cursor[part] = mergeLocalizedValue(cursor[part], value);
      return;
    }
    if (cursor[part] == null || typeof cursor[part] !== 'object') {
      cursor[part] = /^\d+$/.test(String(nextPart || '')) ? [] : {};
    }
    cursor = cursor[part];
  });
}

/**
 * Overlay {lang}.json `sections` (keys: manifest handles like `header`) onto layout rows (ids like `header-1`).
 */
export function mergeLangSectionsIntoLayout(
  layout: LayoutSection[],
  langSections: Record<string, Record<string, unknown>> | null | undefined,
  options?: MergeLangSectionsIntoLayoutOptions,
): LayoutSection[] {
  if (!layout.length || !langSections || typeof langSections !== 'object') return layout;
  const viewLang = normalizeLangCode(options?.storefrontLanguage);
  const defaultLang = normalizeLangCode(options?.defaultLanguage) || 'ar';
  /** When viewing a non-default locale, lang `sections` provide translations and may replace layout text. */
  const isTranslationOverlay = Boolean(viewLang && defaultLang && viewLang !== defaultLang);
  const NON_LOCALIZED_SECTION_KEYS = new Set([
    'alignment',
    'link',
    'overlayOpacity',
    'overlay_opacity',
    'color_scheme',
    'colorScheme',
  ]);
  const overlayKeysFor = (sec: LayoutSectionWithMeta): string[] => {
    const keys: string[] = [];
    if (sec.manifestId && typeof sec.manifestId === 'string') keys.push(sec.manifestId);
    const id = String(sec.id || '');
    keys.push(id);
    const baseId = id.replace(/-\d+$/, '');
    if (baseId && baseId !== id) keys.push(baseId);
    const t = sectionTypeToken(sec.type).toLowerCase();
    if (t === 'header') keys.push('header');
    if (t === 'footer') keys.push('footer');
    return [...new Set(keys.filter(Boolean))];
  };
  return layout.map((sec) => {
    const keys = overlayKeysFor(sec as LayoutSectionWithMeta);
    let overlay: Record<string, unknown> | undefined;
    for (const k of keys) {
      const chunk = langSections[k];
      if (chunk && typeof chunk === 'object' && !Array.isArray(chunk)) {
        overlay = { ...(overlay || {}), ...chunk };
      }
    }
    if (!overlay || Object.keys(overlay).length === 0) return sec;
    const baseContent = { ...(sec.content || {}) } as Record<string, unknown>;
    for (const [ck, cv] of Object.entries(overlay)) {
      if (NON_LOCALIZED_SECTION_KEYS.has(ck)) continue;
      // Language overrides should apply only to localizable text-like fields.
      // Layout/media values must stay from published layout to avoid replacing
      // merchant-customized images/sections with theme defaults.
      if (!shouldOverlayLocalizedField(ck)) continue;
      if (isEmptyThemeSettingValue(cv)) continue;
      // Published layout is source of truth for the default language; lang files often still
      // contain theme-package defaults and must not clobber merchant edits (header/footer text).
      if (!isTranslationOverlay) {
        const existing = getNestedFieldValue(baseContent, ck);
        if (!isEmptyThemeSettingValue(existing)) continue;
      }
      setNestedValue(baseContent, ck, cv);
    }
    return {
      ...sec,
      content: baseContent,
    };
  });
}

function resolveApiBaseUrl(envApiBase: string, storefrontOrigin: string): string {
  const configured = envApiBase;
  if (configured.startsWith('http://') || configured.startsWith('https://')) return configured;
  if (configured.startsWith('/')) return `${storefrontOrigin}${configured}`;
  return `/api`;
}

export type BuildThemeRuntimePayloadInput = {
  /** When false or baseUrl empty, returns null */
  active: boolean;
  currentLayout: LayoutSection[] | null | undefined;
  themeLangSections?: Record<string, Record<string, unknown>> | null;
  themeLangSettings?: Record<string, unknown> | null;
  themeLangLanguage?: string | null;
  categories: Array<{
    id: string;
    name: string;
    slug?: string;
    description?: string;
    image?: string;
    productCount?: number;
    count?: number;
  }> | null | undefined;
  products: unknown[] | null | undefined;
  cart: unknown[] | null | undefined;
  theme: {
    uploadedThemeSettings?: Record<string, unknown> | null;
    headerMenuHandle?: string | null;
    primaryColor?: string;
    secondaryColor?: string;
    fontFamily?: string;
    borderRadius?: string;
  } | null | undefined;
  uploadedThemeInstanceSettings?: Record<string, unknown> | null | undefined;
  uploadedThemeDefaultLanguage?: string | null | undefined;
  storeForContext: Record<string, unknown> | undefined;
  storeConfigLanguage?: string | null;
  language?: string | null;
  baseLocale?: string | null;
  isRtl: boolean;
  effectiveStoreId?: string;
  locationPathname: string;
  productPageProductId?: string | null;
  currentProductFetched: unknown | null;
  prefetchedMenus: Record<string, unknown[]>;
  prefetchedReviews: unknown[];
  envApiBase: string;
  /**
   * Host-supplied translations for the active language. Forwarded to themes so they can overlay
   * these on top of their bundled `locales/{lang}.json` (allows merchants to translate or
   * override theme keys from the admin Translations editor).
   */
  hostMessages?: Record<string, string> | null;
  /** ISO code (e.g. `ar`, `en`) of the language `hostMessages` belongs to. */
  hostMessagesLanguage?: string | null;
  /** For tests / SSR where `window` is absent — defaults to `typeof window !== 'undefined' ? window.location.origin : ''`. */
  storefrontOriginOverride?: string;
};

export function buildThemeRuntimePayload(input: BuildThemeRuntimePayloadInput): StorifyThemeRuntimePayload | null {
  if (!input.active) return null;

  const storefrontLang =
    (input.language && String(input.language).trim()) ||
    (input.storeConfigLanguage && String(input.storeConfigLanguage).trim()) ||
    input.themeLangLanguage ||
    input.uploadedThemeDefaultLanguage ||
    'ar';
  const layoutForTheme = mergeLangSectionsIntoLayout(input.currentLayout || [], input.themeLangSections, {
    storefrontLanguage: storefrontLang,
    defaultLanguage: input.uploadedThemeDefaultLanguage || 'ar',
  });
  const layoutPayload: ThemeRuntimeLayoutRowPayload[] = layoutForTheme.map((s, i) => ({
    id: s.id,
    type: (s as { type?: string }).type ?? undefined,
    group: (s as { group?: string }).group ?? 'template_group',
    manifestId: (s as { manifestId?: string }).manifestId ?? undefined,
    customName: (s as { customName?: string }).customName ?? s.id,
    content: (s.content ?? {}) as Record<string, unknown>,
    order: (s as { order?: number }).order ?? i,
    enabled: s.enabled !== false,
  }));

  const themeCategories = (input.categories || []).map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug || c.id,
    description: c.description,
    image: c.image ?? '',
    count: c.productCount ?? c.count ?? 0,
  }));

  const products = input.products ?? [];
  const productPageProductId = input.productPageProductId ?? undefined;
  const currentProduct =
    productPageProductId && Array.isArray(products) && products.length > 0
      ? (products as { id?: string }[]).find((p) => p.id === productPageProductId) ?? input.currentProductFetched ?? null
      : input.currentProductFetched ?? null;

  const storefrontOrigin =
    typeof input.storefrontOriginOverride === 'string'
      ? input.storefrontOriginOverride
      : typeof window !== 'undefined'
        ? window.location.origin
        : '';
  const apiBaseUrl = resolveApiBaseUrl(input.envApiBase, storefrontOrigin);
  const sdkScriptUrl = `/sdk/storefront-sdk.js?v=currency-format-v2`;

  const iframeThemeSettings = (() => {
    const base = {} as Record<string, unknown>;
    const inst = input.uploadedThemeInstanceSettings;
    if (input.theme?.uploadedThemeSettings && typeof input.theme.uploadedThemeSettings === 'object' && !Array.isArray(input.theme.uploadedThemeSettings)) {
      assignThemeSettings(base, input.theme.uploadedThemeSettings as Record<string, unknown>);
    }
    if (inst && typeof inst === 'object' && !Array.isArray(inst)) {
      assignThemeSettings(base, inst as Record<string, unknown>);
    }
    const langS = input.themeLangSettings;
    if (langS && typeof langS === 'object' && !Array.isArray(langS)) {
      mergeLangThemeSettings(base, langS as Record<string, unknown>);
    }
    const resolvedHeader = resolveHeaderMenuHandleFromTheme(
      input.theme as { headerMenuHandle?: string | null; uploadedThemeSettings?: Record<string, unknown> | null },
    );
    if (resolvedHeader) base.headerMenuHandle = resolvedHeader;
    flattenLocalizedThemeSettings(base, storefrontLang);
    canonicalizeThemeSettingsForDirectPayload(base);
    applyThemeRowAppearanceFallback(base, input.theme);
    return base;
  })();

  return {
    payloadVersion: THEME_RUNTIME_PAYLOAD_VERSION,
    layout: layoutPayload,
    settings: iframeThemeSettings,
    storeId: input.effectiveStoreId,
    store: {
      ...(input.storeForContext || {}),
      language: input.language ?? undefined,
      baseLocale: input.baseLocale ?? undefined,
      direction: input.isRtl ? 'rtl' : 'ltr',
    },
    products,
    cart: input.cart ?? [],
    categories: themeCategories,
    path: typeof input.locationPathname === 'string' ? input.locationPathname : '/',
    productId: productPageProductId,
    currentProduct: currentProduct ?? undefined,
    sdkScriptUrl,
    apiBaseUrl,
    storefrontOrigin: storefrontOrigin || undefined,
    prefetchedMenus: input.prefetchedMenus,
    prefetchedReviews: input.prefetchedReviews,
    messages:
      input.hostMessages && typeof input.hostMessages === 'object' && Object.keys(input.hostMessages).length > 0
        ? { ...input.hostMessages }
        : undefined,
    messagesLanguage:
      input.hostMessagesLanguage && String(input.hostMessagesLanguage).trim()
        ? String(input.hostMessagesLanguage).trim().toLowerCase().split('-')[0] || undefined
        : undefined,
  };
}
