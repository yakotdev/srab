/**
 * Wishlist: useWishlist for theme (local state + localStorage, keyed by storeId).
 */

import { useState, useEffect, useCallback } from 'react';
import type { Product } from '../../types';
import { getStoreId } from './config';

const STORAGE_KEY_PREFIX = 'storify_wishlist_';

function getStorageKey(): string {
  const storeId = getStoreId();
  return `${STORAGE_KEY_PREFIX}${storeId || 'default'}`;
}

function loadWishlist(): Product[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(getStorageKey());
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveWishlist(items: Product[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(getStorageKey(), JSON.stringify(items));
  } catch {
    // ignore
  }
}

export function useWishlist() {
  const storeId = getStoreId();
  const [wishlist, setWishlist] = useState<Product[]>(() => loadWishlist());

  useEffect(() => {
    setWishlist(loadWishlist());
  }, [storeId]);

  useEffect(() => {
    saveWishlist(wishlist);
  }, [wishlist]);

  const toggleWishlist = useCallback((product: Product) => {
    setWishlist((prev) => {
      const exists = prev.some((p) => p.id === product.id);
      if (exists) return prev.filter((p) => p.id !== product.id);
      return [product, ...prev];
    });
  }, []);

  const isInWishlist = useCallback(
    (productId: string) => wishlist.some((p) => p.id === productId),
    [wishlist]
  );

  return { wishlist, toggleWishlist, isInWishlist };
}
