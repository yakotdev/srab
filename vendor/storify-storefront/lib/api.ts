import { Product, Order, Customer, Category, Review, Discount, ContactMessage, NewsletterSubscriber, ActivityLog, StoreConfig, ThemeConfig, ThemeInstanceConfig, Plugin, PluginType, Country, City, MarketRegion, Market, StorefrontApp } from '../types';
import { getResolvedStoreId, withStoreIdInGetPath } from './store-id';

// Use relative URL for API (same domain as storefront)
// This works because Engine serves both storefront and API on the same domain
const API_URL = import.meta.env.VITE_API_URL || '/api';

// Debug: Log API URL in development
if (import.meta.env.DEV) {
  console.log('🔗 API URL:', API_URL);
}

export function getStoreId(): string | null {
  return getResolvedStoreId();
}

function getPathLanguage(): string | null {
  if (typeof window === 'undefined') return null;
  const firstSegment = window.location.pathname.split('/').filter(Boolean)[0];
  if (!firstSegment) return null;
  if (!/^[a-z]{2}(?:-[a-z]{2})?$/i.test(firstSegment)) return null;
  return firstSegment.toLowerCase().split('-')[0] || null;
}

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const method = (options?.method ?? 'GET').toUpperCase();
  const pathForRequest = method === 'GET' ? withStoreIdInGetPath(endpoint) : endpoint;
  const url = `${API_URL}${pathForRequest}`;

  // NEW: Cookies sent automatically, but keep header for backward compat
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options?.headers,
  };

  // Backend (unified) requires X-Store-Id; send when we know the store (Engine inject or subdomain)
  const storeId = getStoreId();
  if (storeId) {
    (headers as Record<string, string>)['X-Store-Id'] = storeId;
  }

  // LEGACY: Only add Authorization header if token in localStorage
  // This supports old clients during migration
  // Check if we should use cookie auth (default to true for new clients)
  const useCookieAuth = import.meta.env.VITE_USE_COOKIE_AUTH !== 'false';

  if (!useCookieAuth) {
    const token = localStorage.getItem('auth_token');
    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include', // NEW: Required for cookies
    });

    if (!response.ok) {
      let message = `Request failed (${response.status})`;
      const ct = response.headers.get('content-type') || '';
      try {
        if (ct.includes('application/json')) {
          const error = await response.json();
          message =
            (error && (error.message || error.error || error.msg)) ||
            (typeof error === 'string' ? error : message);
        } else {
          const text = await response.text();
          if (text?.trim()) message = text.slice(0, 200);
        }
      } catch {
        /* keep default message */
      }
      throw new ApiError(response.status, message);
    }

    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    // Network error or connection refused
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new ApiError(0, 'Cannot connect to server. Please make sure the backend is running.');
    }
    throw error;
  }
}

// Products API
export const productsApi = {
  getAll: (params?: { category?: string; status?: string; search?: string }): Promise<Product[]> => {
    const query = new URLSearchParams();
    if (params?.category) query.append('category', params.category);
    if (params?.status) query.append('status', params.status);
    if (params?.search) query.append('search', params.search);
    const language = getPathLanguage();
    if (language) query.append('language', language);
    return fetchApi<Product[]>(`/products?${query.toString()}`);
  },
  getById: (id: string): Promise<Product> => {
    const language = getPathLanguage();
    const query = language ? `?language=${encodeURIComponent(language)}` : '';
    return fetchApi<Product>(`/products/${id}${query}`);
  },
  getBestSelling: (limit: number = 10): Promise<Product[]> => {
    const query = new URLSearchParams({ limit: String(limit) });
    const language = getPathLanguage();
    if (language) query.append('language', language);
    return fetchApi<Product[]>(`/products/best-selling?${query.toString()}`);
  },
  getNewest: (limit: number = 10): Promise<Product[]> => {
    const query = new URLSearchParams({ limit: String(limit) });
    const language = getPathLanguage();
    if (language) query.append('language', language);
    return fetchApi<Product[]>(`/products/newest?${query.toString()}`);
  },
  getByCollection: (collectionId: string): Promise<Product[]> => {
    const language = getPathLanguage();
    const query = language ? `?language=${encodeURIComponent(language)}` : '';
    return fetchApi<Product[]>(`/products/collection/${collectionId}${query}`);
  },
  create: (product: Omit<Product, 'id'>): Promise<Product> => {
    return fetchApi<Product>('/products', {
      method: 'POST',
      body: JSON.stringify(product),
    });
  },
  update: (id: string, product: Partial<Product>): Promise<Product> => {
    return fetchApi<Product>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(product),
    });
  },
  delete: (id: string): Promise<void> => {
    return fetchApi<void>(`/products/${id}`, {
      method: 'DELETE',
    });
  },
};

