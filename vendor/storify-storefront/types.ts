
export enum PluginType {
  PAYMENT = 'PAYMENT',
  SHIPPING = 'SHIPPING',
  MARKETING = 'MARKETING',
  ANALYTICS = 'ANALYTICS',
  COMMUNICATION = 'COMMUNICATION'
}

export interface Plugin {
  id: string;
  name: string;
  description: string;
  type: PluginType;
  installed: boolean;
  icon: string;
  settings?: Record<string, string>;
}

export interface StorefrontAppRuntime {
  type: 'analytics' | 'script' | 'admin-only';
  provider?: string;
  storefront?: boolean;
}

export interface StorefrontApp {
  appKey: string;
  category: string;
  runtime: StorefrontAppRuntime;
  config: Record<string, unknown>;
}

export interface ProductOption {
  id: string;
  name: string;
  values: string[];
}

export interface ProductVariant {
  id: string;
  title: string;
  price: number;
  compareAtPrice?: number;
  catalogPromotionId?: string;
  stock: number;
  sku: string;
  image?: string; // Image URL for this specific variant
}

export interface Review {
  id: string;
  productId: string;
  customerName: string;
  rating: number;
  comment: string;
  date: string;
  status: 'Pending' | 'Approved' | 'Rejected';
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  productCount: number;
  products?: Product[];
}

export interface Market {
  id: string;
  name: string;
  countries: string[];
  /** للماركت: مدن مفعّلة لكل دولة (مثلاً IL: ['cityId1'], PS: ['cityId2']) */
  citiesByCountry?: Record<string, string[]>;
  currency: Currency;
  language: Language;
  active: boolean;
}

export interface ShippingMethod {
  id: string;
  name: string;
  description?: string;
  price: number;
  estimatedDays?: string;
  active: boolean;
  marketId: string; // Linked to a specific market
}

/** Shipping rate within a zone (admin: flat or conditional by price/weight) */
export interface ShippingRate {
  id: string;
  name: string;
  price: number;
  type: 'flat' | 'weight' | 'price';
  minPrice?: number;
  maxPrice?: number;
}

/** Shipping zone: regions (country names) + rates */
export interface ShippingZone {
  id: string;
  name: string;
  regions: string[];
  /** عند وجوده: المناطق تشمل مدن محددة فقط (مثلاً IL: ['tel-aviv','jerusalem']) */
  citiesByCountry?: Record<string, string[]>;
  rates: ShippingRate[];
}

export interface PaymentMethod {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  active: boolean;
  appId?: string; // ID of the installed app
  settings?: Record<string, any>; // Payment gateway settings
}

export interface CheckoutField {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'number' | 'textarea' | 'select' | 'checkbox' | 'date' | 'time' | 'url';
  required: boolean;
  enabled: boolean;
  order: number;
  placeholder?: string;
  options?: string[]; // For select type
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

export interface OrderStatusHistory {
  status: string;
  date: string;
  note?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  image: string;
  images: string[];
  /** Optional product videos (URLs) */
  videos?: string[];
  category: string; // Keep for backward compatibility
  /** Primary category id from API (for filters / ?category=) */
  categoryId?: string;
  /** All category ids linked via ProductCategory */
  categoryIds?: string[];
  categories?: string[]; // New: multiple categories
  status: 'Active' | 'Draft' | 'Archived';
  price: number;
  compareAtPrice?: number;
  costPerItem?: number;
  stock: number;
  sku?: string;
  barcode?: string;
  trackQuantity?: boolean;
  sellWhenOutOfStock?: boolean; // Allow selling even when stock is 0
  weight?: number;
  weightUnit?: 'kg' | 'lb';
  hasVariants?: boolean;
  options?: ProductOption[];
  variants?: ProductVariant[];
  selectedVariant?: ProductVariant;
  quantity?: number;
  reviews?: Review[];
  rating?: number;
  seoTitle?: string;
  seoDescription?: string;
  tags?: string[];
}

export interface OrderLineItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  variantTitle?: string;
}

