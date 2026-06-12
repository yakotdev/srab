/**
 * Wishlist for standalone SDK (localStorage, keyed by storeId). No React.
 */

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

function saveWishlist(list: Product[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(getStorageKey(), JSON.stringify(list));
  } catch {
    // ignore
  }
}

export function getWishlist(): Product[] {
  return loadWishlist();
}

export function toggleWishlist(product: Product): void {
  const list = loadWishlist();
  const exists = list.some((p) => p.id === product.id);
  const next = exists ? list.filter((p) => p.id !== product.id) : [product, ...list];
  saveWishlist(next);
}

export function isInWishlist(productId: string): boolean {
  return loadWishlist().some((p) => p.id === productId);
}