// Orders API
export const ordersApi = {
  getAll: (params?: { status?: string; customerId?: string }): Promise<Order[]> => {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.customerId) query.append('customerId', params.customerId);
    return fetchApi<Order[]>(`/orders?${query.toString()}`);
  },
  getById: (id: string): Promise<Order> => {
    return fetchApi<Order>(`/orders/${id}`);
  },
  create: (order: Omit<Order, 'id' | 'date'> & { return_url?: string }): Promise<Order | { order: Order; clientSecret?: string; redirectUrl?: string; paymentIntentId?: string }> => {
    return fetchApi<Order | { order: Order; clientSecret?: string; redirectUrl?: string; paymentIntentId?: string }>('/orders', {
      method: 'POST',
      body: JSON.stringify(order),
    });
  },
  update: (id: string, order: Partial<Order>): Promise<Order> => {
    return fetchApi<Order>(`/orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(order),
    });
  },
  delete: (id: string): Promise<void> => {
    return fetchApi<void>(`/orders/${id}`, {
      method: 'DELETE',
    });
  },
};

// Checkout API (public storefront) — استدعاءات Stripe في وحدة StripePayment فقط
export const checkoutApi = {};

// Customers API
export const customersApi = {
  getAll: (): Promise<Customer[]> => {
    return fetchApi<Customer[]>('/customers');
  },
  getById: (id: string): Promise<Customer> => {
    return fetchApi<Customer>(`/customers/${id}`);
  },
  create: (customer: Omit<Customer, 'id' | 'totalSpent' | 'ordersCount' | 'lastOrder'>): Promise<Customer> => {
    return fetchApi<Customer>('/customers', {
      method: 'POST',
      body: JSON.stringify(customer),
    });
  },
};

// Categories API
export const categoriesApi = {
  getAll: (): Promise<Category[]> => {
    const language = getPathLanguage();
    const query = language ? `?language=${encodeURIComponent(language)}` : '';
    return fetchApi<Category[]>(`/categories${query}`);
  },
  getById: (id: string): Promise<Category> => {
    const language = getPathLanguage();
    const query = language ? `?language=${encodeURIComponent(language)}` : '';
    return fetchApi<Category>(`/categories/${id}${query}`);
  },
  create: (data: { name: string; description?: string; image?: string }): Promise<Category> => {
    return fetchApi<Category>('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  update: (id: string, data: { name?: string; description?: string; image?: string }): Promise<Category> => {
    return fetchApi<Category>(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  updateProducts: (id: string, productIds: string[]): Promise<Category> => {
    return fetchApi<Category>(`/categories/${id}/products`, {
      method: 'PUT',
      body: JSON.stringify({ productIds }),
    });
  },
  delete: (id: string): Promise<void> => {
    return fetchApi<void>(`/categories/${id}`, {
      method: 'DELETE',
    });
  },
};

// Reviews API
export const reviewsApi = {
  getAll: (params?: { productId?: string; status?: string }): Promise<Review[]> => {
    const query = new URLSearchParams();
    if (params?.productId) query.append('productId', params.productId);
    if (params?.status) query.append('status', params.status);
    return fetchApi<Review[]>(`/reviews?${query.toString()}`);
  },
  create: (review: Omit<Review, 'id' | 'date' | 'status'>): Promise<Review> => {
    return fetchApi<Review>('/reviews', {
      method: 'POST',
      body: JSON.stringify(review),
    });
  },
  updateStatus: (id: string, status: Review['status']): Promise<Review> => {
    return fetchApi<Review>(`/reviews/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },
  delete: (id: string): Promise<void> => {
    return fetchApi<void>(`/reviews/${id}`, {
      method: 'DELETE',
    });
  },
};

