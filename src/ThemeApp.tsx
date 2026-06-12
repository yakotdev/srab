import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ThemeProvider, ThemeConfig, LayoutSection, ThemeCategory, useThemeConfig } from './ThemeContext';
import { SectionRenderer } from './SectionRenderer';
import QuickViewModal from './components/QuickViewModal';
import CartSidebar from './components/CartSidebar';
import SearchOverlay from './components/SearchOverlay';
import NewsletterPopup from './components/NewsletterPopup';
import { WhatsAppPopup } from './components/WhatsAppPopup';
const ThemeEditor = React.lazy(() => import('./components/ThemeEditor'));
const StorifySimulator = React.lazy(() => import('./components/StorifySimulator'));
import { Product } from './constants';
import { Settings as SettingsIcon } from 'lucide-react';
import manifest from '../theme-manifest.json';
import { setHostOriginFromString } from '@storify/theme';
import { buildStorifyAddToCartMessage } from '@storify/theme';
import { clearThemeCatalogCache } from '@storify/theme';
import { emitAddToCartToHost, emitRemoveFromCartToHost, emitToggleWishlistToHost } from '@storify/theme';
import { normalizeProductForHostCart } from '@storify/theme';
import { parseCategoryScope } from '@storify/theme';
import { applyStorifyStoreConfig, loadStorifySdk, loadStorifyEditorBridge } from '@storify/theme';
import { setPrefetchedMenus, setPrefetchedReviews } from '@storify/theme';
import {
  defaultRuntimeColorSchemes,
  deriveThemeStateFromRuntimePayload,
  injectGoogleFontsForThemeSettings,
  normalizeDirectThemeSettings,
  resolveDirectProductIdFromWindow,
} from '@storify/theme';
import { isStorifyThemeEmbedded } from '@storify/theme';
import { ThemeCatalogProvider } from '@storify/theme';
import { isRtlLocale, normalizeLocale, resolveThemeLanguage } from '@storify/theme';
import arStrings from './locales/ar.json';
import { createThemeTranslator } from './locales';

const ThemeDevSimulatorFab: React.FC<{ onOpen: () => void }> = ({ onOpen }) => {
  const { t } = useThemeConfig();
  return (
    <button
      type="button"
      onClick={onOpen}
      className="fixed bottom-24 left-6 z-[90] bg-brand-primary text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform active:scale-95 flex items-center gap-3 group"
    >
      <SettingsIcon size={20} className="group-hover:rotate-90 transition-transform duration-500" />
      <span className="text-xs font-bold uppercase tracking-widest hidden md:block">{t('theme_dev_simulator')}</span>
    </button>
  );
};

const LOCAL_SDK_SCRIPT_FALLBACK = '/sdk/storefront-sdk.js';
const LOCAL_EDITOR_BRIDGE_FALLBACK = '/sdk/theme-editor-bridge.js';
const LOCAL_API_BASE_FALLBACK = '/api';

function readEditorSdkScriptUrlFromQuery(): string {
  try {
    const raw = new URLSearchParams(window.location.search).get('sdkScriptUrl');
    return raw && raw.trim() ? raw.trim() : '';
  } catch {
    return '';
  }
}

function resolveSdkScriptUrl(
  payload: Record<string, unknown>,
  derivedUrl: string | undefined,
): string {
  const fromPayload = typeof payload.sdkScriptUrl === 'string' ? payload.sdkScriptUrl.trim() : '';
  const fromQuery = readEditorSdkScriptUrlFromQuery();
  const fromDerived = derivedUrl?.trim() || '';
  return fromPayload || fromQuery || fromDerived || (isLocalhostHost() ? LOCAL_SDK_SCRIPT_FALLBACK : '');
}

function isLocalhostHost(): boolean {
  if (typeof window === 'undefined') return false;
  const h = window.location.hostname;
  return h === 'localhost' || h === '127.0.0.1' || h === '[::1]';
}

const isThemeEmbedded = isStorifyThemeEmbedded;

const toCanonicalId = (value: unknown) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_');

const getSectionDefinition = (sectionIdOrType: unknown) => {
  const source = String(sectionIdOrType || '');
  const canonical = toCanonicalId(source);
  const upper = source.toUpperCase().replace(/-/g, '_');

  return (manifest.sections || []).find(
    (s: any) =>
      toCanonicalId(s.id) === canonical ||
      toCanonicalId(s.component) === canonical ||
      String(s.component || '').toUpperCase() === upper,
  );
};

const defaultFieldValue = (field: Record<string, any> = {}) => {
  if (field.default !== undefined) return field.default;
  if (field.type === 'repeater') return [];
  if (field.type === 'menu') return '';
  if (field.type === 'category_scope') return { mode: 'all', categoryIds: [] as string[] };
  if (field.type === 'select') {
    if (field.optionsFrom === 'color_schemes' && field.default != null && String(field.default).trim() !== '') {
      return String(field.default);
    }
    const firstOption = Array.isArray(field.options) ? field.options[0] : undefined;
    if (typeof firstOption === 'object' && firstOption !== null) return firstOption.value ?? '';
    return firstOption ?? '';
  }
  return '';
};

