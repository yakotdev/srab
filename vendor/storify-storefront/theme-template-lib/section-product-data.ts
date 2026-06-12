/**
 * Single policy for "where do section grids get products?" — prefer host payload, then SDK-backed list.
 */
import type { Product } from '@srab/constants';
import { useThemeConfig } from '@srab/ThemeContext';
import { useMemo } from 'react';
import { useProducts } from './storefront-api';

export type UseSectionProductsOptions = {
  limit: number;
  /** When true (default), use `ThemeConfig.products` from host if non-empty before hitting API. */
  preferHostPayload?: boolean;
};

export function useSectionProducts(options: UseSectionProductsOptions): Product[] {
  const { limit, preferHostPayload = true } = options;
  const { products: fromHost } = useThemeConfig();
  const fromApi = useProducts(undefined, limit);

  return useMemo(() => {
    if (preferHostPayload && Array.isArray(fromHost) && fromHost.length > 0) {
      return fromHost.slice(0, limit) as Product[];
    }
    return fromApi;
  }, [preferHostPayload, fromHost, fromApi, limit]);
}
