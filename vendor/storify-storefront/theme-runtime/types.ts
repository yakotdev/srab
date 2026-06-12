/**
 * Contract between uploaded theme (iframe or direct) and storefront host.
 * Theme sends STORIFY_RUNTIME_REQUEST; host replies with STORIFY_RUNTIME_RESPONSE.
 */

import type { StorefrontTrackingEvent, StorefrontTrackingPayload } from '../lib/apps/trackEvent';

export type { StorefrontTrackingEvent, StorefrontTrackingPayload };

export type ThemeRuntimeMethod =
  | 'track'
  | 'getProducts'
  | 'getProduct'
  | 'getCategories'
  | 'getMenu'
  | 'getReviews'
  | 'getPolicy'
  | 'getOrderById'
  | 'submitContact'
  | 'submitReview'
  | 'addToCart'
  | 'removeFromCart'
  | 'navigate'
  | 'setLocalization'
  | 'newsletterSubscribe'
  | 'openCart'
  | 'toggleWishlist';

export interface ThemeRuntimeRequestEnvelope {
  type: 'STORIFY_RUNTIME_REQUEST';
  requestId: string;
  method: ThemeRuntimeMethod;
  params?: unknown;
}

export interface ThemeRuntimeResponseEnvelope {
  type: 'STORIFY_RUNTIME_RESPONSE';
  requestId: string;
  ok: boolean;
  result?: unknown;
  error?: { code: string; message: string };
}

export type ThemeRuntimeTrackParams = {
  eventName: StorefrontTrackingEvent;
  payload?: StorefrontTrackingPayload;
};

export type ThemeRuntimeGetProductsParams = {
  limit?: number;
  search?: string;
  category?: string;
  status?: string;
};

export type ThemeRuntimeGetProductParams = { id: string };

export type ThemeRuntimeGetCategoriesParams = { limit?: number };

export type ThemeRuntimeGetMenuParams = { handle: string };

export type ThemeRuntimeGetReviewsParams = { productId: string };

export type ThemeRuntimeGetPolicyParams = { slug: string };

export type ThemeRuntimeGetOrderParams = { orderId: string };

export type ThemeRuntimeSubmitContactParams = {
  name: string;
  email: string;
  message: string;
  storeId?: string;
};

export type ThemeRuntimeSubmitReviewParams = {
  productId: string;
  review: { customerName: string; rating: number; comment: string };
};

/** Same shape as STORIFY_ADD_TO_CART message body */
export type ThemeRuntimeAddToCartParams = {
  productId: string;
  quantity?: number;
  variantId?: string;
  product?: Record<string, unknown>;
  suppressHostCartOpen?: boolean;
};

export type ThemeRuntimeRemoveFromCartParams = {
  productId: string;
  variantId?: string;
};

export type ThemeRuntimeNavigateParams = { path: string };

/** Language / market style handoff — host performs full navigation (Shopify-style locale URLs). */
export type ThemeRuntimeSetLocalizationParams = {
  path?: string;
  languageCode?: string;
  countryCode?: string;
  currencyCode?: string;
  marketId?: string;
};

export type ThemeRuntimeNewsletterParams = { email: string };

export type ThemeRuntimeToggleWishlistParams = { product: Record<string, unknown> };
