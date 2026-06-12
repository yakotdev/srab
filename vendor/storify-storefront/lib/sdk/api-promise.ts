/**
 * Promise-based API for standalone SDK (no React). Used when theme loads SDK from platform script.
 */

import { sdkFetch, sdkPost } from './fetch';
import type { Product, Order } from '../../types';
import type { Category } from '../../types';
import type { MenuItem } from './types';
import type { Review } from './types';
import type { StoreConfig } from '../../types';
import type { Policy } from './types';
import type { ProductQuery } from './types';
export interface AddReviewInputStandalone {
  customerName: string;
  rating: number;
  comment?: string;
}

export async function getProducts(query: ProductQuery = {}): Promise<Product[]> {
  const params = new URLSearchParams();
  if (query.search) params.set('search', query.search);
  if (query.category) params.set('category', query.category);
  if (query.status) params.set('status', query.status);
  if (query.limit != null) params.set('limit', String(query.limit));
  if (query.offset != null) params.set('offset', String(query.offset));
  const qs = params.toString();
  const url = qs ? `/products?${qs}` : '/products';
  const data = await sdkFetch<Product[]>(url);
  return Array.isArray(data) ? data : [];
}

export async function getProduct(id: string | null): Promise<Product | null> {
  if (!id) return null;
  try {
    return await sdkFetch<Product>(`/products/${id}`);
  } catch {
    return null;
  }
}

/** Guest/customer order lookup for theme iframe (same credentials + X-Store-Id as other SDK calls). */
export async function getOrderById(id: string | null): Promise<Order | null> {
  if (!id) return null;
  const clean = id.replace(/^#/, '').trim();
  if (!clean) return null;
  try {
    return await sdkFetch<Order>(`/orders/${encodeURIComponent(clean)}`);
  } catch {
    return null;
  }
}

export async function getProductByHandle(handle: string | null): Promise<Product | null> {
  if (!handle) return null;
  try {
    return await sdkFetch<Product>(`/products/by-handle/${encodeURIComponent(handle)}`);
  } catch {
    const list = await sdkFetch<Product[]>(`/products?search=${encodeURIComponent(handle)}`);
    return Array.isArray(list) && list.length > 0 ? list[0] : null;
  }
}

export async function getBestSellingProducts(limit = 10): Promise<Product[]> {
  const data = await sdkFetch<Product[]>(`/products/best-selling?limit=${limit}`);
  return Array.isArray(data) ? data : [];
}

export async function getNewestProducts(limit = 10): Promise<Product[]> {
  const data = await sdkFetch<Product[]>(`/products/newest?limit=${limit}`);
  return Array.isArray(data) ? data : [];
}

export async function getProductsByCollection(collectionId: string | null): Promise<Product[]> {
  if (!collectionId) return [];
  const data = await sdkFetch<Product[]>(`/products/collection/${collectionId}`);
  return Array.isArray(data) ? data : [];
}

export async function getCategories(): Promise<Category[]> {
  const data = await sdkFetch<Category[]>('/categories');
  return Array.isArray(data) ? data : [];
}

export async function getCategory(id: string | null): Promise<Category | null> {
  if (!id) return null;
  try {
    return await sdkFetch<Category>(`/categories/${id}`);
  } catch {
    return null;
  }
}

export async function getMenu(handle: string | null): Promise<MenuItem[]> {
  if (!handle) return [];
  const data = await sdkFetch<{ items?: MenuItem[] }>(`/menus/by-handle?handle=${encodeURIComponent(handle)}`);
  const items = data?.items;
  return Array.isArray(items) ? items : [];
}

export async function getStoreConfig(): Promise<StoreConfig | null> {
  try {
    return await sdkFetch<StoreConfig>('/store-config');
  } catch {
    return null;
  }
}

const POLICY_SLUG_MAP: Record<string, { key: string }> = {
  'return-exchange': { key: 'returnExchange' },
  privacy: { key: 'privacy' },
  terms: { key: 'terms' },
  shipping: { key: 'shipping' },
};

export async function getPolicy(slug: string | null): Promise<Policy | null> {
  if (!slug || !POLICY_SLUG_MAP[slug]) return null;
  const config = await getStoreConfig();
  if (!config?.policies) return null;
  const p = config.policies as Record<string, string>;
  const def = POLICY_SLUG_MAP[slug];
  const content = def.key === 'returnExchange'
    ? (p.returnExchange ?? (p as Record<string, string>).refund ?? '')
    : (p[def.key] ?? '');
  return content ? { slug, body: content } : null;
}

export async function getReviews(productId: string | null): Promise<Review[]> {
  if (!productId) return [];
  const params = new URLSearchParams({ productId });
  const data = await sdkFetch<Review[] | { data: Review[] }>(`/reviews?${params}`);
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object' && 'data' in data) return Array.isArray((data as { data: Review[] }).data) ? (data as { data: Review[] }).data : [];
  return [];
}

export async function addReview(productId: string, input: AddReviewInputStandalone): Promise<Review> {
  return sdkPost<Review>('/reviews', {
    productId,
    customerName: input.customerName,
    rating: Number(input.rating),
    comment: input.comment ?? '',
  });
}
