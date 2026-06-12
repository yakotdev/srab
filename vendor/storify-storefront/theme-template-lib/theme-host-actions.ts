import { shouldUseThemeRuntimeBridge, themeRuntimeCall } from '../theme-runtime/theme-client';

/** Newsletter signup: runtime bridge when embedded in parent iframe, else legacy postMessage. */
export function notifyNewsletterSubscribe(email: string): void {
  const trimmed = email.trim();
  if (!trimmed) return;
  if (shouldUseThemeRuntimeBridge()) {
    void themeRuntimeCall('newsletterSubscribe', { email: trimmed }).catch(() => {});
    return;
  }
  window.parent?.postMessage?.({ type: 'STORIFY_NEWSLETTER_SUBSCRIBE', email: trimmed }, '*');
}

/** Open host cart drawer / sidebar — single entry for themes. */
export function emitOpenCartToHost(): void {
  if (shouldUseThemeRuntimeBridge()) {
    void themeRuntimeCall('openCart').catch(() => {});
    return;
  }
  window.parent?.postMessage?.({ type: 'STORIFY_OPEN_CART' }, '*');
}

/** Remove line from host cart (legacy shape matches StoreFront handler). */
export function emitRemoveFromCartToHost(productId: string, variantId?: string): void {
  const id = productId?.trim();
  if (!id) return;
  if (shouldUseThemeRuntimeBridge()) {
    void themeRuntimeCall('removeFromCart', { productId: id, variantId }).catch(() => {});
    return;
  }
  window.parent?.postMessage?.({ type: 'STORIFY_REMOVE_FROM_CART', productId: id, variantId }, '*');
}

/** Wishlist toggle on host — pass full product for analytics parity. */
export function emitToggleWishlistToHost(product: Record<string, unknown>): void {
  if (shouldUseThemeRuntimeBridge()) {
    void themeRuntimeCall('toggleWishlist', { product } as { product: Record<string, unknown> }).catch(() => {});
    return;
  }
  window.parent?.postMessage?.({ type: 'STORIFY_TOGGLE_WISHLIST', product }, '*');
}

export type StorifyAddToCartHostMessage = {
  type: 'STORIFY_ADD_TO_CART';
  productId: string;
  variantId?: string;
  quantity: number;
  product: Record<string, unknown>;
  suppressHostCartOpen?: boolean;
};

/** Same body as `buildStorifyAddToCartMessage` — runtime bridge omits `type`. */
export function emitAddToCartToHost(message: StorifyAddToCartHostMessage): void {
  if (shouldUseThemeRuntimeBridge()) {
    const { type: _t, ...rest } = message;
    void themeRuntimeCall('addToCart', rest).catch(() => {});
    return;
  }
  window.parent?.postMessage?.(message, '*');
}
