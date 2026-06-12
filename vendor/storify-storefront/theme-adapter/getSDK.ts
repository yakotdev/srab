/**
 * Returns window.StorifySDK (platform-loaded). No fetch, no apiBaseUrl.
 */

export type StorifySDKGlobal = typeof window extends { StorifySDK: infer S } ? S : {
  setStoreConfig: (
    config: {
      id?: string;
      currency?: string;
      currencyFormat?: { symbol?: string | null; decimalPlaces?: number | null };
      language?: string;
      apiBaseUrl?: string;
    } | null,
  ) => void;
  getStoreId: () => string | null;
  getApiUrl: () => string;
  getStoreSdkConfig: () => unknown;
  formatPrice: (price: number) => string;
  prepareProductDescription: (html: string) => string;
  getProducts: (query?: Record<string, unknown>) => Promise<unknown[]>;
  getProduct: (id: string | null) => Promise<unknown | null>;
  getProductByHandle: (handle: string | null) => Promise<unknown | null>;
  getBestSellingProducts: (limit?: number) => Promise<unknown[]>;
  getNewestProducts: (limit?: number) => Promise<unknown[]>;
  getProductsByCollection: (collectionId: string | null) => Promise<unknown[]>;
  getCategories: () => Promise<unknown[]>;
  getCategory: (id: string | null) => Promise<unknown | null>;
  getMenu: (handle: string | null) => Promise<unknown[]>;
  getStoreConfig: () => Promise<unknown | null>;
  getPolicy: (slug: string | null) => Promise<unknown | null>;
  getReviews: (productId: string | null) => Promise<unknown[]>;
  addReview: (productId: string, input: { customerName: string; rating: number; comment?: string }) => Promise<unknown>;
  getCartItems: () => unknown[];
  addToCart: (product: unknown, quantity?: number, variantId?: string) => void;
  removeFromCart: (productId: string, variantId?: string) => void;
  updateCartQuantity: (productId: string, quantity: number, variantId?: string) => void;
  clearCart: () => void;
  getCartSubtotal: () => number;
  getCartTotalItems: () => number;
  getWishlist: () => unknown[];
  toggleWishlist: (product: unknown) => void;
  isInWishlist: (productId: string) => boolean;
};

export function getSDK(): StorifySDKGlobal | null {
  if (typeof window === 'undefined') return null;
  const sdk = (window as unknown as Window & { StorifySDK?: StorifySDKGlobal }).StorifySDK;
  return sdk && typeof sdk === 'object' ? sdk : null;
}
