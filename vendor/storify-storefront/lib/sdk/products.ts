/**
 * Product hooks: useProducts, useProduct, useProductByHandle, useBestSellingProducts, useNewestProducts, useProductsByCollection, useProductsBySource.
 */

import { useState, useEffect } from 'react';
import type { Product } from '../../types';
import type { ProductQuery } from './types';
import { sdkFetch } from './fetch';
import { getInitialData } from './initial-data';

export type { ProductQuery };

export function useProducts(query: ProductQuery = {}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (query.search) params.set('search', query.search);
    if (query.category) params.set('category', query.category);
    if (query.status) params.set('status', query.status);
    const qs = params.toString();
    const url = qs ? `/products?${qs}` : '/products';
    sdkFetch<Product[]>(url)
      .then((data) => {
        if (!cancelled) setProducts(Array.isArray(data) ? data : []);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [query.search, query.category, query.status]);

  return { products, loading, error };
}

export function useBestSellingProducts(limit = 10) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => {
    let cancelled = false;
    sdkFetch<Product[]>(`/products/best-selling?limit=${limit}`)
      .then((data) => { if (!cancelled) setProducts(Array.isArray(data) ? data : []); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e : new Error(String(e))); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [limit]);
  return { products, loading, error };
}

export function useNewestProducts(limit = 10) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => {
    let cancelled = false;
    sdkFetch<Product[]>(`/products/newest?limit=${limit}`)
      .then((data) => { if (!cancelled) setProducts(Array.isArray(data) ? data : []); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e : new Error(String(e))); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [limit]);
  return { products, loading, error };
}

export function useProductsByCollection(collectionId: string | null) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(!!collectionId);
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => {
    if (!collectionId) { setProducts([]); setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    sdkFetch<Product[]>(`/products/collection/${collectionId}`)
      .then((data) => { if (!cancelled) setProducts(Array.isArray(data) ? data : []); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e : new Error(String(e))); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [collectionId]);
  return { products, loading, error };
}

export function useProductsBySource(
  source: 'best_selling' | 'newest' | 'collection',
  limit: number,
  collectionId?: string | null
) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => {
    let url: string | null = null;
    if (source === 'best_selling') url = `/products/best-selling?limit=${limit}`;
    else if (source === 'newest') url = `/products/newest?limit=${limit}`;
    else if (source === 'collection' && collectionId) url = `/products/collection/${collectionId}`;
    if (!url) { setProducts([]); setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    sdkFetch<Product[]>(url)
      .then((data) => { if (!cancelled) setProducts(Array.isArray(data) ? data : []); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e : new Error(String(e))); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [source, limit, collectionId]);
  return { products, loading, error };
}

export function useProduct(id: string | null) {
  const initial = getInitialData()?.product;
  const hasInitial = initial && id && initial.id === id;
  const [product, setProduct] = useState<Product | null>(hasInitial ? initial : null);
  const [loading, setLoading] = useState(!!id && !hasInitial);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!id) {
      setProduct(null);
      setLoading(false);
      return;
    }
    const init = getInitialData()?.product;
    if (init && init.id === id) {
      setProduct(init);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    sdkFetch<Product>(`/products/${id}`)
      .then((data) => {
        if (!cancelled) setProduct(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [id]);

  return { product, loading, error };
}

export function useProductByHandle(handle: string | null) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(!!handle);
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => {
    if (!handle) { setProduct(null); setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    setError(null);
    sdkFetch<Product>(`/products/by-handle/${encodeURIComponent(handle)}`)
      .then((data) => { if (!cancelled) setProduct(data); })
      .catch((e) => {
        if (!cancelled) {
          sdkFetch<Product[]>(`/products?search=${encodeURIComponent(handle)}`)
            .then((list) => { if (!cancelled) setProduct(Array.isArray(list) && list.length > 0 ? list[0] : null); })
            .catch((e2) => { if (!cancelled) setError(e2 instanceof Error ? e2 : new Error(String(e2))); });
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [handle]);
  return { product, loading, error };
}