const normalizeSectionContent = (
  schema: Record<string, any> = {},
  content: Record<string, any> = {},
): Record<string, any> => {
  const input = content && typeof content === 'object' && !Array.isArray(content) ? content : {};
  /** بدون مخطط لا نُصفّر المحتوى الوارد (مثلاً إن فشل حل نوع القسم). */
  if (!schema || Object.keys(schema).length === 0) {
    return { ...input };
  }
  const normalized: Record<string, any> = {};

  Object.entries(schema).forEach(([key, field]) => {
    const currentValue = input[key] ?? defaultFieldValue(field);

    if (field?.type === 'repeater') {
      const items = Array.isArray(currentValue) ? currentValue : [];
      const itemSchema = field?.fields || {};
      normalized[key] = items.map((item: any) => normalizeSectionContent(itemSchema, item || {}));
      return;
    }

    if (field?.type === 'menu') {
      if (Array.isArray(currentValue)) {
        normalized[key] = currentValue;
      } else if (typeof currentValue === 'string') {
        normalized[key] = currentValue;
      } else if (currentValue && typeof currentValue === 'object') {
        // Keep object-shaped menu values (e.g. {handle}, localized maps) so HeaderSection can resolve them.
        normalized[key] = currentValue;
      } else {
        normalized[key] = '';
      }
      return;
    }

    if (field?.type === 'select') {
      normalized[key] = String(currentValue ?? '');
      return;
    }

    if (field?.type === 'link') {
      normalized[key] =
        typeof currentValue === 'string' || typeof currentValue === 'object'
          ? currentValue
          : String(currentValue ?? '');
      return;
    }

    if (field?.type === 'category_scope') {
      normalized[key] = parseCategoryScope(currentValue);
      return;
    }

    normalized[key] = currentValue === null || currentValue === undefined ? '' : currentValue;
  });

  // Keep unknown keys from persisted content to avoid losing backward-compatible fields
  // (e.g. older key naming styles still consumed by section components).
  const passthrough: Record<string, any> = {};
  Object.entries(input).forEach(([key, value]) => {
    if (!(key in schema)) passthrough[key] = value;
  });

  return { ...passthrough, ...normalized };
};

const buildDefaultContent = (schema: Record<string, any> = {}) => normalizeSectionContent(schema, {});

const resolveSectionDefinition = (section: LayoutSection & { manifestId?: string }) =>
  getSectionDefinition(section.manifestId) ||
  getSectionDefinition(section.type) ||
  getSectionDefinition(section.id);

const normalizeLayout = (layout: LayoutSection[] = []): LayoutSection[] =>
  layout.map((section, index) => {
    const sectionDef = resolveSectionDefinition(section as LayoutSection & { manifestId?: string });
    const resolvedType = sectionDef?.component || String(section.type || section.id || '').toUpperCase();
    const schema = sectionDef?.contentSchema || {};
    const incoming = section.content && typeof section.content === 'object' && !Array.isArray(section.content) ? section.content : {};

    // Payload content takes priority. Only fill in missing keys from manifest defaults.
    const mergedContent: Record<string, any> = { ...incoming };
    for (const [key, field] of Object.entries(schema)) {
      if (!(key in mergedContent)) {
        mergedContent[key] = defaultFieldValue(field);
      }
    }

    return {
      ...section,
      id: String(section.id || `${toCanonicalId(sectionDef?.id || resolvedType)}-${index + 1}`),
      type: resolvedType,
      enabled: section.enabled !== false,
      // Editor reordering updates array position, not always the order field.
      order: index,
      group: section.group || sectionDef?.group || 'template_group',
      content: mergedContent,
    };
  });

const buildDefaultLayout = (): LayoutSection[] => {
  const homePage = (manifest.pages || []).find((p: any) => p.id === 'home');
  if (!homePage) return normalizeLayout(mockConfig.layout);

  const pageDefaults = (manifest as any).pageDefaults?.home || {};
  const mapped = (homePage.layout || []).map((entry: any, index: number) => {
    const sectionDef = getSectionDefinition(entry.sectionId);
    const defaultsFromPage = pageDefaults?.[entry.handle] || {};
    const baseContent = buildDefaultContent(sectionDef?.contentSchema || {});

    return {
      id: String(entry.sectionId || entry.handle || `section-${index + 1}`),
      type: sectionDef?.component || entry.sectionId,
      enabled: entry.defaultEnabled !== false,
      order: index,
      group: sectionDef?.group || 'template_group',
      content: normalizeSectionContent(sectionDef?.contentSchema || {}, {
        ...baseContent,
        ...defaultsFromPage,
      }),
    };
  });

  return normalizeLayout(mapped);
};