// Discounts API
export const discountsApi = {
  getAll: (params?: { status?: string; code?: string }): Promise<Discount[]> => {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.code) query.append('code', params.code);
    return fetchApi<Discount[]>(`/discounts?${query.toString()}`);
  },
  getByCode: (code: string): Promise<Discount> => {
    return fetchApi<Discount>(`/discounts/${code}`);
  },
  create: (discount: Omit<Discount, 'id' | 'usageCount'>): Promise<Discount> => {
    return fetchApi<Discount>('/discounts', {
      method: 'POST',
      body: JSON.stringify(discount),
    });
  },
  update: (id: string, discount: Partial<Discount>): Promise<Discount> => {
    return fetchApi<Discount>(`/discounts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(discount),
    });
  },
  delete: (id: string): Promise<void> => {
    return fetchApi<void>(`/discounts/${id}`, {
      method: 'DELETE',
    });
  },
};

export interface CartDiscountPreview {
  ok: boolean;
  rejectReason?: string;
  merchandiseSubtotal: number;
  discountAmount: number;
  subtotalAfterDiscount: number;
  tax: number;
  shippingCost: number;
  shippingDiscount?: number;
  shippingCostAfterDiscount?: number;
  total: number;
  discountId?: string;
  couponCode?: string;
  discountPercentage?: number;
  lineAllocations: { lineIndex: number; amount: number }[];
}

/** Public cart discount preview (server source of truth). */
export const cartDiscountsApi = {
  preview: (body: {
    lines: { price: number; quantity: number; productId?: string; name?: string }[];
    couponCode?: string;
    shippingCost?: number;
    customerId?: string | null;
  }): Promise<CartDiscountPreview> =>
    fetchApi<CartDiscountPreview>('/cart/discounts/preview', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};

// Messages API
export const messagesApi = {
  getAll: (params?: { read?: boolean }): Promise<ContactMessage[]> => {
    const query = new URLSearchParams();
    if (params?.read !== undefined) query.append('read', params.read.toString());
    return fetchApi<ContactMessage[]>(`/messages?${query.toString()}`);
  },
  create: (message: Omit<ContactMessage, 'id' | 'date' | 'read'>): Promise<ContactMessage> => {
    return fetchApi<ContactMessage>('/messages', {
      method: 'POST',
      body: JSON.stringify(message),
    });
  },
  markRead: (id: string): Promise<ContactMessage> => {
    return fetchApi<ContactMessage>(`/messages/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ read: true }),
    });
  },
  delete: (id: string): Promise<void> => {
    return fetchApi<void>(`/messages/${id}`, {
      method: 'DELETE',
    });
  },
};

// Subscribers API
export const subscribersApi = {
  getAll: (): Promise<NewsletterSubscriber[]> => {
    return fetchApi<NewsletterSubscriber[]>('/subscribers');
  },
  /** Public storefront signup (no auth). Use this for "Join our community" form. */
  subscribePublic: (email: string): Promise<NewsletterSubscriber> => {
    return fetchApi<NewsletterSubscriber>('/subscribe', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },
  create: (email: string): Promise<NewsletterSubscriber> => {
    return fetchApi<NewsletterSubscriber>('/subscribers', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },
  delete: (id: string): Promise<void> => {
    return fetchApi<void>(`/subscribers/${id}`, {
      method: 'DELETE',
    });
  },
};

// Activity Logs API
export const activityLogsApi = {
  getAll: (limit?: number): Promise<ActivityLog[]> => {
    const query = new URLSearchParams();
    if (limit) query.append('limit', limit.toString());
    return fetchApi<ActivityLog[]>(`/activity-logs?${query.toString()}`);
  },
  create: (log: Omit<ActivityLog, 'id' | 'date'>): Promise<ActivityLog> => {
    return fetchApi<ActivityLog>('/activity-logs', {
      method: 'POST',
      body: JSON.stringify(log),
    });
  },
};

// Users API
export const usersApi = {
  getAll: (): Promise<any[]> => {
    return fetchApi<any[]>('/users');
  },
  getById: (id: string): Promise<any> => {
    return fetchApi<any>(`/users/${id}`);
  },
  create: (user: any): Promise<any> => {
    return fetchApi<any>('/users', {
      method: 'POST',
      body: JSON.stringify(user),
    });
  },
  update: (id: string, user: any): Promise<any> => {
    return fetchApi<any>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(user),
    });
  },
  delete: (id: string): Promise<void> => {
    return fetchApi<void>(`/users/${id}`, {
      method: 'DELETE',
    });
  },
};

