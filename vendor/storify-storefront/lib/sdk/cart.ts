/**
 * Cart hook: useCart. Local state only; no backend sync.
 */

import { useState } from 'react';
import type { Product } from '../../types';
import type { CartItem } from './types';

export type { CartItem };

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = (product: Product, quantity = 1, variantId?: string) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id && i.variantId === variantId);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id && i.variantId === variantId
            ? { ...i, quantity: i.quantity + quantity }
            : i
        );
      }
      return [...prev, { product, quantity, variantId }];
    });
  };

  const getItemPrice = (item: CartItem): number => {
    if (item.variantId && item.product.variants?.length) {
      const v = item.product.variants.find((x) => x.id === item.variantId);
      if (v) return v.price;
    }
    return item.product.price ?? 0;
  };

  const removeItem = (productId: string, variantId?: string) => {
    setItems((prev) => prev.filter((i) => !(i.product.id === productId && i.variantId === variantId)));
  };

  const updateQuantity = (productId: string, quantity: number, variantId?: string) => {
    if (quantity <= 0) return removeItem(productId, variantId);
    setItems((prev) => prev.map((i) =>
      i.product.id === productId && i.variantId === variantId ? { ...i, quantity } : i
    ));
  };

  const clear = () => setItems([]);

  const subtotal = items.reduce((sum, i) => sum + getItemPrice(i) * i.quantity, 0);
  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);

  return { items, addItem, removeItem, updateQuantity, clear, subtotal, totalItems };
}
