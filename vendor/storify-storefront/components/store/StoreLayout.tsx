import React, { Suspense, useState, useEffect } from 'react';
import { isStorefrontBootstrapReadyForPaint, useStore } from '../../context/StoreContext';
import { getFontFamilyCss } from '../../lib/theme-fonts';
import { Outlet, useLocation, useParams } from 'react-router-dom';
import { ChatBadge } from './ChatBadge';
import { OpenCartProvider } from '../../context/OpenCartContext';
import { useSeo, useProduct, usePolicy } from '../../lib/storefront-sdk';
import StoreSkeleton from './StoreSkeleton';
import { StorefrontAppsRuntime } from '../apps/StorefrontAppsRuntime';
import { useSessionHeartbeat } from '../../lib/analytics/sessionHeartbeat';

const ChatAssistant = React.lazy(() => import('./ChatAssistant'));
const LoginModal = React.lazy(() => import('./LoginModal'));
const CartDrawer = React.lazy(() =>
  import('./CartDrawer').then((m) => ({ default: m.CartDrawer })),
);

const StoreLayout: React.FC = () => {
  useSessionHeartbeat();
  const { theme, t, language, currency, storeConfig, currentUser, plugins, loading, themeHtml, storefrontApps, enabledLanguages, isRtl } = useStore();
  const uploadedThemeId = (theme as { uploadedThemeId?: string | null }).uploadedThemeId;
  const canPaintUploadedTheme = Boolean(uploadedThemeId && themeHtml?.trim());
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [shouldLoadChat, setShouldLoadChat] = useState(false);
  const location = useLocation();
  const params = useParams<{ id?: string; slug?: string }>();

  const siteName = storeConfig.name || t('platform_name_store') || 'Store';
  const siteDesc = storeConfig.metaDescription
    || (language === 'ar' ? `${siteName} – تسوق آمن ومميز` : `${siteName} – Your store`);
  const siteImage = storeConfig.logo || storeConfig.favicon || '';

  const pathWithoutLocale = location.pathname.replace(/^\/[a-z]{2}(?=\/|$)/i, '') || '/';
  const pageType = pathWithoutLocale.startsWith('/product/') ? 'product'
    : pathWithoutLocale.startsWith('/policies/') ? 'policy'
    : pathWithoutLocale === '/shop' ? 'shop'
    : 'home';

  const { product } = useProduct(pageType === 'product' ? params.id ?? null : null);
  const { policy } = usePolicy(pageType === 'policy' ? params.slug ?? null : null);

  const seo = useSeo({
    pageType,
    storeName: siteName,
    storeDescription: siteDesc,
    storeImage: siteImage || undefined,
    product: pageType === 'product' ? product : undefined,
    policy: pageType === 'policy' ? policy : undefined,
  });

  // Scroll to top when navigating to a new page
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    if (shouldLoadChat) return;
    const startLoadingChat = () => setShouldLoadChat(true);
    const idleId = window.setTimeout(startLoadingChat, 2500);
    window.addEventListener('pointerdown', startLoadingChat, { once: true });
    window.addEventListener('keydown', startLoadingChat, { once: true });
    return () => {
      window.clearTimeout(idleId);
      window.removeEventListener('pointerdown', startLoadingChat);
      window.removeEventListener('keydown', startLoadingChat);
    };
  }, [shouldLoadChat]);

  useEffect(() => {
    const nextDir = isRtl ? 'rtl' : 'ltr';
    document.documentElement.setAttribute('dir', nextDir);
    document.documentElement.setAttribute('lang', language || 'en');
    document.body.setAttribute('dir', nextDir);
  }, [isRtl, language]);

  const fontStyle = { fontFamily: getFontFamilyCss(theme.fontFamily) };
  const openCart = () => setIsCartOpen(true);

  // Update document title, favicon, and SEO meta (useSeo for page-specific meta)
  useEffect(() => {
    document.title = seo.title;

    const setMeta = (attr: string, value: string, isProperty = false) => {
      const key = isProperty ? 'property' : 'name';
      let el = document.querySelector(`meta[${key}="${attr}"]`) as HTMLMetaElement;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(key, attr);
        document.head.appendChild(el);
      }
      el.content = value;
    };
    setMeta('description', seo.description);
    if (seo.keywords) {
      setMeta('keywords', seo.keywords);
    } else {
      document.querySelector('meta[name="keywords"]')?.remove();
    }
    setMeta('og:title', seo.title, true);
    setMeta('og:description', seo.description, true);
    setMeta('og:url', seo.url, true);
    setMeta('og:type', seo.type, true);
    if (seo.image) setMeta('og:image', seo.image, true);
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', seo.title);
    setMeta('twitter:description', seo.description);
    if (seo.image) setMeta('twitter:image', seo.image);

    const origin = window.location.origin;
    const normalizedPath = pathWithoutLocale === '/' ? '' : pathWithoutLocale;
    const activeCodes = enabledLanguages.filter((lang) => lang.isActive !== false).map((lang) => lang.code);
    const setLink = (hreflang: string, href: string) => {
      let link = document.querySelector(`link[rel="alternate"][hreflang="${hreflang}"]`) as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'alternate';
        link.hreflang = hreflang;
        document.head.appendChild(link);
      }
      link.href = href;
    };
    activeCodes.forEach((code) => setLink(code, `${origin}/${code}${normalizedPath}`));
    setLink('x-default', `${origin}/${activeCodes[0] || language}${normalizedPath}`);
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = `${origin}/${language}${normalizedPath}`;

    if (storeConfig.favicon && String(storeConfig.favicon).trim() !== '') {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = storeConfig.favicon.trim();
    }
  }, [enabledLanguages, language, pathWithoutLocale, seo.title, seo.description, seo.url, seo.type, seo.image, storeConfig.favicon]);

  if (loading && !canPaintUploadedTheme && !isStorefrontBootstrapReadyForPaint()) {
    return <StoreSkeleton dir={isRtl ? 'rtl' : 'ltr'} />;
  }

  return (
    <OpenCartProvider openCart={openCart}>
      <div className={`min-h-screen bg-white flex flex-col`} style={fontStyle} dir={isRtl ? 'rtl' : 'ltr'}>
        <Suspense fallback={null}>
          {isCartOpen && <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />}
        </Suspense>

        <Suspense fallback={null}>
          {isLoginOpen && <LoginModal onClose={() => setIsLoginOpen(false)} />}
        </Suspense>

        <StorefrontAppsRuntime apps={storefrontApps} currency={currency} language={language} direction={isRtl ? 'rtl' : 'ltr'} />

        <main className="flex-1">
          <Outlet />
        </main>

        {shouldLoadChat && (
          <Suspense fallback={null}>
            <ChatAssistant />
          </Suspense>
        )}

        {plugins
          .filter(p => p.installed)
          .map(plugin => {
            const manifest = (plugin as any).manifest;
            if (!manifest || !manifest.storefrontComponents) return null;

            return manifest.storefrontComponents.map((component: any, idx: number) => {
              if (plugin.id === 'chat-app' && component.name === 'ChatBadge') {
                return <ChatBadge key={`app-component-${plugin.id}-${idx}`} />;
              }
              return null;
            });
          })
          .flat()
          .filter(Boolean)}
      </div>
    </OpenCartProvider>
  );
};

export default StoreLayout;