// Store Config API
export const storeConfigApi = {
  get: (): Promise<StoreConfig> => {
    return fetchApi<StoreConfig>('/store-config');
  },
  update: (config: StoreConfig): Promise<StoreConfig> => {
    return fetchApi<StoreConfig>('/store-config', {
      method: 'PUT',
      body: JSON.stringify(config),
    });
  },
};

// Theme API
export const themeApi = {
  get: (): Promise<ThemeConfig> => {
    return fetchApi<ThemeConfig>('/theme');
  },
  update: (theme: ThemeConfig): Promise<ThemeConfig> => {
    return fetchApi<ThemeConfig>('/theme', {
      method: 'PUT',
      body: JSON.stringify(theme),
    });
  },
};

/** Response from GET /api/bootstrap — theme + storeConfig + uploaded theme config/lang in one round-trip */
export interface BootstrapResponse {
  theme: ThemeConfig;
  storeConfig: StoreConfig;
  uploadedThemeConfig?: ThemeInstanceConfig | null;
  themeLangConfig?: { language: string; settings: Record<string, unknown>; sections: Record<string, Record<string, unknown>> } | null;
  themeHtml?: string | null;
  storefrontApps?: StorefrontApp[];
}

export const bootstrapApi = {
  get: (opts?: { shell?: boolean }): Promise<BootstrapResponse> => {
    const query = new URLSearchParams();
    if (opts?.shell) query.set('shell', '1');
    const language = getPathLanguage();
    if (language) query.set('language', language);
    const suffix = query.toString();
    // Avoid stale storeConfig (e.g. currencyFormat) after admin saves — HTTP cache may honor max-age on /bootstrap.
    return fetchApi<BootstrapResponse>(suffix ? `/bootstrap?${suffix}` : '/bootstrap', { cache: 'no-store' });
  },
};

export interface MenuItemApi {
  id: string;
  label: string;
  url: string;
  sortOrder: number;
  openInNewTab: boolean;
  depth: number;
}

export interface MenuApi {
  id: string;
  title: string;
  handle: string;
  items: MenuItemApi[];
}

export const menusApi = {
  getByHandle: (handle: string): Promise<MenuApi> => {
    return fetchApi<MenuApi>(`/menus/by-handle?handle=${encodeURIComponent(handle)}`);
  },
};

// Theme Files API (for multi-tenant theme system)
export const themeFilesApi = {
  getStructure: (themeId: string, userId?: string): Promise<any> => {
    const query = userId ? `?userId=${encodeURIComponent(userId)}` : '';
    return fetchApi<any>(`/theme-files/${themeId}/structure${query}`);
  },
  readFile: (themeId: string, filePath: string, userId?: string): Promise<{ path: string; content: string }> => {
    const query = userId ? `?userId=${encodeURIComponent(userId)}` : '';
    const encodedPath = encodeURIComponent(filePath);
    return fetchApi<{ path: string; content: string }>(`/theme-files/${themeId}/file/${encodedPath}${query}`);
  },
  writeFile: (themeId: string, filePath: string, content: string, userId?: string): Promise<{ message: string; path: string }> => {
    const encodedPath = encodeURIComponent(filePath);
    return fetchApi<{ message: string; path: string }>(`/theme-files/${themeId}/file/${encodedPath}`, {
      method: 'PUT',
      body: JSON.stringify({ content, userId }),
    });
  },
  getConfig: (themeId: string, userId?: string): Promise<any> => {
    const query = userId ? `?userId=${encodeURIComponent(userId)}` : '';
    return fetchApi<any>(`/theme-files/${themeId}/config${query}`);
  },
  getSettings: (themeId: string, userId?: string): Promise<any> => {
    const query = userId ? `?userId=${encodeURIComponent(userId)}` : '';
    return fetchApi<any>(`/theme-files/${themeId}/settings${query}`);
  },
  getSchema: (themeId: string, userId?: string): Promise<any> => {
    const query = userId ? `?userId=${encodeURIComponent(userId)}` : '';
    return fetchApi<any>(`/theme-files/${themeId}/schema${query}`);
  },
  getAssets: (themeId: string, userId?: string): Promise<string[]> => {
    const query = userId ? `?userId=${encodeURIComponent(userId)}` : '';
    return fetchApi<string[]>(`/theme-files/${themeId}/assets${query}`);
  },
  getTemplate: (themeId: string, templateName: string, userId?: string): Promise<any> => {
    const query = userId ? `?userId=${encodeURIComponent(userId)}` : '';
    return fetchApi<any>(`/theme-files/${themeId}/template/${templateName}${query}`);
  },
  saveTemplate: (themeId: string, templateName: string, data: { sections?: any; order?: string[] }, userId?: string): Promise<{ message: string; templateName: string }> => {
    return fetchApi<{ message: string; templateName: string }>(`/theme-files/${themeId}/template/${templateName}`, {
      method: 'PUT',
      body: JSON.stringify({ ...data, userId }),
    });
  },
  getSections: (themeId: string, userId?: string): Promise<any[]> => {
    const query = userId ? `?userId=${encodeURIComponent(userId)}` : '';
    return fetchApi<any[]>(`/theme-files/${themeId}/sections${query}`);
  },
};

