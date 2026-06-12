/**
 * Theme SDK Adapter — single import for themes.
 * All requests go through window.StorifySDK (loaded from payload.sdkScriptUrl). No fetch, no apiBaseUrl.
 *
 * Usage:
 *   1. Load SDK from platform (payload.sdkScriptUrl) and call StorifySDK.setStoreConfig(payload).
 *   2. Import from this adapter: getSDK, useProducts, useProduct, formatPrice, etc.
 */

export { getSDK } from './getSDK';
export type { StorifySDKGlobal } from './getSDK';

export {
  useProducts,
  useProduct,
  useCategories,
  useMenu,
  useReviews,
  useCart,
  useWishlist,
} from './hooks';

export { formatPrice, prepareProductDescription, submitReview } from './helpers';

export type {
  MenuItem,
  SubmitReviewPayload,
  ApiError,
  ProductMinimal,
  CategoryMinimal,
  ReviewMinimal,
  CartItemMinimal,
} from './types';
