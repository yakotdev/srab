/**
 * SEO helper: useSeo. Returns meta for current page type.
 */

import type { Product, Category } from '../../types';
import type { Policy, SeoMeta } from './types';

export type { SeoMeta };

export function useSeo(options: {
  pageType: 'home' | 'product' | 'policy' | 'shop' | 'category';
  storeName?: string;
  storeDescription?: string;
  storeImage?: string;
  product?: Product | null;
  policy?: Policy | null;
  category?: Category | null;
}): SeoMeta {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '';
  const siteName = options.storeName || 'Store';
  const siteDesc = options.storeDescription || `${siteName} – Your store`;
  const siteImage = options.storeImage || '';

  if (options.pageType === 'product' && options.product) {
    const p = options.product;
    const img = (p.images && p.images[0]) || p.image || siteImage;
    const title =
      (p.seoTitle && String(p.seoTitle).trim()) || `${p.name} | ${siteName}`;
    const description =
      (p.seoDescription && String(p.seoDescription).slice(0, 160)) ||
      (p.description && String(p.description).slice(0, 160)) ||
      siteDesc;
    const tagList = Array.isArray(p.tags) ? p.tags.map((t) => String(t).trim()).filter(Boolean) : [];
    return {
      title,
      description,
      keywords: tagList.length > 0 ? tagList.join(', ') : undefined,
      image: typeof img === 'string' ? img : undefined,
      url: baseUrl,
      type: 'product',
    };
  }
  if (options.pageType === 'policy' && options.policy) {
    return {
      title: `${options.policy.title || options.policy.slug} | ${siteName}`,
      description: (options.policy.body && String(options.policy.body).slice(0, 160)) || siteDesc,
      image: siteImage,
      url: baseUrl,
      type: 'article',
    };
  }
  if (options.pageType === 'category' && options.category) {
    const c = options.category;
    return {
      title: `${c.name} | ${siteName}`,
      description: (c.description && String(c.description).slice(0, 160)) || siteDesc,
      image: c.image || siteImage,
      url: baseUrl,
      type: 'website',
    };
  }
  return {
    title: siteName,
    description: siteDesc,
    image: siteImage,
    url: baseUrl,
    type: 'website',
  };
}
