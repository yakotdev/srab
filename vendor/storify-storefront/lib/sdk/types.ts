/**
 * Shared types for Storefront SDK.
 * Product, Category, StoreConfig are re-exported from storefront types.
 */

import type { Product, Category, StoreConfig } from '../../types';

export type { Product, Category, StoreConfig };

export interface Review {
  id: string;
  productId: string;
  customerName: string;
  rating: number;
  comment: string;
  date: string;
  status: 'Pending' | 'Approved' | 'Rejected';
}

export interface ProductQuery {
  search?: string;
  category?: string;
  categoryIds?: string[];
  status?: string;
  page?: number;
  pageSize?: number;
  /** Public list endpoint supports `limit` (and `offset`) on GET /products */
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'price' | 'title' | 'best_selling';
  sortDirection?: 'asc' | 'desc';
}

export interface MenuItem {
  id: string;
  label: string;
  url: string;
  sortOrder: number;
  openInNewTab: boolean;
  depth: number;
}

export interface Policy {
  slug: string;
  title?: string;
  body?: string;
  enabled?: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
  variantId?: string;
}

export interface SeoMeta {
  title: string;
  description: string;
  /** Comma-separated meta keywords (product tags). */
  keywords?: string;
  image?: string;
  url: string;
  type: 'website' | 'product' | 'article';
}

export interface StorefrontInitialData {
  product?: Product;
  policy?: Policy;
}

/** Symbol / fraction-digit overrides (same as store `currencyFormat`). */
export type StoreSdkCurrencyFormat = {
  symbol?: string | null;
  decimalPlaces?: number | null;
};

/** Store config set by theme when receiving STORIFY_THEME_CONFIG (iframe). Used by formatPrice and API base URL. */
export interface StoreSdkConfig {
  id?: string;
  currency?: string;
  currencyFormat?: StoreSdkCurrencyFormat | null;
  language?: string;
  baseLocale?: string;
  direction?: 'rtl' | 'ltr' | string;
  /** Absolute API base (e.g. https://storefront.example.com/api). Required when theme runs in cross-origin iframe. */
  apiBaseUrl?: string;
}
