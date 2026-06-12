/**
 * Storefront SDK Image component — optimized for themes.
 * - Lazy loading and decoding="async" by default
 * - Optional srcset/sizes for responsive images
 * - Placeholder for future CDN/transform pipeline (Cloudflare Images, R2 Transform)
 * See: docs/theme/THEME_DSL_AND_STOREFRONT_SDK_PLAN.md §7.12
 */

import React from 'react';

export interface ImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'loading' | 'decoding'> {
  /** Image URL (raw or from image field) */
  src: string;
  /** Alt text (required for accessibility) */
  alt: string;
  /** Enable lazy loading (default: true) */
  loading?: 'lazy' | 'eager';
  /** Async decoding (default: async) */
  decoding?: 'async' | 'sync' | 'auto';
  /** Responsive widths for srcset (e.g. [400, 800, 1200]). If provided, generates srcset. */
  widths?: number[];
  /** Sizes attribute for responsive images (e.g. "(max-width: 768px) 100vw, 50vw") */
  sizes?: string;
}

/**
 * Build srcset from base URL. Supports simple width param if URL has query or ends cleanly.
 * For now uses same URL for all (no transform). Future: integrate with image pipeline.
 */
function buildSrcSet(src: string, widths: number[]): string {
  if (!src || widths.length === 0) return '';
  const sep = src.includes('?') ? '&' : '?';
  return widths.map((w) => `${src}${sep}w=${w} ${w}w`).join(', ');
}

const Image: React.FC<ImageProps> = ({
  src,
  alt,
  loading = 'lazy',
  decoding = 'async',
  widths,
  sizes,
  className,
  ...rest
}) => {
  const imgSrc = src || '';
  const srcSet = widths && widths.length > 0 ? buildSrcSet(imgSrc, widths) : undefined;

  return (
    <img
      src={imgSrc}
      alt={alt}
      loading={loading}
      decoding={decoding}
      srcSet={srcSet}
      sizes={sizes}
      className={className}
      {...rest}
    />
  );
};

export default Image;