// Plugins API
export const pluginsApi = {
  getAll: async (): Promise<Plugin[]> => {
    try {
      // Get all apps from new system (not just available, but also installed/active)
      // Use fetchApi helper to ensure proper authentication
      const apps = await fetchApi<any[]>('/apps');

      // Convert apps to plugins format
      const appsAsPlugins: Plugin[] = apps
        .filter((app: any) => app.type === 'COMMUNICATION' || app.type === 'PAYMENT' || app.type === 'SHIPPING' || app.type === 'MARKETING' || app.type === 'ANALYTICS')
        .map((app: any) => {
          const manifest = typeof app.manifest === 'object' && app.manifest !== null ? app.manifest : {};
          const plugin: any = {
            id: app.appId || app.id,
            name: app.name,
            description: app.description || '',
            type: (app.type === 'COMMUNICATION' ? PluginType.COMMUNICATION :
              app.type === 'PAYMENT' ? PluginType.PAYMENT :
                app.type === 'SHIPPING' ? PluginType.SHIPPING :
                  app.type === 'MARKETING' ? PluginType.MARKETING :
                    app.type === 'ANALYTICS' ? PluginType.ANALYTICS : PluginType.MARKETING) as PluginType,
            installed: app.status === 'installed' || app.status === 'active',
            icon: manifest.icon || '📦',
            settings: (app.settings && typeof app.settings === 'object' ? app.settings : {}) as Record<string, string>
          };
          // Add manifest to plugin for adminRoutes access
          plugin.manifest = manifest;
          return plugin;
        });

      // Also get old plugins
      try {
        const oldPlugins = await fetchApi<Plugin[]>('/plugins');
        return [...oldPlugins, ...appsAsPlugins];
      } catch {
        return appsAsPlugins;
      }
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 401)) {
        console.error('Failed to load apps:', error);
      }
      // Fallback to old plugins API
      try {
        return fetchApi<Plugin[]>('/plugins');
      } catch {
        return [];
      }
    }
  },
  create: (plugin: Omit<Plugin, 'id'>): Promise<Plugin> => {
    return fetchApi<Plugin>('/plugins', {
      method: 'POST',
      body: JSON.stringify(plugin),
    });
  },
  update: (id: string, plugin: Partial<Plugin>): Promise<Plugin> => {
    return fetchApi<Plugin>(`/plugins/${id}`, {
      method: 'PUT',
      body: JSON.stringify(plugin),
    });
  },
};

// Translations API
export interface Language {
  id: string;
  code: string;
  name: string;
  nativeName?: string | null;
  direction?: string;
  isActive: boolean;
  isDefault: boolean;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    translations: number;
  };
}

export interface TranslationKey {
  id: string;
  key: string;
  description?: string;
  category?: string;
  createdAt: string;
  updatedAt: string;
  translations?: Translation[];
}

