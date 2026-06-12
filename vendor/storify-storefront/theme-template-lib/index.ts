/**
 * Shared template helpers; consumed from the unified package `@storify/theme` (see `../theme-package/index.ts`).
 * Theme app wires `@srab/constants` and `@srab/ThemeContext` in tsconfig/vite.
 */

export {
  getLocaleFromPath,
  localizePath,
  normalizeLocale,
  stripLocaleFromPath,
} from '../lib/locale-routing';
export * from './applyThemeRuntimePayload';
export * from './catalog-fetch-cache';
export * from './add-to-cart-payload';
export * from './cart-messaging';
export * from './category-scope';
export * from './host-origin';
export * from './htmlContent';
export * from './inventory';
export * from './navigation';
export * from './productImageTheme';
export * from './productPrice';
export * from './resolve-selected-variant';
export * from './storify-sdk-loader';
export * from './section-product-data';
export * from './storefront-api';
export * from './theme-localization';
export * from './theme-catalog-context';
export * from './theme-embedded';
export * from './theme-host-actions';
export * from './themeColorSchemes';
export * from './tracking';
