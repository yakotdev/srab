/**
 * In-memory cart for standalone SDK (no React). Themes use StorifySDK.cart.*
 */

import type { Product } from '../../types';
import type { CartItem } from './types';

let items: CartItem[] = [];

function getItemPrice(item: CartItem): number {
  if (item.variantId && item.product.variants?.length) {
    const v = item.product.variants.find((x) => x.id === item.variantId);
    if (v) return v.price;
  }
  return item.product.price ?? 0;
}

export function getCartItems(): CartItem[] {
  return [...items];
}

export function addItem(product: Product, quantity = 1, variantId?: string): void {
  const existing = items.find((i) => i.product.id === product.id && i.variantId === variantId);
  if (existing) {
    items = items.map((i) =>
      i.product.id === product.id && i.variantId === variantId
        ? { ...i, quantity: i.quantity + quantity }
        : i
    );
  } else {
    items = [...items, { product, quantity, variantId }];
  }
}

export function removeItem(productId: string, variantId?: string): void {
  items = items.filter((i) => !(i.product.id === productId && i.variantId === variantId));
}

export function updateQuantity(productId: string, quantity: number, variantId?: string): void {
  if (quantity <= 0) {
    removeItem(productId, variantId);
    return;
  }
  items = items.map((i) =>
    i.product.id === productId && i.variantId === variantId ? { ...i, quantity } : i
  );
}

export function clearCart(): void {
  items = [];
}

export function getSubtotal(): number {
  return items.reduce((sum, i) => sum + getItemPrice(i) * i.quantity, 0);
}

export function getTotalItems(): number {
  return items.reduce((sum, i) => sum + i.quantity, 0);
}
