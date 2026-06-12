import React, { useEffect, useState } from 'react';
import { useThemeConfig, type StoreInfo } from '../ThemeContext';
import { shouldUseThemeRuntimeBridge, themeRuntimeCall } from '@storify/theme';
import { getStorifySDK } from '@storify/theme';
import { prepareHtmlContent } from '@storify/theme';

const POLICY_SLUGS = new Set(['return-exchange', 'privacy', 'terms', 'shipping']);

function policySlugTitleKey(slug: string): string {
  return `policy_slug_${String(slug || '').replace(/-/g, '_')}`;
}

function policyBodyFromStorePolicies(
  policies: StoreInfo['policies'] | undefined,
  slug: string,
): string | null {
  if (!policies || typeof policies !== 'object') return null;
  const p = policies as Record<string, string | undefined>;
  let raw: string | undefined;
  switch (slug) {
    case 'privacy':
      raw = p.privacy;
      break;
    case 'terms':
      raw = p.terms;
      break;
    case 'shipping':
      raw = p.shipping;
      break;
    case 'return-exchange':
      raw = p.returnExchange ?? p.refund;
      break;
    default:
      return null;
  }
  const s = raw != null ? String(raw).trim() : '';
  return s ? s : null;
}

function policySlugFromPath(path: string | undefined): string | null {
  if (!path || typeof path !== 'string') return null;
  const normalized = path.replace(/\/+$/, '');
  const m = normalized.match(/\/policies\/([^/?#]+)/) || normalized.match(/\/policy\/([^/?#]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

const PolicyPageSection: React.FC<{ section: { content?: Record<string, unknown> } }> = ({ section }) => {
  const { path, sdkReady, t, store } = useThemeConfig();
  const content = section?.content || {};
  const slugOverride = typeof content.policy_slug === 'string' ? content.policy_slug.trim() : '';
  const slug = slugOverride || policySlugFromPath(path);
  const [body, setBody] = useState<string | null>(null);
  const [title, setTitle] = useState<string>(t('policy'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      if (!slug || !POLICY_SLUGS.has(slug)) {
        if (mounted) {
          setBody(null);
          setTitle(t('policy'));
          setLoading(false);
        }
        return;
      }
      setTitle(t(policySlugTitleKey(slug)));

      const fromParent = policyBodyFromStorePolicies(store?.policies, slug);
      if (fromParent) {
        if (mounted) {
          setBody(fromParent);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      try {
        if (shouldUseThemeRuntimeBridge()) {
          const pol = await themeRuntimeCall<{ slug?: string; body?: string } | null>('getPolicy', { slug });
          if (!mounted) return;
          setBody(pol?.body && String(pol.body).trim() ? String(pol.body) : null);
        } else {
          const sdk = getStorifySDK();
          if (sdkReady && sdk?.getPolicy) {
            const pol = await sdk.getPolicy(slug);
            if (!mounted) return;
            setBody(pol?.body && String(pol.body).trim() ? String(pol.body) : null);
          } else {
            if (mounted) setBody(null);
          }
        }
      } catch {
        if (mounted) setBody(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void run();
    return () => {
      mounted = false;
    };
  }, [slug, sdkReady, t, store]);

  if (!slug || !POLICY_SLUGS.has(slug)) {
    return (
      <section className="py-20 px-6 text-center opacity-40" style={{ background: 'var(--storify-bg)', color: 'var(--storify-text)' }}>
        <p>{t('policy_invalid')}</p>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="py-20 px-6 text-center opacity-40 text-sm" style={{ background: 'var(--storify-bg)', color: 'var(--storify-text)' }}>
        {t('loading')}
      </section>
    );
  }

  if (!body?.trim()) {
    return (
      <section className="py-20 px-6 max-w-3xl mx-auto text-center" style={{ background: 'var(--storify-bg)', color: 'var(--storify-text)' }}>
        <h1 className="text-2xl font-black mb-4" style={{ color: 'var(--storify-headings)' }}>{title}</h1>
        <p className="opacity-60">{t('policy_not_available')}</p>
      </section>
    );
  }

  return (
    <section className="py-16 md:py-24 px-6 max-w-4xl mx-auto" style={{ background: 'var(--storify-bg)', color: 'var(--storify-text)' }}>
      <h1 className="text-3xl md:text-4xl font-black mb-8" style={{ color: 'var(--storify-headings)' }}>{title}</h1>
      <div
        className="prose prose-neutral max-w-none leading-relaxed policy-rich-content opacity-80"
        style={{ color: 'var(--storify-text)' }}
        dangerouslySetInnerHTML={{ __html: prepareHtmlContent(body) }}
      />
      <style>{`
        .policy-rich-content p { margin: 0.75em 0; line-height: 1.7; }
        .policy-rich-content ul { list-style: disc; padding-inline-start: 1.5em; margin: 0.75em 0; }
        .policy-rich-content ol { list-style: decimal; padding-inline-start: 1.5em; margin: 0.75em 0; }
        .policy-rich-content a { text-decoration: underline; color: var(--storify-primary); }
      `}</style>
    </section>
  );
};

export default PolicyPageSection;
