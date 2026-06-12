
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Product, Order, Plugin, ThemeConfig, StoreContextType, StoreLoadStatus, Customer, Discount, Language, Currency, StoreConfig, StorefrontLanguage, ContactMessage, Review, NewsletterSubscriber, ActivityLog, Category, ShippingMethod, Market, CheckoutField, PaymentMethod, MenuDisplay, ThemeInstanceConfig, StorefrontApp } from '../types';
import { INITIAL_PRODUCTS, INITIAL_ORDERS, INITIAL_CUSTOMERS, INITIAL_DISCOUNTS, INITIAL_PLUGINS, DEFAULT_THEME, TRANSLATIONS } from '../constants';
import { formatCurrency } from '../lib/currency';
import { productsApi, ordersApi, customersApi, categoriesApi, discountsApi, cartDiscountsApi, pluginsApi, bootstrapApi, themeApi, storeConfigApi, messagesApi, subscribersApi, activityLogsApi, reviewsApi, translationsApi, appsApi, menusApi, getStoreId } from '../lib/api';
import { extractMenuHandleFromSetting, resolveHeaderMenuHandleFromTheme } from '../lib/menu-handle';
import { trackEvent } from '../lib/apps/trackEvent';
import { syncCartToAnalytics } from '../lib/analytics/cartSync';
import { setAnalyticsCartSummary, setAnalyticsHeartbeatStatus } from '../lib/analytics/sessionHeartbeat';
import { useAuth } from './AuthContext';

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const DEFAULT_CHECKOUT_FIELDS: CheckoutField[] = [
    { id: 'fullName', name: 'fullName', label: 'Full Name', type: 'text', required: true, enabled: true, order: 1 },
    { id: 'email', name: 'email', label: 'Email Address', type: 'email', required: true, enabled: true, order: 2 },
    { id: 'phone', name: 'phone', label: 'Phone Number', type: 'tel', required: true, enabled: true, order: 3 },
    { id: 'address', name: 'address', label: 'Address', type: 'text', required: true, enabled: true, order: 4 },
    { id: 'city', name: 'city', label: 'City', type: 'text', required: true, enabled: true, order: 5 },
    { id: 'postalCode', name: 'postalCode', label: 'Postal Code', type: 'text', required: false, enabled: true, order: 6 },
];

const DEFAULT_MARKETS: Market[] = [
    { id: 'm-1', name: 'Palestine', countries: ['PS'], currency: 'ILS', language: 'ar', active: true },
    { id: 'm-2', name: 'Israel', countries: ['IL'], currency: 'ILS', language: 'en', active: true },
    { id: 'm-3', name: 'Global', countries: ['All'], currency: 'ILS', language: 'en', active: true },
];

const DEFAULT_ENABLED_LANGUAGES: StorefrontLanguage[] = [
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', direction: 'rtl', isActive: true, isDefault: true },
  { code: 'en', name: 'English', nativeName: 'English', direction: 'ltr', isActive: true, isDefault: false },
];

const RTL_LANGUAGES = new Set(['ar', 'he', 'fa', 'ur', 'ps', 'sd', 'ku']);

function normalizeLanguageCode(language?: string | null): Language {
  const value = String(language || '').trim().toLowerCase();
  return value.split('-')[0] || 'ar';
}

function isRtlLanguage(language: Language): boolean {
  return RTL_LANGUAGES.has(normalizeLanguageCode(language));
}

