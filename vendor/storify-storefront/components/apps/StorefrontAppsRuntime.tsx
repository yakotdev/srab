import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import type { StorefrontApp } from '../../types';
import {
  configureFacebookTrackingToggles,
  configureGoogleTrackingMode,
  configureTikTokTrackingToggles,
  trackEvent,
} from '../../lib/apps/trackEvent';

interface StorefrontAppsRuntimeProps {
  apps: StorefrontApp[];
  currency?: string;
  language?: string;
  direction?: 'rtl' | 'ltr';
}

const googleInitialized = new Set<string>();
const gtmInitialized = new Set<string>();
const facebookInitialized = new Set<string>();
const tiktokInitialized = new Set<string>();

function ensureScript(id: string, src: string): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(id)) return;
  const script = document.createElement('script');
  script.id = id;
  script.async = true;
  script.src = src;
  document.head.appendChild(script);
}

function initGoogleAnalytics(measurementId: string): void {
  const id = measurementId.trim();
  if (!id || googleInitialized.has(id)) return;
  if ((window as Window & { __STORIFY_GA4_ID__?: string }).__STORIFY_GA4_ID__ === id) {
    googleInitialized.add(id);
    return;
  }

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtagShim(...args: unknown[]) {
    window.dataLayer?.push(args);
  };
  window.gtag('js', new Date());
  window.gtag('config', id, { send_page_view: false });
  ensureScript(`storify-google-analytics-${id}`, `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`);
  googleInitialized.add(id);
}