export interface Translation {
  id: string;
  keyId: string;
  languageId: string;
  value: string;
  createdAt: string;
  updatedAt: string;
  key?: TranslationKey;
  language?: Language;
}

export interface TranslationsResponse {
  language: string;
  requestedLanguage?: string;
  baseLocale?: string;
  fallbackUsed?: boolean;
  sourceLanguage?: string;
  rtl?: boolean;
  translations: Record<string, string>;
}

export interface LocalizationContextResponse {
  storeId: string;
  requestedLanguage: string;
  activeLanguage: string;
  baseLocale: string;
  enabledLanguages: Language[];
  currency: string;
  rtl: boolean;
  fallbackUsed: boolean;
  sourceLanguage: string;
}

export const translationsApi = {
  getAll: (params?: { language?: string }): Promise<Translation[]> => {
    const query = new URLSearchParams();
    if (params?.language) query.append('language', params.language);
    return fetchApi<Translation[]>(`/translations?${query.toString()}`);
  },
  getByLanguage: (language: string): Promise<TranslationsResponse> => {
    return fetchApi<TranslationsResponse>(`/translations/${language}`, { cache: 'no-cache' });
  },
  getContext: (language?: string): Promise<LocalizationContextResponse> => {
    const query = new URLSearchParams();
    if (language) query.append('language', language);
    return fetchApi<LocalizationContextResponse>(`/translations/context?${query.toString()}`, { cache: 'no-cache' });
  },
  getKeys: (): Promise<TranslationKey[]> => {
    return fetchApi<TranslationKey[]>('/translations/keys/all');
  },
  getLanguages: (): Promise<Language[]> => {
    return fetchApi<Language[]>('/translations/languages/all');
  },
  createLanguage: (language: { code: string; name: string; nativeName?: string | null; direction?: string; isActive?: boolean; isDefault?: boolean }): Promise<Language> => {
    return fetchApi<Language>('/translations/languages', {
      method: 'POST',
      body: JSON.stringify(language),
    });
  },
  updateLanguage: (id: string, language: Partial<Language>): Promise<Language> => {
    return fetchApi<Language>(`/translations/languages/${id}`, {
      method: 'PUT',
      body: JSON.stringify(language),
    });
  },
  createKey: (key: { key: string; description?: string; category?: string }): Promise<TranslationKey> => {
    return fetchApi<TranslationKey>('/translations/keys', {
      method: 'POST',
      body: JSON.stringify(key),
    });
  },
  updateKey: (id: string, key: Partial<TranslationKey>): Promise<TranslationKey> => {
    return fetchApi<TranslationKey>(`/translations/keys/${id}`, {
      method: 'PUT',
      body: JSON.stringify(key),
    });
  },
  createTranslation: (translation: { key: string; languageCode: string; value: string }): Promise<Translation> => {
    return fetchApi<Translation>('/translations', {
      method: 'POST',
      body: JSON.stringify(translation),
    });
  },
  updateTranslation: (id: string, value: string): Promise<Translation> => {
    return fetchApi<Translation>(`/translations/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ value }),
    });
  },
  deleteTranslation: (id: string): Promise<void> => {
    return fetchApi<void>(`/translations/${id}`, {
      method: 'DELETE',
    });
  },
  deleteKey: (id: string): Promise<void> => {
    return fetchApi<void>(`/translations/keys/${id}`, {
      method: 'DELETE',
    });
  },
  getContentTranslations: (params?: { entityType?: string; entityId?: string; languageCode?: string; state?: string }): Promise<unknown[]> => {
    const query = new URLSearchParams();
    if (params?.entityType) query.append('entityType', params.entityType);
    if (params?.entityId) query.append('entityId', params.entityId);
    if (params?.languageCode) query.append('languageCode', params.languageCode);
    if (params?.state) query.append('state', params.state);
    return fetchApi<unknown[]>(`/translations/content/all?${query.toString()}`);
  },
  upsertContentTranslation: (translation: {
    entityType: string;
    entityId: string;
    languageCode: string;
    fieldKey: string;
    value: string;
    state?: string;
    sourceValue?: string;
  }): Promise<unknown> => {
    return fetchApi<unknown>('/translations/content', {
      method: 'POST',
      body: JSON.stringify(translation),
    });
  },
  publishContentTranslations: (payload: { languageCode: string; entityType?: string; entityId?: string }): Promise<{ count: number }> => {
    return fetchApi<{ count: number }>('/translations/content/publish', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};

// Market Regions API
export const marketRegionsApi = {
  getCountries: (params?: { includeCities?: boolean; code?: string }): Promise<Country[]> => {
    const query = new URLSearchParams();
    if (params?.includeCities) query.append('includeCities', 'true');
    if (params?.code) query.append('code', params.code);
    return fetchApi<{ success: boolean; data: Country[] }>(`/market-regions/countries?${query.toString()}`).then(res => res.data);
  },
  getCountry: (code: string): Promise<Country> => {
    return fetchApi<{ success: boolean; data: Country }>(`/market-regions/countries/${code}`).then(res => res.data);
  },
  getCities: (params?: { countryId?: string; countryCode?: string; search?: string; limit?: number; offset?: number }): Promise<{ data: City[]; count: number; total: number; hasMore: boolean }> => {
    const query = new URLSearchParams();
    if (params?.countryId) query.append('countryId', params.countryId);
    if (params?.countryCode) query.append('countryCode', params.countryCode);
    if (params?.search) query.append('search', params.search);
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.offset) query.append('offset', params.offset.toString());
    return fetchApi<{ success: boolean; data: { data: City[]; count: number; total: number; hasMore: boolean } }>(`/market-regions/cities?${query.toString()}`).then(res => res.data);
  },
  getRegions: (params?: { countryCode?: string; includeEmpty?: boolean }): Promise<Country[]> => {
    const query = new URLSearchParams();
    if (params?.countryCode) query.append('countryCode', params.countryCode);
    if (params?.includeEmpty) query.append('includeEmpty', 'true');
    return fetchApi<{ success: boolean; data: Country[] }>(`/market-regions/regions?${query.toString()}`).then(res => res.data);
  },
  getMarketRegions: (marketId: string): Promise<MarketRegion[]> => {
    return fetchApi<{ success: boolean; data: MarketRegion[] }>(`/market-regions/${marketId}`).then(res => res.data);
  },
  createRegion: (region: Omit<MarketRegion, 'id'>): Promise<MarketRegion> => {
    return fetchApi<{ success: boolean; data: MarketRegion }>('/market-regions', {
      method: 'POST',
      body: JSON.stringify(region),
    }).then(res => res.data);
  },
  updateRegion: (id: string, region: Partial<MarketRegion>): Promise<MarketRegion> => {
    return fetchApi<{ success: boolean; data: MarketRegion }>(`/market-regions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(region),
    }).then(res => res.data);
  },
  deleteRegion: (id: string): Promise<void> => {
    return fetchApi<{ success: boolean }>(`/market-regions/${id}`, {
      method: 'DELETE',
    }).then(() => undefined);
  },
  deleteMarketRegions: (marketId: string): Promise<void> => {
    return fetchApi<{ success: boolean }>(`/market-regions/market/${marketId}`, {
      method: 'DELETE',
    }).then(() => undefined);
  },
};

