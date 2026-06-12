/**
 * Minimal types for theme adapter. No fetch, no apiBaseUrl — all via window.StorifySDK.
 * Themes can use these or extend them.
 */

export interface MenuItem {
  id: string;
  label: string;
  url: string;
  sortOrder: number;
  openInNewTab: boolean;
  depth: number;
}

export interface SubmitReviewPayload {
  customerName: string;
  rating: number;
  comment?: string;
}

export interface ApiError {
  message: string;
  status?: number;
}

/** Minimal product shape for theme sections */
export interface ProductMinimal {
  id: string;
  name: string;
  price: number;
  image?: string;
  description?: string;
  stock?: number;
  variants?: Array<{ id: string; title: string; price: number; stock?: number; sku?: string; image?: string }>;
  hasVariants?: boolean;
  sellWhenOutOfStock?: boolean;
  [key: string]: unknown;
}

/** Minimal category shape */
export interface CategoryMinimal {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  productCount?: number;
  [key: string]: unknown;
}

/** Review from API */
export interface ReviewMinimal {
  id: string;
  productId: string;
  customerName: string;
  rating: number;
  comment: string;
  date: string;
  status: string;
}

/** Cart item shape used by adapter */
export interface CartItemMinimal {
  product: ProductMinimal;
  quantity: number;
  variantId?: string;
}
