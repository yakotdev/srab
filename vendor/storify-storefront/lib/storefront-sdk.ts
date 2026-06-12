/**
 * Storefront SDK — single entry for themes and storefront.
 * Implementations live in lib/sdk/ for easier maintenance. See docs/theme-developer-guide/06-STOREFRONT-SDK.md
 */

export {
  getApiUrl,
  getStoreId,
  getStoreSdkConfig,
  setStoreConfig,
  sdkFetch,
  formatPrice,
  prepareProductDescription,
  getInitialData,
  setInitialData,
  useProducts,
  useProduct,
  useProductByHandle,
  useBestSellingProducts,
  useNewestProducts,
  useProductsByCollection,
  useProductsBySource,
  useCategories,
  useCollectionByHandle,
  useMenu,
  useStoreConfig,
  usePolicy,
  useCart,
  useReviews,
  useAddReview,
  addReview,
  useWishlist,
  useSeo,
} from './sdk';

export type {
  ProductQuery,
  MenuItem,
  Policy,
  CartItem,
  SeoMeta,
  StorefrontInitialData,
  StoreSdkConfig,
  Product,
  Category,
  StoreConfig,
  Review,
  AddReviewInput,
} from './sdk';
