/**
 * Standalone Storefront SDK entry — no React. Loaded by themes via <script src={payload.sdkScriptUrl}>.
 * Exposes window.StorifySDK. Theme must call setStoreConfig(payload) when receiving STORIFY_THEME_CONFIG.
 */

import { setStoreConfig, getStoreId, getApiUrl, getStoreSdkConfig } from './sdk/config';
import { formatPrice, prepareProductDescription } from './sdk/formatters';
import * as api from './sdk/api-promise';
import * as cart from './sdk/cart-standalone';
import * as wishlist from './sdk/wishlist-standalone';

const StorifySDK = {
  setStoreConfig,
  getStoreId,
  getApiUrl,
  getStoreSdkConfig,
  formatPrice,
  prepareProductDescription,

  getProducts: api.getProducts,
  getProduct: api.getProduct,
  getOrderById: api.getOrderById,
  getProductByHandle: api.getProductByHandle,
  getBestSellingProducts: api.getBestSellingProducts,
  getNewestProducts: api.getNewestProducts,
  getProductsByCollection: api.getProductsByCollection,
  getCategories: api.getCategories,
  getCategory: api.getCategory,
  getMenu: api.getMenu,
  getStoreConfig: api.getStoreConfig,
  getPolicy: api.getPolicy,
  getReviews: api.getReviews,
  addReview: api.addReview,

  getCartItems: cart.getCartItems,
  addToCart: cart.addItem,
  removeFromCart: cart.removeItem,
  updateCartQuantity: cart.updateQuantity,
  clearCart: cart.clearCart,
  getCartSubtotal: cart.getSubtotal,
  getCartTotalItems: cart.getTotalItems,

  getWishlist: wishlist.getWishlist,
  toggleWishlist: wishlist.toggleWishlist,
  isInWishlist: wishlist.isInWishlist,
};

declare global {
  interface Window {
    StorifySDK: typeof StorifySDK;
  }
}

if (typeof window !== 'undefined') {
  window.StorifySDK = StorifySDK;
}

export { StorifySDK };