function initGoogleTagManager(containerId: string): void {
  const id = containerId.trim();
  if (!id || gtmInitialized.has(id)) return;
  const gtmGlobal = (window as Window & { google_tag_manager?: Record<string, unknown> }).google_tag_manager;
  if (gtmGlobal && gtmGlobal[id]) {
    gtmInitialized.add(id);
    return;
  }
  if (document.querySelector(`script[src*="googletagmanager.com/gtm.js?id=${encodeURIComponent(id)}"]`)) {
    gtmInitialized.add(id);
    return;
  }

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    'gtm.start': Date.now(),
    event: 'gtm.js',
  });
  ensureScript(`storify-google-tag-manager-${id}`, `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(id)}`);

  if (typeof document !== 'undefined' && document.body && !document.getElementById(`storify-google-tag-manager-noscript-${id}`)) {
    const noScript = document.createElement('noscript');
    noScript.id = `storify-google-tag-manager-noscript-${id}`;
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.googletagmanager.com/ns.html?id=${encodeURIComponent(id)}`;
    iframe.height = '0';
    iframe.width = '0';
    iframe.style.display = 'none';
    iframe.style.visibility = 'hidden';
    noScript.appendChild(iframe);
    document.body.prepend(noScript);
  }
  gtmInitialized.add(id);
}

function injectSearchConsoleMeta(content: string): void {
  if (typeof document === 'undefined') return;
  const value = content.trim();
  const selector = 'meta[name="google-site-verification"][data-storify-google="1"]';
  const existing = document.querySelector(selector) as HTMLMetaElement | null;
  if (!value) {
    if (existing) existing.remove();
    return;
  }
  const meta = existing ?? document.createElement('meta');
  meta.name = 'google-site-verification';
  meta.content = value;
  meta.setAttribute('data-storify-google', '1');
  if (!existing) document.head.appendChild(meta);
}

function initFacebookPixel(pixelId: string): void {
  const id = pixelId.trim();
  if (!id || facebookInitialized.has(id)) return;

  if (!window.fbq) {
    const fbq = function fbqShim(...args: unknown[]) {
      const withCallMethod = fbq as unknown as {
        callMethod?: (...callArgs: unknown[]) => void;
        queue: unknown[];
      };
      if (typeof withCallMethod.callMethod === 'function') {
        withCallMethod.callMethod(...args);
        return;
      }
      withCallMethod.queue.push(args);
    } as unknown as Window['fbq'] & {
      queue: unknown[];
      loaded?: boolean;
      version?: string;
      push?: (...pushArgs: unknown[]) => void;
    };
    fbq.queue = [];
    fbq.push = (...pushArgs: unknown[]) => {
      (fbq as unknown as (...args: unknown[]) => void)(...pushArgs);
    };
    fbq.loaded = true;
    fbq.version = '2.0';
    window.fbq = fbq;
    (window as Window & { _fbq?: typeof fbq })._fbq = fbq;
  }

  ensureScript('storify-facebook-pixel', 'https://connect.facebook.net/en_US/fbevents.js');
  // Prevent Meta auto-detected click events (e.g., SubscribedButtonClick)
  // so reporting stays focused on explicitly tracked commerce events.
  window.fbq('init', id);
  window.fbq('set', 'autoConfig', false, id);
  facebookInitialized.add(id);
}

function initTikTokPixel(pixelId: string): void {
  const id = pixelId.trim();
  if (!id || tiktokInitialized.has(id)) return;

  if (!window.ttq) {
    const ttq = function ttqShim(...args: unknown[]) {
      const withMethods = ttq as unknown as {
        instances: Record<string, unknown>;
        _i: Record<string, unknown>;
        _q: unknown[];
      };
      withMethods._q.push(args);
    } as unknown as Window['ttq'] & {
      instances: Record<string, unknown>;
      _i: Record<string, unknown>;
      _q: unknown[];
    };
    ttq.instances = {};
    ttq._i = {};
    ttq._q = [];
    window.ttq = ttq;
  }

  ensureScript('storify-tiktok-pixel', 'https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=storify&lib=ttq');
  window.ttq('load', id);
  window.ttq('page');
  tiktokInitialized.add(id);
}

export function StorefrontAppsRuntime({ apps, currency, language, direction }: StorefrontAppsRuntimeProps) {
  const location = useLocation();

  useEffect(() => {
    const googleApp = apps.find((app) => app.runtime.provider === 'google');
    const legacyGoogleAnalyticsApp = apps.find((app) => app.runtime.provider === 'google_analytics');
    const gtmContainerId =
      googleApp && typeof googleApp.config.gtmContainerId === 'string' ? googleApp.config.gtmContainerId : '';
    const measurementId =
      googleApp && typeof googleApp.config.measurementId === 'string'
        ? googleApp.config.measurementId
        : legacyGoogleAnalyticsApp && typeof legacyGoogleAnalyticsApp.config.measurementId === 'string'
          ? legacyGoogleAnalyticsApp.config.measurementId
          : '';
    const searchConsoleVerification =
      googleApp && typeof googleApp.config.searchConsoleVerification === 'string'
        ? googleApp.config.searchConsoleVerification
        : '';

    if (gtmContainerId.trim() && !measurementId.trim()) {
      initGoogleTagManager(gtmContainerId);
      configureGoogleTrackingMode({ useDataLayer: true });
    } else {
      if (measurementId.trim()) {
        configureGoogleTrackingMode({ useDataLayer: false });
        initGoogleAnalytics(measurementId);
      }
      if (gtmContainerId.trim()) {
        initGoogleTagManager(gtmContainerId);
      }
    }
    injectSearchConsoleMeta(searchConsoleVerification);

    for (const app of apps) {
      if (app.runtime.provider === 'facebook_pixel') {
        const pixelId = typeof app.config.pixelId === 'string' ? app.config.pixelId : '';
        configureFacebookTrackingToggles({
          trackPageView: app.config.trackPageView,
          trackViewItem: app.config.trackViewItem,
          trackAddToCart: app.config.trackAddToCart,
          trackAddToWishlist: app.config.trackAddToWishlist,
          trackBeginCheckout: app.config.trackBeginCheckout,
          trackPurchase: app.config.trackPurchase,
          trackSearch: app.config.trackSearch,
          trackSignUp: app.config.trackSignUp,
        });
        initFacebookPixel(pixelId);
      }
      if (app.runtime.provider === 'tiktok_pixel') {
        const pixelId = typeof app.config.pixelId === 'string' ? app.config.pixelId : '';
        configureTikTokTrackingToggles({
          trackPageView: app.config.trackPageView,
          trackViewItem: app.config.trackViewItem,
          trackAddToCart: app.config.trackAddToCart,
          trackAddToWishlist: app.config.trackAddToWishlist,
          trackBeginCheckout: app.config.trackBeginCheckout,
          trackPurchase: app.config.trackPurchase,
          trackSearch: app.config.trackSearch,
          trackSignUp: app.config.trackSignUp,
        });
        initTikTokPixel(pixelId);
      }
    }
  }, [apps]);

  useEffect(() => {
    if (apps.length === 0) return;
    trackEvent('page_view', {
      path: `${location.pathname}${location.search}`,
      title: typeof document !== 'undefined' ? document.title : undefined,
      currency,
      language,
      direction,
    });
  }, [apps, currency, direction, language, location.pathname, location.search]);

  return null;
}
