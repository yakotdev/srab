/**
 * Policy hook: usePolicy. Fetches policy content from store config by slug.
 */

import { useState, useEffect } from 'react';
import type { StoreConfig } from '../../types';
import type { Policy } from './types';
import { sdkFetch } from './fetch';
import { getInitialData } from './initial-data';

const POLICY_SLUG_MAP: Record<string, { key: string; titleAr: string; titleEn: string }> = {
  'return-exchange': { key: 'returnExchange', titleAr: 'سياسة الاستبدال والاسترجاع', titleEn: 'Return & Exchange Policy' },
  privacy: { key: 'privacy', titleAr: 'سياسة الخصوصية', titleEn: 'Privacy Policy' },
  terms: { key: 'terms', titleAr: 'شروط الخدمة', titleEn: 'Terms of Service' },
  shipping: { key: 'shipping', titleAr: 'سياسة الشحن والتوصيل', titleEn: 'Shipping & Delivery Policy' },
};

export function usePolicy(slug: string | null) {
  const initial = getInitialData()?.policy;
  const hasInitial = initial && slug && initial.slug === slug;
  const [policy, setPolicy] = useState<Policy | null>(hasInitial ? initial : null);
  const [loading, setLoading] = useState(!!slug && !hasInitial);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!slug) {
      setPolicy(null);
      setLoading(false);
      return;
    }
    const init = getInitialData()?.policy;
    if (init && init.slug === slug) {
      setPolicy(init);
      setLoading(false);
      return;
    }
    const def = POLICY_SLUG_MAP[slug];
    if (!def) {
      setPolicy(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    sdkFetch<StoreConfig>('/store-config')
      .then((data) => {
        if (!cancelled && data?.policies) {
          const p = data.policies as Record<string, string>;
          const content = def.key === 'returnExchange'
            ? (p.returnExchange ?? (p as Record<string, string>).refund ?? '')
            : (p[def.key] ?? '');
          setPolicy(content ? { slug, title: def.titleAr, body: content } : null);
        } else {
          setPolicy(null);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [slug]);

  return { policy, loading, error };
}