export interface Order {
  id: string;
  customerName: string;
  total: number;
  subtotal: number;
  tax: number;
  shippingCost: number;
  discountAmount?: number;
  couponCode?: string;
  shippingMethodName?: string;
  status: 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';
  history: OrderStatusHistory[];
  date: string;
  items: number;
  lineItems?: OrderLineItem[];
  paymentMethod?: string; // Payment method ID
  email?: string;
  isInternal?: boolean; // Internal order created by admin
  notes?: string; // Internal notes for the order
  orderData?: Record<string, any>; // Custom checkout fields data (country, city, and all custom fields)
  trackingEventId?: string;
  fbp?: string;
  fbc?: string;
  eventSourceUrl?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  shippedAt?: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  cityId?: string;
  country?: string;
  countryCode?: string;
  postalCode?: string;
  profileData?: Record<string, any>;
  totalSpent: number;
  ordersCount: number;
  lastOrder: string;
  status: 'Active' | 'Inactive';
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  message: string;
  date: string;
  read: boolean;
}

export interface NewsletterSubscriber {
  id: string;
  email: string;
  date: string;
}

export interface ActivityLog {
  id: string;
  action: string;
  details: string;
  user: string;
  date: string;
}

export interface Discount {
  id: string;
  code: string;
  percentage: number;
  usageCount: number;
  status: 'Active' | 'Expired';
  usageLimit?: number;
  startsAt?: string;
  endsAt?: string;
  minSubtotal?: number;
}

export interface MenuItemDisplay {
  id: string;
  label: string;
  url: string;
  openInNewTab?: boolean;
  depth?: number;
}

export interface MenuDisplay {
  id: string;
  title: string;
  handle: string;
  items: MenuItemDisplay[];
}

export interface HeaderSettings {
  sticky?: boolean;
  backgroundColor?: string;
  showWishlist?: boolean;
  showCart?: boolean;
  height?: 'compact' | 'normal' | 'large';
  showLogo?: boolean;
  navAlign?: 'left' | 'center' | 'right';
}

export interface ThemeConfig {
  id: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: 'sans' | 'serif' | 'cairo';
  layout: LayoutSection[];
  borderRadius: string;
  headerMenuHandle?: string | null;
  headerSettings?: HeaderSettings | null;
  footerMenuHandle?: string | null;
  footerMenuHandles?: (string | null)[] | null;
  pages?: {
    [pageName: string]: {
      layout: LayoutSection[];
    };
  };
  /** Uploaded theme (developer dist from R2) — when set, storefront may render theme from baseUrl */
  uploadedThemeId?: string | null;
  uploadedThemeBaseUrl?: string | null;
  /** Display name from uploaded theme manifest (e.g. "The King", "StoreDesign") */
  uploadedThemeName?: string | null;
  /** Slug for section registry (theking | storedesign | default-storefront) — من الـ API، يعرض تصميم الثيم بدون VITE_THEME_SLUG */
  uploadedThemeSlug?: string | null;
  uploadedThemeLayout?: unknown[] | null;
  /** Theme settings from settingsSchema (passed to uploaded theme iframe) */
  uploadedThemeSettings?: Record<string, unknown> | null;
}

/** Runtime theme instance config per store + theme, saved as JSON in R2. */
export interface ThemeInstanceConfig {
  /** Uploaded theme id (e.g. th_xxx). */
  themeId: string;
  /** Store / tenant id that owns this configuration. */
  storeId: string;
  /** Optional theme version from manifest. */
  version?: string;
  /** Languages supported by this theme instance (usually from manifest.languages). */
  languages: string[];
  /** Default language code (e.g. "ar" أو "en"). */
  defaultLanguage: string;
  /**
   * Theme-level settings derived from themeSettingsSchema.
   * - للحقل localizable: القيمة تكون عادةً كائن { [lang]: value }.
   * - للحقل العادي: القيمة تكون مباشرة (string/number/..).
   */
  settings: Record<string, unknown>;
  /**
   * Per-page layout and section content.
   * Each layout item corresponds إلى handle معيّن على صفحة معيّنة.
   */
  pages: Record<
    string,
    {
      layout: LayoutSection[];
    }
  >;
}