// Markets API
export const marketsApi = {
  getAll: (params?: { active?: boolean }): Promise<Market[]> => {
    const query = new URLSearchParams();
    if (params?.active !== undefined) query.append('active', params.active.toString());
    return fetchApi<{ success: boolean; data: Market[] }>(`/markets?${query.toString()}`).then(res => res.data);
  },
  getById: (id: string): Promise<Market> => {
    return fetchApi<{ success: boolean; data: Market }>(`/markets/${id}`).then(res => res.data);
  },
  create: (market: Omit<Market, 'id'>): Promise<Market> => {
    return fetchApi<{ success: boolean; data: Market }>('/markets', {
      method: 'POST',
      body: JSON.stringify(market),
    }).then(res => res.data);
  },
  update: (id: string, market: Partial<Market>): Promise<Market> => {
    return fetchApi<{ success: boolean; data: Market }>(`/markets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(market),
    }).then(res => res.data);
  },
  delete: (id: string): Promise<void> => {
    return fetchApi<{ success: boolean }>(`/markets/${id}`, {
      method: 'DELETE',
    }).then(() => undefined);
  },
};

// Chat App API
export const chatApi = {
  getConversations: (params?: { storeId?: string; status?: string }): Promise<any[]> => {
    const query = new URLSearchParams();
    if (params?.storeId) query.append('storeId', params.storeId);
    if (params?.status) query.append('status', params.status);
    return fetchApi<any[]>(`/apps/chat/conversations?${query.toString()}`);
  },
  getConversation: (id: string): Promise<any> => {
    return fetchApi<any>(`/apps/chat/conversations/${id}`);
  },
  getMessages: (conversationId: string): Promise<any[]> => {
    return fetchApi<any[]>(`/apps/chat/conversations/${conversationId}/messages`);
  },
  createConversation: (data: { storeId: string; customerName: string; customerEmail?: string; initialMessage: string }): Promise<any> => {
    return fetchApi<any>('/apps/chat/conversations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  sendMessage: (conversationId: string, data: { sender: string; content: string }): Promise<any> => {
    return fetchApi<any>(`/apps/chat/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  markAsRead: (conversationId: string): Promise<void> => {
    return fetchApi<void>(`/apps/chat/conversations/${conversationId}/read`, {
      method: 'PUT',
      body: JSON.stringify({ action: 'read' }),
    });
  },
  getUnreadCount: (params?: { storeId?: string }): Promise<{ count: number }> => {
    const query = new URLSearchParams();
    if (params?.storeId) query.append('storeId', params.storeId);
    return fetchApi<{ count: number }>(`/apps/chat/unread-count?${query.toString()}`);
  },
};

// Apps API (for installing/uninstalling apps)
export const appsApi = {
  getAll: (params?: { status?: string; type?: string }): Promise<any[]> => {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.type) query.append('type', params.type);
    return fetchApi<any[]>(`/apps?${query.toString()}`);
  },
  install: (appId: string, storeId?: string): Promise<any> => {
    return fetchApi<any>(`/apps/${appId}/install`, {
      method: 'POST',
      body: JSON.stringify({ storeId: storeId || 'default' }),
    });
  },
  uninstall: (appId: string): Promise<void> => {
    return fetchApi<void>(`/apps/${appId}`, {
      method: 'DELETE',
    });
  },
  activate: (appId: string): Promise<any> => {
    return fetchApi<any>(`/apps/${appId}/activate`, {
      method: 'POST',
    });
  },
  deactivate: (appId: string): Promise<any> => {
    return fetchApi<any>(`/apps/${appId}/deactivate`, {
      method: 'POST',
    });
  },
};

// Storage API
export interface UploadResponse {
  url: string;
  path: string;
}

export interface FileListItem {
  url: string;
  path: string;
  name: string;
  size: number;
  uploadedAt: string;
}

export interface ListFilesResponse {
  files: FileListItem[];
}

export const storageApi = {
  upload: async (file: File, type?: 'image' | 'file' | 'video'): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    if (type) {
      formData.append('type', type);
    }

    const url = `${API_URL}/storage/upload`;

    // Use cookie auth (credentials: 'include')
    const headers: HeadersInit = {};

    // LEGACY: Only add Authorization header if token in localStorage
    const useCookieAuth = import.meta.env.VITE_USE_COOKIE_AUTH !== 'false';
    if (!useCookieAuth) {
      const token = localStorage.getItem('auth_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers, // Don't set Content-Type, browser will set it with boundary for FormData
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new ApiError(response.status, error.error || `HTTP error! status: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new ApiError(0, 'Cannot connect to server. Please make sure the backend is running.');
      }
      throw error;
    }
  },

  delete: async (path: string): Promise<void> => {
    const encodedPath = encodeURIComponent(path);
    return fetchApi<void>(`/storage/${encodedPath}`, {
      method: 'DELETE',
    });
  },

  list: async (type?: 'image' | 'file' | 'video'): Promise<FileListItem[]> => {
    const params = new URLSearchParams();
    if (type) {
      params.append('type', type);
    }
    const queryString = params.toString();
    const endpoint = `/storage/list${queryString ? `?${queryString}` : ''}`;

    const response = await fetchApi<ListFilesResponse>(endpoint, {
      method: 'GET',
    });

    return response.files;
  },
};
