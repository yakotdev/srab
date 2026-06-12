/**
 * React hooks over window.StorifySDK. Single place for sections — no repeated useState/useEffect.
 */

import { useState, useEffect, useCallback } from 'react';
import { getSDK } from './getSDK';
import type { MenuItem } from './types';
import type { ProductMinimal } from './types';
import type { CategoryMinimal } from './types';
import type { ReviewMinimal } from './types';
import type { CartItemMinimal } from './types';

export function useProducts(query: { search?: string; category?: string; status?: string } = {}) {
  const [products, setProducts] = useState<ProductMinimal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const sdk = getSDK();
    if (!sdk) {
      setProducts([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    sdk.getProducts(query)
      .then((data) => { if (!cancelled) setProducts(Array.isArray(data) ? (data as ProductMinimal[]) : []); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e : new Error(String(e))); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [query.search, query.category, query.status]);

  return { products, loading, error };
}

export function useProduct(id: string | null) {
  const [product, setProduct] = useState<ProductMinimal | null>(null);
  const [loading, setLoading] = useState(!!id);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!id) {
      setProduct(null);
      setLoading(false);
      return;
    }
    const sdk = getSDK();
    if (!sdk) {
      setProduct(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    sdk.getProduct(id)
      .then((data) => { if (!cancelled) setProduct(data as ProductMinimal | null); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e : new Error(String(e))); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  return { product, loading, error };
}

export function useCategories() {
  const [categories, setCategories] = useState<CategoryMinimal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const sdk = getSDK();
    if (!sdk) {
      setCategories([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    sdk.getCategories()
      .then((data) => { if (!cancelled) setCategories(Array.isArray(data) ? (data as CategoryMinimal[]) : []); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e : new Error(String(e))); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return { categories, loading, error };
}

export function useMenu(handle: string | null) {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(!!handle);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!handle) {
      setItems([]);
      setLoading(false);
      return;
    }
    const sdk = getSDK();
    if (!sdk) {
      setItems([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    sdk.getMenu(handle)
      .then((data) => { if (!cancelled) setItems(Array.isArray(data) ? (data as MenuItem[]) : []); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e : new Error(String(e))); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [handle]);

  return { items, loading, error };
}

export function useReviews(productId: string | null) {
  const [reviews, setReviews] = useState<ReviewMinimal[]>([]);
  const [loading, setLoading] = useState(!!productId);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!productId) {
      setReviews([]);
      setLoading(false);
      return;
    }
    const sdk = getSDK();
    if (!sdk) {
      setReviews([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    sdk.getReviews(productId)
      .then((data) => { if (!cancelled) setReviews(Array.isArray(data) ? (data as ReviewMinimal[]) : []); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e : new Error(String(e))); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [productId]);

  return { reviews, loading, error };
}

export function useCart() {
  const sdk = getSDK();
  const [items, setItems] = useState<CartItemMinimal[]>([]);

  const refresh = useCallback(() => {
    if (sdk) setItems((sdk.getCartItems() || []) as CartItemMinimal[]);
  }, [sdk]);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 500);
    return () => clearInterval(t);
  }, [refresh]);

  const addItem = useCallback((product: ProductMinimal, quantity = 1, variantId?: string) => {
    getSDK()?.addToCart(product, quantity, variantId);
    refresh();
  }, [refresh]);

  const removeItem = useCallback((productId: string, variantId?: string) => {
    getSDK()?.removeFromCart(productId, variantId);
    refresh();
  }, [refresh]);

  const updateQuantity = useCallback((productId: string, quantity: number, variantId?: string) => {
    getSDK()?.updateCartQuantity(productId, quantity, variantId);
    refresh();
  }, [refresh]);

  const clear = useCallback(() => {
    getSDK()?.clearCart();
    refresh();
  }, [refresh]);

  const subtotal = sdk ? sdk.getCartSubtotal() : 0;
  const totalItems = sdk ? sdk.getCartTotalItems() : 0;

  return { items, addItem, removeItem, updateQuantity, clear, subtotal, totalItems };
}

export function useWishlist() {
  const sdk = getSDK();
  const [wishlist, setWishlist] = useState<ProductMinimal[]>([]);

  const refresh = useCallback(() => {
    if (sdk) setWishlist((sdk.getWishlist() || []) as ProductMinimal[]);
  }, [sdk]);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 300);
    return () => clearInterval(t);
  }, [refresh]);

  const toggleWishlist = useCallback((product: ProductMinimal) => {
    getSDK()?.toggleWishlist(product);
    refresh();
  }, [refresh]);

  const isInWishlist = useCallback((productId: string) => {
    return getSDK()?.isInWishlist(productId) ?? false;
  }, []);

  return { wishlist, toggleWishlist, isInWishlist };
}