function getInitialDirectRenderingPayload(): Record<string, unknown> | null {
  if (typeof window === 'undefined') return null;
  try {
    const wrap = (window as unknown as {
      __STORIFY_THEME_CONFIG__?: { type?: string; payload?: Record<string, unknown> };
    }).__STORIFY_THEME_CONFIG__;
    const payload = wrap?.type === 'STORIFY_THEME_CONFIG' ? wrap.payload : null;
    if (!payload || payload.directRendering !== true) return null;
    if (!Array.isArray(payload.layout) || payload.layout.length === 0) return null;
    return payload;
  } catch {
    return null;
  }
}

const S = arStrings as Record<string, string>;

const mockConfig: ThemeConfig = {
  layout: [
    {
      id: 'header-1',
      type: 'HEADER',
      enabled: true,
      group: 'header_group',
      content: {
        sticky: true,
        height: 'normal',
        show_logo: true,
        nav_align: 'left',
        show_wishlist: true,
        show_cart: true,
        menu: [],
      },
    },
    {
      id: 'hero-1',
      type: 'HERO_SLIDER',
      enabled: true,
      group: 'template_group',
      content: {
        title: S.mock_hero_title,
        subtitle: S.mock_hero_subtitle,
        buttonText: S.mock_hero_cta,
        link: '/shop',
        alignment: 'left',
        overlayOpacity: '0.1',
      },
    },
    {
      id: 'categories-1',
      type: 'CATEGORIES',
      enabled: true,
      group: 'template_group',
      content: {
        title: S.mock_categories_title,
        subtitle: S.mock_categories_subtitle,
        layout_style: 'bento',
        padding_top: '80px',
        padding_bottom: '80px',
      },
    },
    {
      id: 'featured-1',
      type: 'FEATURED_PRODUCTS',
      enabled: true,
      group: 'template_group',
      content: {
        title: S.mock_featured_title,
        subtitle: S.mock_featured_subtitle,
        layout_style: 'grid',
        items_per_row: '4',
        bg_color: '#ffffff',
        padding_top: '96px',
        padding_bottom: '96px',
      },
    },
    {
      id: 'newsletter-1',
      type: 'NEWSLETTER',
      enabled: true,
      group: 'template_group',
      content: {
        title: S.mock_newsletter_title,
        subtitle: S.mock_newsletter_subtitle,
        bg_color: '#111827',
        text_color: '#ffffff',
        padding_top: '96px',
        padding_bottom: '96px',
      },
    },
    {
      id: 'footer-1',
      type: 'FOOTER',
      enabled: true,
      group: 'footer_group',
      content: {
        footer_menu_title: S.mock_footer_menu_title,
        show_social: true,
        bg_color: '#0b1120',
        text_color: '#f9fafb',
      },
    },
  ],
  settings: {
    primaryColor: '#0f172a',
    accentColor: '#6366f1',
    borderRadius: '16px',
    fontFamily: 'Almarai',
    fontFamilyHeadings: 'Almarai',
    color_schemes: defaultRuntimeColorSchemes(),
    nav_primary: [
      { name: S.nav_home, href: '/' },
      { name: S.nav_shop, href: '/shop' },
      { name: S.nav_about, href: '/about' },
      { name: S.nav_contact, href: '/contact' },
    ],
  },
  store: {
    name: S.store_name,
    logo: '',
    favicon: '',
    email: 'hello@storify.example',
    phone: '+966 00 000 0000',
    address: S.store_address,
    metaDescription: S.store_meta_description,
    enabledLanguages: [
      { code: 'ar', name: 'Arabic', nativeName: 'العربية', isDefault: true, isActive: true },
      { code: 'en', name: 'English', nativeName: 'English', isActive: true },
      { code: 'fr', name: 'French', nativeName: 'Français', isActive: true },
    ],
  },
  t: (key: string) => key,
  isRtl: true,
};

export const cartLineVariantSegment = (variant: { id?: string | number } | undefined | null) => {
  return variant?.id != null && String(variant.id).trim() !== '' ? String(variant.id).trim() : 'base';
};

export const getCartLineKey = (productId: string | number, variant: { id?: string | number } | undefined | null) => {
  return `${String(productId).trim()}:${cartLineVariantSegment(variant)}`;
};

