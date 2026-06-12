/**
 * Theme template types — aligned with LayoutSection and ThemeConfig from types.ts
 * Used by theme/sections and TemplateRenderer.
 */
import type { CSSProperties } from 'react';
import type { LayoutSection, ThemeConfig } from '../types';

export type { LayoutSection, ThemeConfig };

export type SectionType = LayoutSection['type'];

/** Context passed to section components via TemplateContext */
export interface TemplateContextValue {
  theme: ThemeConfig;
  products: any[];
  addToCart: (product: any, quantity?: number) => void;
  addToast: (message: string, type?: string) => void;
  t: (key: string) => string;
  formatPrice: (price: number) => string;
  navigate: (path: string) => void;
  addSubscriber: (email: string) => Promise<void>;
  allCategories: any[];
  /** Newsletter state (owned by StoreFront, passed down) */
  newsletterEmail: string;
  setNewsletterEmail: (v: string) => void;
  newsletterStatus: 'idle' | 'loading' | 'success' | 'error';
  setNewsletterStatus: (v: 'idle' | 'loading' | 'success' | 'error') => void;
  newsletterMessage: string;
  setNewsletterMessage: (v: string) => void;
  /** When set, we're rendering the product page template */
  productPageProductId?: string;
  /** Computed styles from theme */
  primaryStyle: CSSProperties;
  radiusStyle: CSSProperties;
  textPrimaryStyle: CSSProperties;
  /** فتح درج السلة (من StoreLayout) */
  openCart?: () => void;
  /** Theme slug for section registry (default-storefront | storedesign | theking) */
  themeSlug?: string;
  /** معلومات المتجر من الإعدادات العامة (اسم، شعار، تواصل) — للهيدر والفوتر والمعاينة */
  store?: {
    name: string;
    logo: string;
    favicon: string;
    email: string;
    phone: string;
    address: string;
    metaDescription?: string;
    currency?: string;
    language?: string;
  };
}
