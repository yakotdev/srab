/**
 * Reviews: useReviews (list by product), addReview (submit from storefront).
 */

import { useState, useEffect, useCallback } from 'react';
import type { Review } from './types';
import { sdkFetch, sdkPost } from './fetch';
import { getStoreId } from './config';

export type { Review };

export interface AddReviewInput {
  customerName: string;
  rating: number;
  comment: string;
}

export function useReviews(productId: string | null) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(!!productId);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!productId) {
      setReviews([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ productId });
    sdkFetch<Review[] | { data: Review[] }>(`/reviews?${params}`)
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data) ? data : (data && typeof data === 'object' && 'data' in data ? (data as { data: Review[] }).data : []);
        setReviews(Array.isArray(list) ? list : []);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [productId]);

  return { reviews, loading, error };
}

/**
 * Submit a review for a product. Requires storeId (setStoreConfig). Returns the created review or throws.
 */
export async function addReview(productId: string, input: AddReviewInput): Promise<Review> {
  const storeId = getStoreId();
  if (!storeId?.trim()) throw new Error('Store ID required: call setStoreConfig with id when receiving STORIFY_THEME_CONFIG');
  return sdkPost<Review>('/reviews', {
    productId,
    customerName: input.customerName,
    rating: Number(input.rating),
    comment: input.comment,
  });
}

/**
 * Hook that returns a stable addReview callback and optional loading/error state for form use.
 */
export function useAddReview() {
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<Error | null>(null);

  const submit = useCallback(async (productId: string, input: AddReviewInput) => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const review = await addReview(productId, input);
      return review;
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      setSubmitError(err);
      throw err;
    } finally {
      setSubmitting(false);
    }
  }, []);

  return { addReview: submit, submitting, error: submitError };
}
