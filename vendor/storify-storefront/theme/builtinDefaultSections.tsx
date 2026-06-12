/**
 * Fallback section components when `@theme-default/registry` is empty (stub theme package).
 * Lives in shared/storefront so we do not mix TemplateContext-based UI into `themes/*` packages.
 * See PROJECT_OVERVIEW.md — built-in themes should ship real registries from themes/default-storefront;
 * this is a platform fallback until that package exports a full registry.
 */
import React, { useState } from 'react';
import type { LayoutSection } from '../types';
import { useTemplateContext } from './TemplateContext';

type Props = { section: LayoutSection };

const getContent = (s: LayoutSection) => s.content || {};

const BuiltinHeroSection: React.FC<Props> = ({ section }) => {
  const { primaryStyle, textPrimaryStyle } = useTemplateContext();
  const c = getContent(section);
  return (
    <section className="relative w-full overflow-hidden bg-slate-900 text-white">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl" style={textPrimaryStyle}>
          {c.title || 'Welcome'}
        </h1>
        {c.subtitle && <p className="mt-4 max-w-2xl text-lg text-slate-200">{String(c.subtitle)}</p>}
      </div>
      <div className="absolute inset-0 -z-10 opacity-40" style={primaryStyle} aria-hidden />
    </section>
  );
};

const BuiltinFeaturedProductsSection: React.FC<Props> = ({ section }) => {
  const { products, formatPrice, navigate } = useTemplateContext();
  const c = getContent(section);
  const count = Math.min(Math.max(Number(c.count) || 8, 1), 24);
  const cols = Math.min(Math.max(Number(c.columns) || 4, 2), 4);
  const gridClass = cols === 2 ? 'grid-cols-2' : cols === 3 ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4';
  const slice = products.slice(0, count);
  return (
    <section className="mx-auto max-w-6xl px-4 py-12">
      {c.title && <h2 className="mb-6 text-2xl font-semibold text-slate-900">{String(c.title)}</h2>}
      <div className={`grid gap-4 ${gridClass}`}>
        {slice.map((p: { id: string; name?: string; image?: string; price?: number }) => (
          <button
            key={p.id}
            type="button"
            onClick={() => navigate(`/product/${p.id}`)}
            className="rounded-lg border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-indigo-300"
          >
            {p.image ? (
              <img
                src={p.image}
                alt=""
                width={400}
                height={320}
                className="mb-2 h-40 w-full rounded object-cover"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <div className="mb-2 flex h-40 w-full items-center justify-center rounded bg-slate-100 text-slate-400">—</div>
            )}
            <div className="font-medium text-slate-900">{p.name}</div>
            <div className="mt-1 text-sm text-indigo-600">{formatPrice(Number(p.price) || 0)}</div>
          </button>
        ))}
      </div>
      {slice.length === 0 && <p className="text-slate-500">No products yet.</p>}
    </section>
  );
};

const BuiltinCategoriesSection: React.FC<Props> = ({ section }) => {
  const { allCategories, navigate } = useTemplateContext();
  const c = getContent(section);
  return (
    <section className="mx-auto max-w-6xl px-4 py-12">
      {c.title && <h2 className="mb-6 text-2xl font-semibold text-slate-900">{String(c.title)}</h2>}
      <div className="flex flex-wrap gap-2">
        {allCategories.map((cat: { id: string; name?: string }) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => navigate(`/shop?category=${encodeURIComponent(cat.id)}`)}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-indigo-400 hover:text-indigo-700"
          >
            {cat.name || cat.id}
          </button>
        ))}
      </div>
      {allCategories.length === 0 && <p className="text-slate-500">No categories yet.</p>}
    </section>
  );
};