export interface LayoutSection {
  id: string;
  type: 'HERO' | 'SLIDESHOW' | 'FEATURED_PRODUCTS' | 'CATEGORIES' | 'NEWSLETTER' | 'FOOTER' | 'IMAGE_WITH_TEXT' | 'TESTIMONIALS' | 'EMPTY_STATE' | 'PRODUCT_DETAILS_SETTINGS' | 'PRODUCT_REVIEWS' | 'HEADER' | 'SHOP_PAGE' | 'ABOUT_PAGE' | 'CONTACT_PAGE' | 'WISHLIST_PAGE' | 'TRACK_ORDER_PAGE' | 'PROFILE_PAGE' | 'POLICY_PAGE';
  enabled: boolean;
  content?: {
    // Common fields
    title?: string;
    subtitle?: string;
    
    // Featured Products
    count?: number;
    columns?: number;
    source?: 'best_selling' | 'newest' | 'collection';
    collectionId?: string;
    
    // Categories
    showAll?: boolean;
    categoryId?: string;
    
    // Other fields (flexible for different section types)
    [key: string]: any;
  }; 
}

export interface StoreConfig {
  name: string;
  email: string;
  phone: string;
  address: string;
  logo?: string;
  favicon?: string;
  /** وصف الموقع للـ SEO والمشاركة (meta description, og:description) */
  metaDescription?: string;
  storefrontUrl?: string;
  currency?: Currency;
  /** Symbol / fraction digits for price display (from store settings). */
  currencyFormat?: { symbol?: string | null; decimalPlaces?: number | null } | null;
  language?: Language;
  defaultLanguage?: Language;
  baseLocale?: Language;
  activeLanguage?: Language;
  enabledLanguages?: StorefrontLanguage[];
  rtl?: boolean;
  markets: Market[];
  checkoutFields: CheckoutField[];
  tax: {
    enabled: boolean;
    rate: number;
    pricesIncludeTax: boolean;
  };
  shipping: {
    methods: ShippingMethod[];
    freeShippingThreshold: number;
    /** Zones + rates (tempcode-style); when present, checkout derives methods from zones by country + conditions */
    zones?: ShippingZone[];
    storeLocation?: string;
  };
  payment: {
    methods: PaymentMethod[];
  };
  policies: {
    returnExchange?: string;
    privacy?: string;
    terms?: string;
    shipping?: string;
    refund?: string;
  };
}

export type Language = string;
export type Currency = string;

export interface StorefrontLanguage {
  id?: string;
  code: Language;
  name: string;
  nativeName?: string | null;
  direction?: 'rtl' | 'ltr' | string;
  isActive?: boolean;
  isDefault?: boolean;
  publishedAt?: string | null;
}

export interface Country {
  id: string;
  name: string;
  nameAr?: string;
  code: string;
  createdAt?: string;
  updatedAt?: string;
  _count?: {
    cities: number;
  };
  cities?: City[];
}

export interface City {
  id: string;
  name: string;
  nameAr?: string;
  zone?: string;
  countryId?: string;
  countryCode?: string;
  createdAt?: string;
  country?: {
    id: string;
    name: string;
    nameAr?: string;
    code: string;
  };
}

export interface MarketRegion {
  id?: string;
  marketId: string;
  countryCode: string;
  countryName: string;
  countryNameAr?: string;
  cityIds: string[];
  cities?: Array<{
    id: string;
    name: string;
    nameAr?: string;
  }>;
  createdAt?: string;
  updatedAt?: string;
}

export interface StoreLoadStatus {
  productsFailed: boolean;
  categoriesFailed: boolean;
  themeFailed: boolean;
  menusFailed: boolean;
}

