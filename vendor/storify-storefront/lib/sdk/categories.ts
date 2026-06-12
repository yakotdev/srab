/**
 * Category hooks: useCategories, useCollectionByHandle.
 */

import { useState, useEffect } from 'react';
import type { Product } from '../../types';
import type { Category } from '../../types';
import { sdkFetch } from './fetch';

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    sdkFetch<Category[]>('/categories')
      .then((data) => {
        if (!cancelled) setCategories(Array.isArray(data) ? data : []);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return { categories, loading, error };
}

export function useCollectionByHandle(handle: string | null) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(!!handle);
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => {
    if (!handle) { setProducts([]); setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    sdkFetch<Product[]>(`/products?category=${encodeURIComponent(handle)}`)
      .then((data) => { if (!cancelled) setProducts(Array.isArray(data) ? data : []); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e : new Error(String(e))); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [handle]);
  return { products, loading, error };
}
