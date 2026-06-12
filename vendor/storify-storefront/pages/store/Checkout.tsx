import React, { useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react';
import '../../checkout-tailwind.css';
import { useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { CreditCard, Truck, ChevronLeft, ChevronRight, Shield, Tag, Lock, Home, Check, Smartphone } from '../../components/ui/Icons';
import { PaymentMethodLogos } from '../../components/ui/PaymentMethodLogos';
import { Order, OrderLineItem, ShippingMethod, Market, Country, City, MarketRegion, ShippingZone } from '../../types';
import { marketRegionsApi, cartDiscountsApi, translationsApi } from '../../lib/api';
import { StripePaymentStep, useStripeCheckout } from '../../components/store/StripePayment';
import { ShamCashPaymentStep, useShamCashCheckout } from '../../components/store/ShamCashPayment';
import {
  createTrackingEventId,
  getFacebookBrowserIdentifiers,
  trackEvent,
  type StorefrontTrackingLineItem,
} from '../../lib/apps/trackEvent';
import { sanitizePlainTextInput } from '../../lib/plainTextInput';
import { syncCartToAnalytics } from '../../lib/analytics/cartSync';
import { getSessionId } from '../../lib/analytics/session';
import { setAnalyticsContact, setAnalyticsHeartbeatStatus } from '../../lib/analytics/sessionHeartbeat';

/** Build shipping methods from zones: match by country name (+ city when zone has citiesByCountry) */
function getMethodsFromZones(
  zones: ShippingZone[],
  countryName: string | null,
  subtotal: number,
  marketId: string,
  countryCode?: string | null,
  cityId?: string | null
): ShippingMethod[] {
  if (!zones.length || !countryName) return [];
  const zone = zones.find((z) => {
    if (!z.regions.some((r) => r === countryName)) return false;
    const byCountry = z.citiesByCountry;
    if (!byCountry || !countryCode) return true;
    const cityIds = byCountry[countryCode];
    if (!cityIds || cityIds.length === 0) return true;
    return cityId != null && cityIds.includes(cityId);
  });
  if (!zone?.rates?.length) return [];
  const eligible = zone.rates.filter((rate) => {
    if (rate.type === 'flat') return true;
    if (rate.type === 'price') {
      const minOk = rate.minPrice == null || subtotal >= rate.minPrice;
      const maxOk = rate.maxPrice == null || subtotal <= rate.maxPrice;
      return minOk && maxOk;
    }
    return true;
  });
  return eligible.map((r) => ({
    id: r.id,
    name: r.name,
    description: '',
    price: r.price,
    estimatedDays: '',
    active: true,
    marketId,
  }));
}

/** عند فشل أو غياب API — حد أدنى للعرض (المصدر الحقيقي: الباكند) */
const DEFAULT_COUNTRIES_FALLBACK: Country[] = [
  { id: 'PS', code: 'PS', name: 'Palestine', nameAr: 'فلسطين' },
  { id: 'IL', code: 'IL', name: 'Israel', nameAr: 'إسرائيل' },
  { id: 'JO', code: 'JO', name: 'Jordan', nameAr: 'الأردن' },
  { id: 'EG', code: 'EG', name: 'Egypt', nameAr: 'مصر' },
];

const DEFAULT_CITIES_BY_COUNTRY: Record<string, City[]> = {
  IL: [
    { id: 'jerusalem', name: 'Jerusalem', nameAr: 'القدس' },
    { id: 'tel-aviv', name: 'Tel Aviv', nameAr: 'تل أبيب' },
    { id: 'haifa', name: 'Haifa', nameAr: 'حيفا' },
  ],
  PS: [
    { id: 'ramallah', name: 'Ramallah', nameAr: 'رام الله' },
    { id: 'gaza', name: 'Gaza', nameAr: 'غزة' },
    { id: 'hebron', name: 'Hebron', nameAr: 'الخليل' },
  ],
};

const CHECKOUT_SHIPPING_KEY = 'storify_checkout_shipping';

function getCheckoutStorageKey(): string {
  if (typeof window === 'undefined') return CHECKOUT_SHIPPING_KEY;
  const storeId = (window as Window & { __STORE_CONFIG__?: { id?: string } }).__STORE_CONFIG__?.id;
  return storeId ? `${CHECKOUT_SHIPPING_KEY}_${storeId}` : CHECKOUT_SHIPPING_KEY;
}

function loadSavedShipping(): Record<string, string> | null {
  try {
    const raw = localStorage.getItem(getCheckoutStorageKey());
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return null;
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === 'string') out[k] = v;
    }
    return out;
  } catch {
    return null;
  }
}

function saveShippingToStorage(data: Record<string, string>): void {
  try {
    localStorage.setItem(getCheckoutStorageKey(), JSON.stringify(data));
  } catch (_) { }
}

/** روابط سياسات المتجر الافتراضية — تطابق مسارات `/policies/:slug` في التطبيق */
const CHECKOUT_POLICY_LINKS: { slug: string; labelAr: string; labelEn: string }[] = [
  { slug: 'privacy', labelAr: 'سياسة الخصوصية', labelEn: 'Privacy policy' },
  { slug: 'terms', labelAr: 'شروط الخدمة', labelEn: 'Terms of service' },
  { slug: 'shipping', labelAr: 'الشحن والتوصيل', labelEn: 'Shipping & delivery' },
  { slug: 'return-exchange', labelAr: 'الاستبدال والاسترجاع', labelEn: 'Returns & exchanges' },
];

/** استخراج قيم معيارية من نموذج الدفع حسب نوع الحقل واسمه — لربط البيانات بالأماكن الصحيحة في الطلب */
function getMappedOrderFields(
  checkoutFields: Array<{ name: string; type: string }>,
  form: Record<string, string>
): { customerName: string; email: string; phone?: string } {
  let customerName = form.fullName ?? form.customerName ?? '';
  let email = form.email ?? form.customer_email ?? form.user_email ?? '';
  let phone: string | undefined = form.phone ?? form.mobile ?? form.tel ?? '';

  for (const field of checkoutFields) {
    const value = (form[field.name] ?? '').trim();
    if (!value) continue;
    if (field.type === 'name' || field.name === 'fullName') {
      customerName = value;
      break;
    }
  }
  for (const field of checkoutFields) {
    const value = (form[field.name] ?? '').trim();
    if (!value) continue;
    if (field.type === 'email' || ['email', 'customer_email', 'user_email'].includes(field.name)) {
      email = value;
      break;
    }
  }
  for (const field of checkoutFields) {
    const value = (form[field.name] ?? '').trim();
    if (!value) continue;
    if (field.type === 'tel' || ['phone', 'mobile', 'tel'].includes(field.name)) {
      phone = value;
      break;
    }
  }

  return {
    customerName: customerName || 'Customer',
    email: email || '',
    phone: phone || undefined,
  };
}

