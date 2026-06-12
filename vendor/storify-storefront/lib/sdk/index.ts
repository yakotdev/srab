/**
 * Storefront SDK — unified entry. All hooks and helpers for theme developers.
 * See: docs/theme-developer-guide/06-STOREFRONT-SDK.md and STOREFRONT_SDK_PLAN.md
 */

// Config & store id (for theme iframe: setStoreConfig when receiving STORIFY_THEME_CONFIG)
export { getApiUrl, getStoreId, getStoreSdkConfig, setStoreConfig } from './config';
// Fetch (internal use; themes use hooks)
export { sdkFetch } from './fetch';
// Types
export type { ProductQuery, MenuItem, Policy, CartItem, SeoMeta, StorefrontInitialData, StoreSdkConfig, Review } from './types';
export type { Product, Category, StoreConfig } from './types';
// Formatters
export { formatPrice, prepareProductDescription } from './formatters';
// Initial data (SSR/hydration)
export { getInitialData, setInitialData } from './initial-data';
// Products
export {
  useProducts,
  useProduct,
  useProductByHandle,
  useBestSellingProducts,
  useNewestProducts,
  useProductsByCollection,
  useProductsBySource,
} from './products';
// Categories
export { useCategories, useCollectionByHandle } from './categories';
// Menu
export { useMenu } from './menu';
// Store config
export { useStoreConfig } from './store-config';
// Policy
export { usePolicy } from './policy';
// Cart
export { useCart } from './cart';
// Reviews
export { useReviews, useAddReview, addReview } from './reviews';
export type { AddReviewInput } from './reviews';
// Wishlist
export { useWishlist } from './wishlist';
// SEO
export { useSeo } from './seo';