export interface StoreContextType {
  products: Product[];
  addProduct: (product: Product) => Promise<void>;
  updateProduct: (product: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  orders: Order[];
  addOrder: (order: Order | Omit<Order, 'id'>) => Promise<Order | null>;
  updateOrder: (order: Order) => Promise<void>;
  deleteOrder: (id: string) => Promise<void>;
  customers: Customer[];
  categories: Category[];
  addCategory: (name: string, description?: string, image?: string) => Promise<Category>;
  updateCategory: (id: string, data: { name?: string; description?: string; image?: string }) => Promise<Category>;
  deleteCategory: (id: string) => Promise<void>;
  discounts: Discount[];
  addDiscount: (discount: Discount) => Promise<void>;
  deleteDiscount: (id: string) => Promise<void>;
  plugins: Plugin[];
  togglePlugin: (id: string) => void;
  configurePlugin: (id: string, settings: Record<string, string>) => void;
  theme: ThemeConfig;
  updateTheme: (newTheme: ThemeConfig) => Promise<void>;
  /** Re-fetch theme from API (e.g. when storeId in URL changes). */
  refreshTheme: () => Promise<void>;
  /** true حتى اكتمال تحميل القالب والإعدادات (bootstrap) — نعرض شاشة تحميل بدل التصميم الثابت */
  loading: boolean;
  loadStatus: StoreLoadStatus;
  /** From bootstrap or StoreFront fetch — avoids extra round-trips for uploaded theme */
  uploadedThemeConfig: ThemeInstanceConfig | null;
  themeLangConfig: { language: string; settings: Record<string, unknown>; sections: Record<string, Record<string, unknown>> } | null;
  /** Prefetched theme HTML from bootstrap to eliminate waterfall. */
  themeHtml: string | null;
  /** Public, non-sensitive app runtime payload from bootstrap. */
  storefrontApps: StorefrontApp[];
  setUploadedThemeData: (config: ThemeInstanceConfig | null, lang: { language: string; settings: Record<string, unknown>; sections: Record<string, Record<string, unknown>> } | null, html?: string | null) => void;
  headerMenu: MenuDisplay | null;
  /** Footer has 3 columns; each slot can be a menu or null */
  footerMenus: (MenuDisplay | null)[];
  cart: Product[];
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string, variantId?: string) => void;
  updateQuantity: (productId: string, quantity: number, variantId?: string) => void;
  clearCart: () => void;
  appliedCoupon: Discount | null;
  applyCoupon: (code: string) => Promise<{ success: boolean; reason?: string }>;
  removeCoupon: () => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  baseLocale: Language;
  enabledLanguages: StorefrontLanguage[];
  isRtl: boolean;
  localizationLoaded: boolean;
  currency: Currency;
  setCurrency: (curr: Currency) => void;
  t: (key: string) => string;
  /** Raw translation dictionary loaded for the active language (key → translated value).
   *  Useful when the dictionary itself needs to be forwarded to an embedded surface
   *  (e.g. uploaded theme runtime payload). */
  translations: Record<string, string>;
  formatPrice: (price: number) => string;
  storeConfig: StoreConfig;
  updateStoreConfig: (config: StoreConfig) => Promise<StoreConfig>;
  wishlist: Product[];
  toggleWishlist: (product: Product) => void;
  addReview: (productId: string, review: Omit<Review, 'id' | 'date' | 'status'>) => Promise<void>;
  updateReviewStatus: (productId: string, reviewId: string, status: Review['status']) => Promise<void>;
  messages: ContactMessage[];
  addMessage: (msg: Omit<ContactMessage, 'id' | 'date' | 'read'>) => Promise<void>;
  markMessageRead: (id: string) => Promise<void>;
  currentUser: Customer | null;
  login: (name: string, email: string) => Promise<void>;
  logout: () => void;
  subscribers: NewsletterSubscriber[];
  addSubscriber: (email: string) => Promise<void>;
  logs: ActivityLog[];
  addLog: (action: string, details: string) => Promise<void>;
}
