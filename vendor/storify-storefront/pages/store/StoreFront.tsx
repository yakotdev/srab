import React, { Suspense, useState, useEffect, useMemo, useRef } from 'react';
import { useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { useOpenCart } from '../../context/OpenCartContext';
import { getFontFamilyCss } from '../../lib/theme-fonts';
import { useNavigate, useLocation } from 'react-router-dom';
import { fetchApi, getStoreId } from '../../lib/api';
import { CartDrawer } from '../../components/store/CartDrawer';
import type { LayoutSection, ThemeInstanceConfig } from '../../types';
import StoreSkeleton from '../../components/store/StoreSkeleton';
import { resolveThemeSlug } from '../../theme/sectionResolve';
import { recordThemeTelemetry } from '../../lib/themeTelemetry';
import { extractMenuHandleFromSetting, resolveHeaderMenuHandleFromTheme } from '../../lib/menu-handle';
import { buildThemeRuntimePayload } from '../../theme-runtime/buildThemeRuntimePayload';
import ThemeDirectLoader from '../../components/store/ThemeDirectLoader';
import { isStorefrontTrackingEvent, trackEvent, type StorefrontTrackingPayload } from '../../lib/apps/trackEvent';
import {
  handleThemeRuntimeRequest,
  processIframeAddToCartMessage,
  type ThemeRuntimeHostHandlerContext,
} from '../../theme-runtime/themeRuntimeHostHandler';
import type { ThemeRuntimeMethod } from '../../theme-runtime/types';
import { buildLocalizedStorefrontPath } from '../../theme-template-lib/theme-localization';
import { stripLocaleFromPath } from '../../lib/locale-routing';
const ProductDetails = React.lazy(() => import('./ProductDetails'));
const TemplateRenderer = React.lazy(() => import('../../theme/TemplateRenderer'));

interface ThemeLangConfig {
  language: string;
  settings: Record<string, unknown>;
  sections: Record<string, Record<string, unknown>>;
}

/** كاش لتكوين الثيم المرفوع وملف اللغة — يقلل الطلبات عند التنقل أو إعادة الرسم. */
const uploadedThemeConfigCache: Record<string, ThemeInstanceConfig> = {};
const uploadedThemeLangCache: Record<string, ThemeLangConfig> = {};

const PAGE_TO_SECTION_TYPE: Record<string, LayoutSection['type']> = {
  shop: 'SHOP_PAGE',
  collection: 'SHOP_PAGE',
  about: 'ABOUT_PAGE',
  contact: 'CONTACT_PAGE',
  wishlist: 'WISHLIST_PAGE',
  'track-order': 'TRACK_ORDER_PAGE',
  profile: 'PROFILE_PAGE',
  policy: 'POLICY_PAGE',
};

function numberFromUnknown(value: unknown): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/** Normalize section type from manifest/DB (e.g. header, HEADER, Header). */
function sectionTypeToken(type: unknown): string {
  return String(type ?? '')
    .trim()
    .toUpperCase()
    .replace(/-/g, '_');
}

function sortLayoutByOrder(layout: LayoutSection[] | undefined | null): LayoutSection[] {
  if (!Array.isArray(layout)) return [];
  if (layout.length === 0) return [];

  const withIndex = layout.map((s, idx) => ({ s, idx }));
  const isHeader = (sec: LayoutSection) =>
    (sec as any)?.group === 'header_group' || sectionTypeToken((sec as any)?.type) === 'HEADER';
  const isFooter = (sec: LayoutSection) =>
    (sec as any)?.group === 'footer_group' || sectionTypeToken((sec as any)?.type) === 'FOOTER';

  const header = withIndex.filter(({ s }) => isHeader(s));
  const footer = withIndex.filter(({ s }) => isFooter(s));
  const middle = withIndex.filter(({ s }) => !isHeader(s) && !isFooter(s));

  header.sort((a, b) => a.idx - b.idx);
  middle.sort((a, b) => a.idx - b.idx);
  footer.sort((a, b) => a.idx - b.idx);

  return [...header, ...middle, ...footer].map(({ s }) => s as LayoutSection);
}

const isSharedGroup = (s: any) =>
  s?.group === 'header_group' || s?.group === 'overlay_group' || s?.group === 'footer_group' ||
  String(s?.type ?? '').toUpperCase() === 'HEADER' || String(s?.type ?? '').toUpperCase() === 'FOOTER';
const isTemplateGroup = (s: any) =>
  !isSharedGroup(s) && (!s?.group || s?.group === 'template_group');

/** ثابتات من layout الرئيسية بترتيب: هيدر → overlay → فوتر (لدمجها مع قالب الصفحة) */
function getSharedSectionsOrdered(layout: LayoutSection[] | undefined | null): LayoutSection[] {
  if (!Array.isArray(layout)) return [];
  const isHeader = (x: any) => x?.group === 'header_group' || String(x?.type ?? '').toUpperCase() === 'HEADER';
  const isOverlay = (x: any) => x?.group === 'overlay_group';
  const isFooter = (x: any) => x?.group === 'footer_group' || String(x?.type ?? '').toUpperCase() === 'FOOTER';
  return [...layout.filter(isHeader), ...layout.filter(isOverlay), ...layout.filter(isFooter)] as LayoutSection[];
}

function getDefaultLayoutForPage(page: string, themeLayout: LayoutSection[]): LayoutSection[] {
  const sectionType = PAGE_TO_SECTION_TYPE[page];
  if (!sectionType) return [];
  const footerFromTheme = Array.isArray(themeLayout) ? themeLayout.find((l: LayoutSection) => l.type === 'FOOTER' && l.enabled) : null;
  const footerSection: LayoutSection = footerFromTheme
    ? { ...footerFromTheme, id: footerFromTheme.id || 'footer-default' }
    : { id: 'footer-default', type: 'FOOTER', enabled: true, content: {} };
  return [
    { id: 'header-default', type: 'HEADER', enabled: true, content: {} },
    { id: `${page}-page-default`, type: sectionType, enabled: true, content: {} },
    footerSection,
  ];
}

/**
 * PDP fallback when `pages.product.layout` is missing: reuse header + overlays + footer
 * from the home layout (same pattern as shop/about) instead of a synthetic empty HEADER.
 * A blank `header-default` caused “some sections follow theme settings, some don’t” on /product only.
 */
function getDefaultProductLayout(themeLayout: LayoutSection[]): LayoutSection[] {
  const shared = getSharedSectionsOrdered(themeLayout);
  const isHeader = (s: LayoutSection) =>
    (s as { group?: string }).group === 'header_group' || sectionTypeToken((s as { type?: string }).type) === 'HEADER';
  const isOverlay = (s: LayoutSection) => (s as { group?: string }).group === 'overlay_group';
  const isFooter = (s: LayoutSection) =>
    (s as { group?: string }).group === 'footer_group' || sectionTypeToken((s as { type?: string }).type) === 'FOOTER';

  const headers = shared.filter(isHeader);
  const overlays = shared.filter(isOverlay);
  const footers = shared.filter(isFooter);

  const productSection: LayoutSection = {
    id: 'product-details-default',
    type: 'PRODUCT_DETAILS_SETTINGS',
    enabled: true,
    content: {},
  };

  const headerBlock: LayoutSection[] =
    headers.length > 0
      ? headers
      : [{ id: 'header-default', type: 'HEADER', enabled: true, content: {} }];
  const footerBlock: LayoutSection[] =
    footers.length > 0
      ? footers
      : [{ id: 'footer-default', type: 'FOOTER', enabled: true, content: {} }];

  return sortLayoutByOrder([...headerBlock, ...overlays, productSection, ...footerBlock]);
}

interface StoreFrontProps {
  previewPage?: string; // For theme editor preview
  /** When set, render product page with theme.pages.product.layout sections and ProductDetails for this id */
  productPageProductId?: string;
}

const StoreFront: React.FC<StoreFrontProps> = ({ previewPage, productPageProductId }) => {
  const { 
    theme, products, categories, cart, addToCart, removeFromCart, toggleWishlist, t, translations, formatPrice, 
    addSubscriber, storeConfig, uploadedThemeConfig: contextUploadedConfig, 
    themeLangConfig: contextThemeLang, themeHtml, setUploadedThemeData, loadStatus,
    language, baseLocale, isRtl, enabledLanguages
  } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const effectiveStoreId = getStoreId() ?? undefined;

  /** SPA navigation for ThemeDirectLoader — avoids full reload + «جاري تحميل» on every click. */
  const spaNavigateTo = useMemo(() => {
    return (path: string) => {
      const trimmed = path.trim();
      if (!trimmed.startsWith('/')) return;
      const current = `${location.pathname}${location.search || ''}`;
      if (trimmed === current) return;
      navigate(trimmed);
    };
  }, [navigate, location.pathname, location.search]);
  const metaEnv = (import.meta as unknown as { env?: Record<string, unknown> }).env ?? {};
  const isDev = Boolean(metaEnv.DEV);
  const envApiBase = typeof metaEnv.VITE_API_URL === 'string' ? metaEnv.VITE_API_URL.trim() : '';

  // القالب يُحمّل مرة واحدة فقط من الـ bootstrap في StoreContext. لا استدعاء تلقائي لـ refreshTheme من هنا — فرض استدعاء القالب من مكان واحد فقط (الـ bootstrap) ولا يحمّله أي شيء آخر.
  const { addToast } = useToast();
  const openCart = useOpenCart();
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [newsletterMessage, setNewsletterMessage] = useState('');
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);
  /** Use context (from bootstrap or previous fetch) when it matches current theme */
  const uploadedThemeId = (theme as any).uploadedThemeId as string | undefined | null;
  const uploadedThemeConfig =
    contextUploadedConfig &&
    String(contextUploadedConfig.themeId ?? '') === String(uploadedThemeId ?? '')
      ? contextUploadedConfig
      : null;
  const themeLangConfig = uploadedThemeConfig ? contextThemeLang : null;
  const [themeRegistry, setThemeRegistry] = useState<Record<string, React.FC<{ section: LayoutSection }>> | null>(null);
  /** جاهز عندما registry الثيم الحالي محمّل — يمنع عرض شكل افتراضي ثم تغيّره (لاج) */
  const [registryReady, setRegistryReady] = useState(false);
  const uploadedThemeIframeRef = useRef<HTMLIFrameElement>(null);
  /** Observed postMessage origin from our iframe (may differ from `new URL(uploadedThemeBaseUrl).origin`). */
  const uploadedThemeContentOriginRef = useRef<string | null>(null);
  const [currentProductFetched, setCurrentProductFetched] = useState<Record<string, unknown> | null>(null);
  const lastTrackedProductViewRef = useRef<string | null>(null);
  const lastTrackedSearchRef = useRef<string | null>(null);
  /** Prefetched menu items for the iframe theme (avoids PNA block in Chrome) */
  const [prefetchedMenus, setPrefetchedMenus] = useState<Record<string, unknown[]>>({});
  /** Prefetched reviews for the current product (avoids PNA block in Chrome) */
  const [prefetchedReviews, setPrefetchedReviews] = useState<unknown[]>([]);

  // Determine current page from pathname (or preview/product)
  const currentPage = useMemo(() => {
    if (productPageProductId) return 'product';
    if (previewPage) return previewPage;
    /** `/:locale/shop` → pathname `/ar/shop` — strip locale so page detection matches `App.tsx` routes */
    const path = stripLocaleFromPath(location.pathname) || '/';
    if (path === '/') return 'index';
    if (path.startsWith('/product')) return 'product';
    if (path === '/shop') return 'shop';
    if (path === '/about') return 'about';
    if (path === '/contact') return 'contact';
    if (path === '/wishlist') return 'wishlist';
    if (path === '/blog') return 'blog';
    if (path === '/lookbook') return 'lookbook';
    if (path === '/track-order') return 'track-order';
    if (path === '/profile') return 'profile';
    if (path.startsWith('/policies/')) return 'policy';
    if (path.startsWith('/collection')) return 'collection';
    if (path.startsWith('/cart')) return 'cart';
    if (path.startsWith('/checkout')) return 'checkout';
    return 'index';
  }, [previewPage, location.pathname, productPageProductId]);

  // Fetch uploaded theme config/lang only when context doesn't have them (e.g. after refreshTheme). Bootstrap normally fills context.
  useEffect(() => {
    const uploadedId = (theme as any).uploadedThemeId as string | undefined | null;
    if (!uploadedId) return;
    if (String(contextUploadedConfig?.themeId ?? '') === String(uploadedId ?? '')) return; // already from bootstrap
    const cached = uploadedThemeConfigCache[uploadedId];
    if (cached) {
      setUploadedThemeData(cached, uploadedThemeLangCache[`${uploadedId}:${cached.defaultLanguage || 'ar'}`] ?? null);
      return;
    }
    let cancelled = false;
    fetchApi<ThemeInstanceConfig>(`/uploaded-themes/${uploadedId}/config`)
      .then((cfg) => {
        if (!cancelled) {
          uploadedThemeConfigCache[uploadedId] = cfg;
          setUploadedThemeData(cfg, null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          recordThemeTelemetry('theme_apply_failed', {
            reason: 'uploaded_config_fetch_failed',
            uploadedThemeId: uploadedId,
            storeId: getStoreId(),
          });
          setUploadedThemeData(null, null);
        }
      });
    return () => { cancelled = true; };
  }, [theme, contextUploadedConfig?.themeId, setUploadedThemeData]);

  useEffect(() => {
    const uploadedId = (theme as any).uploadedThemeId as string | undefined | null;
    const cfg =
      String(contextUploadedConfig?.themeId ?? '') === String(uploadedId ?? '')
        ? contextUploadedConfig
        : uploadedThemeConfigCache[uploadedId ?? ''];
    const lang = cfg?.defaultLanguage || 'ar';
    if (!uploadedId || !cfg) return;
    if (contextThemeLang) return; // already from bootstrap
    const cacheKey = `${uploadedId}:${lang}`;
    const cached = uploadedThemeLangCache[cacheKey];
    if (cached) {
      setUploadedThemeData(cfg, cached);
      return;
    }
    let cancelled = false;
    fetchApi<ThemeLangConfig>(`/uploaded-themes/${uploadedId}/lang/${lang}`)
      .then((langCfg) => {
        if (!cancelled) {
          uploadedThemeLangCache[cacheKey] = langCfg;
          setUploadedThemeData(cfg, langCfg);
        }
      })
      .catch(() => {
        if (!cancelled) setUploadedThemeData(cfg, null);
      });
    return () => { cancelled = true; };
  }, [theme, contextUploadedConfig, contextThemeLang, setUploadedThemeData]);

  // مصدر layout الرئيسية (home) — للصفحة الأولى ولدمج الثابتات مع الصفحات الثانية
  const homeLayoutSource = useMemo(() => {
    const uploadedId = (theme as any).uploadedThemeId as string | undefined | null;
    const cfg = uploadedThemeConfig;
    // Storefront should honor published ThemeConfig first.
    // R2 config is a fallback (older flows may leave it at manifest defaults).
    if (uploadedId && Array.isArray(theme.uploadedThemeLayout) && theme.uploadedThemeLayout.length > 0) {
      return theme.uploadedThemeLayout as LayoutSection[];
    }
    const homeFromCfg = cfg?.pages?.home?.layout;
    if (uploadedId && homeFromCfg && Array.isArray(homeFromCfg) && homeFromCfg.length > 0) return homeFromCfg as LayoutSection[];
    return Array.isArray(theme.layout) ? (theme.layout as LayoutSection[]) : [];
  }, [theme, uploadedThemeConfig]);

  // Get current layout: كل الصفحات (ما عدا checkout الثابتة) تسحب من الثيم — ثابتات من الرئيسية + قالب الصفحة
  const currentLayout = useMemo(() => {
    const uploadedId = (theme as any).uploadedThemeId as string | undefined | null;
    const cfg = uploadedThemeConfig;

    if (productPageProductId) {
      const productLayout = theme.pages?.product?.layout;
      const productLayoutFromCfg = cfg?.pages?.product?.layout;
      const rawProductLayout: LayoutSection[] | null =
        Array.isArray(productLayout) && productLayout.length > 0
          ? (productLayout as LayoutSection[])
          : uploadedId && productLayoutFromCfg && Array.isArray(productLayoutFromCfg) && productLayoutFromCfg.length > 0
            ? (productLayoutFromCfg as LayoutSection[])
            : null;

      // دمج shared sections (هيدر + overlay + فوتر) من الرئيسية مع سكاشن المنتج — نفس المنطق المتبع في بقية الصفحات
      const sharedOrdered = getSharedSectionsOrdered(homeLayoutSource);

      if (rawProductLayout) {
        const templateOnly = rawProductLayout.filter((s: any) => isTemplateGroup(s));
        if (templateOnly.length > 0) {
          return sortLayoutByOrder([...sharedOrdered, ...templateOnly]);
        }
        // لا يوجد template sections: ادمج كل ما هو غير shared
        const nonShared = rawProductLayout.filter((s: any) => !isSharedGroup(s));
        return sortLayoutByOrder([...sharedOrdered, ...(nonShared.length > 0 ? nonShared : rawProductLayout)]);
      }

      return getDefaultProductLayout(homeLayoutSource);
    }
    const pageToUse = previewPage || currentPage;
    // الصفحة الرئيسية: layout كامل من الثيم
    if (pageToUse === 'index') {
      let layout = sortLayoutByOrder(homeLayoutSource);
      const hasEnabledHeader = layout.some(
        (s: LayoutSection) =>
          s.enabled !== false &&
          ((s as any)?.group === 'header_group' || sectionTypeToken((s as any)?.type) === 'HEADER'),
      );
      // Strict `s.type === 'HEADER'` missed DB values like `header` and caused a second HEADER with empty content — user menu on the real HEADER was ignored.
      if (layout.length > 0 && !hasEnabledHeader) {
        layout = [{ id: 'header-index', type: 'HEADER', enabled: true, content: {} }, ...layout];
      }
      return layout;
    }
    // checkout ثابتة — لا تُرسم من StoreFront أصلاً (مسار منفصل)
    if (pageToUse === 'checkout') return [];

    // بقية الصفحات: ثابتات من الرئيسية + قالب الصفحة من الثيم (كلها من الثيم)
    const themeDrivenPages = ['shop', 'collection', 'about', 'contact', 'wishlist', 'blog', 'lookbook', 'track-order', 'profile', 'policy', 'cart'];
    if (themeDrivenPages.includes(pageToUse)) {
      const sharedOrdered = getSharedSectionsOrdered(homeLayoutSource);
      const pageLayoutFromCfg = cfg?.pages?.[pageToUse]?.layout;
      const pageLayoutFromTheme = theme.pages?.[pageToUse]?.layout;
      const pageLayout = (uploadedId && pageLayoutFromCfg && Array.isArray(pageLayoutFromCfg) ? pageLayoutFromCfg : pageLayoutFromTheme) as LayoutSection[] | undefined;
      const templateOnly = Array.isArray(pageLayout) ? pageLayout.filter((s: any) => isTemplateGroup(s)) : [];

      // إذا وُجدت سكاشن template مخصّصة للصفحة: ندمجها مع الهيدر/الفوتر
      if (templateOnly.length > 0) {
        const merged = [...sharedOrdered, ...templateOnly];
        return sortLayoutByOrder(merged);
      }

      // لا يوجد template خاص لهذه الصفحة: نبني layout افتراضي (HEADER + PAGE + FOOTER)
      if (PAGE_TO_SECTION_TYPE[pageToUse]) {
        return getDefaultLayoutForPage(pageToUse, homeLayoutSource);
      }

      // fallback أخير: عرض الثابتات فقط
      return sortLayoutByOrder(sharedOrdered);
    }
    return sortLayoutByOrder(homeLayoutSource);
  }, [previewPage, currentPage, theme, uploadedThemeConfig, productPageProductId, homeLayoutSource]);

  // التصنيفات من الـ context (تُحمّل بعد القالب في StoreContext) — لا طلب منفصل هنا.

  // Force re-render when previewPage changes (for theme editor)
  useEffect(() => {
    // This effect ensures the component re-renders when previewPage changes
    // The key prop on StoreFront in ThemeEditor should handle this, but this is a backup
  }, [previewPage, currentPage]);

  // When using an uploaded theme, derive visual settings from per-language config (priority)
  // or ThemeInstanceConfig.settings as fallback.
  const effectiveTheme = useMemo(() => {
    const uploadedId = (theme as any).uploadedThemeId as string | undefined | null;
    if (!uploadedId) return theme;
    const langSettings = themeLangConfig?.settings;
    const cfgSettings = uploadedThemeConfig?.settings;
    const s = (langSettings && typeof langSettings === 'object' ? langSettings : cfgSettings) as Record<string, unknown> | undefined;
    if (!s) return theme;
    const primary = (s.primary_color as string) || theme.primaryColor;
    const secondary = (s.secondary_color as string) || theme.secondaryColor;
    const font = (s.font_family as string) || theme.fontFamily;
    return {
      ...theme,
      primaryColor: primary,
      secondaryColor: secondary,
      fontFamily: font,
    };
  }, [theme, uploadedThemeConfig, themeLangConfig]);

  const primaryStyle = { backgroundColor: effectiveTheme.primaryColor, color: '#ffffff' };
  const textPrimaryStyle = { color: effectiveTheme.primaryColor };

  // Helper to get actual CSS border radius from theme config
  const getRadius = () => {
    switch (theme.borderRadius) {
      case 'none': return '0px';
      case 'sm': return '4px';
      case 'md': return '8px';
      case 'lg': return '16px';
      case 'full': return '24px';
      default: return '12px';
    }
  };
  const radiusStyle = { borderRadius: getRadius() };

  const themeSlugFromUrl = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('themeSlug') ?? new URLSearchParams(window.location.search).get('theme_slug') : null;
  const themeSlug = resolveThemeSlug(theme, themeSlugFromUrl);
  const storeForContext = useMemo(() => (storeConfig ? {
    name: storeConfig.name ?? '',
    logo: storeConfig.logo ?? '',
    favicon: storeConfig.favicon ?? '',
    email: storeConfig.email ?? '',
    phone: storeConfig.phone ?? '',
    address: storeConfig.address ?? '',
    metaDescription: storeConfig.metaDescription ?? '',
    currency: storeConfig.currency ?? undefined,
    currencyFormat: storeConfig.currencyFormat ?? undefined,
    language: storeConfig.language ?? undefined,
    policies: storeConfig.policies,
    enabledLanguages: Array.isArray(enabledLanguages) && enabledLanguages.length > 0 ? enabledLanguages : storeConfig.enabledLanguages,
    shipping: storeConfig.shipping,
  } : undefined), [storeConfig, enabledLanguages]);

  const templateContext = useMemo(() => ({
    theme: effectiveTheme,
    products,
    addToCart,
    addToast,
    t,
    formatPrice,
    navigate,
    addSubscriber,
    allCategories: categories,
    newsletterEmail,
    setNewsletterEmail,
    newsletterStatus,
    setNewsletterStatus,
    newsletterMessage,
    setNewsletterMessage,
    productPageProductId,
    primaryStyle,
    radiusStyle,
    textPrimaryStyle,
    openCart,
    themeLangConfig,
    themeSlug,
    store: storeForContext,
  }), [effectiveTheme, products, categories, addToCart, addToast, t, formatPrice, navigate, addSubscriber, newsletterEmail, newsletterStatus, newsletterMessage, productPageProductId, primaryStyle, radiusStyle, textPrimaryStyle, openCart, themeLangConfig, themeSlug, storeForContext]);

  // ثيم مرفوع: كل الثيمات المرفوعة تعرض عبر iframe عند وجود baseUrl صالح (لا استثناءات محلية بالأسماء).
  const baseUrlRaw = theme?.uploadedThemeBaseUrl ?? null;
  const baseUrl = baseUrlRaw && String(baseUrlRaw).trim().toLowerCase().startsWith('http') ? baseUrlRaw.trim() : null;
  // Enable external rendering for uploaded themes using ThemeDirectLoader
  const useUploadedThemeIframe = Boolean(
    baseUrl && !previewPage && currentPage !== 'checkout'
  );

  /** Intercept same-origin theme `<a target="_top">` clicks so React Router navigates without a full reload. */
  useEffect(() => {
    if (!useUploadedThemeIframe) return;
    const onDocumentClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!anchor) return;
      const targetAttr = (anchor.getAttribute('target') || '').toLowerCase();
      if (targetAttr === '_blank' || anchor.hasAttribute('download')) return;
      const rawHref = anchor.getAttribute('href');
      if (!rawHref) return;
      const trimmed = rawHref.trim();
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('mailto:') || trimmed.startsWith('tel:')) return;
      let url: URL;
      try {
        url = new URL(trimmed, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      const next = `${url.pathname}${url.search}`;
      const current = `${location.pathname}${location.search || ''}`;
      event.preventDefault();
      if (next !== current) spaNavigateTo(next);
    };
    document.addEventListener('click', onDocumentClick, true);
    return () => document.removeEventListener('click', onDocumentClick, true);
  }, [useUploadedThemeIframe, spaNavigateTo, location.pathname, location.search]);

  const currentProductForTracking = useMemo(() => {
    if (!productPageProductId) return null;
    return products.find((p: { id?: string }) => String(p.id) === productPageProductId) ?? currentProductFetched;
  }, [productPageProductId, products, currentProductFetched]);

  useEffect(() => {
    if (!productPageProductId || !currentProductForTracking) return;
    const productId = String(currentProductForTracking.id ?? productPageProductId).trim();
    if (!productId || lastTrackedProductViewRef.current === productId) return;
    lastTrackedProductViewRef.current = productId;
    trackEvent('view_item', {
      productId,
      name: typeof currentProductForTracking.name === 'string' ? currentProductForTracking.name : undefined,
      value: numberFromUnknown(currentProductForTracking.price),
      currency: storeConfig.currency,
      quantity: 1,
    });
  }, [productPageProductId, currentProductForTracking, storeConfig.currency]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const query = (params.get('q') || params.get('search') || '').trim();
    if (!query || !['index', 'shop', 'collection'].includes(currentPage)) return;
    const key = `${location.pathname}:${query}`;
    if (lastTrackedSearchRef.current === key) return;
    lastTrackedSearchRef.current = key;
    trackEvent('search', {
      searchQuery: query,
      path: `${location.pathname}${location.search}`,
      currency: storeConfig.currency,
    });
  }, [currentPage, location.pathname, location.search, storeConfig.currency]);

  // تحميل registry فقط عند الحاجة — لا نسحب @theme-default/registry مع مسار ThemeDirectLoader (ثيم مرفوع).
  useEffect(() => {
    if (!previewPage && useUploadedThemeIframe) {
      return;
    }
    let cancelled = false;
    void import('../../theme/sectionRegistry')
      .then(({ getDefaultRegistry, loadThemeRegistry }) => {
        if (cancelled) return;
        if (themeSlug === 'default-storefront') {
          setThemeRegistry(getDefaultRegistry());
          setRegistryReady(true);
          return;
        }
        setRegistryReady(false);
        return loadThemeRegistry(themeSlug)
          .then((r) => {
            if (!cancelled) {
              setThemeRegistry(r);
              setRegistryReady(true);
            }
          })
          .catch((e) => {
            console.warn('[StoreFront] loadThemeRegistry failed, using default sections', e);
            if (!cancelled) {
              setThemeRegistry(getDefaultRegistry());
              setRegistryReady(true);
            }
          });
      })
      .catch((e) => {
        console.warn('[StoreFront] sectionRegistry import failed', e);
        if (!cancelled) {
          void import('../../theme/builtinDefaultSections').then((m) => {
            if (!cancelled) {
              setThemeRegistry(m.getBuiltinDefaultRegistry() as Record<string, React.FC<{ section: LayoutSection }>>);
              setRegistryReady(true);
            }
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [themeSlug, useUploadedThemeIframe, previewPage]);

  useEffect(() => {
    if (!productPageProductId || !useUploadedThemeIframe) {
      setCurrentProductFetched(null);
      return;
    }
    const inList = Array.isArray(products) && products.some((p: { id?: string }) => p.id === productPageProductId);
    if (inList) {
      setCurrentProductFetched(null);
      return;
    }
    let cancelled = false;
    fetchApi<Record<string, unknown>>(
      `/products/${encodeURIComponent(productPageProductId)}?language=${encodeURIComponent(language || baseLocale || 'en')}`,
    )
      .then((data) => {
        if (!cancelled && data && typeof data === 'object') setCurrentProductFetched(data);
      })
      .catch(() => {
        if (!cancelled) setCurrentProductFetched(null);
      });
    return () => { cancelled = true; };
  }, [productPageProductId, products, useUploadedThemeIframe, language, baseLocale]);

  // Prefetch reviews for the current product so the iframe doesn't need to call localhost directly
  useEffect(() => {
    if (!productPageProductId || !useUploadedThemeIframe) {
      setPrefetchedReviews([]);
      return;
    }
    let cancelled = false;
    fetchApi<unknown[]>(`/reviews?productId=${encodeURIComponent(productPageProductId)}&status=Approved`)
      .then((data) => {
        if (!cancelled) setPrefetchedReviews(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setPrefetchedReviews([]);
      });
    return () => { cancelled = true; };
  }, [productPageProductId, useUploadedThemeIframe]);

  // Prefetch menu items for the uploaded theme — deferred until idle so first paint / theme scripts aren’t competing.
  useEffect(() => {
    if (!useUploadedThemeIframe) return;
    const header = resolveHeaderMenuHandleFromTheme(theme as { headerMenuHandle?: string | null; uploadedThemeSettings?: Record<string, unknown> | null });
    const uploaded = theme?.uploadedThemeSettings as Record<string, unknown> | undefined;
    const f1 = uploaded ? extractMenuHandleFromSetting(uploaded.footer_col_1) : null;
    const f2 = uploaded ? extractMenuHandleFromSetting(uploaded.footer_col_2) : null;
    const f3 = uploaded ? extractMenuHandleFromSetting(uploaded.footer_col_3) : null;
    const handles = [...new Set([header, f1, f2, f3].filter(Boolean))] as string[];
    if (handles.length === 0) return;
    let cancelled = false;

    const runPrefetch = () => {
      if (cancelled) return;
      void Promise.all(
        handles.map((handle) =>
          fetchApi<{ items?: unknown[] }>(`/menus/by-handle?handle=${encodeURIComponent(handle)}`)
            .then((data) => ({ handle, items: Array.isArray(data?.items) ? data.items! : [] }))
            .catch(() => ({ handle, items: [] as unknown[] })),
        ),
      ).then((results) => {
        if (cancelled) return;
        const next: Record<string, unknown[]> = {};
        for (const { handle, items } of results) {
          if (items.length > 0) next[handle] = items;
        }
        setPrefetchedMenus((prev) => ({ ...prev, ...next }));
      });
    };

    let idleId: number | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    if (typeof requestIdleCallback === 'function') {
      idleId = requestIdleCallback(() => runPrefetch(), { timeout: 2500 });
    } else {
      timeoutId = setTimeout(runPrefetch, 400);
    }

    return () => {
      cancelled = true;
      if (idleId !== undefined && typeof cancelIdleCallback === 'function') {
        cancelIdleCallback(idleId);
      }
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    };
  }, [useUploadedThemeIframe, (theme as { headerMenuHandle?: string | null })?.headerMenuHandle, theme?.uploadedThemeSettings]);

  useEffect(() => {
    uploadedThemeContentOriginRef.current = null;
  }, [baseUrl, useUploadedThemeIframe]);

  useEffect(() => {
    uploadedThemeContentOriginRef.current = null;
  }, [location.pathname, productPageProductId, useUploadedThemeIframe]);

  /** نفس حمولة STORIFY_THEME_CONFIG — للحقن المباشر (ThemeDirectLoader) ولـ postMessage بعد التحميل. */
  const uploadedThemeHostPayload = useMemo((): Record<string, unknown> | null => {
    if (typeof window !== 'undefined') {
      /** Diagnostic: open DevTools and call `window.__storifyHostTranslations()` to inspect. */
      (window as unknown as { __storifyHostTranslations?: () => unknown }).__storifyHostTranslations = () => ({
        storeId: effectiveStoreId,
        language,
        baseLocale,
        translationsCount: translations ? Object.keys(translations).length : 0,
        sample: translations
          ? Object.fromEntries(Object.entries(translations).slice(0, 8))
          : null,
      });
    }
    const built = buildThemeRuntimePayload({
      active: Boolean(useUploadedThemeIframe && baseUrl),
      currentLayout,
      themeLangSections: themeLangConfig?.sections,
      themeLangSettings: themeLangConfig?.settings,
      themeLangLanguage: themeLangConfig?.language,
      categories,
      products,
      cart,
      theme,
      uploadedThemeInstanceSettings: uploadedThemeConfig?.settings,
      uploadedThemeDefaultLanguage: uploadedThemeConfig?.defaultLanguage,
      storeForContext: storeForContext as Record<string, unknown> | undefined,
      storeConfigLanguage: storeConfig?.language,
      language,
      baseLocale,
      isRtl,
      effectiveStoreId,
      locationPathname: typeof location?.pathname === 'string' ? location.pathname : '/',
      productPageProductId,
      currentProductFetched,
      prefetchedMenus,
      prefetchedReviews,
      envApiBase,
      hostMessages: translations,
      hostMessagesLanguage: language,
    });
    return built as Record<string, unknown> | null;
  }, [
    useUploadedThemeIframe,
    baseUrl,
    currentLayout,
    theme?.uploadedThemeSettings,
    theme?.primaryColor,
    theme?.secondaryColor,
    theme?.fontFamily,
    theme?.borderRadius,
    uploadedThemeConfig?.settings,
    themeLangConfig?.settings,
    themeLangConfig?.sections,
    (theme as { headerMenuHandle?: string | null })?.headerMenuHandle,
    effectiveStoreId,
    storeForContext,
    language,
    baseLocale,
    isRtl,
    products,
    cart,
    categories,
    location?.pathname,
    productPageProductId,
    currentProductFetched,
    prefetchedMenus,
    prefetchedReviews,
    envApiBase,
    storeConfig?.language,
    storeConfig?.currencyFormat,
    uploadedThemeConfig?.defaultLanguage,
    themeLangConfig?.language,
    translations,
  ]);

  useEffect(() => {
    if (!useUploadedThemeIframe) return;
    const themeOrigin = (() => {
      if (!baseUrl) return null;
      try {
        return new URL(baseUrl.replace(/\/?$/, '/')).origin;
      } catch {
        return null;
      }
    })();

    const isFromOurThemeIframe = (event: MessageEvent) => {
      const originStr = typeof event.origin === 'string' ? event.origin : '';
      const storefrontOrigin = typeof window !== 'undefined' ? window.location.origin : '';
      const learned = uploadedThemeContentOriginRef.current;

      if (originStr && originStr === storefrontOrigin) {
        uploadedThemeContentOriginRef.current = originStr;
        return true;
      }
      
      const iframeWin = uploadedThemeIframeRef.current?.contentWindow;
      if (iframeWin && event.source === iframeWin) {
        if (originStr) uploadedThemeContentOriginRef.current = originStr;
        return true;
      }

      if (!originStr) return false;
      if (themeOrigin && originStr === themeOrigin) {
        uploadedThemeContentOriginRef.current = originStr;
        return true;
      }
      if (learned && originStr === learned) return true;
      return false;
    };

    const onMessage = (event: MessageEvent) => {
      if (!isFromOurThemeIframe(event)) {
        if (
          isDev &&
          typeof event.data?.type === 'string' &&
          event.data.type.startsWith('STORIFY_')
        ) {
          console.warn('[StoreFront] ignored iframe postMessage (origin)', event.data.type, {
            origin: event.origin,
            themeOrigin,
            learnedOrigin: uploadedThemeContentOriginRef.current,
          });
        }
        return;
      }
      if (event.data?.type === 'STORIFY_THEME_READY') {
        return;
      }
      if (event.data?.type === 'STORIFY_RUNTIME_REQUEST') {
        const requestId = typeof event.data.requestId === 'string' ? event.data.requestId : '';
        const method = event.data.method;
        const rawParams = event.data.params;
        if (!requestId || !event.source || typeof method !== 'string') return;

        const source = event.source as Window;
        const sendRuntimeResponse = (body: Record<string, unknown>) => {
          try {
            source.postMessage(body, '*');
          } catch {
            /* ignore */
          }
        };

        const ctx: ThemeRuntimeHostHandlerContext = {
          products: products as ThemeRuntimeHostHandlerContext['products'],
          cart: cart as ThemeRuntimeHostHandlerContext['cart'],
          storeCurrency: storeConfig.currency,
          storeLanguage: language,
          storeDirection: isRtl ? 'rtl' : 'ltr',
          addToCart,
          removeFromCart,
          openCart,
          toggleWishlist,
          addSubscriber,
          lastTrackedProductViewRef,
          lastTrackedSearchRef,
          locationPathname: location.pathname,
          locationSearch: location.search,
          navigateInternal: useUploadedThemeIframe ? spaNavigateTo : undefined,
        };

        void handleThemeRuntimeRequest(method as ThemeRuntimeMethod, rawParams, ctx)
          .then((result) => {
            sendRuntimeResponse({
              type: 'STORIFY_RUNTIME_RESPONSE',
              requestId,
              ok: true,
              result,
            });
          })
          .catch((err: unknown) => {
            const message = err instanceof Error ? err.message : String(err);
            sendRuntimeResponse({
              type: 'STORIFY_RUNTIME_RESPONSE',
              requestId,
              ok: false,
              error: { code: 'RUNTIME_ERROR', message },
            });
          });
        return;
      }
      if (event.data?.type === 'STORIFY_TRACK_EVENT') {
        const eventName = event.data.eventName;
        if (!isStorefrontTrackingEvent(eventName)) return;
        const payload = event.data.payload && typeof event.data.payload === 'object' && !Array.isArray(event.data.payload)
          ? (event.data.payload as StorefrontTrackingPayload)
          : {};
        if (eventName === 'view_item' && typeof payload.productId === 'string') {
          if (lastTrackedProductViewRef.current === payload.productId) return;
          lastTrackedProductViewRef.current = payload.productId;
        }
        if (eventName === 'search' && typeof payload.searchQuery === 'string') {
          const key = `${location.pathname}:${payload.searchQuery.trim()}`;
          if (lastTrackedSearchRef.current === key) return;
          lastTrackedSearchRef.current = key;
        }
        trackEvent(eventName, {
          ...payload,
          currency: typeof payload.currency === 'string' ? payload.currency : storeConfig.currency,
        });
        return;
      }
      if (event.data?.type === 'STORIFY_OPEN_CART') {
        openCart();
        return;
      }
      if (
        event.data?.type === 'STORIFY_SET_LOCALIZATION' ||
        event.data?.type === 'STORIFY_SET_LANGUAGE'
      ) {
        const d = event.data as Record<string, unknown>;
        const pathRaw = typeof d.path === 'string' ? d.path.trim() : '';
        const current = `${location.pathname}${location.search || ''}`;
        if (pathRaw && pathRaw.startsWith('/')) {
          if (pathRaw !== current) {
            if (useUploadedThemeIframe) spaNavigateTo(pathRaw);
            else window.location.assign(pathRaw);
          }
          return;
        }
        const lang =
          (typeof d.languageCode === 'string' && d.languageCode.trim()) ||
          (typeof d.language === 'string' && d.language.trim()) ||
          '';
        if (lang) {
          const full = buildLocalizedStorefrontPath(lang, {
            pathname: location.pathname,
            search: location.search,
          });
          if (full !== current) {
            if (useUploadedThemeIframe) spaNavigateTo(full);
            else window.location.assign(full);
          }
        }
        return;
      }
      if (event.data?.type === 'STORIFY_NAVIGATE') {
        const nextPath = typeof event.data.path === 'string' ? event.data.path.trim() : '';
        const current = `${location.pathname}${location.search || ''}`;
        if (nextPath && nextPath.startsWith('/') && nextPath !== current) {
          if (useUploadedThemeIframe) spaNavigateTo(nextPath);
          else window.location.assign(nextPath);
        }
        return;
      }
      if (event.data?.type === 'STORIFY_NEWSLETTER_SUBSCRIBE') {
        const email = typeof event.data.email === 'string' ? event.data.email.trim() : '';
        if (email) void addSubscriber(email).catch(() => { });
        return;
      }
      if (event.data?.type === 'STORIFY_ADD_TO_CART') {
        processIframeAddToCartMessage(event.data as Record<string, unknown>, {
          products: products as ThemeRuntimeHostHandlerContext['products'],
          cart: cart as ThemeRuntimeHostHandlerContext['cart'],
          addToCart,
          openCart,
        });
        return;
      }
      if (event.data?.type === 'STORIFY_REMOVE_FROM_CART') {
        const productId = String(event.data.productId ?? '').trim();
        const variantId =
          typeof event.data.variantId === 'string' && event.data.variantId.trim()
            ? event.data.variantId.trim()
            : undefined;
        if (!productId) return;
        if (variantId) {
          removeFromCart(productId, variantId);
          return;
        }
        // Fallback: when theme cannot resolve variant id, remove all rows for this product id.
        const candidates = (cart || []).filter((p: { id?: string }) => String(p.id) === productId);
        if (candidates.length === 0) return;
        for (const item of candidates) {
          const vid = (item as { selectedVariant?: { id?: string } }).selectedVariant?.id;
          removeFromCart(productId, typeof vid === 'string' && vid.trim() ? vid.trim() : undefined);
        }
        return;
      }
      if (event.data?.type === 'STORIFY_TOGGLE_WISHLIST' && event.data.product && typeof event.data.product === 'object') {
        toggleWishlist(event.data.product as any);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [
    useUploadedThemeIframe,
    products,
    cart,
    addToCart,
    removeFromCart,
    toggleWishlist,
    openCart,
    baseUrl,
    addSubscriber,
    storeConfig.currency,
    location.pathname,
    location.search,
    spaNavigateTo,
  ]);

  /* -------------------------------------------------------------
   *  RENDER LOGIC
   * ------------------------------------------------------------- */

  // 1. Preview Mode (Theme Editor): نفس منطق الستورفرونت — كل الصفحات من قالب الثيم (TemplateRenderer) بدون تصاميم ثابتة
  if (previewPage) {
    if (!registryReady || !themeRegistry) {
      return <StoreSkeleton dir={storeConfig?.language === 'ar' ? 'rtl' : 'ltr'} />;
    }
    const hasProductDetailsSection = currentLayout.some((l: any) => l.enabled && l.type === 'PRODUCT_DETAILS_SETTINGS');
    const showProductFallback = previewPage === 'product' && products[0]?.id && !hasProductDetailsSection;
    const previewDir = storeConfig?.language === 'ar' ? 'rtl' : 'ltr';
    return (
      <div style={{ fontFamily: getFontFamilyCss(effectiveTheme.fontFamily) }}>
        <Suspense fallback={<StoreSkeleton dir={previewDir} />}>
          <TemplateRenderer layout={currentLayout} context={templateContext} registry={themeRegistry} />
          {showProductFallback && <ProductDetails productId={products[0]!.id} />}
        </Suspense>
        {previewPage === 'cart' && <CartDrawer isOpen={true} onClose={() => { }} />}
      </div>
    );
  }

  // عرض مباشر: إن كان الثيم مرفوعاً من Cloudflare (baseUrl) وعرض الصفحة الرئيسية → iframe حسب THEME_MANIFEST_AND_API
  const hasProductDetailsSection = currentLayout.some((l: any) => l.enabled && l.type === 'PRODUCT_DETAILS_SETTINGS');
  const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const currentStoreId = typeof window !== 'undefined' ? getStoreId() : null;
  // إظهار التلميح فقط عندما لا يوجد معرف متجر — حتى لا يظهر بعد وقت أو فشل طلب رغم وجود المتجر
  const showStoreIdHint = isLocalhost && themeSlug === 'default-storefront' && !theme?.uploadedThemeId && !currentStoreId;
  const showUploadedThemeNoBaseUrlHint = isLocalhost && Boolean(theme?.uploadedThemeId) && !baseUrl;
  if (useUploadedThemeIframe && baseUrl) {
    const normalizedBase = baseUrl.replace(/\/?$/, '/');
    const storeIdParam = effectiveStoreId;
    const pathParam = typeof location?.pathname === 'string' ? location.pathname : '/';
    const params = new URLSearchParams();
    if (storeIdParam) params.set('storeId', storeIdParam);
    params.set('path', pathParam);
    if (productPageProductId) params.set('productId', productPageProductId);
    if (typeof window !== 'undefined') {
      params.set('parentOrigin', encodeURIComponent(window.location.origin));
      const parentQs = new URLSearchParams(location.search);
      const catQ = parentQs.get('category');
      if (catQ) params.set('category', catQ);
      const qVal = parentQs.get('q') || parentQs.get('search');
      if (qVal) params.set('q', qVal);
    }
    const iframeSrc = `${normalizedBase}index.html?${params.toString()}`;
    // A stable empty payload reference so it does not trigger infinite reload loops in ThemeDirectLoader.
    return (
      <div style={{ fontFamily: getFontFamilyCss(effectiveTheme.fontFamily), width: '100%', minHeight: '100vh' }}>
        {showStoreIdHint && (
          <div style={{ background: '#fef3c7', color: '#92400e', padding: '8px 12px', fontSize: '13px', textAlign: 'center' }}>
            لرؤية القالب المثبت لمتجرك: أضف <code style={{ background: '#fde68a', padding: '2px 6px', borderRadius: 4 }}>?storeId=معرف_المتجر</code> إلى الرابط، أو ضع <code style={{ background: '#fde68a', padding: '2px 6px', borderRadius: 4 }}>VITE_DEV_STORE_ID=معرف_المتجر</code> في <code>.env</code> وأعد تشغيل الستورفرونت.
          </div>
        )}
        <ThemeDirectLoader
          key={`theme-direct:${effectiveStoreId ?? 'default'}:${normalizedBase}`}
          baseUrl={normalizedBase}
          themeConfigPayload={uploadedThemeHostPayload ?? {}}
          prefetchedHtml={themeHtml}
        />
      </div>
    );
  }

  if (!registryReady || !themeRegistry) {
    return <StoreSkeleton dir={storeConfig?.language === 'ar' ? 'rtl' : 'ltr'} />;
  }

  const shellDir = storeConfig?.language === 'ar' ? 'rtl' : 'ltr';
  return (
    <div style={{ fontFamily: getFontFamilyCss(effectiveTheme.fontFamily) }}>
      {showStoreIdHint && (
        <div style={{ background: '#fef3c7', color: '#92400e', padding: '8px 12px', fontSize: '13px', textAlign: 'center' }}>
          لرؤية القالب المثبت لمتجرك: أضف <code style={{ background: '#fde68a', padding: '2px 6px', borderRadius: 4 }}>?storeId=معرف_المتجر</code> إلى الرابط، أو ضع <code style={{ background: '#fde68a', padding: '2px 6px', borderRadius: 4 }}>VITE_DEV_STORE_ID=معرف_المتجر</code> في <code>.env</code> وأعد تشغيل الستورفرونت.
        </div>
      )}
      {showUploadedThemeNoBaseUrlHint && (
        <div style={{ background: '#fee2e2', color: '#991b1b', padding: '8px 12px', fontSize: '13px', textAlign: 'center' }}>
          الثيم المرفوع مفعّل لمتجرك لكن رابط التخزين غير متوفر. تحقق من إعدادات التخزين (مثلاً <code>STORAGE_PUBLIC_BASE_URL</code>) أو أن الملفات مرفوعة فعلاً.
        </div>
      )}
      <Suspense fallback={<StoreSkeleton dir={shellDir} />}>
        <TemplateRenderer layout={currentLayout} context={templateContext} registry={themeRegistry} />
        {productPageProductId && !hasProductDetailsSection && <ProductDetails productId={productPageProductId} />}
      </Suspense>
    </div>
  );
};

export default StoreFront;