const BuiltinNewsletterSection: React.FC<Props> = ({ section }) => {
  const { addSubscriber, addToast } = useTemplateContext();
  const c = getContent(section);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      await addSubscriber(trimmed);
      addToast('تم الاشتراك', 'success');
      setEmail('');
    } catch {
      addToast('تعذّر الاشتراك', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="bg-slate-100 py-12">
      <div className="mx-auto max-w-xl px-4 text-center">
        {c.title && <h2 className="text-2xl font-semibold text-slate-900">{String(c.title)}</h2>}
        {c.subtitle && <p className="mt-2 text-slate-600">{String(c.subtitle)}</p>}
        <form onSubmit={submit} className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="rounded-lg border border-slate-300 px-3 py-2 sm:min-w-[240px]"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {busy ? '…' : 'Subscribe'}
          </button>
        </form>
      </div>
    </section>
  );
};

const BuiltinFooterSection: React.FC<Props> = ({ section }) => {
  const { store } = useTemplateContext();
  const c = getContent(section);
  const bg = (c.backgroundColor as string) || '#0f172a';
  const fg = (c.textColor as string) || '#ffffff';
  return (
    <footer className="mt-auto py-8" style={{ backgroundColor: bg, color: fg }}>
      <div className="mx-auto max-w-6xl px-4 text-center text-sm">
        <div className="font-medium">{store?.name || 'Store'}</div>
        <p className="mt-2 opacity-90">{c.text || '© Store'}</p>
      </div>
    </footer>
  );
};

const BuiltinHeaderSection: React.FC<Props> = () => {
  const { store, navigate } = useTemplateContext();
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <button type="button" onClick={() => navigate('/')} className="text-lg font-semibold text-slate-900">
          {store?.name || 'Store'}
        </button>
        <nav className="flex gap-3 text-sm text-slate-600">
          <button type="button" className="hover:text-indigo-600" onClick={() => navigate('/shop')}>
            Shop
          </button>
          <button type="button" className="hover:text-indigo-600" onClick={() => navigate('/cart')}>
            Cart
          </button>
        </nav>
      </div>
    </header>
  );
};

const Shell: React.FC<{ title?: string; children?: React.ReactNode }> = ({ title, children }) => (
  <section className="mx-auto max-w-6xl px-4 py-10">
    {title && <h2 className="mb-4 text-xl font-semibold text-slate-900">{title}</h2>}
    {children}
  </section>
);

const BuiltinSlideshowSection: React.FC<Props> = ({ section }) => (
  <Shell title={String(getContent(section).title || '')}>
    <div className="rounded-lg bg-slate-100 p-8 text-center text-slate-500">Slideshow</div>
  </Shell>
);

const BuiltinImageWithTextSection: React.FC<Props> = ({ section }) => {
  const c = getContent(section);
  return (
    <Shell title={c.title ? String(c.title) : undefined}>
      <div className="grid gap-6 md:grid-cols-2 md:items-center">
        {c.image && (
          <img
            src={String(c.image)}
            alt=""
            width={800}
            height={600}
            className="w-full rounded-lg object-cover"
            loading="lazy"
            decoding="async"
          />
        )}
        <div>{c.subtitle && <p className="text-slate-600">{String(c.subtitle)}</p>}</div>
      </div>
    </Shell>
  );
};

const BuiltinTestimonialsSection: React.FC<Props> = ({ section }) => (
  <Shell title={String(getContent(section).title || 'Testimonials')}>
    <p className="text-slate-500">Testimonials</p>
  </Shell>
);

const BuiltinEmptyStateSection: React.FC<Props> = ({ section }) => (
  <Shell title={String(getContent(section).title || '')}>
    <p className="text-slate-500">{String(getContent(section).subtitle || 'Nothing here yet.')}</p>
  </Shell>
);

const BuiltinProductDetailsSettingsSection: React.FC<Props> = ({ section }) => (
  <Shell title={String(getContent(section).title || 'Product')}>
    <p className="text-slate-500 text-sm">Product layout</p>
  </Shell>
);

const BuiltinProductReviewsSection: React.FC<Props> = ({ section }) => (
  <Shell title={String(getContent(section).title || 'Reviews')}>
    <p className="text-slate-500 text-sm">Reviews</p>
  </Shell>
);