export const ThemeApp: React.FC = () => {
  const loadingT = useMemo(
    () =>
      createThemeTranslator(
        normalizeLocale(resolveThemeLanguage(typeof navigator !== 'undefined' ? navigator.language : null, null)),
      ),
    [],
  );

  const initialDirectPayload = getInitialDirectRenderingPayload();
  const [config, setConfig] = useState<ThemeConfig | null>(() => {
    if (!initialDirectPayload) return null;
    const payloadProducts = Array.isArray(initialDirectPayload.products) ? initialDirectPayload.products : [];
    const payloadCategories = Array.isArray(initialDirectPayload.categories) ? initialDirectPayload.categories : [];
    const productIdFromPayload = typeof initialDirectPayload.productId === 'string' ? initialDirectPayload.productId : undefined;
    return {
      layout: normalizeLayout(initialDirectPayload.layout as LayoutSection[]),
      settings: normalizeDirectThemeSettings(initialDirectPayload.settings),
      storeId: (initialDirectPayload.storeId as string | undefined) ?? undefined,
      store: (initialDirectPayload.store as ThemeConfig['store']) ?? undefined,
      products: payloadProducts,
      categories: payloadCategories,
      path: typeof initialDirectPayload.path === 'string' ? initialDirectPayload.path : undefined,
      productId: resolveDirectProductIdFromWindow(productIdFromPayload),
      currentProduct:
        initialDirectPayload.currentProduct && typeof initialDirectPayload.currentProduct === 'object'
          ? (initialDirectPayload.currentProduct as Product)
          : undefined,
      t: (key: string) => key,
      storifyEditorPreview: Boolean(initialDirectPayload.editorPreview),
    };
  });
  const [sdkReady, setSdkReady] = useState(() => Boolean(initialDirectPayload));
  const [layout, setLayout] = useState<LayoutSection[]>(() =>
    initialDirectPayload && Array.isArray(initialDirectPayload.layout)
      ? normalizeLayout(initialDirectPayload.layout as LayoutSection[])
      : buildDefaultLayout(),
  );
  const [cart, setCartRaw] = useState<Product[]>(() => {
    if (initialDirectPayload && Array.isArray(initialDirectPayload.cart)) {
      return initialDirectPayload.cart as Product[];
    }
    try {
      const saved = localStorage.getItem('storify_theme_cart') || localStorage.getItem('cart');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch { /* ignore */ }
    return [];
  });
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  /** Host-supplied translation overrides (Translations editor in admin-central → STORIFY_THEME_CONFIG.messages). */
  const [hostMessages, setHostMessages] = useState<Record<string, string> | null>(() =>
    initialDirectPayload && initialDirectPayload.messages && typeof initialDirectPayload.messages === 'object'
      ? (initialDirectPayload.messages as Record<string, string>)
      : null,
  );
  const [hostMessagesLanguage, setHostMessagesLanguage] = useState<string | null>(() =>
    initialDirectPayload && typeof initialDirectPayload.messagesLanguage === 'string'
      ? String(initialDirectPayload.messagesLanguage).toLowerCase()
      : null,
  );
  const setCart: typeof setCartRaw = (action) => {
    setCartRaw((prev) => {
      const next = typeof action === 'function' ? action(prev) : action;
      try {
        const json = JSON.stringify(next);
        localStorage.setItem('storify_theme_cart', json);
        localStorage.setItem('cart', json);
      } catch { /* ignore */ }
      return next;
    });
  };
  const [wishlist, setWishlistRaw] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem('storify_theme_wishlist') || localStorage.getItem('wishlist');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch { /* ignore */ }
    return [];
  });
  const setWishlist: typeof setWishlistRaw = (action) => {
    setWishlistRaw((prev) => {
      const next = typeof action === 'function' ? action(prev) : action;
      try {
        const json = JSON.stringify(next);
        localStorage.setItem('storify_theme_wishlist', json);
        localStorage.setItem('wishlist', json);
      } catch { /* ignore */ }
      return next;
    });
  };
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showNewsletter, setShowNewsletter] = useState(false);
  const devMode = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const hostMessagesLangMismatchRef = useRef<string | null>(null);

  useEffect(() => {
    let receivedParentConfig = false;
    const getStoreIdFromQuery = (): string | undefined => {
      const params = new URLSearchParams(window.location.search);
      const malformedUnnamedValue = (() => {
        try {
          const raw = window.location.search || '';
          if (!raw.startsWith('?')) return '';
          const first = raw.slice(1).split('&')[0] || '';
          if (!first.startsWith('=') || first.length <= 1) return '';
          return decodeURIComponent(first.slice(1)).trim();
        } catch {
          return '';
        }
      })();
      const fromQuery = params.get('storeId') || params.get('store_id') || malformedUnnamedValue;
      return fromQuery && fromQuery.trim() ? fromQuery.trim() : undefined;
    };

    const shouldUseLocalFallback = (() => {
      const hasStoreQuery = !!getStoreIdFromQuery();
      const embedded = isStorifyThemeEmbedded() || !!document.referrer;
      // Use mock fallback only for standalone local preview (not real storefront/editor iframe).
      return !embedded && !hasStoreQuery;
    })();

    const resolvePreviewLayout = (themeData: any, previewPage?: string): LayoutSection[] => {
      const pageKey = previewPage && previewPage !== 'index' ? previewPage : 'home';
      const pages = themeData?.pages && typeof themeData.pages === 'object' ? themeData.pages : {};
      const fromPage = Array.isArray(pages?.[pageKey]?.layout) ? pages[pageKey].layout : null;
      const fromHome = Array.isArray(pages?.home?.layout) ? pages.home.layout : null;
      const fromUploaded = Array.isArray(themeData?.uploadedThemeLayout) ? themeData.uploadedThemeLayout : null;
      const fromThemeLayout = Array.isArray(themeData?.layout) ? themeData.layout : null;
      const raw = fromPage || fromHome || fromUploaded || fromThemeLayout || [];
      return normalizeLayout(raw);
    };

    const fallbackTimer = shouldUseLocalFallback
      ? setTimeout(() => {
        setSdkReady(true);
        setConfig((prev) => {
          if (prev) return prev;
          setLayout(normalizeLayout(mockConfig.layout));
          return mockConfig;
        });
      }, 1500)
      : null;

    // Safety net (standalone local preview only): if no parent config arrives,
    // stop endless loading with manifest defaults.
    // In embedded storefront mode we must NOT switch to fallback/mock UI.
    const emergencyTimer = shouldUseLocalFallback
      ? setTimeout(() => {
        setSdkReady(true);
        setConfig((prev) => {
          if (prev) return prev;
          const fallbackLayout = buildDefaultLayout();
          setLayout(fallbackLayout);
          return {
            layout: fallbackLayout,
            settings: {
              primaryColor: '#0f172a',
              accentColor: '#6366f1',
              borderRadius: '16px',
              fontFamily: 'Almarai',
              fontFamilyHeadings: 'Almarai',
              color_schemes: defaultRuntimeColorSchemes(),
            },
            storeId: getStoreIdFromQuery(),
            store: mockConfig.store,
            t: (key: string) => key,
          };
        });
      }, 7000)
      : null;

    const isEditorFromUrl = (() => {
      try {
        const q = new URLSearchParams(window.location.search);
        return q.get('storifyEditor') === '1';
      } catch {
        return false;
      }
    })();

    const applyParentStorifyConfig = (p: Record<string, unknown>, eventOrigin: string) => {
      receivedParentConfig = true;
      if (fallbackTimer) clearTimeout(fallbackTimer);
      clearTimeout(emergencyTimer);
      clearThemeCatalogCache();

      const derived = deriveThemeStateFromRuntimePayload<LayoutSection>(p, normalizeLayout, eventOrigin);
      if (derived.storefrontOrigin) setHostOriginFromString(derived.storefrontOrigin);
      setLayout(derived.layout);
      if (derived.prefetchedMenus && typeof derived.prefetchedMenus === 'object') {
        setPrefetchedMenus(derived.prefetchedMenus);
      }
      if (Array.isArray(derived.prefetchedReviews)) {
        setPrefetchedReviews(derived.prefetchedReviews);
      }
      // Update host-supplied translation overrides (admin Translations editor) so the theme
      // translator immediately re-renders with the new strings.
      setHostMessages(derived.messages ?? null);
      setHostMessagesLanguage(derived.messagesLanguage ?? null);
      setCart(derived.cart as Product[]);
      const sdkAlreadyLoaded = typeof window.StorifySDK?.setStoreConfig === 'function';
      if (!sdkAlreadyLoaded) setSdkReady(false);
      setConfig({
        layout: derived.layout,
        settings: derived.settings as Record<string, any>,
        storeId: derived.storeId ?? getStoreIdFromQuery(),
        store: (derived.store as ThemeConfig['store']) ?? undefined,
        products: derived.products as Product[],
        categories: derived.categories as ThemeCategory[],
        path: derived.path,
        productId: derived.productId,
        currentProduct: (derived.currentProduct as Product | undefined) ?? undefined,
        t: (key: string) => key,
        storifyEditorPreview: derived.editorPreview || isEditorFromUrl,
      });

      const storefrontOrigin = derived.storefrontOrigin;
      void (async () => {
        try {
          const apiFromParent = derived.apiBaseUrl?.trim() || '';
          const useLocalSdkFallback = isLocalhostHost();
          const apiBaseUrl =
            apiFromParent || (useLocalSdkFallback ? LOCAL_API_BASE_FALLBACK : undefined);
          if (sdkAlreadyLoaded) {
            applyStorifyStoreConfig({
              storeId: derived.storeId ?? getStoreIdFromQuery(),
              store: derived.store as ThemeConfig['store'],
              apiBaseUrl,
            });
          } else {
            const sdkUrl = resolveSdkScriptUrl(p, derived.sdkScriptUrl);
            if (sdkUrl) {
              await loadStorifySdk(sdkUrl);
              applyStorifyStoreConfig({
                storeId: derived.storeId ?? getStoreIdFromQuery(),
                store: derived.store as ThemeConfig['store'],
                apiBaseUrl,
              });
            }
          }
        } catch (err) {
          console.warn('[srab] SDK load failed', err);
        } finally {
          setSdkReady(true);
          if (derived.editorPreview || isEditorFromUrl) {
            const bridgeDirect =
              typeof p.editorBridgeScriptUrl === 'string' ? p.editorBridgeScriptUrl.trim() : '';
            const bridgeUrl =
              bridgeDirect ||
              (isLocalhostHost() ? LOCAL_EDITOR_BRIDGE_FALLBACK : `${storefrontOrigin}/sdk/theme-editor-bridge.js`);
            void loadStorifyEditorBridge(bridgeUrl).then(() => {
              window.parent?.postMessage?.({ type: 'STORIFY_EDITOR_BRIDGE_READY' }, '*');
            });
          }
        }
      })();
    };

    try {
      const w = window as unknown as {
        __STORIFY_THEME_CONFIG__?: { type?: string; payload?: Record<string, unknown> };
      };
      const wrap = w.__STORIFY_THEME_CONFIG__;
      const p0 = wrap?.type === 'STORIFY_THEME_CONFIG' && wrap?.payload ? wrap.payload : null;
      if (
        p0 &&
        p0.directRendering === true &&
        Array.isArray(p0.layout) &&
        (p0.layout as unknown[]).length > 0
      ) {
        const bootOrigin =
          typeof p0.platformOrigin === 'string' && String(p0.platformOrigin).trim()
            ? String(p0.platformOrigin).trim()
            : '';
        applyParentStorifyConfig(p0, bootOrigin);
      }
    } catch {
      /* ignore */
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'STORIFY_SCROLL_TO_SECTION' && event.data.sectionId) {
        setActiveSectionId(event.data.sectionId);
        const el = document.getElementById(event.data.sectionId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        return;
      }

      if (event.data?.type === 'STORIFY_THEME_CONFIG' && event.data.payload) {
        applyParentStorifyConfig(
          event.data.payload as Record<string, unknown>,
          typeof event.origin === 'string' ? event.origin : '',
        );
        return;
      }

      // Theme editor iframe preview payload from admin-central.
      if (event.data?.type === 'STORIFY_THEME_PREVIEW' && event.data.theme) {
        receivedParentConfig = true;
        if (fallbackTimer) clearTimeout(fallbackTimer);
        clearTimeout(emergencyTimer);
        clearThemeCatalogCache();
        const previewPage = typeof event.data.previewPage === 'string' ? event.data.previewPage : 'home';
        const themeData = event.data.theme;
        const passedApiBaseUrl = event.data.apiBaseUrl;
        const origin = typeof event.origin === 'string' && event.origin ? event.origin : '';

        if (origin) {
          setHostOriginFromString(origin);
        }

        const incomingLayout = resolvePreviewLayout(themeData, previewPage);
        const settings = normalizeDirectThemeSettings(themeData?.uploadedThemeSettings ?? themeData?.settings);

        setLayout(incomingLayout.length > 0 ? incomingLayout : normalizeLayout(mockConfig.layout));
        const sdkAlreadyLoaded = typeof window.StorifySDK?.setStoreConfig === 'function';
        if (!sdkAlreadyLoaded) setSdkReady(false);
        setConfig((prev) => ({
          ...(prev || mockConfig),
          layout: incomingLayout.length > 0 ? incomingLayout : normalizeLayout(mockConfig.layout),
          settings,
          storeId: themeData?.storeId ?? prev?.storeId ?? getStoreIdFromQuery(),
          store: themeData?.store || prev?.store || mockConfig.store,
          products: Array.isArray(themeData?.products) ? themeData.products : prev?.products,
          categories: Array.isArray(themeData?.categories) ? themeData.categories : prev?.categories,
          t: (key: string) => key,
          storifyEditorPreview: true,
        }));
        void (async () => {
          try {
            let apiBase = (passedApiBaseUrl && typeof passedApiBaseUrl === 'string') ? passedApiBaseUrl : (origin ? `${origin}/api` : undefined);
            if (!apiBase && isLocalhostHost()) apiBase = LOCAL_API_BASE_FALLBACK;
            const sdkFromPreview =
              typeof event.data?.sdkScriptUrl === 'string' ? String(event.data.sdkScriptUrl).trim() : '';
            if (sdkAlreadyLoaded) {
              applyStorifyStoreConfig({
                storeId: themeData?.storeId ?? getStoreIdFromQuery(),
                store: themeData?.store,
                apiBaseUrl: apiBase,
              });
            } else {
              const sdkUrl = sdkFromPreview || (isLocalhostHost() ? LOCAL_SDK_SCRIPT_FALLBACK : '');
              if (sdkUrl) {
                await loadStorifySdk(sdkUrl);
                applyStorifyStoreConfig({
                  storeId: themeData?.storeId ?? getStoreIdFromQuery(),
                  store: themeData?.store,
                  apiBaseUrl: apiBase,
                });
              }
            }
          } catch (err) {
            console.warn('[srab] Preview SDK load failed', err);
          } finally {
            setSdkReady(true);
            const bridgeFromPreview =
              typeof event.data?.editorBridgeScriptUrl === 'string'
                ? String(event.data.editorBridgeScriptUrl).trim()
                : '';
            const bridgeUrl =
              bridgeFromPreview ||
              (isLocalhostHost()
                ? LOCAL_EDITOR_BRIDGE_FALLBACK
                : origin
                  ? `${origin.replace(/\/$/, '')}/sdk/theme-editor-bridge.js`
                  : LOCAL_EDITOR_BRIDGE_FALLBACK);
            void loadStorifyEditorBridge(bridgeUrl).then(() => {
              window.parent?.postMessage?.({ type: 'STORIFY_EDITOR_BRIDGE_READY' }, '*');
            });
          }
        })();
      }
    };

    window.addEventListener('message', handleMessage);
    // Tell parent storefront/editor we are ready to receive config.
    // Retry a few times to avoid race condition if parent listener isn't ready on first ping.
    const postThemeReady = () => window.parent?.postMessage?.({ type: 'STORIFY_THEME_READY' }, '*');
    postThemeReady();
    const readyRetryInterval = window.setInterval(() => {
      if (receivedParentConfig) {
        window.clearInterval(readyRetryInterval);
        return;
      }
      postThemeReady();
    }, 700);
    const readyRetryStopper = window.setTimeout(() => {
      window.clearInterval(readyRetryInterval);
    }, 10000);
    return () => {
      window.removeEventListener('message', handleMessage);
      if (fallbackTimer) clearTimeout(fallbackTimer);
      if (emergencyTimer) clearTimeout(emergencyTimer);
      window.clearInterval(readyRetryInterval);
      window.clearTimeout(readyRetryStopper);
    };
  }, []);

  useEffect(() => {
    if (!config?.settings) return;
    const s = config.settings as Record<string, unknown>;
    injectGoogleFontsForThemeSettings(s);
    const root = document.documentElement;
    if (s.primaryColor) root.style.setProperty('--brand-primary', String(s.primaryColor));
    if (s.accentColor) root.style.setProperty('--brand-accent', String(s.accentColor));
    if (s.borderRadius) root.style.setProperty('--brand-radius', String(s.borderRadius));
    if (s.fontFamily) root.style.setProperty('--brand-font', String(s.fontFamily));
  }, [config?.settings]);

  const currentLayout = layout.length > 0 ? layout : config?.layout || normalizeLayout(mockConfig.layout);

  const updateSectionContent = (sectionId: string, contentPatch: Record<string, any>) => {
    setLayout(prev =>
      prev.map(section =>
        section.id === sectionId
          ? { ...section, content: { ...(section.content || {}), ...contentPatch } }
          : section)
    );
  };

  const updateSectionEnabled = (sectionId: string, enabled: boolean) => {
    setLayout(prev => prev.map(section => (section.id === sectionId ? { ...section, enabled } : section)));
  };

  const handleAddToCart = (product: Product) => {
    const qty =
      typeof (product as Product & { quantity?: number }).quantity === 'number' &&
        !Number.isNaN((product as Product & { quantity?: number }).quantity!)
        ? Math.max(1, (product as Product & { quantity?: number }).quantity!)
        : 1;

    const id = product?.id != null ? String(product.id).trim() : '';
    if (!id || id === 'undefined' || id === 'null') {
      console.warn('[Storify theme] add to cart ignored: invalid product id', product?.id);
      return;
    }

    const base = { ...product, quantity: qty } as Product & { quantity: number };
    const payload = normalizeProductForHostCart(base);
    const lineKey = getCartLineKey(id, payload.selectedVariant);

    setCart((prev) => {
      const idx = prev.findIndex((p) => getCartLineKey(String(p.id), p.selectedVariant) === lineKey);

      if (idx >= 0) {
        return prev.map((p, i) =>
          i === idx ? { ...p, quantity: (Number((p as Product & { quantity?: number }).quantity) || 1) + qty } : p,
        );
      }
      return [...prev, payload];
    });

    const msg = buildStorifyAddToCartMessage(payload);
    if (msg) {
      emitAddToCartToHost(msg);
    }

    setIsCartOpen(true);
  };

  const toggleWishlist = (product: Product) => {
    emitToggleWishlistToHost(product as unknown as Record<string, unknown>);
    setWishlist((prev) => {
      const exists = prev.find((p) => p.id === product.id);
      if (exists) return prev.filter((p) => p.id !== product.id);
      return [...prev, product];
    });
  };

  const currentLang = normalizeLocale(resolveThemeLanguage(undefined, config?.store?.language ?? null));
  // Only honor host overrides when they belong to the language the theme is currently
  // rendering — otherwise we'd accidentally show e.g. Arabic strings while the merchant
  // browses the English version.
  const effectiveHostMessages = useMemo(() => {
    if (!hostMessages) return null;
    const hostBase = hostMessagesLanguage ? hostMessagesLanguage.toLowerCase().split('-')[0] : '';
    const currentBase = currentLang.toLowerCase().split('-')[0];
    if (hostBase && hostBase !== currentBase) {
      const stamp = `${hostBase}→${currentBase}`;
      if (hostMessagesLangMismatchRef.current !== stamp) {
        hostMessagesLangMismatchRef.current = stamp;
        console.warn(
          '[storify-theme] Host translation overrides ignored: messagesLanguage (%s) ≠ resolved theme locale (%s). ' +
            'URL path locale should match; if this persists, check STORIFY_THEME_CONFIG.store.language and messagesLanguage.',
          hostBase,
          currentBase,
        );
      }
      return null;
    }
    hostMessagesLangMismatchRef.current = null;
    return hostMessages;
  }, [hostMessages, hostMessagesLanguage, currentLang]);

  const hostMessagesMismatch = (() => {
    if (!hostMessages || !hostMessagesLanguage?.trim()) return false;
    const hm = hostMessagesLanguage.toLowerCase().split('-')[0];
    const cur = currentLang.toLowerCase().split('-')[0];
    return Boolean(hm) && hm !== cur;
  })();

  // Dev-only diagnostic: expose `window.__storifyTranslations()` so merchants can quickly
  // verify whether host overrides arrived (admin Translations editor → theme messages).
  if (typeof window !== 'undefined' && devMode) {
    (window as unknown as { __storifyTranslations?: () => unknown }).__storifyTranslations = () => ({
      currentLang,
      hostMessagesLanguage,
      hostMessagesCount: hostMessages ? Object.keys(hostMessages).length : 0,
      effectiveCount: effectiveHostMessages ? Object.keys(effectiveHostMessages).length : 0,
      hostMessagesIgnoredReason: hostMessagesMismatch
        ? `messagesLanguage (${hostMessagesLanguage}) does not match resolved locale (${currentLang})`
        : null,
      sample: effectiveHostMessages
        ? Object.fromEntries(Object.entries(effectiveHostMessages).slice(0, 5))
        : null,
      payloadHasMessages: Boolean(
        (window as unknown as { __STORIFY_THEME_CONFIG__?: { payload?: { messages?: unknown } } })
          .__STORIFY_THEME_CONFIG__?.payload?.messages,
      ),
    });
  }

  const translate = useMemo(
    () => createThemeTranslator(currentLang, effectiveHostMessages),
    [currentLang, effectiveHostMessages],
  );
  const isRtl = isRtlLocale(currentLang);

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400 font-sans">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-brand-accent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-medium tracking-widest uppercase">{loadingT('theme_loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider value={{
      ...config,
      t: translate,
      sdkReady,
      layout: currentLayout,
      onQuickView: setQuickViewProduct,
      onAddToCart: handleAddToCart,
      onToggleWishlist: toggleWishlist,
      onOpenCart: () => {
        setIsCartOpen(true);
      },
      onOpenSearch: () => setIsSearchOpen(true),
      cart,
      wishlist,
      updateSectionContent,
      updateSectionEnabled,
      isRtl,
      activeSectionId,
    }}>
      <ThemeCatalogProvider>
      <div className="selection:bg-brand-accent selection:text-white" dir={isRtl ? 'rtl' : 'ltr'}>
        <SectionRenderer />
        {devMode ? (
          <React.Suspense fallback={null}>
            <ThemeEditor />
          </React.Suspense>
        ) : null}

        <QuickViewModal
          product={quickViewProduct}
          onClose={() => setQuickViewProduct(null)}
          onAddToCart={handleAddToCart}
          onToggleWishlist={toggleWishlist}
          wishlist={wishlist}
        />

        <CartSidebar
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          cart={cart}
          onRemove={(item) =>
            setCart((prev) => {
              const selected = item as Product & { selectedVariant?: { id?: string; title?: string } };
              const productId = selected?.id != null ? String(selected.id).trim() : '';
              const variantSegment = cartLineVariantSegment(selected.selectedVariant);
              if (productId) {
                emitRemoveFromCartToHost(productId, variantSegment || undefined);
              }
              const dropKey = getCartLineKey(productId, selected.selectedVariant);
              return prev.filter((p) => getCartLineKey(String(p.id), p.selectedVariant) !== dropKey);
            })
          }
        />

        <SearchOverlay
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
        />

        <WhatsAppPopup />

        {devMode ? (
          <>
            <ThemeDevSimulatorFab onOpen={() => setIsSimulatorOpen(true)} />

            <React.Suspense fallback={null}>
              <StorifySimulator
                isOpen={isSimulatorOpen}
                onClose={() => setIsSimulatorOpen(false)}
              />
            </React.Suspense>
          </>
        ) : null}
      </div>
      </ThemeCatalogProvider>
    </ThemeProvider>
  );
};
