import React, { createContext, useContext } from 'react';

import { Product } from './constants';

export interface StorefrontLanguageRow {
  code: string;
  name?: string;
  nativeName?: string | null;
  isActive?: boolean;
  isDefault?: boolean;
}

export interface StoreInfo {
  name: string;
  logo: string;
  favicon: string;
  email: string;
  phone: string;
  address: string;
  metaDescription?: string;
  currency?: string;
  language?: string;
  /** Store languages from the storefront — preferred over shipping.localizationLanguages */
  enabledLanguages?: StorefrontLanguageRow[];
  shipping?: {
    localizationLanguages?: Array<string | StorefrontLanguageRow>;
  };
  /** From the parent page via postMessage — preferred over loading the SDK inside the iframe (PNA / load timing). */
  policies?: {
    returnExchange?: string;
    privacy?: string;
    terms?: string;
    shipping?: string;
    refund?: string;
  };
}

export interface LayoutSection {
  id: string;
  type: string;
  /** Matches section `id` in theme-manifest (e.g. featured_products) — used to resolve content schema reliably */
  manifestId?: string;
  enabled: boolean;
  content?: Record<string, any>;
  order?: number;
  group?: string;
}

export interface ThemeCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image: string;
  count?: number;
}

export interface ThemeConfig {
  layout: LayoutSection[];
  settings: Record<string, any>;
  storeId?: string;
  store?: StoreInfo;
  /** Platform SDK loaded and setStoreConfig applied (iframe / preview). */
  sdkReady?: boolean;
  products?: Product[];
  categories?: ThemeCategory[];
  path?: string;
  productId?: string;
  currentProduct?: Product | null;
  t: (key: string) => string;
  onAddToCart?: (product: Product) => void;
  onQuickView?: (product: Product | null) => void;
  onToggleWishlist?: (product: Product) => void;
  onOpenCart?: () => void;
  onOpenSearch?: () => void;
  cart?: Product[];
  wishlist?: Product[];
  updateSectionContent?: (sectionId: string, contentPatch: Record<string, any>) => void;
  updateSectionEnabled?: (sectionId: string, enabled: boolean) => void;
  currentPage?: string;
  setCurrentPage?: (pageId: string) => void;
  isRtl: boolean;
  storifyEditorPreview?: boolean;
  activeSectionId?: string | null;
}

const ThemeContext = createContext<ThemeConfig | null>(null);

export const ThemeProvider: React.FC<{ value: ThemeConfig; children: React.ReactNode }> = ({ value, children }) => {
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useThemeConfig = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeConfig must be used within a ThemeProvider');
  }
  return context;
};
