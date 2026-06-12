/**
 * Initial data (SSR/hydration). Hooks can use this to avoid duplicate fetches.
 */

import type { StorefrontInitialData } from './types';
import type { Product } from '../../types';

const DATA_KEY = '__STOREFRONT_DATA__';

export type { StorefrontInitialData };

export function getInitialData(): StorefrontInitialData | null {
  if (typeof window === 'undefined') return null;
  const win = window as Window & { [key: string]: unknown };
  return (win[DATA_KEY] as StorefrontInitialData) ?? null;
}

/**
 * Inject initial data (e.g. from server or host). Used by storefront shell; themes typically do not call this.
 */
export function setInitialData(data: StorefrontInitialData | null): void {
  if (typeof window === 'undefined') return;
  const win = window as Window & { [key: string]: unknown };
  win[DATA_KEY] = data ?? undefined;
}
