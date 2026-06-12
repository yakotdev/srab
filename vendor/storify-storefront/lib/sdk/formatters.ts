/**
 * Formatters for theme use. formatPrice uses store currency/language from config (set by host or theme via setStoreConfig).
 * prepareProductDescription sanitizes product description HTML (XSS-safe).
 */

import { formatCurrency } from '../currency';
import { prepareHtmlContent } from '../htmlContent';
import { getStoreSdkConfig } from './config';

const DEFAULT_CURRENCY = 'USD';
const DEFAULT_LOCALE = 'en';

/**
 * Format a price for display. Uses store currency and language from setStoreConfig (or defaults).
 * Themes must call setStoreConfig when receiving STORIFY_THEME_CONFIG so currency/language match the store.
 */
export function formatPrice(price: number): string {
  const config = getStoreSdkConfig();
  const currency = config?.currency && String(config.currency).trim() ? String(config.currency).trim() : DEFAULT_CURRENCY;
  const locale = config?.language && String(config.language).trim() ? String(config.language).trim() : DEFAULT_LOCALE;
  const display = config?.currencyFormat && typeof config.currencyFormat === 'object' ? config.currencyFormat : null;
  return formatCurrency(price, currency, locale, display);
}

/**
 * Sanitize product description HTML for safe display (XSS). Use with dangerouslySetInnerHTML.
 * Do not render product.description raw.
 */
export function prepareProductDescription(html: string): string {
  return prepareHtmlContent(html);
}
