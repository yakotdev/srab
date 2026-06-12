/**
 * Helpers: formatPrice, prepareProductDescription, submitReview. All via getSDK() — no fetch.
 */

import { getSDK } from './getSDK';
import type { SubmitReviewPayload } from './types';
import type { ReviewMinimal } from './types';

export function formatPrice(price: number): string {
  const sdk = getSDK();
  return sdk ? sdk.formatPrice(price) : String(price);
}

export function prepareProductDescription(html: string): string {
  const sdk = getSDK();
  return sdk ? sdk.prepareProductDescription(html || '') : '';
}

export async function submitReview(productId: string, payload: SubmitReviewPayload): Promise<ReviewMinimal> {
  const sdk = getSDK();
  if (!sdk) throw new Error('SDK not loaded: call setStoreConfig when receiving STORIFY_THEME_CONFIG');
  const result = await sdk.addReview(productId, {
    customerName: payload.customerName,
    rating: payload.rating,
    comment: payload.comment ?? '',
  });
  return result as ReviewMinimal;
}