const BuiltinShopPageSection: React.FC<Props> = ({ section }) => (
  <Shell title={String(getContent(section).title || 'Shop')}>
    <p className="text-slate-500 text-sm">Shop</p>
  </Shell>
);

const BuiltinAboutPageSection: React.FC<Props> = ({ section }) => (
  <Shell title={String(getContent(section).title || 'About')}>
    <p className="text-slate-500 text-sm">About</p>
  </Shell>
);

const BuiltinContactPageSection: React.FC<Props> = ({ section }) => (
  <Shell title={String(getContent(section).title || 'Contact')}>
    <p className="text-slate-500 text-sm">Contact</p>
  </Shell>
);

const BuiltinWishlistPageSection: React.FC<Props> = ({ section }) => (
  <Shell title={String(getContent(section).title || 'Wishlist')}>
    <p className="text-slate-500 text-sm">Wishlist</p>
  </Shell>
);

const BuiltinTrackOrderPageSection: React.FC<Props> = ({ section }) => (
  <Shell title={String(getContent(section).title || 'Track order')}>
    <p className="text-slate-500 text-sm">Track order</p>
  </Shell>
);

const BuiltinProfilePageSection: React.FC<Props> = ({ section }) => (
  <Shell title={String(getContent(section).title || 'Profile')}>
    <p className="text-slate-500 text-sm">Profile</p>
  </Shell>
);

const BuiltinPolicyPageSection: React.FC<Props> = ({ section }) => (
  <Shell title={String(getContent(section).title || 'Policy')}>
    <p className="text-slate-500 text-sm">Policy</p>
  </Shell>
);

type BuiltinSection = React.FC<{ section: LayoutSection }>;
let cachedBuiltin: Record<string, BuiltinSection> | null = null;

/** Registry used only when the theme package default registry has no entries. */
export function getBuiltinDefaultRegistry(): Record<string, BuiltinSection> {
  if (cachedBuiltin) return cachedBuiltin;
  cachedBuiltin = {
    HEADER: BuiltinHeaderSection,
    HERO: BuiltinHeroSection,
    SLIDESHOW: BuiltinSlideshowSection,
    FEATURED_PRODUCTS: BuiltinFeaturedProductsSection,
    CATEGORIES: BuiltinCategoriesSection,
    LOOKBOOK: BuiltinSlideshowSection,
    FLASH_SALE: BuiltinEmptyStateSection,
    BLOG: BuiltinEmptyStateSection,
    BLOG_POSTS: BuiltinEmptyStateSection,
    INSTAGRAM: BuiltinEmptyStateSection,
    INSTAGRAM_FEED: BuiltinEmptyStateSection,
    TESTIMONIALS: BuiltinTestimonialsSection,
    IMAGE_WITH_TEXT: BuiltinImageWithTextSection,
    COLLECTIONS: BuiltinCategoriesSection,
    VIDEO: BuiltinEmptyStateSection,
    BRANDS: BuiltinEmptyStateSection,
    BRAND_LOGOS: BuiltinEmptyStateSection,
    FAQ: BuiltinEmptyStateSection,
    NEWSLETTER: BuiltinNewsletterSection,
    EMPTY_STATE: BuiltinEmptyStateSection,
    PRODUCT_DETAILS_SETTINGS: BuiltinProductDetailsSettingsSection,
    PRODUCT_REVIEWS: BuiltinProductReviewsSection,
    SHOP_PAGE: BuiltinShopPageSection,
    ABOUT_PAGE: BuiltinAboutPageSection,
    CONTACT_PAGE: BuiltinContactPageSection,
    WISHLIST_PAGE: BuiltinWishlistPageSection,
    TRACK_ORDER_PAGE: BuiltinTrackOrderPageSection,
    PROFILE_PAGE: BuiltinProfilePageSection,
    POLICY_PAGE: BuiltinPolicyPageSection,
    FOOTER: BuiltinFooterSection,
  };
  return cachedBuiltin;
}
