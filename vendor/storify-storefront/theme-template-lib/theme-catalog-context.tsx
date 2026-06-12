import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react';
import { STORIFY_SDK_STORE_CONFIG_APPLIED } from '../lib/sdk/config';
import { clearThemeCatalogCache } from './catalog-fetch-cache';

export type ThemeCatalogContextValue = {
  /** Clears deduped product/category/product-by-id caches (e.g. after new STORIFY_THEME_CONFIG). */
  invalidate: () => void;
};

const ThemeCatalogContext = createContext<ThemeCatalogContextValue>({
  invalidate: () => {
    clearThemeCatalogCache();
  },
});

export function ThemeCatalogProvider({ children }: { children: React.ReactNode }) {
  const [, bumpForSdkConfig] = useReducer((n: number) => n + 1, 0);
  const invalidate = useCallback(() => {
    clearThemeCatalogCache();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onApplied = () => bumpForSdkConfig();
    window.addEventListener(STORIFY_SDK_STORE_CONFIG_APPLIED, onApplied);
    return () => window.removeEventListener(STORIFY_SDK_STORE_CONFIG_APPLIED, onApplied);
  }, []);

  const value = useMemo(() => ({ invalidate }), [invalidate]);
  return <ThemeCatalogContext.Provider value={value}>{children}</ThemeCatalogContext.Provider>;
}

export function useThemeCatalog(): ThemeCatalogContextValue {
  return useContext(ThemeCatalogContext);
}