function humanizeTranslationKey(key: string): string {
  const normalized = String(key || '').trim();
  if (!normalized) return '';
  const withSpaces = normalized
    .replace(/[\.\-_]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
  if (!withSpaces) return '';
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
}

/** لغة من المسار (?lang= أو /xx/) تُقبل فقط إن كانت ضمن لغات المتجر المفعّلة؛ وإلا نعود للافتراضي من الإعدادات */
function pickPathLanguageIfEnabled(
  pathRaw: Language | null,
  enabled: StorefrontLanguage[],
): Language | null {
  if (!pathRaw) return null;
  const norm = normalizeLanguageCode(pathRaw);
  const activeCodes = enabled
    .filter((item) => item.isActive !== false)
    .map((item) => normalizeLanguageCode(item.code));
  if (activeCodes.length === 0) return norm;
  return activeCodes.includes(norm) ? norm : null;
}

function resolveRtlFromLanguage(
  activeLanguage: Language,
  availableLanguages: StorefrontLanguage[],
  explicitRtl?: boolean,
): boolean {
  const normalizedActive = normalizeLanguageCode(activeLanguage);
  const langRow = availableLanguages.find(
    (item) => normalizeLanguageCode(item.code) === normalizedActive,
  );
  if (langRow?.direction === 'rtl') return true;
  if (langRow?.direction === 'ltr') return false;
  if (typeof explicitRtl === 'boolean') return explicitRtl;
  return isRtlLanguage(normalizedActive);
}

/**
 * Resolve the visitor's intended locale from the URL. We accept both styles so the storefront
 * stays consistent with `resolveThemeLanguage` in the theme runtime:
 *   1. Path prefix:   `/en/...` or `/ar/...`
 *   2. Query string:  `?lang=en` or `?locale=ar`
 *
 * The URL hint is treated as the source of truth and beats the store's default language; when
 * the merchant has saved overrides for that locale they MUST appear, even if the language isn't
 * (yet) marked active in the store config.
 */
function getInitialPathLanguage(): Language | null {
  if (typeof window === 'undefined') return null;
  const firstSegment = window.location.pathname.split('/').filter(Boolean)[0];
  if (firstSegment && /^[a-z]{2}(-[a-z]{2})?$/i.test(firstSegment)) {
    return normalizeLanguageCode(firstSegment);
  }
  try {
    const params = new URLSearchParams(window.location.search);
    const query = params.get('lang') || params.get('locale');
    if (query && /^[a-z]{2}(-[a-z]{2})?$/i.test(query)) {
      return normalizeLanguageCode(query);
    }
  } catch {
    /* malformed URL — fall through to caller default */
  }
  return null;
}

const DEFAULT_PAYMENT_METHODS: PaymentMethod[] = [
    { id: 'cod', name: 'الدفع عند الاستلام', description: 'Pay when you receive', icon: '💵', active: true },
];

const DEFAULT_LOAD_STATUS: StoreLoadStatus = {
  productsFailed: false,
  categoriesFailed: false,
  themeFailed: false,
  menusFailed: false,
};

/** يبقى عبر إعادة الـ mount حتى لا نستبدل الثيم عند التشغيل الثاني */
let storefrontHasLoadedPublicOnce = false;
/** يمنع تشغيل first-load مرتين في نفس الوقت (race condition عند تغيُّر isAuthenticated أثناء التحميل) */
let storefrontFirstLoadInProgress = false;
/** كاش للثيم والبيانات العامة — عند إعادة mount الـ Provider نستعيدها فلا يختفي القالب */
let storefrontThemeCache: ThemeConfig | null = null;
let storefrontProductsCache: Product[] | null = null;
let storefrontCategoriesCache: Category[] | null = null;
let storefrontStoreConfigCache: StoreConfig | null = null;
/** كاش تزامني لـ uploadedThemeConfig و themeLangConfig و themeHtml — يُملأ من sessionStorage عند أول رسم */
let storefrontUploadedThemeConfigCache: import('../types').ThemeInstanceConfig | null = null;
let storefrontThemeLangConfigCache: { language: string; settings: Record<string, unknown>; sections: Record<string, Record<string, unknown>> } | null = null;
let storefrontThemeHtmlCache: string | null = null;
let storefrontAppsCache: StorefrontApp[] = [];

const BOOTSTRAP_CACHE_KEY_SYNC = 'storify_bootstrap_';
const BOOTSTRAP_CACHE_TTL_MS_SYNC = 5 * 60 * 1000;

function getLocaleCacheKeyPart(): string {
  if (typeof window === 'undefined') return 'default';
  const firstSegment = window.location.pathname.split('/').filter(Boolean)[0];
  if (!firstSegment || !/^[a-z]{2}(-[a-z]{2})?$/i.test(firstSegment)) return 'default';
  return normalizeLanguageCode(firstSegment);
}

type BootstrapValueSync = {
  theme?: ThemeConfig;
  storeConfig?: StoreConfig;
  uploadedThemeConfig?: ThemeInstanceConfig | null;
  themeLangConfig?: { language: string; settings: Record<string, unknown>; sections: Record<string, Record<string, unknown>> } | null;
  themeHtml?: string | null;
  storefrontApps?: StorefrontApp[];
} | null;

function applyBootstrapSyncPayload(parsed: BootstrapValueSync): void {
  if (!parsed?.theme) return;
  storefrontThemeCache = parsed.theme;
  storefrontStoreConfigCache = parsed.storeConfig ?? storefrontStoreConfigCache;
  storefrontUploadedThemeConfigCache = parsed.uploadedThemeConfig ?? null;
  storefrontThemeLangConfigCache = parsed.themeLangConfig ?? null;
  storefrontThemeHtmlCache = parsed.themeHtml ?? null;
  storefrontAppsCache = Array.isArray(parsed.storefrontApps) ? parsed.storefrontApps : [];
}

/** True when we can paint an uploaded theme without waiting on StoreContext loading. */
export function isStorefrontBootstrapReadyForPaint(): boolean {
  if (storefrontThemeCache == null) return false;
  const uploadedId = (storefrontThemeCache as ThemeConfig & { uploadedThemeId?: string | null }).uploadedThemeId;
  if (!uploadedId) return true;
  return Boolean(storefrontThemeHtmlCache?.trim());
}

/** قراءة تزامنية من الكاش أو __BOOTSTRAP__ حتى أول رسم يعرض القالب مباشرة دون وميض التصميم الافتراضي.
 *  لا نضع storefrontHasLoadedPublicOnce = true هنا حتى يبقى isFirstLoad = true في الـ effect فيُجلب المنتجات والتصنيفات.
 *  نقرأ أيضاً uploadedThemeConfig / themeLangConfig / themeHtml حتى يُعدّ أول payload للثيم المباشر بالكامل. */
function initBootstrapSync(): void {
  if (typeof window === 'undefined') return;
  if (storefrontThemeCache != null) return;
  try {
    const storeId = getStoreId() || 'default';
    const localePart = getLocaleCacheKeyPart();
    const raw = sessionStorage.getItem(`${BOOTSTRAP_CACHE_KEY_SYNC}${storeId}_${localePart}`);
    if (raw) {
      const parsed = JSON.parse(raw) as {
        theme?: ThemeConfig;
        storeConfig?: StoreConfig;
        uploadedThemeConfig?: import('../types').ThemeInstanceConfig | null;
        themeLangConfig?: { language: string; settings: Record<string, unknown>; sections: Record<string, Record<string, unknown>> } | null;
        themeHtml?: string | null;
        storefrontApps?: StorefrontApp[];
        _ts?: number;
      };
      if (parsed?.theme && (parsed._ts ?? 0) && Date.now() - (parsed._ts ?? 0) <= BOOTSTRAP_CACHE_TTL_MS_SYNC) {
        applyBootstrapSyncPayload(parsed);
        // استرجاع المنتجات والتصنيفات المخزنة لتسريع أول رسم عند التحديث
        if (storefrontProductsCache == null) {
          try {
            const rawP = sessionStorage.getItem(`storify_products_${storeId}_${localePart}`);
            if (rawP) {
              const { data, _ts: pts } = JSON.parse(rawP);
              if (Array.isArray(data) && Date.now() - (pts ?? 0) <= BOOTSTRAP_CACHE_TTL_MS_SYNC) {
                storefrontProductsCache = data;
              }
            }
          } catch (_) {}
        }
        if (storefrontCategoriesCache == null) {
          try {
            const rawC = sessionStorage.getItem(`storify_categories_${storeId}_${localePart}`);
            if (rawC) {
              const { data, _ts: cts } = JSON.parse(rawC);
              if (Array.isArray(data) && Date.now() - (cts ?? 0) <= BOOTSTRAP_CACHE_TTL_MS_SYNC) {
                storefrontCategoriesCache = data;
              }
            }
          } catch (_) {}
        }
        return;
      }
    }
    const inj = (window as Window & { __BOOTSTRAP__?: BootstrapValueSync }).__BOOTSTRAP__;
    if (inj?.theme) {
      applyBootstrapSyncPayload(inj);
    }
  } catch (_) {}
}

function getInitialLoading(): boolean {
  initBootstrapSync();
  return !isStorefrontBootstrapReadyForPaint();
}

function getInitialTheme(): ThemeConfig {
  return storefrontThemeCache ?? DEFAULT_THEME;
}
function getInitialProducts(): Product[] {
  return storefrontProductsCache ?? [];
}
function getInitialCategories(): Category[] {
  return storefrontCategoriesCache ?? [];
}
const DEFAULT_STORE_CONFIG: StoreConfig = {
  name: 'Storify Store',
  email: 'admin@storify.ai',
  phone: '+1 234 567 890',
  address: '123 Commerce St, Tech City',
  logo: undefined,
  favicon: undefined,
  storefrontUrl: undefined,
  currency: 'ILS',
  language: 'ar',
  defaultLanguage: 'ar',
  baseLocale: 'ar',
  activeLanguage: 'ar',
  enabledLanguages: DEFAULT_ENABLED_LANGUAGES,
  rtl: true,
  markets: DEFAULT_MARKETS,
  checkoutFields: DEFAULT_CHECKOUT_FIELDS,
  tax: { enabled: true, rate: 15, pricesIncludeTax: false },
  shipping: {
    freeShippingThreshold: 200,
    methods: [
      { id: 's-1', name: 'Standard Shipping', description: 'Budget friendly delivery', price: 10, estimatedDays: '3-5 days', active: true, marketId: 'm-1' },
      { id: 's-2', name: 'Express Delivery', description: 'Get it faster', price: 25, estimatedDays: '1-2 days', active: true, marketId: 'm-2' },
      { id: 's-3', name: 'Local Store Pickup', description: 'Collect at your convenience', price: 0, estimatedDays: 'Ready in 2h', active: true, marketId: 'm-1' }
    ],
  },
  payment: { methods: DEFAULT_PAYMENT_METHODS },
  policies: { returnExchange: '', privacy: '', terms: '', shipping: '' },
};

function getInitialStoreConfig(): StoreConfig {
  return storefrontStoreConfigCache ?? DEFAULT_STORE_CONFIG;
}

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [products, setProducts] = useState<Product[]>(() => {
    initBootstrapSync();
    return getInitialProducts();
  });
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [theme, setTheme] = useState<ThemeConfig>(getInitialTheme);
  const [headerMenu, setHeaderMenu] = useState<MenuDisplay | null>(null);
  const [footerMenus, setFooterMenus] = useState<(MenuDisplay | null)[]>([null, null, null]);
  const [categories, setCategories] = useState<Category[]>(getInitialCategories);
  const [storeConfig, setStoreConfig] = useState<StoreConfig>(getInitialStoreConfig);
  /** من الـ bootstrap أو طلب StoreFront — يلغي طلبات config/lang المنفصلة للثيم المرفوع */
  const [uploadedThemeConfig, setUploadedThemeConfigState] = useState<ThemeInstanceConfig | null>(
    () => storefrontUploadedThemeConfigCache,
  );
  const [themeLangConfig, setThemeLangConfigState] = useState<{ language: string; settings: Record<string, unknown>; sections: Record<string, Record<string, unknown>> } | null>(
    () => storefrontThemeLangConfigCache,
  );
  const [themeHtml, setThemeHtmlState] = useState<string | null>(
    () => storefrontThemeHtmlCache,
  );
  const [storefrontApps, setStorefrontApps] = useState<StorefrontApp[]>(() => storefrontAppsCache);
  const setUploadedThemeData = useCallback((config: ThemeInstanceConfig | null, lang: { language: string; settings: Record<string, unknown>; sections: Record<string, Record<string, unknown>> } | null, html?: string | null) => {
    setUploadedThemeConfigState(config);
    setThemeLangConfigState(lang);
    if (html !== undefined) setThemeHtmlState(html);
  }, []);
  /** لا نطفي loading عند إعادة mount إلا إذا في ثيم جاهز فعلياً بالكاش؛
   *  الاعتماد على hasLoadedOnce وحده كان يسمح بومضة الواجهة الافتراضية قبل وصول bootstrap. */
  const [loading, setLoading] = useState(() => getInitialLoading());
  const [loadStatus, setLoadStatus] = useState<StoreLoadStatus>(DEFAULT_LOAD_STATUS);

  const [wishlist, setWishlist] = useState<Product[]>(() => {
      const saved = localStorage.getItem('wishlist');
      return saved ? JSON.parse(saved) : [];
  });

  const [messages, setMessages] = useState<ContactMessage[]>(() => {
      const saved = localStorage.getItem('messages');
      return saved ? JSON.parse(saved) : [];
  });

  const [currentUser, setCurrentUser] = useState<Customer | null>(() => {
      const saved = localStorage.getItem('currentUser');
      return saved ? JSON.parse(saved) : null;
  });

  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>(() => {
      const saved = localStorage.getItem('subscribers');
      return saved ? JSON.parse(saved) : [];
  });

  const [logs, setLogs] = useState<ActivityLog[]>(() => {
      const saved = localStorage.getItem('logs');
      return saved ? JSON.parse(saved) : [];
  });

  const [cart, setCart] = useState<Product[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem('cart');
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [appliedCoupon, setAppliedCoupon] = useState<Discount | null>(null);
  const [language, setLanguage] = useState<Language>(() => getInitialPathLanguage() || DEFAULT_STORE_CONFIG.language || 'ar');
  const [baseLocale, setBaseLocale] = useState<Language>(DEFAULT_STORE_CONFIG.baseLocale || DEFAULT_STORE_CONFIG.language || 'ar');
  const [enabledLanguages, setEnabledLanguages] = useState<StorefrontLanguage[]>(DEFAULT_STORE_CONFIG.enabledLanguages || DEFAULT_ENABLED_LANGUAGES);
  const [isRtl, setIsRtl] = useState<boolean>(() => isRtlLanguage(getInitialPathLanguage() || DEFAULT_STORE_CONFIG.language || 'ar'));
  const [localizationLoaded, setLocalizationLoaded] = useState(false);
  const [currency, setCurrency] = useState<Currency>('ILS');

  useEffect(() => {
    const lineItems = cart.map((item) => ({
      productId: String(item.id),
      name: item.name,
      price: Number(item.selectedVariant?.price ?? item.price) || 0,
      quantity: item.quantity || 1,
      image: item.selectedVariant?.image || item.image,
      variantTitle: item.selectedVariant?.title,
    }));
    const subtotal = lineItems.reduce((sum, li) => sum + (li.price || 0) * (li.quantity || 1), 0);
    const itemCount = lineItems.reduce((sum, li) => sum + (li.quantity || 1), 0);
    if (cart.length === 0) {
      setAnalyticsHeartbeatStatus('browsing');
      setAnalyticsCartSummary(0, 0);
      return;
    }
    setAnalyticsHeartbeatStatus('cart');
    setAnalyticsCartSummary(subtotal, itemCount);
    syncCartToAnalytics({
      lineItems,
      subtotal,
      currency,
      status: 'cart',
    });
  }, [cart, currency]);

  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [translationsLoaded, setTranslationsLoaded] = useState(false);

  const applyLocalizationContract = (config: StoreConfig) => {
    const nextBaseLocale = normalizeLanguageCode(config.baseLocale || config.defaultLanguage || config.language || baseLocale);
    /**
     * URL path locale must beat `config.activeLanguage`/`config.language`. The bootstrap response
     * carries the *store default* (e.g. `ar`); blindly applying it would override the customer's
     * `/en/...` choice — that previously caused the storefront to drop to Arabic and fetch the
     * `ar` translation bundle, hiding any saved overrides made in the admin for `en`.
     */
    const nextLanguages = Array.isArray(config.enabledLanguages) && config.enabledLanguages.length > 0
      ? config.enabledLanguages.map((item) => ({
          ...item,
          code: normalizeLanguageCode(item.code),
          direction: item.direction || (isRtlLanguage(item.code) ? 'rtl' : 'ltr'),
        }))
      : DEFAULT_ENABLED_LANGUAGES;
    const pathLanguage = pickPathLanguageIfEnabled(getInitialPathLanguage(), nextLanguages);
    const nextActiveLanguage = normalizeLanguageCode(
      pathLanguage || config.activeLanguage || config.language || language || nextBaseLocale,
    );
    setBaseLocale(nextBaseLocale);
    setEnabledLanguages(nextLanguages);
    setIsRtl(resolveRtlFromLanguage(nextActiveLanguage, nextLanguages, config.rtl));
    setLanguage(nextActiveLanguage);
  };

  // Load translations when language changes
  useEffect(() => {
    const loadTranslations = async () => {
      try {
        const sid = getStoreId() || 'default';
        const cachedKey = `translations_${sid}_${language}`;
        const invalidationKey = `translations_invalidate_${sid}`;
        const cached = localStorage.getItem(cachedKey);

        // Short-lived cache for instant first paint. Admin edits MUST appear quickly,
        // so 5 minutes is the upper bound; the API call below also revalidates.
        const TRANSLATIONS_CACHE_TTL_MS = 5 * 60 * 1000;
        const lastInvalidation = Number(localStorage.getItem(invalidationKey) || '0');

        if (cached) {
          try {
            const cachedData = JSON.parse(cached);
            const fresh =
              Date.now() - cachedData.timestamp < TRANSLATIONS_CACHE_TTL_MS &&
              cachedData.timestamp >= lastInvalidation;
            if (fresh) {
              setTranslations(cachedData.translations);
              setTranslationsLoaded(true);
              // Keep cached text for instant paint, but always revalidate from API
              // so recent admin edits appear without waiting for cache expiry.
            }
          } catch {
            /* corrupt cache entry — ignore and revalidate */
          }
        }

        const [context, response] = await Promise.all([
          translationsApi.getContext(language),
          translationsApi.getByLanguage(language),
        ]);
        if (context) {
          const contextLanguages = (context.enabledLanguages || DEFAULT_ENABLED_LANGUAGES).map((item) => ({
            ...item,
            code: normalizeLanguageCode(item.code),
            direction: item.direction || (isRtlLanguage(item.code) ? 'rtl' : 'ltr'),
          }));
          const contextActiveLanguage = normalizeLanguageCode(context.activeLanguage || language);
          setBaseLocale(normalizeLanguageCode(context.baseLocale));
          setEnabledLanguages(contextLanguages);
          setIsRtl(resolveRtlFromLanguage(contextActiveLanguage, contextLanguages, context.rtl));
          if (context.currency) setCurrency(context.currency);
          /**
           * لا نعتمد لغة المسار إن لم تكن مفعّلة في المتجر (pickPathLanguageIfEnabled).
           * إن لم يبقَ أي تلميح مسار صالح، نعتمد `activeLanguage` من الخادم (غالباً baseLocale).
           */
          const pathLanguage = pickPathLanguageIfEnabled(getInitialPathLanguage(), contextLanguages);
          if (
            !pathLanguage &&
            context.activeLanguage &&
            contextActiveLanguage !== normalizeLanguageCode(language)
          ) {
            setLanguage(contextActiveLanguage);
          }
        }
        setTranslations(response.translations);
        try {
          const sample = response.translations
            ? Object.fromEntries(Object.entries(response.translations).slice(0, 5))
            : null;
          console.info('[storefront] /api/translations loaded', {
            storeId: getStoreId(),
            language,
            count: response.translations ? Object.keys(response.translations).length : 0,
            sample,
          });
        } catch { /* ignore */ }
        if (response.baseLocale) setBaseLocale(normalizeLanguageCode(response.baseLocale));
        const knownLanguages = (context?.enabledLanguages || enabledLanguages || DEFAULT_ENABLED_LANGUAGES).map((item) => ({
          ...item,
          code: normalizeLanguageCode(item.code),
          direction: item.direction || (isRtlLanguage(item.code) ? 'rtl' : 'ltr'),
        }));
        if (response.language) {
          const responseLanguage = normalizeLanguageCode(response.language);
          setIsRtl(resolveRtlFromLanguage(responseLanguage, knownLanguages, response.rtl));
        } else if (typeof response.rtl === 'boolean') {
          setIsRtl(response.rtl);
        }
        const pathOkForResponse = pickPathLanguageIfEnabled(getInitialPathLanguage(), knownLanguages);
        if (
          !pathOkForResponse &&
          response.language &&
          normalizeLanguageCode(response.language) !== normalizeLanguageCode(language)
        ) {
          setLanguage(normalizeLanguageCode(response.language));
        }
        setTranslationsLoaded(true);
        setLocalizationLoaded(true);
        
        // Cache translations
        localStorage.setItem(cachedKey, JSON.stringify({
          translations: response.translations,
          timestamp: Date.now(),
        }));
      } catch (error) {
        console.warn('Failed to load translations from API, using fallback:', error);
        setTranslationsLoaded(true); // Still mark as loaded to use fallback
        setLocalizationLoaded(true);
      }
    };

    loadTranslations();

    // Cross-tab refresh: when the admin saves a translation it writes to the
    // `translations_invalidate_<storeId>` localStorage key (and broadcasts on
    // a same-origin channel). Storefront tabs listening here re-fetch
    // immediately so the merchant sees their edits without a manual reload.
    const sid = getStoreId() || 'default';
    const onStorage = (event: StorageEvent) => {
      if (!event.key) return;
      if (event.key === `translations_invalidate_${sid}`) {
        void loadTranslations();
      }
    };
    window.addEventListener('storage', onStorage);

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(`storify-translations-${sid}`);
      channel.onmessage = (msg) => {
        if (msg?.data?.type === 'invalidate') void loadTranslations();
      };
    } catch {
      /* BroadcastChannel may be unavailable; the storage event covers most cases */
    }
    return () => {
      window.removeEventListener('storage', onStorage);
      try {
        channel?.close();
      } catch {
        /* ignore */
      }
    };
  }, [language]);

  // Load data from API on mount (timeouts so we don't hang if API is down)
  const PUBLIC_LOAD_TIMEOUT_MS = 3_000;   // إن لم يرد الـ API خلال 3 ثوانٍ نعرض الافتراضي (preload في index يقلل الحاجة)
  const ADMIN_LOAD_TIMEOUT_MS = 15_000;   // admin data can be slower (plugins/apps)

  type BootstrapValue = { 
    theme?: ThemeConfig; 
    storeConfig?: StoreConfig; 
    uploadedThemeConfig?: ThemeInstanceConfig | null; 
    themeLangConfig?: { language: string; settings: Record<string, unknown>; sections: Record<string, Record<string, unknown>> } | null;
    themeHtml?: string | null;
    storefrontApps?: StorefrontApp[];
  } | null;

  const BOOTSTRAP_CACHE_KEY = 'storify_bootstrap_';
  const BOOTSTRAP_CACHE_TTL_MS = 5 * 60 * 1000; // 5 دقائق — كاش القالب في المتصفح

  const saveBootstrapToCache = useCallback((storeId: string, data: BootstrapValue) => {
    if (typeof window === 'undefined' || !data || !(data as any).theme) return;
    try {
      const html = (data as any).themeHtml;
      const MAX_HTML_BYTES = 300_000; // لا نخزن HTML كبير في sessionStorage (يتجاوز حدود ~5MB)
      const htmlToStore =
        typeof html === 'string' && html.length <= MAX_HTML_BYTES ? html : null;
      const localePart = getLocaleCacheKeyPart();
      sessionStorage.setItem(
        `${BOOTSTRAP_CACHE_KEY}${storeId}_${localePart}`,
        JSON.stringify({ ...data, themeHtml: htmlToStore, _ts: Date.now() }),
      );
    } catch (_) {}
  }, []);

  const getBootstrapFromCache = useCallback((storeId: string): BootstrapValue | null => {
    if (typeof window === 'undefined' || !storeId) return null;
    try {
      const localePart = getLocaleCacheKeyPart();
      const raw = sessionStorage.getItem(`${BOOTSTRAP_CACHE_KEY}${storeId}_${localePart}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as BootstrapValue & { _ts?: number };
      if (!parsed || !(parsed as any).theme) return null;
      const ts = parsed._ts ?? 0;
      if (Date.now() - ts > BOOTSTRAP_CACHE_TTL_MS) return null;
      const { _ts, ...rest } = parsed;
      return rest as BootstrapValue;
    } catch (_) {
      return null;
    }
  }, []);

  const processBootstrapResult = (bootstrapValue: BootstrapValue) => {
    if (bootstrapValue != null && typeof bootstrapValue === 'object' && bootstrapValue.theme) {
      setLoadStatus((prev) => ({ ...prev, themeFailed: false }));
      storefrontThemeCache = bootstrapValue.theme;
      setTheme(bootstrapValue.theme);
      if (bootstrapValue.storeConfig) {
        const config = bootstrapValue.storeConfig;
        if (!config.payment || !config.payment.methods || config.payment.methods.length === 0) {
          config.payment = { methods: DEFAULT_PAYMENT_METHODS };
        }
        const rawFields = Array.isArray(config.checkoutFields) ? [...config.checkoutFields] : [];
        if (!rawFields.some((f: any) => f.name === 'city')) {
          rawFields.push({ id: 'city', name: 'city', label: 'City', type: 'text', required: true, enabled: true, order: 5 });
        }
        if (!rawFields.some((f: any) => f.name === 'country')) {
          rawFields.push({ id: 'country', name: 'country', label: 'Country', type: 'text', required: true, enabled: true, order: 6 });
        }
        config.checkoutFields = rawFields.sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
        storefrontStoreConfigCache = config;
        setStoreConfig(config);
        if (config.currency) setCurrency(config.currency);
        applyLocalizationContract(config);
      }
      setUploadedThemeConfigState(bootstrapValue.uploadedThemeConfig ?? null);
      setThemeLangConfigState(bootstrapValue.themeLangConfig ?? null);
      setThemeHtmlState(bootstrapValue.themeHtml ?? null);
      storefrontAppsCache = Array.isArray(bootstrapValue.storefrontApps) ? bootstrapValue.storefrontApps : [];
      setStorefrontApps(storefrontAppsCache);
      if (typeof window !== 'undefined') saveBootstrapToCache(getStoreId() || 'default', bootstrapValue);
    } else {
      setLoadStatus((prev) => ({ ...prev, themeFailed: true }));
      storefrontThemeCache = DEFAULT_THEME;
      setTheme(DEFAULT_THEME);
      setUploadedThemeConfigState(null);
      setThemeLangConfigState(null);
      setThemeHtmlState(null);
      storefrontAppsCache = [];
      setStorefrontApps([]);
    }
  };

  const processProductsAndCategories = (results: PromiseSettledResult<unknown>[]) => {
    const productsValue = results[0]?.status === 'fulfilled' ? (results[0] as PromiseFulfilledResult<Product[] | null>).value : null;
    if (productsValue != null && Array.isArray(productsValue)) {
      setLoadStatus((prev) => ({ ...prev, productsFailed: false }));
      storefrontProductsCache = productsValue;
      setProducts(productsValue);
    } else {
      setLoadStatus((prev) => ({ ...prev, productsFailed: true }));
      storefrontProductsCache = INITIAL_PRODUCTS;
      setProducts(INITIAL_PRODUCTS);
    }
    const categoriesValue = results[1]?.status === 'fulfilled' ? (results[1] as PromiseFulfilledResult<Category[] | null>).value : null;
    if (categoriesValue != null && Array.isArray(categoriesValue)) {
      setLoadStatus((prev) => ({ ...prev, categoriesFailed: false }));
      storefrontCategoriesCache = categoriesValue;
      setCategories(categoriesValue);
    } else {
      setLoadStatus((prev) => ({ ...prev, categoriesFailed: true }));
      const uniqueCats = Array.from(new Set(INITIAL_PRODUCTS.map(p => p.category)));
      const value = uniqueCats.map(name => ({
        id: name.toLowerCase(),
        name,
        slug: name.toLowerCase(),
        productCount: INITIAL_PRODUCTS.filter(p => p.category === name).length
      }));
      storefrontCategoriesCache = value;
      setCategories(value);
    }
    // حفظ المنتجات والتصنيفات في sessionStorage لتسريع التحميل عند التحديث
    try {
      const sid = getStoreId() || 'default';
      const localePart = getLocaleCacheKeyPart();
      if (storefrontProductsCache && storefrontProductsCache !== INITIAL_PRODUCTS) {
        const pStr = JSON.stringify({ data: storefrontProductsCache, _ts: Date.now() });
        if (pStr.length <= 3_000_000) sessionStorage.setItem(`storify_products_${sid}_${localePart}`, pStr);
      }
      if (storefrontCategoriesCache) {
        sessionStorage.setItem(`storify_categories_${sid}_${localePart}`, JSON.stringify({ data: storefrontCategoriesCache, _ts: Date.now() }));
      }
    } catch (_) {}
  };

  const processAdminResults = (results: PromiseSettledResult<unknown>[]) => {
    let i = 0;
    const ordersVal = results[i]?.status === 'fulfilled' ? (results[i] as PromiseFulfilledResult<Order[] | null>).value : null;
    setOrders(ordersVal != null && Array.isArray(ordersVal) ? ordersVal : INITIAL_ORDERS);
    i++;
    const customersVal = results[i]?.status === 'fulfilled' ? (results[i] as PromiseFulfilledResult<Customer[] | null>).value : null;
    setCustomers(customersVal != null && Array.isArray(customersVal) ? customersVal : INITIAL_CUSTOMERS);
    i++;
    const discountsVal = results[i]?.status === 'fulfilled' ? (results[i] as PromiseFulfilledResult<Discount[] | null>).value : null;
    setDiscounts(discountsVal != null && Array.isArray(discountsVal) ? discountsVal : INITIAL_DISCOUNTS);
    i++;
    const pluginsVal = results[i]?.status === 'fulfilled' ? (results[i] as PromiseFulfilledResult<Plugin[] | null>).value : null;
    setPlugins(pluginsVal != null && Array.isArray(pluginsVal) ? pluginsVal : INITIAL_PLUGINS);
    i++;
    const messagesVal = results[i]?.status === 'fulfilled' ? (results[i] as PromiseFulfilledResult<ContactMessage[] | null>).value : null;
    if (messagesVal != null && Array.isArray(messagesVal)) setMessages(messagesVal);
    i++;
    const subscribersVal = results[i]?.status === 'fulfilled' ? (results[i] as PromiseFulfilledResult<NewsletterSubscriber[] | null>).value : null;
    if (subscribersVal != null && Array.isArray(subscribersVal)) setSubscribers(subscribersVal);
    i++;
    const logsVal = results[i]?.status === 'fulfilled' ? (results[i] as PromiseFulfilledResult<ActivityLog[] | null>).value : null;
    if (logsVal != null && Array.isArray(logsVal)) setLogs(logsVal);
  };

  /** If the app module loaded before index.html bootstrap fetch finished, apply payload as soon as it lands. */
  useEffect(() => {
    if (!loading) return;
    let cancelled = false;
    const syncLateBootstrap = () => {
      if (cancelled) return;
      initBootstrapSync();
      if (!isStorefrontBootstrapReadyForPaint()) return;
      processBootstrapResult({
        theme: storefrontThemeCache ?? undefined,
        storeConfig: storefrontStoreConfigCache ?? undefined,
        uploadedThemeConfig: storefrontUploadedThemeConfigCache,
        themeLangConfig: storefrontThemeLangConfigCache,
        themeHtml: storefrontThemeHtmlCache,
        storefrontApps: storefrontAppsCache,
      });
      setLoading(false);
    };
    syncLateBootstrap();
    const intervalId = window.setInterval(syncLateBootstrap, 40);
    const stopId = window.setTimeout(() => window.clearInterval(intervalId), 3_000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.clearTimeout(stopId);
    };
  }, [loading]);

  useEffect(() => {
    const loadData = async () => {
      const isFirstLoad = !storefrontHasLoadedPublicOnce;

      // منع تشغيل first-load مرتين في نفس الوقت — يحدث عندما يتغير isAuthenticated
      // أثناء التحميل الأول (مثلاً عند استرجاع بيانات الأدمن من localStorage)
      if (isFirstLoad) {
        if (storefrontFirstLoadInProgress) return;
        storefrontFirstLoadInProgress = true;
      }

      if (isFirstLoad) setLoading(true);

      // عدم طلب بيانات الـ admin عند أول تحميل للستورفرونت — يقلل الطلبات ويمنع طلبات معلقة (مثل plugins) من إطالة Finish
      const adminDataPromises = !isFirstLoad && isAuthenticated ? [
        ordersApi.getAll().catch(() => null),
        customersApi.getAll().catch(() => null),
        discountsApi.getAll().catch(() => null),
        pluginsApi.getAll().catch(() => null),
        messagesApi.getAll().catch(() => null),
        subscribersApi.getAll().catch(() => null),
        activityLogsApi.getAll(100).catch(() => null)
      ] : [];

      try {
        if (isFirstLoad) {
          const currentStoreId = getStoreId() || 'default';

          // كاش القالب: إن وُجد في sessionStorage (خلال 5 دقائق) نستخدمه فوراً ثم نحدّث في الخلفية (stale-while-revalidate)
          const cachedBootstrap = getBootstrapFromCache(currentStoreId);
          if (cachedBootstrap != null && typeof cachedBootstrap === 'object' && (cachedBootstrap as BootstrapValue).theme) {
            // كل الطلبات في نفس الوقت — نطلق products و categories و admin من الآن
            Promise.allSettled([
              productsApi.getAll().catch(() => null),
              categoriesApi.getAll().catch(() => null),
            ]).then((results) => processProductsAndCategories(results as PromiseSettledResult<unknown>[]));
            if (adminDataPromises.length > 0) {
              const adminTimeout = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('ADMIN_TIMEOUT')), ADMIN_LOAD_TIMEOUT_MS)
              );
              Promise.race([Promise.allSettled(adminDataPromises), adminTimeout])
                .then((adminResults) => {
                  if (Array.isArray(adminResults)) processAdminResults(adminResults as PromiseSettledResult<unknown>[]);
                })
                .catch(() => {
                  setOrders(INITIAL_ORDERS);
                  setCustomers(INITIAL_CUSTOMERS);
                  setDiscounts(INITIAL_DISCOUNTS);
                  setPlugins(INITIAL_PLUGINS);
                });
            } else {
              setOrders(INITIAL_ORDERS);
              setCustomers(INITIAL_CUSTOMERS);
              setDiscounts(INITIAL_DISCOUNTS);
              setPlugins(INITIAL_PLUGINS);
            }
            processBootstrapResult(cachedBootstrap as BootstrapValue);
            storefrontHasLoadedPublicOnce = true;
            storefrontFirstLoadInProgress = false;
            setLoading(false);
            bootstrapApi.get().catch(() => null).then((fresh) => {
              if (fresh && (fresh as BootstrapValue).theme) processBootstrapResult(fresh as BootstrapValue);
            });
            return;
          }

          // القالب يحمل مع الصفحة: إن كان الـ Engine حقن window.__BOOTSTRAP__ نستخدمه فوراً بدون طلب شبكة.
          const injectedBootstrap = typeof window !== 'undefined' ? (window as Window & { __BOOTSTRAP__?: BootstrapValue }).__BOOTSTRAP__ : undefined;
          if (injectedBootstrap != null && typeof injectedBootstrap === 'object' && (injectedBootstrap as BootstrapValue).theme) {
            // كل الطلبات في نفس الوقت
            Promise.allSettled([
              productsApi.getAll().catch(() => null),
              categoriesApi.getAll().catch(() => null),
            ]).then((results) => processProductsAndCategories(results as PromiseSettledResult<unknown>[]));
            if (adminDataPromises.length > 0) {
              const adminTimeout = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('ADMIN_TIMEOUT')), ADMIN_LOAD_TIMEOUT_MS)
              );
              Promise.race([Promise.allSettled(adminDataPromises), adminTimeout])
                .then((adminResults) => {
                  if (Array.isArray(adminResults)) processAdminResults(adminResults as PromiseSettledResult<unknown>[]);
                })
                .catch(() => {
                  setOrders(INITIAL_ORDERS);
                  setCustomers(INITIAL_CUSTOMERS);
                  setDiscounts(INITIAL_DISCOUNTS);
                  setPlugins(INITIAL_PLUGINS);
                });
            } else {
              setOrders(INITIAL_ORDERS);
              setCustomers(INITIAL_CUSTOMERS);
              setDiscounts(INITIAL_DISCOUNTS);
              setPlugins(INITIAL_PLUGINS);
            }
            processBootstrapResult(injectedBootstrap as BootstrapValue);
            storefrontHasLoadedPublicOnce = true;
            storefrontFirstLoadInProgress = false;
            setLoading(false);
            return;
          }

          // لا يوجد __BOOTSTRAP__: لا نرسم على shell theme أولاً حتى لا يظهر القالب الافتراضي ثم يتبدل.
          // نحاول أولاً bootstrap الكامل، ونسقط إلى shell فقط كحل أخير عند الفشل/الـ timeout.
          const bootstrapTimeout = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('LOAD_TIMEOUT')), PUBLIC_LOAD_TIMEOUT_MS)
          );
          const shellPromise = Promise.race([
            bootstrapApi.get({ shell: true }).catch(() => null),
            bootstrapTimeout,
          ]) as Promise<BootstrapValue>;
          const fullPromise = bootstrapApi.get().catch(() => null);
          Promise.allSettled([
            productsApi.getAll().catch(() => null),
            categoriesApi.getAll().catch(() => null),
          ]).then((results) => processProductsAndCategories(results as PromiseSettledResult<unknown>[]));
          if (adminDataPromises.length > 0) {
            const adminTimeout = new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('ADMIN_TIMEOUT')), ADMIN_LOAD_TIMEOUT_MS)
            );
            Promise.race([Promise.allSettled(adminDataPromises), adminTimeout])
              .then((adminResults) => {
                if (Array.isArray(adminResults)) processAdminResults(adminResults as PromiseSettledResult<unknown>[]);
              })
              .catch(() => {
                setOrders(INITIAL_ORDERS);
                setCustomers(INITIAL_CUSTOMERS);
                setDiscounts(INITIAL_DISCOUNTS);
                setPlugins(INITIAL_PLUGINS);
              });
          } else {
            setOrders(INITIAL_ORDERS);
            setCustomers(INITIAL_CUSTOMERS);
            setDiscounts(INITIAL_DISCOUNTS);
            setPlugins(INITIAL_PLUGINS);
          }
          let fullResult: BootstrapValue = null;
          try {
            fullResult = await Promise.race([fullPromise, bootstrapTimeout]) as BootstrapValue;
          } catch (_) {
            fullResult = null;
          }

          if (fullResult?.theme) {
            processBootstrapResult(fullResult);
          } else {
            let shellResult: BootstrapValue = null;
            try {
              shellResult = await shellPromise;
            } catch (_) {
              shellResult = null;
            }
            processBootstrapResult(shellResult);
          }
          storefrontHasLoadedPublicOnce = true;
          storefrontFirstLoadInProgress = false;
          setLoading(false);
          return;
        }

        // Not first load: only refresh admin data when auth state changed
        if (adminDataPromises.length === 0) {
          setOrders(INITIAL_ORDERS);
          setCustomers(INITIAL_CUSTOMERS);
          setDiscounts(INITIAL_DISCOUNTS);
          setPlugins(INITIAL_PLUGINS);
          setLoading(false);
          return;
        }
        const adminTimeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('ADMIN_TIMEOUT')), ADMIN_LOAD_TIMEOUT_MS)
        );
        const adminResults = await Promise.race([
          Promise.allSettled(adminDataPromises),
          adminTimeout,
        ]) as PromiseSettledResult<unknown>[];
        processAdminResults(adminResults);
        setLoading(false);
      } catch (error) {
        const isTimeout = error instanceof Error && (error.message === 'LOAD_TIMEOUT' || error.message === 'ADMIN_TIMEOUT');
        if (isTimeout) {
          console.warn('Storefront: API load timed out — using default data. Ensure backend is running and /api is reachable.');
        } else {
          console.error('Error loading data:', error);
        }
        if (isFirstLoad) {
          setLoadStatus((prev) => ({
            ...prev,
            productsFailed: true,
            categoriesFailed: true,
            themeFailed: true,
          }));
          storefrontProductsCache = INITIAL_PRODUCTS;
          storefrontThemeCache = DEFAULT_THEME;
          const uniqueCats = Array.from(new Set(INITIAL_PRODUCTS.map(p => p.category)));
          storefrontCategoriesCache = uniqueCats.map(name => ({
            id: name.toLowerCase(),
            name,
            slug: name.toLowerCase(),
            productCount: INITIAL_PRODUCTS.filter(p => p.category === name).length
          }));
          setProducts(INITIAL_PRODUCTS);
          setOrders(INITIAL_ORDERS);
          setCustomers(INITIAL_CUSTOMERS);
          setDiscounts(INITIAL_DISCOUNTS);
          setPlugins(INITIAL_PLUGINS);
          setTheme(DEFAULT_THEME);
          setCategories(storefrontCategoriesCache);
          storefrontHasLoadedPublicOnce = true;
          storefrontFirstLoadInProgress = false;
        }
        if (isFirstLoad) setLoading(false);
      }
    };

    loadData();
  }, [isAuthenticated]);

  // Re-fetch localized catalog data when storefront language changes.
  // Debounce يقلل التعارض مع أول تحميل (bootstrap) عند فتح مسار مثل `/he/?storeId=…` حيث يصل تحديث اللغة والـ bootstrap تقريباً معاً.
  useEffect(() => {
    const refreshLocalizedCatalog = async () => {
      try {
        const [productsRes, categoriesRes] = await Promise.allSettled([
          productsApi.getAll().catch(() => null),
          categoriesApi.getAll().catch(() => null),
        ]);
        const nextProducts =
          productsRes.status === 'fulfilled' && Array.isArray(productsRes.value) ? productsRes.value : null;
        const nextCategories =
          categoriesRes.status === 'fulfilled' && Array.isArray(categoriesRes.value) ? categoriesRes.value : null;

        if (nextProducts) {
          storefrontProductsCache = nextProducts;
          setProducts(nextProducts);
        }
        if (nextCategories) {
          storefrontCategoriesCache = nextCategories;
          setCategories(nextCategories);
        }
      } catch {
        // keep currently rendered data if language refresh fails
      }
    };

    if (!language) return;
    let cancelled = false;
    const debounceMs = storefrontHasLoadedPublicOnce ? 120 : 450;
    const id = window.setTimeout(() => {
      if (cancelled) return;
      void refreshLocalizedCatalog();
    }, debounceMs);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [language]);

  // Load header + 3 footer menus when theme has menu handles (parallel).
  // Uploaded themes store picks in uploadedThemeSettings (nav_primary, footer_col_*) — not only Theme row columns.
  useEffect(() => {
    const h = resolveHeaderMenuHandleFromTheme(theme);
    const uploaded = theme?.uploadedThemeSettings && typeof theme.uploadedThemeSettings === 'object'
      ? (theme.uploadedThemeSettings as Record<string, unknown>)
      : null;
    const baseFooter = Array.isArray(theme?.footerMenuHandles)
      ? theme.footerMenuHandles.slice(0, 3).map((x: any) => (x && String(x).trim()) || null)
      : (theme?.footerMenuHandle?.trim() ? [theme.footerMenuHandle.trim(), null, null] : [null, null, null]);
    const footerHandles = [
      baseFooter[0] || (uploaded ? extractMenuHandleFromSetting(uploaded.footer_col_1) : null),
      baseFooter[1] || (uploaded ? extractMenuHandleFromSetting(uploaded.footer_col_2) : null),
      baseFooter[2] || (uploaded ? extractMenuHandleFromSetting(uploaded.footer_col_3) : null),
    ] as (string | null)[];
    const hasAny = h || footerHandles.some(Boolean);
    if (!hasAny) {
      setLoadStatus((prev) => ({ ...prev, menusFailed: false }));
      setHeaderMenu(null);
      setFooterMenus([null, null, null]);
      return;
    }
    let cancelled = false;
    const toItem = (i: { id: string; label: string; url: string; openInNewTab?: boolean; depth?: number }) =>
      ({ id: i.id, label: i.label, url: i.url, openInNewTab: i.openInNewTab, depth: i.depth });
    (async () => {
      const headerP = h ? menusApi.getByHandle(h).then((menu) => ({ id: menu.id, title: menu.title, handle: menu.handle, items: menu.items.map(toItem) })).catch(() => null) : Promise.resolve(null);
      const footerPs = footerHandles.map((handle) =>
        handle ? menusApi.getByHandle(handle).then((menu) => ({ id: menu.id, title: menu.title, handle: menu.handle, items: menu.items.map(toItem) })).catch(() => null) : Promise.resolve(null)
      );
      const [headerResult, ...footerResults] = await Promise.all([headerP, ...footerPs]);
      if (!cancelled) {
        const requestedFooterCount = footerHandles.filter(Boolean).length;
        const successfulFooterCount = footerResults.filter(Boolean).length;
        const requestedAnyMenu = Boolean(h) || requestedFooterCount > 0;
        const successfulAnyMenu = Boolean(headerResult) || successfulFooterCount > 0;
        setLoadStatus((prev) => ({ ...prev, menusFailed: requestedAnyMenu && !successfulAnyMenu }));
        setHeaderMenu(headerResult);
        setFooterMenus((prev) => [
          footerResults[0] ?? null,
          footerResults[1] ?? null,
          footerResults[2] ?? prev[2],
        ]);
      }
    })();
    return () => { cancelled = true; };
  }, [
    theme?.headerMenuHandle,
    theme?.footerMenuHandle,
    theme?.footerMenuHandles,
    theme?.uploadedThemeSettings,
  ]);

  const uploadedForFooter =
    theme?.uploadedThemeSettings && typeof theme.uploadedThemeSettings === 'object'
      ? (theme.uploadedThemeSettings as Record<string, unknown>)
      : null;
  const baseFooterOuter = Array.isArray(theme?.footerMenuHandles)
    ? theme.footerMenuHandles.slice(0, 3).map((x: any) => (x && String(x).trim()) || null)
    : (theme?.footerMenuHandle?.trim() ? [theme.footerMenuHandle.trim(), null, null] : [null, null, null]);
  const footerHandles = [
    baseFooterOuter[0] || (uploadedForFooter ? extractMenuHandleFromSetting(uploadedForFooter.footer_col_1) : null),
    baseFooterOuter[1] || (uploadedForFooter ? extractMenuHandleFromSetting(uploadedForFooter.footer_col_2) : null),
    baseFooterOuter[2] || (uploadedForFooter ? extractMenuHandleFromSetting(uploadedForFooter.footer_col_3) : null),
  ] as (string | null)[];

  // When column 3 has no menu handle, build "terms" menu from enabled policies (footer column 3 = قائمة الشروط)
  useEffect(() => {
    if (footerHandles[2] != null) return;
    const policies = storeConfig.policies || {};
    const termsEntries: { slug: string; labelAr: string; labelEn: string; key: string }[] = [
      { slug: 'return-exchange', labelAr: 'سياسة الاستبدال والاسترجاع', labelEn: 'Return & Exchange', key: 'returnExchange' },
      { slug: 'privacy', labelAr: 'سياسة الخصوصية', labelEn: 'Privacy Policy', key: 'privacy' },
      { slug: 'terms', labelAr: 'شروط الخدمة', labelEn: 'Terms of Service', key: 'terms' },
      { slug: 'shipping', labelAr: 'سياسة الشحن والتوصيل', labelEn: 'Shipping & Delivery', key: 'shipping' },
    ];
    const content = (k: string) => (k === 'returnExchange' ? (policies.returnExchange ?? (policies as any).refund ?? '') : ((policies as any)[k] ?? ''));
    const items = termsEntries
      .filter((e) => (content(e.key) || '').trim().length > 0)
      .map((e, i) => ({
        id: `policy-${e.slug}`,
        label: storeConfig.language === 'ar' ? e.labelAr : e.labelEn,
        url: `/policies/${e.slug}`,
        depth: 0,
      }));
    const termsMenu = items.length > 0
      ? { id: 'terms-policies', title: storeConfig.language === 'ar' ? 'الشروط والسياسات' : 'Terms & Policies', handle: 'terms-policies', items }
      : null;
    setFooterMenus((prev) => [prev[0], prev[1], termsMenu]);
  }, [footerHandles[2], storeConfig.policies, storeConfig.language]);

  // Keep localStorage sync for client-side only data (cart & wishlist persist across refresh)
  useEffect(() => localStorage.setItem('cart', JSON.stringify(cart)), [cart]);
  useEffect(() => localStorage.setItem('wishlist', JSON.stringify(wishlist)), [wishlist]);
  useEffect(() => {
      if (currentUser) localStorage.setItem('currentUser', JSON.stringify(currentUser));
      else localStorage.removeItem('currentUser');
  }, [currentUser]);

  const applyCoupon = async (code: string): Promise<{ success: boolean; reason?: string }> => {
    const upper = code.trim().toUpperCase();
    if (!upper) return { success: false, reason: 'EMPTY_CODE' };
    try {
      const lines = cart.map((item) => ({
        price: item.price,
        quantity: item.quantity || 1,
        productId: item.id,
        name: item.name,
      }));
      const preview = await cartDiscountsApi.preview({
        lines,
        couponCode: upper,
        shippingCost: 0,
        customerId: currentUser?.id || null,
      });
      if (preview.ok) {
        const merchandiseSubtotal = Number(preview.merchandiseSubtotal || 0);
        const orderDiscountOnly = Math.max(
          0,
          Number(preview.discountAmount || 0) - Number(preview.shippingDiscount || 0)
        );
        const effectivePct =
          merchandiseSubtotal > 0
            ? (orderDiscountOnly / merchandiseSubtotal) * 100
            : 0;
        setAppliedCoupon({
          id: 'server',
          code: preview.couponCode || upper,
          percentage: effectivePct,
          usageCount: 0,
          status: 'Active',
        });
        return { success: true };
      } else if (!preview.ok) {
        return { success: false, reason: preview.rejectReason || 'INVALID_CODE' };
      }
    } catch (e: any) {
      console.warn('applyCoupon: server preview failed', e);
      return { success: false, reason: 'SERVER_ERROR' };
    }
    return { success: false, reason: 'INVALID_CODE' };
  };

  const removeCoupon = () => setAppliedCoupon(null);

  const addProduct = async (product: Product) => {
    try {
      // Remove fields that shouldn't be sent to API
      const { 
        id, 
        reviews, 
        rating, 
        selectedVariant, 
        quantity,
        ...productData 
      } = product;
      
      // Clean up optional fields - remove undefined/null values
      const cleanProduct: any = {
        name: productData.name,
        description: productData.description || '',
        image: productData.image || '',
        images: productData.images || [],
        category: productData.category || 'Uncategorized',
        status: productData.status || 'Active',
        price: Number(productData.price),
        stock: Number(productData.stock) || 0,
        hasVariants: productData.hasVariants || false,
        options: productData.options || [],
        variants: productData.variants || [],
      };
      
      // Add optional fields only if they have values
      if (productData.compareAtPrice) cleanProduct.compareAtPrice = Number(productData.compareAtPrice);
      if (productData.costPerItem) cleanProduct.costPerItem = Number(productData.costPerItem);
      if (productData.sku) cleanProduct.sku = productData.sku;
      if (productData.barcode) cleanProduct.barcode = productData.barcode;
      if (productData.weight) cleanProduct.weight = Number(productData.weight);
      if (productData.weightUnit) cleanProduct.weightUnit = productData.weightUnit;
      if (productData.seoTitle) cleanProduct.seoTitle = productData.seoTitle;
      if (productData.seoDescription) cleanProduct.seoDescription = productData.seoDescription;
      if (Array.isArray(productData.tags) && productData.tags.length > 0) {
        cleanProduct.tags = productData.tags;
      }
      if (productData.trackQuantity !== undefined) cleanProduct.trackQuantity = productData.trackQuantity;
      
      console.log('Creating product:', cleanProduct);
      const newProduct = await productsApi.create(cleanProduct);
      console.log('Product created successfully:', newProduct);
      setProducts(prev => [...prev, newProduct]);
      try {
        await activityLogsApi.create({ action: 'Add Product', details: `Added product: ${product.name}`, user: 'Admin' });
      } catch (logError) {
        console.warn('Failed to create activity log:', logError);
      }
      updateCategoryCounts();
    } catch (error: any) {
      console.error('Error adding product:', error);
      console.error('Error details:', error.message, error.status);
      // Fallback to local storage
      setProducts(prev => [...prev, product]);
      await addLog('Add Product', `Added product: ${product.name}`);
      updateCategoryCounts();
      throw error; // Re-throw to let caller know it failed
    }
  };
  const updateProduct = async (updatedProduct: Product) => {
    try {
      const product = await productsApi.update(updatedProduct.id, updatedProduct);
      setProducts(prev => prev.map(p => p.id === product.id ? product : p));
      await activityLogsApi.create({ action: 'Update Product', details: `Updated product: ${updatedProduct.name}`, user: 'Admin' });
      updateCategoryCounts();
    } catch (error) {
      console.error('Error updating product:', error);
    setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
    addLog('Update Product', `Updated product: ${updatedProduct.name}`);
    updateCategoryCounts();
    }
  };
  const deleteProduct = async (id: string) => {
    const product = products.find(p => p.id === id);
    try {
      await productsApi.delete(id);
      setProducts(prev => prev.filter(p => p.id !== id));
      if (product) await activityLogsApi.create({ action: 'Delete Product', details: `Deleted product: ${product.name}`, user: 'Admin' });
      updateCategoryCounts();
    } catch (error) {
      console.error('Error deleting product:', error);
    setProducts(prev => prev.filter(p => p.id !== id));
    if (product) addLog('Delete Product', `Deleted product: ${product.name}`);
    updateCategoryCounts();
    }
  };

  const updateCategoryCounts = () => {
      setCategories(prev => prev.map(cat => ({
          ...cat,
          productCount: products.filter(p => p.category === cat.name).length
      })));
  };

  const addCategory = async (name: string, description?: string, image?: string): Promise<Category> => {
      try {
        const newCat = await categoriesApi.create({ name, description, image });
        setCategories(prev => [...prev, newCat]);
        await activityLogsApi.create({ action: 'Add Category', details: `Added category: ${name}`, user: 'Admin' });
        return newCat;
      } catch (error) {
        console.error('Error adding category:', error);
        const newCat: Category = {
            id: name.toLowerCase().replace(/\s/g, '-'),
            name,
            slug: name.toLowerCase().replace(/\s/g, '-'),
            description,
            image,
            productCount: 0
        };
        setCategories(prev => [...prev, newCat]);
        addLog('Add Category', `Added category: ${name}`);
        return newCat;
      }
  };

  const updateCategory = async (id: string, data: { name?: string; description?: string; image?: string }) => {
      try {
        const updatedCat = await categoriesApi.update(id, data);
        setCategories(prev => prev.map(cat => cat.id === id ? updatedCat : cat));
        await activityLogsApi.create({ action: 'Update Category', details: `Updated category: ${data.name || id}`, user: 'Admin' });
        return updatedCat;
      } catch (error) {
        console.error('Error updating category:', error);
        throw error;
      }
  };

  const deleteCategory = async (id: string) => {
      try {
        await categoriesApi.delete(id);
        setCategories(prev => prev.filter(c => c.id !== id));
        await activityLogsApi.create({ action: 'Delete Category', details: `Deleted category ID: ${id}`, user: 'Admin' });
      } catch (error) {
        console.error('Error deleting category:', error);
      setCategories(prev => prev.filter(c => c.id !== id));
      addLog('Delete Category', `Deleted category ID: ${id}`);
      }
  };

  const addOrder = async (order: Order | Omit<Order, 'id'>): Promise<Order | null> => {
      try {
        const existingId = (order as Order).id;
        const hasPersistedId = typeof existingId === 'string' && existingId.trim() !== '';

        // Check if order already has an ID (already created in DB)
        if (hasPersistedId) {
          // Order already exists, just add to local state
          const orderWithHistory: Order = {
            ...(order as Order),
            history: order.history || [{ status: order.status || 'Pending', date: new Date().toISOString().split('T')[0] }]
          };
          setOrders(prev => [orderWithHistory, ...prev]);
          await activityLogsApi.create({ action: 'New Order', details: `Order #${existingId} placed by ${order.customerName}`, user: 'Admin' });
          return orderWithHistory as Order;
        } else {
          // Order doesn't have ID, create it
          const { id: _ignored, ...orderPayload } = order as Order;
          const apiResult = await ordersApi.create(orderPayload as Order);
          if (apiResult && typeof apiResult === 'object' && 'redirectUrl' in apiResult && !('order' in apiResult)) {
            return apiResult;
          }
          // Stripe: قد يرجع السيرفر { clientSecret, paymentIntentId } فقط دون إنشاء الطلب؛ لا نضيفه إلى الطلبات.
          if (apiResult && typeof apiResult === 'object' && 'clientSecret' in apiResult && !('order' in apiResult)) {
            return apiResult;
          }
          const orderFromApi = apiResult && typeof apiResult === 'object' && 'order' in apiResult ? (apiResult as { order: Order }).order : apiResult as Order;
          const orderWithHistory = {
            ...orderFromApi,
            history: orderFromApi.history || [{ status: 'Pending', date: new Date().toLocaleString() }]
          };
          setOrders(prev => [orderWithHistory, ...prev]);
          try {
            await activityLogsApi.create({ action: 'New Order', details: `Order #${orderFromApi.id} placed by ${orderFromApi.customerName}`, user: 'Admin' });
          } catch (_) {
            // Storefront checkout has no auth; activity log is admin-only, ignore failure
          }
          return apiResult;
        }
      } catch (error) {
        console.error('Error adding order:', error);
        const fallbackId = (order as Order).id?.trim() || `temp-${Date.now()}`;
        const orderWithHistory = {
          ...order,
          id: fallbackId,
          history: order.history || [{ status: 'Pending', date: new Date().toLocaleString() }]
        } as Order;
        setOrders(prev => [orderWithHistory, ...prev]);
        addLog('New Order', `Order #${fallbackId} placed by ${order.customerName}`);
        return orderWithHistory;
      }
  };

  const updateOrder = async (updatedOrder: Order) => {
    try {
      const order = await ordersApi.update(updatedOrder.id, updatedOrder);
      const statusChanged = orders.find(o => o.id === updatedOrder.id)?.status !== updatedOrder.status;
      const orderWithHistory = statusChanged 
          ? { ...order, history: [...(order.history || []), { status: order.status, date: new Date().toLocaleString() }] }
          : order;
      setOrders(prev => prev.map(o => o.id === order.id ? orderWithHistory : o));
      await activityLogsApi.create({ action: 'Update Order', details: `Order #${updatedOrder.id} status: ${updatedOrder.status}`, user: 'Admin' });
    } catch (error) {
      console.error('Error updating order:', error);
    setOrders(prev => prev.map(o => {
        if(o.id === updatedOrder.id) {
            const statusChanged = o.status !== updatedOrder.status;
            const history = statusChanged 
                ? [...(updatedOrder.history || []), { status: updatedOrder.status, date: new Date().toLocaleString() }]
                : updatedOrder.history;
            return { ...updatedOrder, history };
        }
        return o;
    }));
    addLog('Update Order', `Order #${updatedOrder.id} status: ${updatedOrder.status}`);
    }
  };

  const deleteOrder = async (id: string) => {
      try {
        await ordersApi.delete(id);
        setOrders(prev => prev.filter(o => o.id !== id));
        await activityLogsApi.create({ action: 'Delete Order', details: `Order #${id} deleted`, user: 'Admin' });
      } catch (error) {
        console.error('Error deleting order:', error);
      setOrders(prev => prev.filter(o => o.id !== id));
      addLog('Delete Order', `Order #${id} deleted`);
      }
  };

  const addDiscount = async (discount: Discount) => {
    try {
      const newDiscount = await discountsApi.create(discount);
      setDiscounts(prev => [...prev, newDiscount]);
    } catch (error) {
      console.error('Error adding discount:', error);
      setDiscounts(prev => [...prev, discount]);
    }
  };
  const deleteDiscount = async (id: string) => {
    try {
      await discountsApi.delete(id);
      setDiscounts(prev => prev.filter(d => d.id !== id));
    } catch (error) {
      console.error('Error deleting discount:', error);
      setDiscounts(prev => prev.filter(d => d.id !== id));
    }
  };

  const togglePlugin = async (id: string) => {
    const plugin = plugins.find(p => p.id === id);
    if (!plugin) return;
    
    const newInstalled = !plugin.installed;
    
    // Update local state immediately for better UX
    setPlugins(prev => prev.map(p => p.id === id ? { ...p, installed: newInstalled } : p));
    
    try {
      // Check if this is an app from the new system (has appId format)
      // Apps from new system have IDs like "chat-app" (from appId)
      // Old plugins have IDs like "p-1"
      const isApp = !id.startsWith('p-');
      
      if (isApp) {
        // This is an app from the new system
        // Find the app by appId
        const allApps = await appsApi.getAll();
        const app = allApps.find((a: any) => (a.appId || a.id) === id);
        
        if (app) {
          if (newInstalled) {
            // Always use install to ensure migrations run
            // Find the app by appId (could be available, installed, or inactive)
            const appToInstall = allApps.find((a: any) => 
              (a.appId || a.id) === id
            );
            
            if (appToInstall) {
              // Always call install - it will handle migrations and activation
              await appsApi.install(appToInstall.id, 'default');
            } else {
              console.error(`[StoreContext] App ${id} not found in allApps`);
            }
          } else {
            // Uninstall the app - find installed instance
            const installedApp = allApps.find((a: any) => 
              (a.appId || a.id) === id && 
              (a.status === 'installed' || a.status === 'active')
            );
            
            if (installedApp) {
              await appsApi.uninstall(installedApp.id);
            }
          }
          
          // Reload plugins to get updated status
          const updatedPlugins = await pluginsApi.getAll();
          setPlugins(updatedPlugins);
        }
      } else {
        // This is an old plugin, use old API
        await pluginsApi.update(id, { installed: newInstalled });
      }
    } catch (error) {
      console.error('Error toggling plugin:', error);
      // Revert state on error
      setPlugins(prev => prev.map(p => p.id === id ? { ...p, installed: !newInstalled } : p));
      alert(newInstalled ? 'فشل تثبيت التطبيق' : 'فشل إلغاء تثبيت التطبيق');
    }
  };

  const configurePlugin = (id: string, settings: Record<string, string>) => {
    setPlugins(prev => prev.map(p => p.id === id ? { ...p, settings } : p));
  };

  const updateTheme = async (newTheme: ThemeConfig) => {
    try {
      const updatedTheme = await themeApi.update(newTheme);
      setTheme(updatedTheme);
      await activityLogsApi.create({ action: 'Update Theme', details: `Theme settings updated`, user: 'Admin' });
    } catch (error) {
      console.error('Error updating theme:', error);
    setTheme(newTheme);
    addLog('Update Theme', `Theme settings updated`);
    }
  };

  /** Re-fetch theme + storeConfig + uploaded theme config/lang (bootstrap) so القالب لا يختفي — طلب واحد بدل theme ثم config ثم lang. */
  const refreshTheme = useCallback(async () => {
    const previousTheme = storefrontThemeCache;
    try {
      storefrontThemeCache = null;
      const boot = await bootstrapApi.get().catch(() => null);
      if (boot != null && boot.theme) {
        storefrontThemeCache = boot.theme;
        setTheme(boot.theme);
        if (boot.storeConfig) {
          const c = boot.storeConfig;
          if (!c.payment?.methods?.length) c.payment = { methods: DEFAULT_PAYMENT_METHODS };
          const raw = Array.isArray(c.checkoutFields) ? [...c.checkoutFields] : [];
          if (!raw.some((f: any) => f.name === 'city')) raw.push({ id: 'city', name: 'city', label: 'City', type: 'text', required: true, enabled: true, order: 5 });
          if (!raw.some((f: any) => f.name === 'country')) raw.push({ id: 'country', name: 'country', label: 'Country', type: 'text', required: true, enabled: true, order: 6 });
          c.checkoutFields = raw.sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
          storefrontStoreConfigCache = c;
          setStoreConfig(c);
          if (c.currency) setCurrency(c.currency);
          applyLocalizationContract(c);
        }
        setUploadedThemeConfigState(boot.uploadedThemeConfig ?? null);
        setThemeLangConfigState(boot.themeLangConfig ?? null);
      } else {
        const data = await themeApi.get().catch(() => null);
        if (data) {
          storefrontThemeCache = data;
          setTheme(data);
        }
        setUploadedThemeConfigState(null);
        setThemeLangConfigState(null);
      }
    } catch (e) {
      console.warn('refreshTheme failed:', e);
      const keep = previousTheme && (previousTheme as ThemeConfig & { uploadedThemeId?: string | null }).uploadedThemeId;
      if (keep) {
        storefrontThemeCache = previousTheme;
        setTheme(previousTheme);
      } else {
        storefrontThemeCache = DEFAULT_THEME;
        setTheme(DEFAULT_THEME);
        setUploadedThemeConfigState(null);
        setThemeLangConfigState(null);
      }
    }
  }, []);
  const updateStoreConfig = async (config: StoreConfig): Promise<StoreConfig> => {
      try {
        console.log('StoreContext: Updating store config via API...');
        const updatedConfig = await storeConfigApi.update(config);
        console.log('StoreContext: Received updated config from API:', updatedConfig);
        
        setStoreConfig(updatedConfig);
        // Update currency and language if they were changed
        if (updatedConfig.currency) setCurrency(updatedConfig.currency);
        applyLocalizationContract(updatedConfig);
        
        // Invalidate storefront cache when admin updates config
        try {
          const { invalidateStoreConfigCache } = await import('../lib/useStoreConfig');
          invalidateStoreConfigCache();
        } catch (e) {
          // Ignore if module not available
        }
        
        await activityLogsApi.create({ action: 'Update Settings', details: `General settings updated`, user: 'Admin' });
        return updatedConfig;
      } catch (error) {
        console.error('Error updating store config:', error);
        // Don't update local state on error - let the error propagate
        throw error;
      }
  };

  const getCartKey = (productId: string, variantId?: string) => `${productId}:${variantId || 'base'}`;

  const addToCart = (product: Product, quantity: number = 1) => {
    const variantId = product.selectedVariant?.id;
    const key = getCartKey(product.id, variantId);
    const unit = product.selectedVariant?.price ?? product.price;
    const value =
      typeof unit === 'number' && Number.isFinite(unit) ? unit : Number(unit) || 0;
    trackEvent('add_to_cart', {
      productId: String(product.id ?? ''),
      name: product.name,
      value,
      currency,
      quantity,
    });
    setCart(prev => {
      const existing = prev.find(p => getCartKey(p.id, p.selectedVariant?.id) === key);
      if (existing) {
        return prev.map(p =>
          getCartKey(p.id, p.selectedVariant?.id) === key
            ? { ...p, quantity: (p.quantity || 1) + quantity }
            : p
        );
      }
      return [...prev, { ...product, quantity }];
    });
  };

  const removeFromCart = (productId: string, variantId?: string) => {
    const key = getCartKey(productId, variantId);
    setCart(prev => prev.filter(p => getCartKey(p.id, p.selectedVariant?.id) !== key));
  };

  const updateQuantity = (productId: string, quantity: number, variantId?: string) => {
    if (quantity <= 0) {
      removeFromCart(productId, variantId);
      return;
    }
    const key = getCartKey(productId, variantId);
    setCart(prev =>
      prev.map(p =>
        getCartKey(p.id, p.selectedVariant?.id) === key ? { ...p, quantity } : p
      )
    );
  };
  const clearCart = useCallback(() => {
    setCart([]);
    setAppliedCoupon(null);
  }, []);

  const toggleWishlist = (product: Product) => {
      setWishlist(prev => {
          const exists = prev.find(p => p.id === product.id);
          if (exists) return prev.filter(p => p.id !== product.id);
          const rawPrice = (product as Product & { selectedVariant?: { price?: unknown } }).selectedVariant?.price ?? product.price;
          const value =
            typeof rawPrice === 'number' && Number.isFinite(rawPrice) ? rawPrice : Number(rawPrice) || 0;
          trackEvent('add_to_wishlist', {
            productId: String(product.id ?? ''),
            name: product.name,
            value,
            currency,
            quantity: 1,
          });
          return [...prev, product];
      });
  };

  const addReview = async (productId: string, review: Omit<Review, 'id' | 'date' | 'status'>) => {
      try {
        const newReview = await reviewsApi.create({ ...review, productId });
        setProducts(prev => prev.map(p => {
            if (p.id === productId) {
                return { ...p, reviews: [...(p.reviews || []), newReview] };
            }
            return p;
        }));
      } catch (error) {
        console.error('Error adding review:', error);
      const newReview: Review = {
          ...review,
          id: Date.now().toString(),
          date: new Date().toISOString().split('T')[0],
          status: 'Pending'
      };
      setProducts(prev => prev.map(p => {
          if (p.id === productId) {
              return { ...p, reviews: [...(p.reviews || []), newReview] };
          }
          return p;
      }));
      }
  };

  const updateReviewStatus = async (productId: string, reviewId: string, status: Review['status']) => {
      try {
        await reviewsApi.updateStatus(reviewId, status);
        setProducts(prev => prev.map(p => {
            if (p.id === productId) {
                const updatedReviews = (p.reviews || []).map(r => r.id === reviewId ? { ...r, status } : r);
                const approvedReviews = updatedReviews.filter(r => r.status === 'Approved');
                const avgRating = approvedReviews.length > 0 
                  ? approvedReviews.reduce((acc, r) => acc + r.rating, 0) / approvedReviews.length 
                  : p.rating;
                return { ...p, reviews: updatedReviews, rating: avgRating };
            }
            return p;
        }));
      } catch (error) {
        console.error('Error updating review status:', error);
      setProducts(prev => prev.map(p => {
          if (p.id === productId) {
              const updatedReviews = (p.reviews || []).map(r => r.id === reviewId ? { ...r, status } : r);
              const approvedReviews = updatedReviews.filter(r => r.status === 'Approved');
              const avgRating = approvedReviews.length > 0 
                ? approvedReviews.reduce((acc, r) => acc + r.rating, 0) / approvedReviews.length 
                : p.rating;
              return { ...p, reviews: updatedReviews, rating: avgRating };
          }
          return p;
      }));
      }
  };

  const addMessage = async (msg: Omit<ContactMessage, 'id' | 'date' | 'read'>) => {
      try {
        const newMessage = await messagesApi.create(msg);
        setMessages(prev => [newMessage, ...prev]);
      } catch (error) {
        console.error('Error adding message:', error);
      const newMessage: ContactMessage = {
          ...msg,
          id: Date.now().toString(),
          date: new Date().toISOString().split('T')[0],
          read: false
      };
      setMessages(prev => [newMessage, ...prev]);
      }
  };

  const markMessageRead = async (id: string) => {
      try {
        await messagesApi.markRead(id);
        setMessages(prev => prev.map(m => m.id === id ? { ...m, read: true } : m));
      } catch (error) {
        console.error('Error marking message as read:', error);
      setMessages(prev => prev.map(m => m.id === id ? { ...m, read: true } : m));
      }
  };

  const addSubscriber = async (email: string) => {
      if (!subscribers.find(s => s.email.toLowerCase() === email.trim().toLowerCase())) {
          try {
            const newSubscriber = await subscribersApi.subscribePublic(email);
            setSubscribers(prev => [newSubscriber, ...prev]);
            return newSubscriber;
          } catch (error) {
            console.error('Error adding subscriber:', error);
            throw error;
          }
      }
  };

  const addLog = async (action: string, details: string) => {
      const newLog: ActivityLog = {
          id: Date.now().toString(),
          action,
          details,
          user: 'Admin',
          date: new Date().toLocaleString()
      };
      setLogs(prev => [newLog, ...prev].slice(0, 100));
      try {
        await activityLogsApi.create({ action, details, user: 'Admin' });
      } catch (error) {
        console.error('Error saving log:', error);
      }
  };

  const login = async (name: string, email: string) => {
      const existing = customers.find(c => c.email.toLowerCase() === email.toLowerCase());
      if(existing) {
        setCurrentUser(existing);
      } else {
          try {
            const newCustomer = await customersApi.create({ name, email, status: 'Active' });
            setCurrentUser(newCustomer);
            setCustomers(prev => [...prev, newCustomer]);
          } catch (error) {
            console.error('Error creating customer:', error);
          const newCustomer: Customer = {
              id: `c-${Date.now()}`, name, email,
              totalSpent: 0, ordersCount: 0,
              lastOrder: '-', status: 'Active'
          };
          setCurrentUser(newCustomer);
          setCustomers(prev => [...prev, newCustomer]);
          }
      }
  };

  const logout = () => setCurrentUser(null);

  const t = (key: string): string => {
    const normalizedKey = String(key || '').trim();
    if (!normalizedKey) return '';
    // Try API translations first (allow empty string; only skip if key is absent)
    if (translationsLoaded && Object.prototype.hasOwnProperty.call(translations, normalizedKey)) {
      return translations[normalizedKey];
    }
    
    // Fallback to constants
    // @ts-ignore
    if (TRANSLATIONS[language] && TRANSLATIONS[language][normalizedKey]) {
      // @ts-ignore
      return TRANSLATIONS[language][normalizedKey];
    }

    // Try base locale before readable fallback
    // @ts-ignore
    if (TRANSLATIONS[baseLocale] && TRANSLATIONS[baseLocale][normalizedKey]) {
      // @ts-ignore
      return TRANSLATIONS[baseLocale][normalizedKey];
    }

    // Never leak raw keys to storefront users.
    return humanizeTranslationKey(normalizedKey) || 'Translation unavailable';
  };

  const formatPrice = (price: number): string => {
    const display =
      storeConfig?.currencyFormat && typeof storeConfig.currencyFormat === 'object'
        ? storeConfig.currencyFormat
        : null;
    return formatCurrency(price, currency, language || baseLocale, display);
  };

  // لا نعرض شاشة «جاري تحميل الثيم» — نعرض المحتوى مباشرة (كاش أو افتراضي حتى اكتمال التحميل)
  return (
    <StoreContext.Provider value={{
      products, addProduct, updateProduct, deleteProduct,
      orders, addOrder, updateOrder, deleteOrder,
      customers, discounts, addDiscount, deleteDiscount,
      plugins, togglePlugin, configurePlugin,
      theme, updateTheme, refreshTheme,
      loading,
      loadStatus,
      uploadedThemeConfig, themeLangConfig, themeHtml, storefrontApps, setUploadedThemeData,
      headerMenu, footerMenus,
      categories, addCategory, updateCategory, deleteCategory,
      cart, addToCart, removeFromCart, updateQuantity, clearCart,
      appliedCoupon, applyCoupon, removeCoupon,
      language, setLanguage,
      baseLocale, enabledLanguages, isRtl, localizationLoaded,
      currency, setCurrency,
      t, translations, formatPrice,
      storeConfig, updateStoreConfig,
      wishlist, toggleWishlist,
      addReview, updateReviewStatus,
      messages, addMessage, markMessageRead,
      currentUser, login, logout,
      subscribers, addSubscriber,
      logs, addLog
    }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore must be used within a StoreProvider");
  return context;
};