const Checkout: React.FC = () => {
  // Fix: added 'language' to the destructuring from useStore to handle RTL and translations.
  const { cart, clearCart, addOrder, t, formatPrice, theme, storeConfig, currentUser, appliedCoupon, applyCoupon, removeCoupon, language } = useStore();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const searchString = searchParams.toString();
  const shopHref = searchString ? `/shop?${searchString}` : '/shop';
  const policyHref = (slug: string) => (searchString ? `/policies/${slug}?${searchString}` : `/policies/${slug}`);
  /** عند التوجيه لصفحة نجاح الطلب لا نريد أن يُعيدنا useEffect (سلة فارغة) إلى /shop */
  const redirectingToOrderSuccess = useRef(false);
  const lastBeginCheckoutKeyRef = useRef<string | null>(null);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [selectedShipping, setSelectedShipping] = useState<ShippingMethod | null>(null);
  const [couponInput, setCouponInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [couponPreview, setCouponPreview] = useState<{
    discountAmount: number;
    shippingDiscount: number;
  } | null>(null);

  // Dynamic form state based on config
  const [dynamicForm, setDynamicForm] = useState<Record<string, string>>({});

  const [cardData, setCardData] = useState({
    cardNumber: '',
    expiry: '',
    cvv: ''
  });

  // Country and City state
  const [enabledRegions, setEnabledRegions] = useState<MarketRegion[]>([]);
  const [availableCountries, setAvailableCountries] = useState<Country[]>([]);
  const [availableCities, setAvailableCities] = useState<City[]>([]);
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>('');
  const [selectedCityId, setSelectedCityId] = useState<string>('');
  const [loadingRegions, setLoadingRegions] = useState(false);
  const [contentTranslationMap, setContentTranslationMap] = useState<Record<string, string>>({});

  // Determine current market (simplified: first active market for now)
  const currentMarket = storeConfig.markets?.find((m: any) => m.active) || storeConfig.markets?.[0];
  const checkoutFields = Array.isArray(storeConfig.checkoutFields) ? storeConfig.checkoutFields : [];

  /** مفتاح ثابت لحقول الدفع المفعّلة — تغيير الدولة/المدينة أو السلة لا يعيد ضبط الحقول الأخرى */
  const checkoutFieldsInitKey = useMemo(
    () =>
      JSON.stringify(
        checkoutFields
          .filter((f: any) => f.enabled)
          .map((f: any) => ({
            name: f.name,
            type: f.type,
            required: !!f.required,
            order: f.order ?? 0,
          })),
      ),
    [checkoutFields],
  );

  const checkoutUserKey = useMemo(() => {
    if (!currentUser) return 'guest';
    const u = currentUser as { id?: string; email?: string; name?: string; phone?: string };
    return [u.id ?? '', u.email ?? '', u.name ?? '', u.phone ?? ''].join('|');
  }, [currentUser]);

  // Get country and city field configurations (ثابتان في الإعدادات — يظهران عند التفعيل)
  const countryField = checkoutFields.find((f: any) => f.name === 'country');
  const cityField = checkoutFields.find((f: any) => f.name === 'city');
  const countryEnabled = !!(countryField && countryField.enabled !== false);
  const cityEnabled = !!(cityField && cityField.enabled !== false);
  const defaultCountryWhenHidden = (countryField as any)?.defaultValue ?? '';

  /** الدولة الفعالة: عند وجود دولة افتراضية نستخدمها (سواء الحقل ظاهر أو مخفي) حتى يظهر الاختيار مباشرة */
  const defaultCode = useMemo(() => (defaultCountryWhenHidden || '').trim().toUpperCase(), [defaultCountryWhenHidden]);
  const effectiveCountryCode = useMemo(() => {
    if (defaultCode && !selectedCountryCode) return defaultCode;
    if (!countryEnabled && defaultCode) return defaultCode;
    return selectedCountryCode;
  }, [countryEnabled, defaultCode, selectedCountryCode]);

  // مزامنة الحالة مع الدولة الافتراضية (حقل ظاهر أو مخفي) كي القائمة تعرضها مباشرة
  useLayoutEffect(() => {
    if (defaultCode && selectedCountryCode !== effectiveCountryCode) {
      setSelectedCountryCode(effectiveCountryCode);
    }
  }, [defaultCode, effectiveCountryCode, selectedCountryCode]);

  // Get active payment methods
  const activePaymentMethods = storeConfig.payment?.methods?.filter(m => m.active) || [];

  // Do not auto-select payment method so the user always sees the list (COD, Stripe, etc.) first

  // رموز الدول المسموحة — من كل الأسواق المفعّلة (active !== false)، مع دعم مصفوفة أو كائن
  const marketCountryCodes: string[] = useMemo(() => {
    const raw = storeConfig?.markets;
    const markets = Array.isArray(raw) ? raw : (raw && typeof raw === 'object' ? Object.values(raw) : []);
    if (markets.length === 0) return [];
    const allCodes = new Set<string>();
    for (const market of markets) {
      if (!market || (market as any).active === false) continue;
      const list = (market as any).countries;
      const arr = Array.isArray(list) ? list : (list && typeof list === 'object' ? Object.values(list) : []);
      for (const c of arr) {
        const code = typeof c === 'string' ? c : (c && ((c as any).code ?? (c as any).countryCode));
        if (code && String(code).trim()) {
          const normalized = String(code).toUpperCase().trim();
          if (normalized === 'ALL') return [];
          allCodes.add(normalized);
        }
      }
    }
    return Array.from(allCodes);
  }, [storeConfig?.markets]);

  // Load countries (and regions) when country/city enabled أو عند وجود دولة افتراضية (حقل الدولة مخفي)
  const needCountries = countryEnabled || cityEnabled || !!defaultCountryWhenHidden;
  useEffect(() => {
    const loadCountriesAndRegions = async () => {
      if (!needCountries) return;
      // تطبيق الدولة الافتراضية فوراً (حقل الدولة ظاهر أو مخفي) كي تظهر مباشرة
      if (defaultCountryWhenHidden) {
        const code = (defaultCountryWhenHidden || '').trim().toUpperCase();
        if (code) setSelectedCountryCode(code);
      }
      try {
        setLoadingRegions(true);
        let regions: any[] = [];
        if (currentMarket?.id) {
          try {
            regions = await marketRegionsApi.getMarketRegions(currentMarket.id);
            setEnabledRegions(regions);
          } catch (_) { }
        }
        let allCountries: any[] = [];
        try {
          allCountries = await marketRegionsApi.getCountries();
        } catch (_) { }
        if (allCountries.length === 0) {
          allCountries = DEFAULT_COUNTRIES_FALLBACK;
        }
        // 1) إن وُجدت مناطق للماركت نقتصر على دول هذه المناطق
        let countryCodesFromRegions: string[] | null = null;
        if (regions.length > 0) {
          countryCodesFromRegions = [...new Set(regions.map((r: any) => (r.countryCode || '').toUpperCase().trim()))];
        }
        let countries = countryCodesFromRegions?.length
          ? allCountries.filter((c: any) => countryCodesFromRegions!.includes((c.code || '').toUpperCase()))
          : allCountries;
        // 2) نقتصر على دول الماركت المفعلة، ونضيف أي رمز مفعّل غير موجود في القائمة
        if (marketCountryCodes.length > 0) {
          const filtered = countries.filter((c: any) => marketCountryCodes.includes((c.code || '').toUpperCase()));
          const existingCodes = new Set(filtered.map((c: any) => (c.code || '').toUpperCase()));
          const missing = marketCountryCodes.filter((code) => !existingCodes.has(code));
          if (missing.length > 0) {
            const fromFallback = DEFAULT_COUNTRIES_FALLBACK.filter((c) => missing.includes(c.code.toUpperCase()));
            const placeholders = missing
              .filter((code) => !fromFallback.some((c) => c.code.toUpperCase() === code))
              .map((code) => ({ id: code, code, name: code, nameAr: code }));
            countries = [...filtered, ...fromFallback, ...placeholders];
          } else {
            countries = filtered;
          }
        }
        // عند إخفاء الدولة: نضيف الدولة الافتراضية للقائمة إن لم تكن موجودة (كي تُطبَّق وتعمل الشحن)
        if (!countryEnabled && defaultCountryWhenHidden) {
          const defCode = (defaultCountryWhenHidden || '').trim().toUpperCase();
          if (defCode && !countries.some((c: any) => (c.code || '').toUpperCase() === defCode)) {
            const fromAll = allCountries.find((c: any) => (c.code || '').toUpperCase() === defCode);
            const fromFallback = DEFAULT_COUNTRIES_FALLBACK.find((c) => c.code.toUpperCase() === defCode);
            if (fromAll) countries = [...countries, fromAll];
            else if (fromFallback) countries = [...countries, fromFallback];
            else countries = [...countries, { id: defCode, code: defCode, name: defCode, nameAr: defCode }];
          }
        }
        setAvailableCountries(countries);

        const saved = loadSavedShipping();
        const savedCountryCode = saved?.countryCode;
        const savedCityId = saved?.cityId;

        if (countryEnabled && savedCountryCode && countries.some((c: any) => c.code === savedCountryCode)) {
          setSelectedCountryCode(savedCountryCode);
          const cities = await loadCitiesForCountry(savedCountryCode, regions);
          if (savedCityId && cities.some((c: any) => c.id === savedCityId)) {
            setSelectedCityId(savedCityId);
          }
        } else if (countryEnabled && countries.length === 1) {
          setSelectedCountryCode(countries[0].code);
          await loadCitiesForCountry(countries[0].code, regions);
        } else if (defaultCountryWhenHidden) {
          const defaultCountry = countries.find((c: any) => (c.code || '').toUpperCase() === (defaultCountryWhenHidden || '').trim().toUpperCase());
          if (defaultCountry) {
            setSelectedCountryCode(defaultCountry.code);
            await loadCitiesForCountry(defaultCountry.code, regions);
          }
        }
      } catch (error) {
        console.error('Failed to load countries/regions:', error);
      } finally {
        setLoadingRegions(false);
      }
    };
    loadCountriesAndRegions();
  }, [currentMarket?.id, currentMarket?.countries, marketCountryCodes.join(','), countryEnabled, cityEnabled, needCountries, defaultCountryWhenHidden]);

  // Load cities when country is selected — نفلتر حسب مناطق الماركت أو حسب citiesByCountry من كل الأسواق المفعّلة
  const loadCitiesForCountry = async (countryCode: string, regions: MarketRegion[] = enabledRegions): Promise<City[]> => {
    try {
      let result: { data: City[] } = { data: [] };
      try {
        result = await marketRegionsApi.getCities({ countryCode });
      } catch (_) { }
      const region = regions.find((r: any) => r.countryCode === countryCode);
      // جمع مدن مفعّلة من كل الأسواق المفعّلة التي تشمل هذه الدولة
      const allowedCityIdsSet = new Set<string>();
      const markets = storeConfig?.markets ?? [];
      const countryUpper = countryCode.toUpperCase();
      for (const m of markets) {
        if (m && (m as any).active === false) continue;
        const list = (m as any).countries;
        if (!Array.isArray(list)) continue;
        const hasCountry = list.some((c: any) => (typeof c === 'string' ? c : (c?.code ?? c?.countryCode) ?? '').toString().toUpperCase().trim() === countryUpper);
        if (!hasCountry) continue;
        const byCountry = (m as any).citiesByCountry;
        const ids = (byCountry?.[countryCode] ?? byCountry?.[countryUpper]) ?? [];
        if (Array.isArray(ids)) ids.forEach((id: string) => allowedCityIdsSet.add(String(id)));
      }
      const allowedCityIds = allowedCityIdsSet.size > 0 ? Array.from(allowedCityIdsSet) : null;
      let cities = region?.cityIds?.length
        ? result.data.filter((c: any) => region.cityIds.includes(c.id))
        : result.data;
      if (cities.length === 0 && DEFAULT_CITIES_BY_COUNTRY[countryCode]) {
        cities = DEFAULT_CITIES_BY_COUNTRY[countryCode];
      }
      if (allowedCityIds && allowedCityIds.length > 0) {
        cities = cities.filter((c: any) => allowedCityIds.includes(c.id));
      }
      setAvailableCities(cities);
      if (cities.length === 1) {
        setSelectedCityId(cities[0].id);
      }
      return cities;
    } catch (error) {
      console.error('Failed to load cities:', error);
      setAvailableCities([]);
      return [];
    }
  };

  useEffect(() => {
    setDynamicForm((prev) => {
      const next: Record<string, string> = {};
      checkoutFields.forEach((field: any) => {
        if (field.enabled) next[field.name] = prev[field.name] ?? '';
      });
      if (currentUser) {
        checkoutFields.forEach((field: any) => {
          if (!field.enabled) return;
          const key = field.name;
          if ((next[key] ?? '').trim() !== '') return;
          if (field.type === 'name' || field.name === 'fullName') next[key] = currentUser.name ?? '';
          if (field.type === 'email' || ['email', 'customer_email', 'user_email'].includes(field.name)) next[key] = currentUser.email ?? '';
          if (field.type === 'tel' || ['phone', 'mobile', 'tel'].includes(field.name)) next[key] = (currentUser as any).phone ?? '';
        });
      }
      const saved = loadSavedShipping();
      if (saved) {
        for (const key of Object.keys(next)) {
          if (saved[key] !== undefined && saved[key] !== '') {
            next[key] = sanitizePlainTextInput(saved[key]);
          }
        }
      }
      return next;
    });
  }, [checkoutFieldsInitKey, checkoutUserKey]);

  useEffect(() => {
    const zones = storeConfig.shipping?.zones ?? [];
    const useZones = Array.isArray(zones) && zones.length > 0;
    if (useZones) {
      const countryName = availableCountries.find((c) => c.code === effectiveCountryCode)?.name ?? null;
      const sub = cart.reduce((acc, item) => acc + item.price * (item.quantity || 1), 0);
      const disc = appliedCoupon ? (sub * appliedCoupon.percentage) / 100 : 0;
      const methods = getMethodsFromZones(zones, countryName, sub - disc, currentMarket?.id ?? '', effectiveCountryCode ?? null, selectedCityId ?? null);
      if (methods.length > 0) setSelectedShipping(methods[0]);
    } else {
      const activeMarketMethods = (storeConfig.shipping?.methods ?? []).filter((m) => m.active && m.marketId === currentMarket?.id);
      if (activeMarketMethods.length > 0) setSelectedShipping(activeMarketMethods[0]);
    }
  }, [
    storeConfig.shipping,
    availableCountries,
    effectiveCountryCode,
    selectedCityId,
    cart,
    appliedCoupon,
    currentMarket?.id,
  ]);

  // Handle country selection
  const handleCountryChange = async (countryCode: string) => {
    setSelectedCountryCode(countryCode);
    setSelectedCityId(''); // Reset city when country changes
    await loadCitiesForCountry(countryCode, enabledRegions);
  };

  // Compute totals (safe when cart is empty: subtotal will be 0). Use variant line price when set (matches cart rows + pixel line_items).
  const subtotal = cart.reduce((acc, item) => {
    const p = item.selectedVariant?.price ?? item.price;
    const unit = typeof p === 'number' && Number.isFinite(p) ? p : Number(p) || 0;
    return acc + unit * (item.quantity || 1);
  }, 0);
  const preCatalogSubtotal = cart.reduce((acc, item) => {
    const qty = item.quantity || 1;
    const compareAt = item.selectedVariant?.compareAtPrice ?? item.compareAtPrice;
    const basePrice = Number(compareAt && compareAt > item.price ? compareAt : item.price);
    return acc + (basePrice * qty);
  }, 0);
  const catalogDiscountAmount = Math.max(0, preCatalogSubtotal - subtotal);
  const estimatedDiscountAmount = appliedCoupon ? (subtotal * appliedCoupon.percentage) / 100 : 0;
  const subtotalAfterDiscountForShipping = subtotal - estimatedDiscountAmount;

  const shippingZones = storeConfig.shipping?.zones ?? [];
  const useZonesForShipping = Array.isArray(shippingZones) && shippingZones.length > 0;
  const countryNameForShipping = availableCountries.find((c) => c.code === effectiveCountryCode)?.name ?? null;
  const availableShippingMethods = useMemo(() => {
    if (useZonesForShipping && currentMarket?.id)
      return getMethodsFromZones(shippingZones, countryNameForShipping, subtotalAfterDiscountForShipping, currentMarket.id, effectiveCountryCode ?? null, selectedCityId ?? null);
    return (storeConfig.shipping?.methods ?? []).filter((m) => m.active && m.marketId === currentMarket?.id);
  }, [useZonesForShipping, shippingZones, countryNameForShipping, subtotalAfterDiscountForShipping, currentMarket?.id, effectiveCountryCode, selectedCityId, storeConfig.shipping?.methods]);

  // Load content translations for checkout fields, shipping, and payment labels.
  // Fallback chain: base locale -> active language (active overrides base when available).
  useEffect(() => {
    let cancelled = false;
    const loadContentTranslations = async () => {
      try {
        const baseLocale = String(storeConfig?.baseLocale || storeConfig?.language || language || 'en')
          .trim()
          .toLowerCase()
          .split('-')[0];
        const activeLocale = String(language || baseLocale)
          .trim()
          .toLowerCase()
          .split('-')[0];

        const [baseRows, activeRows] = await Promise.all([
          translationsApi.getContentTranslations({
            entityType: 'page',
            languageCode: baseLocale,
          }),
          activeLocale === baseLocale
            ? Promise.resolve([] as unknown[])
            : translationsApi.getContentTranslations({
                entityType: 'page',
                languageCode: activeLocale,
              }),
        ]);

        if (cancelled) return;
        const next: Record<string, string> = {};
        for (const row of [...(baseRows as Array<{ fieldKey?: string; value?: string }>), ...(activeRows as Array<{ fieldKey?: string; value?: string }>)]) {
          const key = String(row?.fieldKey || '').trim();
          const value = String(row?.value || '').trim();
          if (key && value) next[key] = value;
        }
        setContentTranslationMap(next);
      } catch {
        if (!cancelled) setContentTranslationMap({});
      }
    };
    void loadContentTranslations();
    return () => {
      cancelled = true;
    };
  }, [language, storeConfig?.baseLocale, storeConfig?.language]);

  const getShippingMethodLabel = (method: ShippingMethod): string => {
    const methodId = String(method?.id || '').trim();
    if (!methodId) return method?.name || '';
    const directMethodKey = `shipping_method_name_${methodId}`;
    if (contentTranslationMap[directMethodKey]) return contentTranslationMap[directMethodKey];
    // Zone-based shipping keys are saved as shipping_rate_name_{zoneId}_{rateId}.
    const zoneRateHit = Object.entries(contentTranslationMap).find(
      ([key]) => key.startsWith('shipping_rate_name_') && key.endsWith(`_${methodId}`),
    );
    if (zoneRateHit?.[1]) return zoneRateHit[1];
    return method?.name || '';
  };

  const getShippingMethodDescription = (method: ShippingMethod): string => {
    const methodId = String(method?.id || '').trim();
    if (!methodId) return method?.description || '';
    const directMethodKey = `shipping_method_description_${methodId}`;
    if (contentTranslationMap[directMethodKey]) return contentTranslationMap[directMethodKey];
    return method?.description || '';
  };

  const getCheckoutFieldLabel = (field: any, index: number): string => {
    const id = String(field?.id || field?.name || `field_${index}`);
    const key = `checkout_field_label_${id}`;
    return String(contentTranslationMap[key] || field?.label || field?.name || '').trim();
  };

  const getCheckoutFieldPlaceholder = (field: any, index: number): string => {
    const id = String(field?.id || field?.name || `field_${index}`);
    const key = `checkout_field_placeholder_${id}`;
    return String(contentTranslationMap[key] || field?.placeholder || '').trim();
  };

  const getCheckoutFieldOption = (field: any, fieldIndex: number, option: string, optionIndex: number): string => {
    const id = String(field?.id || field?.name || `field_${fieldIndex}`);
    const key = `checkout_field_option_${id}_${optionIndex}`;
    return String(contentTranslationMap[key] || option || '').trim();
  };

  const getPaymentMethodLabel = (method: any): string => {
    const methodId = String(method?.id || '').trim();
    if (!methodId) return String(method?.name || '').trim();
    return String(contentTranslationMap[`payment_method_name_${methodId}`] || method?.name || '').trim();
  };

  const getPaymentMethodDescription = (method: any): string => {
    const methodId = String(method?.id || '').trim();
    if (!methodId) return String(method?.description || '').trim();
    return String(contentTranslationMap[`payment_method_description_${methodId}`] || method?.description || '').trim();
  };

  const isFreeShippingLegacy = !useZonesForShipping && (storeConfig.shipping?.freeShippingThreshold ?? 0) > 0 && subtotalAfterDiscountForShipping >= (storeConfig.shipping?.freeShippingThreshold ?? 0);
  const shippingCost = useZonesForShipping ? (selectedShipping?.price ?? 0) : (isFreeShippingLegacy ? 0 : (selectedShipping?.price ?? 0));
  const shippingDiscountAmount = couponPreview?.shippingDiscount ?? 0;
  const effectiveShippingCost = Math.max(0, shippingCost - shippingDiscountAmount);
  const isFreeShipping = effectiveShippingCost === 0;

  useEffect(() => {
    if (useZonesForShipping && availableShippingMethods.length > 0 && selectedShipping && !availableShippingMethods.some((m) => m.id === selectedShipping.id)) {
      setSelectedShipping(availableShippingMethods[0]);
    }
  }, [useZonesForShipping, availableShippingMethods, selectedShipping]);

  useEffect(() => {
    let canceled = false;
    const syncCouponPreview = async () => {
      if (!appliedCoupon) {
        setCouponPreview(null);
        return;
      }
      try {
        const preview = await cartDiscountsApi.preview({
          lines: cart.map((item) => ({
            price: item.price,
            quantity: item.quantity || 1,
            productId: item.id,
            name: item.name,
          })),
          couponCode: appliedCoupon.code,
          shippingCost,
        });
        if (!canceled && preview.ok) {
          const normalizedOrderDiscount = Math.max(
            0,
            Number(preview.discountAmount || 0) - Number(preview.shippingDiscount || 0)
          );
          setCouponPreview({
            discountAmount: normalizedOrderDiscount,
            shippingDiscount: Number(preview.shippingDiscount || 0),
          });
        }
      } catch {
        if (!canceled) setCouponPreview(null);
      }
    };
    syncCouponPreview();
    return () => {
      canceled = true;
    };
  }, [appliedCoupon, cart, shippingCost]);

  const discountAmount = couponPreview ? couponPreview.discountAmount : estimatedDiscountAmount;
  const subtotalAfterDiscount = subtotal - (couponPreview?.discountAmount ?? estimatedDiscountAmount);

  let taxAmount = 0;
  if (storeConfig.tax?.enabled) {
    if (storeConfig.tax.pricesIncludeTax) {
      taxAmount = subtotalAfterDiscount - (subtotalAfterDiscount / (1 + (storeConfig.tax.rate / 100)));
    } else {
      taxAmount = (subtotalAfterDiscount * storeConfig.tax.rate) / 100;
    }
  }

  const total = (storeConfig.tax?.pricesIncludeTax ? subtotalAfterDiscount : (subtotalAfterDiscount + taxAmount)) + effectiveShippingCost;
  const trackingLineItems = useMemo<StorefrontTrackingLineItem[]>(
    () =>
      cart.map((item) => ({
        productId: String(item.id ?? ''),
        name: item.name,
        price: (() => {
          const p = item.selectedVariant?.price ?? item.price;
          if (typeof p === 'number' && Number.isFinite(p)) return p;
          return Number(p) || 0;
        })(),
        quantity: item.quantity || 1,
      })),
    [cart],
  );

  useEffect(() => {
    if (cart.length === 0) return;
    const itemCount = trackingLineItems.reduce((sum, item) => sum + (item.quantity ?? 1), 0);
    // One InitiateCheckout per cart/coupon state; value = order subtotal after discount (excl. tax/shipping — common Meta / GA4 shape).
    const valueForInitiate = subtotalAfterDiscount;
    const key = `${cart.length}:${itemCount}:${valueForInitiate.toFixed(2)}:${storeConfig.currency}`;
    if (lastBeginCheckoutKeyRef.current === key) return;
    lastBeginCheckoutKeyRef.current = key;
    setAnalyticsHeartbeatStatus('checkout');
    trackEvent('begin_checkout', {
      value: valueForInitiate,
      currency: storeConfig.currency,
      lineItems: trackingLineItems,
    });
    syncCartToAnalytics({
      lineItems: trackingLineItems,
      subtotal: valueForInitiate,
      currency: storeConfig.currency,
      status: 'checkout',
      beginCheckout: true,
      checkoutStep: 'init',
      email: dynamicForm.email,
      phone: dynamicForm.phone,
      customerName: `${dynamicForm.firstName || ''} ${dynamicForm.lastName || ''}`.trim() || undefined,
    });
  }, [cart.length, storeConfig.currency, subtotalAfterDiscount, trackingLineItems, dynamicForm.email, dynamicForm.phone, dynamicForm.firstName, dynamicForm.lastName]);

  useEffect(() => {
    setAnalyticsContact(dynamicForm.email, dynamicForm.phone);
    if (cart.length === 0) return;
    syncCartToAnalytics({
      lineItems: trackingLineItems,
      subtotal: subtotalAfterDiscount,
      currency: storeConfig.currency,
      status: 'checkout',
      checkoutStep: String(step),
      email: dynamicForm.email,
      phone: dynamicForm.phone,
      customerName: `${dynamicForm.firstName || ''} ${dynamicForm.lastName || ''}`.trim() || undefined,
      beginCheckout: true,
    });
  }, [dynamicForm.email, dynamicForm.phone, dynamicForm.firstName, dynamicForm.lastName, step, cart.length, storeConfig.currency, subtotalAfterDiscount, trackingLineItems]);

  const stripe = useStripeCheckout({ storeConfig, paymentMethod, step, total });
  const shamCash = useShamCashCheckout({ storeConfig, paymentMethod, step, total });

  // Early return AFTER all hooks — so hook count is always the same (fixes React #300 / #520)
  if (cart.length === 0) {
    if (redirectingToOrderSuccess.current) return null;
    return (
      <div
        className="min-h-[80vh] flex flex-col items-center justify-center px-6 py-16 animate-fade-in"
        style={{
          background: `linear-gradient(165deg, ${theme.primaryColor || '#0f172a'}10 0%, #f8fafc 40%, #ffffff 100%)`,
        }}
      >
        <div className="max-w-md w-full rounded-[2rem] border border-slate-200/80 bg-white/90 p-8 text-center shadow-xl shadow-slate-200/40 backdrop-blur-sm md:p-10 space-y-6">
          <div
            className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center text-3xl border border-slate-100 bg-slate-50 shadow-inner"
            aria-hidden
          >
            🛒
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900">
            {language === 'ar' ? 'سلة التسوق فارغة' : 'Your cart is empty'}
          </h1>
          <p className="text-slate-500 text-sm leading-relaxed">
            {language === 'ar'
              ? 'أضف منتجات من المتجر ثم عد لإتمام الطلب بأمان.'
              : 'Add items from the shop, then return here to complete your order securely.'}
          </p>
          <Link
            to={shopHref}
            className="inline-flex items-center justify-center px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-sm text-white shadow-xl transition hover:opacity-95 hover:scale-[1.02] active:scale-[0.98]"
            style={{ backgroundColor: theme.primaryColor }}
          >
            {language === 'ar' ? 'تصفح المتجر' : 'Continue shopping'}
          </Link>
        </div>
      </div>
    );
  }

  const handleApplyCoupon = async () => {
    const result = await applyCoupon(couponInput);
    if (result.success) {
      addToast(t('coupon_applied') || (language === 'ar' ? 'تم تطبيق الخصم!' : 'Coupon applied!'), 'success');
      setCouponInput('');
    } else {
      let errorMessage = t('invalid_coupon_code') || (language === 'ar' ? 'كود الخصم غير صالح' : 'Invalid coupon code');
      if (result.reason) {
        switch (result.reason) {
          case 'MIN_SUBTOTAL_NOT_MET':
            errorMessage = language === 'ar' ? 'لم يتم استيفاء الحد الأدنى للطلب' : 'Minimum order subtotal not met';
            break;
          case 'MIN_QUANTITY_NOT_MET':
            errorMessage = language === 'ar' ? 'لم يتم استيفاء الحد الأدنى للكمية' : 'Minimum quantity not met';
            break;
          case 'CUSTOMER_NOT_ELIGIBLE':
            errorMessage = language === 'ar' ? 'أنت غير مؤهل لاستخدام هذا الخصم' : 'You are not eligible for this discount';
            break;
          case 'USAGE_LIMIT_REACHED':
            errorMessage = language === 'ar' ? 'تم الوصول للحد الأقصى لاستخدام الخصم' : 'Coupon usage limit reached';
            break;
          case 'NOT_APPLICABLE':
            errorMessage = language === 'ar' ? 'هذا الخصم لا ينطبق على منتجاتك' : 'Coupon does not apply to these items';
            break;
          case 'EMPTY_CODE':
            errorMessage = language === 'ar' ? 'يرجى إدخال كود الخصم' : 'Please enter a coupon code';
            break;
          case 'EXPIRED':
            errorMessage = language === 'ar' ? 'كود الخصم منتهي الصلاحية' : 'Coupon code is expired';
            break;
        }
      }
      addToast(errorMessage, 'error');
    }
  };

  const handleInputChange = (fieldName: string, value: string) => {
    setDynamicForm(prev => ({ ...prev, [fieldName]: sanitizePlainTextInput(value) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate country and city (مناطق مفعّلة = قوائم؛ وإلا = حقول نصية)
    if (enabledRegions.length > 0) {
      if (countryEnabled && countryField?.required && !effectiveCountryCode) {
        addToast(t('please_select_country') || 'Please select a country', 'error');
        return;
      }
      if (cityEnabled && cityField?.required && availableCities.length > 0 && !selectedCityId) {
        addToast(t('please_select_city') || 'Please select a city', 'error');
        return;
      }
      if (effectiveCountryCode && selectedCityId) {
        const region = enabledRegions.find((r: any) => r.countryCode === effectiveCountryCode);
        if (!region || !region.cityIds?.includes(selectedCityId)) {
          addToast('Selected city is not available in your region', 'error');
          return;
        }
      }
    } else {
      // بدون مناطق ماركت: قد تكون الدولة/المدينة قوائم من API (قيمتها في selectedCountryCode / selectedCityId وليس dynamicForm)
      if (countryEnabled && countryField?.required) {
        const countryUsesApiSelect = availableCountries.length > 0;
        const countryOk = countryUsesApiSelect
          ? !!(String(effectiveCountryCode || selectedCountryCode || '').trim())
          : !!(dynamicForm.country ?? '').trim();
        if (!countryOk) {
          addToast(t('please_select_country') || 'Please select a country', 'error');
          return;
        }
      }
      if (cityEnabled && cityField?.required) {
        const cityRowHidden = !!(effectiveCountryCode && availableCities.length === 0);
        if (cityRowHidden) {
          // واجهة المدينة مخفية (لا مدن للدولة) — لا نطلب حقلاً غير معروض
        } else if (availableCities.length > 0) {
          if (!selectedCityId) {
            addToast(t('please_select_city') || 'Please select a city', 'error');
            return;
          }
        } else if (!(dynamicForm.city ?? '').trim()) {
          addToast(t('please_select_city') || 'Please enter city', 'error');
          return;
        }
      }
    }

    if (step < 3) {
      setStep((step + 1) as any);
      window.scrollTo(0, 0);
      return;
    }

    if (paymentMethod === 'shamcash' && !shamCash.canSubmit) {
      addToast(language === 'ar' ? 'يرجى إكمال خطوة الدفع ورفع الإيصال' : 'Please complete payment step and upload receipt', 'error');
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);

    // Lahza: backend uses guest email when none provided; no need to block here

    const lineItems: OrderLineItem[] = cart.map(item => ({
      productId: item.id,
      name: item.name,
      price: item.price,
      compareAtPrice: item.selectedVariant?.compareAtPrice ?? item.compareAtPrice,
      promotionId: item.selectedVariant?.catalogPromotionId ?? item.catalogPromotionId,
      quantity: item.quantity || 1,
      image: item.selectedVariant?.image || item.image,
      variantTitle: item.selectedVariant?.title
    }));

    const selectedCountry = availableCountries.find((c: any) => c.code === effectiveCountryCode);
    const selectedCity = availableCities.find((c: any) => c.id === selectedCityId);

    // Collect all checkout form data including country and city
    const orderData: Record<string, any> = {
      ...dynamicForm,
    };

    if (enabledRegions.length > 0 && selectedCountry) {
      orderData.country = selectedCountry.name;
      orderData.countryCode = selectedCountry.code;
      if (language === 'ar' && selectedCountry.nameAr) {
        orderData.countryAr = selectedCountry.nameAr;
      }
    } else if (countryEnabled) {
      if (selectedCountry) {
        orderData.country = selectedCountry.name;
        orderData.countryCode = selectedCountry.code;
        if (language === 'ar' && selectedCountry.nameAr) {
          orderData.countryAr = selectedCountry.nameAr;
        }
      } else if (dynamicForm.country) {
        orderData.country = dynamicForm.country;
      }
    }

    if (enabledRegions.length > 0 && selectedCity) {
      orderData.city = selectedCity.name;
      orderData.cityId = selectedCity.id;
      if (language === 'ar' && selectedCity.nameAr) {
        orderData.cityAr = selectedCity.nameAr;
      }
    } else if (cityEnabled) {
      if (selectedCity) {
        orderData.city = selectedCity.name;
        orderData.cityId = selectedCity.id;
        if (language === 'ar' && selectedCity.nameAr) {
          orderData.cityAr = selectedCity.nameAr;
        }
      } else if (dynamicForm.city) {
        orderData.city = dynamicForm.city;
      }
    }

    if (effectiveCountryCode !== 'SY') {
      delete orderData.logestechsCityId;
      delete orderData.logestechsVillageId;
    }

    const mapped = getMappedOrderFields(checkoutFields, dynamicForm);

    let orderSubtotal = subtotal;
    let orderDiscount = discountAmount;
    let orderTax = taxAmount;
    let orderTotal = total;
    if (appliedCoupon) {
      try {
        const preview = await cartDiscountsApi.preview({
          lines: lineItems.map((li) => ({
            price: li.price,
            quantity: li.quantity || 1,
            productId: li.productId,
          })),
          couponCode: appliedCoupon.code,
          shippingCost,
        });
        if (!preview.ok) {
          addToast(
            (t('invalid_coupon_code') || 'Invalid coupon') +
              (preview.rejectReason ? ` (${preview.rejectReason})` : ''),
            'error'
          );
          setIsSubmitting(false);
          return;
        }
        const normalizedOrderDiscount = Math.max(
          0,
          Number(preview.discountAmount || 0) - Number(preview.shippingDiscount || 0)
        );
        const effectiveShippingForOrder = Math.max(
          0,
          Number(shippingCost || 0) - Number(preview.shippingDiscount || 0)
        );
        orderSubtotal = preview.merchandiseSubtotal;
        orderDiscount = normalizedOrderDiscount;
        const subtotalAfterOrderDiscount = orderSubtotal - normalizedOrderDiscount;
        if (storeConfig.tax?.enabled) {
          if (storeConfig.tax.pricesIncludeTax) {
            orderTax = subtotalAfterOrderDiscount - (subtotalAfterOrderDiscount / (1 + (storeConfig.tax.rate / 100)));
          } else {
            orderTax = (subtotalAfterOrderDiscount * storeConfig.tax.rate) / 100;
          }
        } else {
          orderTax = 0;
        }
        orderTotal = (storeConfig.tax?.pricesIncludeTax ? subtotalAfterOrderDiscount : (subtotalAfterOrderDiscount + orderTax)) + effectiveShippingForOrder;
      } catch (err) {
        console.error('Checkout: cart discount preview failed', err);
        addToast(t('order_failed') || 'Could not verify coupon with server.', 'error');
        setIsSubmitting(false);
        return;
      }
    }

    const purchaseEventId = createTrackingEventId();
    const browserIds = getFacebookBrowserIdentifiers();

    // newOrder variable definition
    const newOrder: Omit<Order, 'id'> & {
      return_url?: string;
      trackingEventId?: string;
      fbp?: string;
      fbc?: string;
      eventSourceUrl?: string;
      analyticsSessionId?: string;
    } = {
      customerName: mapped.customerName,
      email: mapped.email,
      total: orderTotal,
      subtotal: orderSubtotal,
      tax: orderTax,
      shippingCost: shippingCost,
      discountAmount: orderDiscount,
      couponCode: appliedCoupon?.code,
      shippingMethodName: selectedShipping?.name,
      status: 'Pending',
      history: [{ status: 'Pending', date: new Date().toLocaleString(), note: 'Order created' }],
      date: new Date().toISOString().split('T')[0],
      items: cart.reduce((acc, item) => acc + (item.quantity || 1), 0),
      lineItems: lineItems,
      paymentMethod: paymentMethod || 'cod',
      orderData: orderData,
      trackingEventId: purchaseEventId,
      fbp: browserIds.fbp,
      fbc: browserIds.fbc,
      eventSourceUrl: typeof window !== 'undefined' ? window.location.href : undefined,
      analyticsSessionId: getSessionId(),
    };

    const selectedPaymentDef = (storeConfig.payment?.methods as any[])?.find((m: any) => m.id === paymentMethod);
    const isRedirectFlow = selectedPaymentDef?.flow === 'redirect' || paymentMethod === 'lahza';
    
    if (isRedirectFlow) {
      const origin = window.location.origin.replace(/\/+$/, '');
      const pathname = window.location.pathname;
      const pathBase = pathname.includes('/checkout') ? pathname.split('/checkout')[0].replace(/^\/+|\/+$/g, '') : '';
      newOrder.return_url = pathBase ? `${origin}/${pathBase}/order-success` : `${origin}/order-success`;
    }

    if (paymentMethod === 'shamcash' && shamCash.intent?.intentId && shamCash.receiptBase64) {
      (newOrder as any).paymentIntentId = shamCash.intent.intentId;
      (newOrder as any).paymentReceiptBase64 = shamCash.receiptBase64;
    }

    try {
      const result = await addOrder(newOrder);
      if (!result) {
        addToast(t('order_failed') || 'فشل إنشاء الطلب. حاول مرة أخرى.', 'error');
        setIsSubmitting(false);
        return;
      }

      const hasStripePayment = typeof result === 'object' && result !== null && 'clientSecret' in result && !!(result as any).clientSecret;
      const hasRedirectUrlKey = typeof result === 'object' && result !== null && 'redirectUrl' in result;
      const redirectUrlValue = (result as any)?.redirectUrl;
      const hasRedirectToGateway = hasRedirectUrlKey && typeof redirectUrlValue === 'string' && redirectUrlValue.length > 0;
      const paymentError = typeof result === 'object' && result !== null && (result as any).paymentError;
      const orderForSuccess = (result as any)?.order || (result as any);

      if (paymentError) {
        addToast((t('payment_setup_failed') || 'فشل إعداد الدفع') + ': ' + String(paymentError), 'error');
        setIsSubmitting(false);
        return;
      }

      if (hasRedirectUrlKey && !redirectUrlValue) {
        addToast(t('payment_redirect_missing') || 'لم يتم الحصول على رابط الدفع. حاول مرة أخرى.', 'error');
        setIsSubmitting(false);
        return;
      }

      const persistShipping = () => {
        const hId = typeof window !== 'undefined' ? window.location.hostname : 'default';
        const toSave: Record<string, string> = { ...dynamicForm };
        if (effectiveCountryCode) toSave.countryCode = effectiveCountryCode;
        if (selectedCityId) toSave.cityId = selectedCityId;
        localStorage.setItem(`checkout_shipping_${hId}`, JSON.stringify(toSave));
      };

      if (hasRedirectToGateway) {
        persistShipping();
        redirectingToOrderSuccess.current = true;
        window.location.href = redirectUrlValue;
        return;
      }

      if (hasStripePayment) {
        persistShipping();
        stripe.setPendingFromOrderResult(result);
        return;
      }

      const finalOrderId = orderForSuccess?.id;
      if (finalOrderId && !hasRedirectToGateway && !hasStripePayment) {
        persistShipping();
        redirectingToOrderSuccess.current = true;
        trackEvent('purchase', {
          trackingEventId: purchaseEventId,
          orderId: finalOrderId,
          value: orderForSuccess?.total ?? orderTotal,
          currency: storeConfig.currency,
          lineItems: trackingLineItems,
        });
        clearCart();
        addToast(t('order_placed_successfully') || 'Order placed successfully!', 'success');
        navigate(`/order-success?id=${finalOrderId}`);
        return;
      }

      addToast(t('order_failed') || 'فشل إنشاء الطلب. حاول مرة أخرى.', 'error');
    } catch (err) {
      console.error('Checkout: addOrder failed', err);
      addToast(t('order_failed') || 'فشل إنشاء الطلب. حاول مرة أخرى.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const primaryHex = '#000000';

  return (
    <div
      className="min-h-screen font-sans selection:bg-slate-900 selection:text-white"
      style={{
        background: `#fcfcfd`,
      }}
    >
      <header className="sticky top-0 z-50 border-b border-slate-200/50 bg-white/95 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <Link to={shopHref} className="flex items-center gap-3 active:scale-95 transition-transform shrink-0">
            {storeConfig.logo && String(storeConfig.logo).trim() !== '' ? (
              <img
                src={storeConfig.logo}
                alt={storeConfig.name}
                className="h-7 md:h-8 w-auto object-contain"
              />
            ) : (
              <span className="font-black text-xl tracking-tighter text-slate-900">
                {storeConfig.name || 'Store'}
              </span>
            )}
          </Link>

          <Link
            to={shopHref}
            className="group flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-all font-bold text-[10px] uppercase tracking-widest shadow-md shadow-slate-200"
          >
            <Home className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{language === 'ar' ? 'العودة للتسوق' : 'Back to shopping'}</span>
          </Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="flex flex-col items-center mb-12 md:mb-16">
          <div className="flex items-center justify-center w-full max-w-lg px-4 relative">
            <div className="absolute top-5 left-0 right-0 h-[1.5px] bg-slate-100 -z-10 mx-8"></div>
            {[1, 2, 3].map((s, idx) => (
              <React.Fragment key={s}>
                <div className="flex flex-col items-center relative z-10 flex-1">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 border-2 ${
                      step >= s 
                        ? 'text-white border-slate-900 bg-slate-900 shadow-md' 
                        : 'bg-white border-slate-100 text-slate-300'
                    }`}
                  >
                    {step > s ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <span className="font-black text-sm">{s}</span>
                    )}
                  </div>
                  <span className={`absolute -bottom-7 whitespace-nowrap text-[9px] font-black uppercase tracking-[0.2em] transition-colors duration-300 ${step >= s ? 'text-slate-900' : 'text-slate-300'}`}>
                    {s === 1 ? (t('information') || 'Info') : s === 2 ? (t('shipping') || 'Delivery') : (t('payment') || 'Payment')}
                  </span>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8">
            <form onSubmit={handleSubmit} className="space-y-8">

              {step === 1 && (
                <div className="bg-white p-6 md:p-8 rounded-[1.5rem] border border-slate-200 shadow-sm animate-slide-up">
                  <div className="flex items-center justify-between mb-8 pb-5 border-b border-slate-100">
                    <div className="flex flex-col gap-0.5">
                      <h2 className="text-xl font-black text-slate-900 tracking-tight">
                        {t('shipping_information') || 'Shipping Information'}
                      </h2>
                      <p className="text-xs text-slate-400 font-medium">
                        {t('checkout_details_hint') || 'Please enter your shipping details accurately'}
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-600 border border-slate-100">
                      <Truck className="w-5 h-5" />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8">
                    {checkoutFields
                      .filter((f: any) => f.enabled)
                      .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
                      .map((field: any, index: number) => {
                        const isFullWidth = field.name === 'address' || field.type === 'textarea';
                        
                        if (field.name === 'country') {
                          return (
                            <div key={field.id} className="group flex flex-col gap-2">
                              <label className="text-xs font-bold text-slate-500 tracking-tight group-focus-within:text-slate-900 transition-colors px-0.5">
                                {getCheckoutFieldLabel(countryField, 0) || (t('country') || 'Country')} {countryField?.required && <span className="text-red-500 font-black">*</span>}
                              </label>
                              {loadingRegions ? (
                                <div className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-400 font-bold animate-pulse text-sm">
                                  {t('loading') || 'Loading...'}
                                </div>
                              ) : availableCountries.length > 0 ? (
                                <select
                                  required={countryField?.required || false}
                                  value={selectedCountryCode}
                                  onChange={e => handleCountryChange(e.target.value)}
                                  className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 outline-none transition-all font-bold text-slate-900 appearance-none hover:border-slate-300 text-sm"
                                >
                                  <option value="">{t('select_country') || (language === 'ar' ? 'اختر الدولة' : 'Select Country')}</option>
                                  {availableCountries.map((country: any) => (
                                    <option key={country.code} value={country.code}>
                                      {language === 'ar' ? (country.nameAr || country.name) : country.name}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <input
                                  type="text"
                                  required={countryField?.required || false}
                                  value={dynamicForm.country || ''}
                                  onChange={e => handleInputChange('country', e.target.value)}
                                  placeholder={t('select_country') || (language === 'ar' ? 'الدولة' : 'Country')}
                                  className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 outline-none transition-all font-bold text-slate-900 hover:border-slate-300 text-sm"
                                />
                              )}
                            </div>
                          );
                        }

                        if (field.name === 'city') {
                          if (availableCities.length === 0 && effectiveCountryCode) return null;
                          return (
                            <div key={field.id} className="group flex flex-col gap-2">
                              <label className="text-xs font-bold text-slate-500 tracking-tight group-focus-within:text-slate-900 transition-colors px-0.5">
                                {getCheckoutFieldLabel(cityField, 0) || (t('city') || 'City')} {cityField?.required && <span className="text-red-500 font-black">*</span>}
                              </label>
                              {!effectiveCountryCode ? (
                                <select disabled className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-xl text-slate-300 font-bold disabled:opacity-50 cursor-not-allowed text-sm">
                                  <option value="">{t('select_country_first') || (language === 'ar' ? 'اختر دولة أولاً' : 'Select country first')}</option>
                                </select>
                              ) : (
                                <select
                                  required={cityField?.required || false}
                                  value={selectedCityId}
                                  onChange={e => setSelectedCityId(e.target.value)}
                                  className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 outline-none transition-all font-bold text-slate-900 appearance-none hover:border-slate-300 text-sm"
                                >
                                  <option value="">{t('select_city') || (language === 'ar' ? 'اختر المدينة' : 'Select City')}</option>
                                  {availableCities.map((city: any) => (
                                    <option key={city.id} value={city.id}>
                                      {language === 'ar' ? (city.nameAr || city.name) : city.name}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>
                          );
                        }

                        return (
                          <div key={field.id} className={`group flex flex-col gap-2 ${isFullWidth ? 'md:col-span-2' : ''}`}>
                            <label className="text-xs font-bold text-slate-500 tracking-tight group-focus-within:text-slate-900 transition-colors px-0.5">
                              {getCheckoutFieldLabel(field, index) || field.label} {field.required && <span className="text-red-500 font-black">*</span>}
                            </label>
                            {field.type === 'select' ? (
                              <select
                                required={field.required}
                                value={dynamicForm[field.name] || ''}
                                onChange={e => handleInputChange(field.name, e.target.value)}
                                className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 outline-none transition-all font-bold text-slate-900 appearance-none hover:border-slate-300 text-sm"
                              >
                                <option value="">{getCheckoutFieldPlaceholder(field, index) || field.placeholder || `Select ${field.label}`}</option>
                                {(field.options ?? []).map((option: string, optIndex: number) => (
                                  <option key={option} value={option}>{getCheckoutFieldOption(field, index, option, optIndex) || option}</option>
                                ))}
                              </select>
                            ) : field.type === 'textarea' ? (
                              <textarea
                                required={field.required}
                                value={dynamicForm[field.name] || ''}
                                onChange={e => handleInputChange(field.name, e.target.value)}
                                placeholder={getCheckoutFieldPlaceholder(field, index) || field.placeholder}
                                className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 outline-none transition-all font-bold text-slate-900 min-h-[100px] resize-none hover:border-slate-300 text-sm"
                              />
                            ) : (
                              <input
                                required={field.required}
                                type={field.type === 'name' ? 'text' : (['email', 'tel', 'number', 'date', 'time', 'url'].includes(field.type) ? field.type : 'text')}
                                value={dynamicForm[field.name] || ''}
                                onChange={e => handleInputChange(field.name, e.target.value)}
                                placeholder={getCheckoutFieldPlaceholder(field, index) || field.placeholder}
                                className="w-full px-7 py-5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 focus:bg-white outline-none transition-all font-bold text-slate-900 hover:border-slate-300"
                              />
                            )}
                          </div>
                        );

                      })}
                  </div>
                </div>
              )}


              {step === 2 && (
                <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-md ring-1 ring-slate-100/90 animate-slide-up">
                  <div className="flex justify-between items-center mb-8 gap-4 flex-wrap pb-4 border-b-2" style={{ borderColor: `${primaryHex}33` }}>
                    <h2 className="text-2xl font-black text-slate-900">{t('shipping_method')}</h2>
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="text-xs font-black uppercase tracking-wider hover:underline text-slate-900"
                    >
                      {t('edit_info')}
                    </button>
                  </div>
                  <div className="space-y-4">
                    {availableShippingMethods.map((method) => (
                      <label
                        key={method.id}
                        className={`group relative flex items-center justify-between p-6 border-2 rounded-[2rem] cursor-pointer transition-all duration-300 ${
                          selectedShipping?.id === method.id 
                            ? 'bg-slate-50 border-slate-900 shadow-[0_15px_30px_-10px_rgba(0,0,0,0.05)]' 
                            : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50/50'
                        }`}
                      >
                        <div className="flex items-center gap-5">
                          <div 
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                              selectedShipping?.id === method.id ? 'bg-slate-900 border-slate-900' : 'border-slate-200'
                            }`}
                          >
                            {selectedShipping?.id === method.id && <div className="w-2 h-2 rounded-full bg-white" />}
                          </div>
                          <input
                            type="radio"
                            name="shipping"
                            className="hidden"
                            checked={selectedShipping?.id === method.id}
                            onChange={() => setSelectedShipping(method)}
                          />
                          <div>
                            <p className="font-black text-slate-900 text-lg tracking-tight">{getShippingMethodLabel(method)}</p>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                              {getShippingMethodDescription(method) || t('standard_delivery') || 'Standard Delivery'}
                            </p>
                          </div>
                        </div>
                        <span className="font-black text-slate-900 text-xl tracking-tight">
                          {isFreeShipping ? (t('shipping_free') || 'FREE') : formatPrice(method.price)}
                        </span>
                      </label>
                    ))}
                    {availableShippingMethods.length === 0 && (
                      <div className="p-12 text-center text-slate-400 border-2 border-dashed border-slate-100 rounded-[2rem] bg-slate-50/50">
                        <p className="font-bold">{t('no_shipping_methods_for_region') || 'No shipping methods available for your region.'}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border border-slate-200 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.02)] animate-slide-up">
                  <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-100">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">{contentTranslationMap['payment_method'] || t('payment_method') || 'Payment Method'}</h2>
                    <Shield className="w-6 h-6 text-emerald-500" />
                  </div>

                  <div className="rounded-3xl bg-slate-50 border border-slate-200/60 p-6 mb-8 flex gap-4 items-start">
                    <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-900 shrink-0">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-slate-900 mb-1">
                        {t('checkout_encrypted_title') || 'Your data is fully encrypted'}
                      </p>
                      <p className="text-sm text-slate-500 leading-relaxed font-medium">
                        {t('checkout_encrypted_desc') || 'We use industry-standard encryption to protect your financial data. Your card details are never stored.'}
                      </p>
                    </div>
                  </div>

                  {stripe.showStripeForm ? (
                    <div className="animate-fade-in group">
                      {stripe.stripeLoading ? (
                        <div className="p-12 text-center text-slate-400 rounded-3xl border-2 border-dashed border-slate-100 bg-slate-50">
                          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin mx-auto mb-4" />
                          <p className="font-bold">{t('loading_secure_gateway') || 'Loading secure gateway...'}</p>
                        </div>
                      ) : stripe.hasStripeData && stripe.stripeProps ? (
                        <div className="p-2 border border-slate-100 rounded-3xl bg-slate-50/30">
                          <StripePaymentStep
                            clientSecret={stripe.stripeProps.clientSecret}
                            paymentIntentId={stripe.stripeProps.paymentIntentId}
                            publishableKey={stripe.stripeProps.publishableKey}
                            buildOrderPayload={() => {
                              const lineItems: OrderLineItem[] = cart.map(item => ({
                                productId: item.id,
                                name: item.name,
                                price: item.price,
                                compareAtPrice: item.selectedVariant?.compareAtPrice ?? item.compareAtPrice,
                                promotionId: item.selectedVariant?.catalogPromotionId ?? item.catalogPromotionId,
                                quantity: item.quantity || 1,
                                image: item.selectedVariant?.image || item.image,
                                SKU: item.SKU,
                                variantId: item.selectedVariant?._id,
                                variantTitle: item.selectedVariant?.title,
                                metadata: item.metadata
                              }));
                              const orderPayload: Omit<Order, 'id'> = {
                                customerName: `${dynamicForm.firstName || ''} ${dynamicForm.lastName || ''}`.trim() || 'Customer',
                                email: dynamicForm.email || '',
                                total,
                                subtotal,
                                tax: taxAmount,
                                shippingCost,
                                discountAmount,
                                couponCode: appliedCoupon?.code,
                                shippingMethodName: selectedShipping?.name,
                                status: 'Pending',
                                history: [{ status: 'Pending', date: new Date().toLocaleString(), note: 'Order created' }],
                                date: new Date().toISOString().split('T')[0],
                                items: cart.reduce((acc, item) => acc + (item.quantity || 1), 0),
                                lineItems,
                                paymentMethod,
                                orderData: {
                                  ...dynamicForm,
                                  shippingMethod: selectedShipping,
                                },
                                trackingEventId: createTrackingEventId(),
                                ...getFacebookBrowserIdentifiers(),
                                eventSourceUrl: typeof window !== 'undefined' ? window.location.href : undefined,
                                analyticsSessionId: getSessionId(),
                              } as any;
                              return orderPayload;
                            }}
                            onSuccess={(orderId) => {
                              stripe.clearStripe();
                              redirectingToOrderSuccess.current = true;
                              trackEvent('purchase', {
                                orderId,
                                value: total,
                                currency: storeConfig.currency,
                                lineItems: trackingLineItems,
                              });
                              clearCart();
                              addToast(t('order_placed_successfully') || 'Order placed successfully!', 'success');
                              navigate(orderId ? `/order-success?id=${orderId}` : '/order-success');
                            }}
                            onCancel={() => { stripe.clearStripe(); setPaymentMethod(''); }}
                            primaryStyle={{ backgroundColor: theme.primaryColor || '#000' }}
                            t={t}
                            language={language}
                          />
                        </div>
                      ) : null}
                    </div>
                  ) : shamCash.showShamCashForm ? (
                    <div className="animate-fade-in text-center p-8 bg-slate-50 rounded-3xl border border-slate-200">
                      {shamCash.loading ? (
                        <div className="py-12">
                          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin mx-auto mb-4" />
                          <p className="font-bold text-slate-400">{t('loading') || 'Loading...'}</p>
                        </div>
                      ) : shamCash.hasIntent && shamCash.intent ? (
                          <ShamCashPaymentStep
                            intent={shamCash.intent}
                            formatPrice={formatPrice}
                            total={total}
                            language={language}
                            onReceiptReady={shamCash.setReceipt}
                            primaryStyle={{ backgroundColor: theme.primaryColor || '#000' }}
                            t={t}
                          />
                      ) : null}
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {activePaymentMethods.length === 0 ? (
                        <div className="p-12 text-center text-slate-400 border-2 border-dashed border-slate-100 rounded-3xl">
                          <p className="font-bold">{t('no_payment_methods_available') || 'No payment methods available.'}</p>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-3">
                          {activePaymentMethods.map((method: any) => {
                            const isSelected = paymentMethod === method.id;
                            const isCod = method.id === 'cod' || method.flow === 'offline' || (method.name && (String(method.name).toLowerCase().includes('cash') || String(method.name).toLowerCase().includes('cod')));
                            const supportsCards = method.cardBrands && method.cardBrands.length > 0;
                            const isCard = supportsCards || method.id === 'stripe' || method.id === 'lahza' || method.id === 'paypal' || method.name?.toLowerCase().includes('card') || method.name?.toLowerCase().includes('فيزا');
                            const isWallet = method.id === 'shamcash' || method.name?.toLowerCase().includes('wallet') || method.name?.toLowerCase().includes('محفظة');
                            
                            return (
                              <div
                                key={method.id}
                                onClick={() => !isSubmitting && setPaymentMethod(method.id)}
                                className={`flex items-center justify-between px-6 py-5 border-2 rounded-2xl transition-all duration-300 relative group cursor-pointer ${
                                  isSelected ? 'border-slate-900 bg-slate-50/50 ring-4 ring-slate-900/5' : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50/30'
                                }`}
                              >
                                <div className="flex items-center gap-5">
                                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                    isSelected ? 'bg-slate-900 border-slate-900' : 'border-slate-200 group-hover:border-slate-300'
                                  }`}>
                                    {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                                  </div>
                                  
                                  <div className="flex flex-col items-start translate-y-[1px]">
                                    <p className="font-black text-slate-900 text-[13px] uppercase tracking-tight leading-none mb-2">{getPaymentMethodLabel(method) || method.name}</p>
                                    <div className="flex items-center gap-2">
                                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                                        {isCod ? (t('pay_on_delivery') || 'Pay on Delivery') :
                                         isWallet ? (t('digital_wallet') || 'Digital Wallet') :
                                         (t('credit_debit_card') || 'Credit / Debit Card')}
                                      </p>
                                      {isCard && <div className="w-1 h-1 rounded-full bg-slate-200" />}
                                      {isCard && <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">VISA / Master</p>}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-4">
                                  {isCard && <PaymentMethodLogos size={28} className="opacity-90 grayscale group-hover:grayscale-0 transition-all" />}
                                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                                    isSelected ? 'bg-white text-slate-900 shadow-sm' : 'bg-slate-50 text-slate-400'
                                  }`}>
                                    {isCod ? <Truck className="w-4 h-4" /> : 
                                     isWallet ? <Smartphone className="w-4 h-4" /> :
                                     <CreditCard className="w-4 h-4" />}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {paymentMethod && (() => {
                        const selectedMethod = activePaymentMethods.find((m: any) => m.id === paymentMethod);
                        const isStripe = selectedMethod?.id === 'stripe';
                        const isShamCash = selectedMethod?.id === 'shamcash';
                        const isCod = selectedMethod?.id === 'cod' || selectedMethod?.flow === 'offline' || (selectedMethod?.name && (String(selectedMethod.name).toLowerCase().includes('cash') || String(selectedMethod.name).toLowerCase().includes('cod')));
                        
                        if (!isStripe && !isShamCash) {
                          return (
                            <div className={`p-8 rounded-[2rem] border animate-fade-in shadow-sm ${isCod ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-900 border-slate-900'}`}>
                              <div className="flex items-center gap-4 mb-3 justify-center text-center">
                                {isCod ? <Truck className="w-6 h-6 text-emerald-600" /> : <Shield className="w-6 h-6 text-white" />}
                                <p className={`font-black text-lg ${isCod ? 'text-emerald-800' : 'text-white'}`}>
                                  {getPaymentMethodLabel(selectedMethod) || selectedMethod?.name} {t('ready_to_confirmation') || 'Ready to Confirmation'}
                                </p>
                              </div>
                              <p className={`text-sm font-medium leading-relaxed max-w-md mx-auto text-center ${isCod ? 'text-emerald-600' : 'text-slate-400'}`}>
                                {getPaymentMethodDescription(selectedMethod) || (language === 'ar' 
                                  ? 'اضغط على زر "تأكيد الطلب" في الأسفل للمتابعة.' 
                                  : 'Click the "Confirm Order" button below to proceed.')}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-8 pt-8 border-t border-slate-100">
                <div className="flex flex-col-reverse sm:flex-row justify-between items-center gap-6">
                  <div className="w-full sm:w-auto">
                    {(!stripe.showStripeForm && (!shamCash.showShamCashForm || shamCash.canSubmit)) && (
                      <button
                        type="submit"
                        disabled={isSubmitting || (step === 2 && !selectedShipping) || (step === 3 && !paymentMethod)}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-10 py-4 rounded-xl text-white font-black uppercase tracking-[0.2em] text-[13px] shadow-xl shadow-slate-200 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-30 disabled:pointer-events-none bg-slate-900"
                      >
                        {isSubmitting && step === 3 ? (
                          <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        ) : (
                          <Shield className="w-4 h-4" />
                        )}
                        <span>
                          {isSubmitting && step === 3
                            ? (t('processing') || 'Processing...')
                            : step < 3
                              ? (t('continue_to_next_step') || 'Continue to next step')
                              : (t('confirm_order') || 'Confirm Order')}
                        </span>
                      </button>
                    )}
                  </div>

                  {step > 1 && !stripe.showStripeForm && !shamCash.showShamCashForm && (
                    <button 
                      type="button" 
                      onClick={() => { setStep((step - 1) as any); window.scrollTo({ top: 0, behavior: 'smooth' }); }} 
                      className="group flex items-center gap-3 text-slate-400 font-bold uppercase text-[10px] tracking-[0.1em] hover:text-slate-900 transition-all transition-colors"
                    >
                      <span>{t('return_to_previous_step') || 'Return to previous step'}</span>
                      <div className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center group-hover:border-slate-900 group-hover:bg-slate-50 transition-all">
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </button>
                  )}
                </div>

                <div className="p-6 rounded-2xl bg-slate-50/50 border border-slate-100 text-center">
                  <p className="text-[10px] text-slate-500 font-medium leading-relaxed max-w-xl mx-auto">
                    {t('checkout_policy_agreement_prefix') || 'By placing your order, you agree to our'}
                    {' '}
                    {CHECKOUT_POLICY_LINKS.map((p, i) => (
                      <React.Fragment key={p.slug}>
                        <Link to={policyHref(p.slug)} className="text-slate-900 font-bold underline hover:no-underline decoration-1 underline-offset-2">{language === 'ar' ? p.labelAr : p.labelEn}</Link>
                        {i < CHECKOUT_POLICY_LINKS.length - 1 && (t('and_word') || ' and ')}
                      </React.Fragment>
                    ))}
                  </p>
                </div>
              </div>
            </form>
          </div>

          <div className="lg:col-span-4 space-y-5 lg:sticky lg:top-24">
            <div className="bg-white p-8 rounded-[1.5rem] border border-slate-200 shadow-sm">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-8 pb-4 border-b border-slate-50 flex items-center justify-between">
                <span>{t('order_summary')}</span>
                <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-[10px] font-black flex items-center justify-center border-2 border-white shadow-sm">
                  {cart.reduce((acc, item) => acc + (item.quantity || 1), 0)}
                </span>
              </h2>

              <div className="space-y-4 mb-8 max-h-[35vh] overflow-y-auto custom-scrollbar pe-2">
                {cart.map((item, idx) => (
                  <div key={idx} className="flex gap-4 group">
                    <div className="w-16 h-16 bg-slate-50 rounded-xl overflow-hidden shrink-0 border border-slate-100 relative shadow-sm">
                      {(item.selectedVariant?.image || item.image) && String(item.selectedVariant?.image || item.image).trim() !== '' ? (
                        <img src={item.selectedVariant?.image || item.image} alt={item.name} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300 font-bold" aria-hidden>{item.name?.charAt(0) || '?'}</div>
                      )}
                      <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-slate-900 text-white text-[9px] font-black flex items-center justify-center border-2 border-white">
                        {item.quantity || 1}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <p className="font-bold text-slate-900 text-sm truncate leading-tight mb-0.5">{item.name}</p>
                      <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider truncate mb-1">{item.selectedVariant?.title || item.category}</p>
                      <div>
                        <p className="text-sm font-black text-slate-900">
                          {formatPrice((item.price) * (item.quantity || 1))}
                        </p>
                        {(() => {
                          const compareAt = item.selectedVariant?.compareAtPrice ?? item.compareAtPrice;
                          return compareAt && compareAt > item.price ? (
                            <p className="text-xs text-slate-400 line-through">
                              {formatPrice(compareAt * (item.quantity || 1))}
                            </p>
                          ) : null;
                        })()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mb-6">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 block">
                  {t('discount_code') || 'Discount Code'}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(sanitizePlainTextInput(e.target.value).toUpperCase())}
                    placeholder={t('enter_code_here') || 'Enter code here...'}
                    className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 outline-none transition-all font-bold text-slate-900 uppercase text-sm placeholder:normal-case placeholder:font-medium placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    disabled={!couponInput.trim()}
                    className="px-6 py-3 bg-slate-900 text-white font-bold rounded-xl shadow-md shadow-slate-200 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm whitespace-nowrap"
                  >
                    {t('apply') || 'Apply'}
                  </button>
                </div>
                {appliedCoupon && (
                  <div className="mt-3 p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-between animate-fade-in">
                    <div className="flex items-center gap-2 text-emerald-700 text-xs font-bold">
                      <Tag className="w-4 h-4" />
                      <span>{appliedCoupon.code}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => { removeCoupon(); setCouponInput(''); }}
                      className="text-emerald-600 hover:text-emerald-800 font-bold text-xs bg-emerald-100/50 px-2 py-1 rounded-md hover:bg-emerald-100 transition-colors"
                    >
                      {t('remove') || 'Remove'}
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-3.5 pt-6 border-t border-slate-50">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-400 uppercase tracking-widest text-[9px]">{t('subtotal')}</span>
                  <span className="font-bold text-slate-900">{formatPrice(subtotal)}</span>
                </div>

                {catalogDiscountAmount > 0 && (
                  <div className="flex justify-between items-center text-xs text-emerald-600">
                    <span className="font-bold uppercase tracking-widest text-[9px]">{t('catalog_discount') || 'Catalog discount'}</span>
                    <span className="font-black">-{formatPrice(catalogDiscountAmount)}</span>
                  </div>
                )}
                
                {appliedCoupon && (
                  <div className="flex justify-between items-center text-xs text-emerald-600">
                    <span className="font-bold uppercase tracking-widest text-[9px]">{t('discount_label')}</span>
                    <span className="font-black">-{formatPrice(discountAmount)}</span>
                  </div>
                )}

                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-400 uppercase tracking-widest text-[9px]">{t('shipping')}</span>
                  <span className={`font-black ${effectiveShippingCost === 0 ? 'text-emerald-500' : 'text-slate-900'}`}>
                    {effectiveShippingCost === 0 ? (t('shipping_free') || 'FREE') : formatPrice(effectiveShippingCost)}
                  </span>
                </div>

                {storeConfig.tax?.enabled && taxAmount > 0 && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-400 uppercase tracking-widest text-[9px]">{t('tax') || (language === 'ar' ? 'الضريبة' : 'Tax')}</span>
                    <span className="font-bold text-slate-900">{formatPrice(taxAmount)}</span>
                  </div>
                )}

                <div className="pt-6 mt-4 border-t font-sans">
                  <div className="flex justify-between items-end">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-0.5">{t('total')}</span>
                      <span className="text-[9px] text-slate-300 font-bold">
                        {storeConfig.tax?.pricesIncludeTax ? (t('inc_tax') || 'Inc. Tax') : ''}
                      </span>
                    </div>
                    <span className="text-3xl font-black tracking-tighter text-slate-900">
                      {formatPrice(total)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;

