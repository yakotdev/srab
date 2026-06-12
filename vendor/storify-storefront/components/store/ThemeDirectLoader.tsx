import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

interface ThemeDirectLoaderProps {
  themeConfigPayload: Record<string, unknown>;
  baseUrl: string;
  prefetchedHtml?: string | null;
}

function isAbortError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const name = (err as { name?: string }).name;
  return name === 'AbortError';
}

/**
 * HTML قديم أو كاش يستخدم `/api/theme-proxy/asset?url=https%3A%2F%2F...` — هذا يكسر
 * `import('./chunk.js')` لأن المتصفح يحل المسارات نسبةً لـ `/api/theme-proxy/` وليس للملف على CDN.
 * نحوّل لنفس شكل المسار الذي يولّده theme-html.service.ts.
 */
const THEME_DIRECT_BOOT_KEY = '__storifyThemeDirectBootstrapped__';

function readGlobalThemeBootstrapped(): boolean {
  try {
    return Boolean((window as unknown as Record<string, unknown>)[THEME_DIRECT_BOOT_KEY]);
  } catch {
    return false;
  }
}

function setGlobalThemeBootstrapped(value: boolean) {
  try {
    (window as unknown as Record<string, unknown>)[THEME_DIRECT_BOOT_KEY] = value;
  } catch {
    /* ignore */
  }
}

function normalizeThemeProxyAssetToPathStyle(absoluteUrl: string): string {
  try {
    const u = new URL(absoluteUrl);
    if (!u.pathname.includes('/theme-proxy/asset')) return absoluteUrl;
    const rawQ = u.searchParams.get('url');
    if (!rawQ || typeof rawQ !== 'string') return absoluteUrl;
    const decoded = (() => {
      try {
        return decodeURIComponent(rawQ.trim());
      } catch {
        return rawQ.trim();
      }
    })();
    if (!decoded.startsWith('http://') && !decoded.startsWith('https://')) return absoluteUrl;
    const target = new URL(decoded);
    const proto = target.protocol.replace(':', '');
    const qEnc = target.search ? target.search.replace(/^\?/, '%3F').replace(/&/g, '%26') : '';
    const segment = `${proto}/${target.host}${target.pathname}${qEnc}`;
    return `${u.origin}/api/theme-proxy/asset/${segment}`;
  } catch {
    return absoluteUrl;
  }
}

const ThemeDirectLoader: React.FC<ThemeDirectLoaderProps> = ({ themeConfigPayload, baseUrl, prefetchedHtml }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(() => !prefetchedHtml?.trim() && !readGlobalThemeBootstrapped());
  const [error, setError] = useState<string | null>(null);
  const { search } = useLocation();
  const themeConfigPayloadRef = useRef(themeConfigPayload);
  themeConfigPayloadRef.current = themeConfigPayload;
  const devAssetBustRef = useRef<string>(`${Date.now()}`);
  /** After first successful boot, never show the host loading overlay again (SPA route changes). */
  const themeBootstrappedRef = useRef(readGlobalThemeBootstrapped());

  /** إظهار أزرار تطوير الثيم داخل الستورفرونت (مبدئياً مخفية بـ CSS على الغلاف) */
  const themeDevToolsOn = useMemo(() => {
    try {
      const env = (import.meta as unknown as { env?: Record<string, string> }).env;
      if (env?.VITE_SHOW_THEME_DEV_IN_STOREFRONT === 'true') return true;
      const q = new URLSearchParams(search);
      if (q.get('storifyThemeDev') === '1') return true;
      if (typeof localStorage !== 'undefined' && localStorage.getItem('storify_theme_dev') === '1') return true;
    } catch {
      /* ignore */
    }
    return false;
  }, [search]);

  function writeHostStorifyEnvelope() {
    const p = themeConfigPayloadRef.current;
    (window as unknown as { __STORIFY_THEME_CONFIG__?: unknown }).__STORIFY_THEME_CONFIG__ = {
      type: 'STORIFY_THEME_CONFIG',
      payload: {
        ...p,
        directRendering: true,
      },
    };
  }

  /** تحديث الحمولة بعد التحميل أو عند التنقل — بدون إعادة حقن HTML.
   *  نستخدم debounce (60ms) لتجميع التغييرات المتزامنة (مثل تغيُّر المسار + إعادة تعيين reviews + menus)
   *  في رسالة واحدة بدلاً من عدة رسائل متتالية تسبب وميض المحتوى. */
  useEffect(() => {
    if (!baseUrl) return;
    writeHostStorifyEnvelope();
    const root = containerRef.current?.querySelector('#root');
    if (!root || root.childElementCount === 0) return;
    if (themeBootstrappedRef.current) {
      setLoading(false);
    }
    const id = window.setTimeout(() => {
      window.postMessage(
        {
          type: 'STORIFY_THEME_CONFIG',
          payload: {
            ...themeConfigPayloadRef.current,
            directRendering: true,
          },
        },
        '*',
      );
    }, 60);
    return () => window.clearTimeout(id);
  }, [baseUrl, themeConfigPayload]);

  useEffect(() => {
    let active = true;
    const abort = new AbortController();
    const headNodes: Node[] = [];
    const bodyNodes: Node[] = [];
    let readyTimeoutId: number | null = null;
    /** سقف أقصى حتى لا يبقى «جاري تحميل» للأبد إن لم يُرسل الثيم STORIFY_THEME_READY (شبكة بطيئة، سكربت عالق، إلخ). */
    let absoluteCapId: number | null = null;
    let externalScriptsPending = 0;
    let readyResolved = false;

    const clearReadyTimeout = () => {
      if (readyTimeoutId != null) {
        window.clearTimeout(readyTimeoutId);
        readyTimeoutId = null;
      }
    };

    const clearAbsoluteCap = () => {
      if (absoluteCapId != null) {
        window.clearTimeout(absoluteCapId);
        absoluteCapId = null;
      }
    };

    const clearAllReadyTimers = () => {
      clearReadyTimeout();
      clearAbsoluteCap();
    };

    const finishLoading = () => {
      if (!active || readyResolved) return;
      readyResolved = true;
      themeBootstrappedRef.current = true;
      setGlobalThemeBootstrapped(true);
      clearAllReadyTimers();
      setError(null);
      setLoading(false);
    };

    const failLoading = (message: string) => {
      if (!active || readyResolved) return;
      readyResolved = true;
      clearAllReadyTimers();
      setError(message);
      setLoading(false);
    };

    const scheduleReadyFallback = () => {
      clearReadyTimeout();
      readyTimeoutId = window.setTimeout(() => {
        if (!active || readyResolved) return;
        finishLoading();
      }, 3200);
    };

    const startAbsoluteCap = () => {
      clearAbsoluteCap();
      absoluteCapId = window.setTimeout(() => {
        if (!active || readyResolved) return;
        finishLoading();
      }, 14_000);
    };

    const onThemeMessage = (event: MessageEvent) => {
      const type = typeof event.data?.type === 'string' ? event.data.type : '';
      if (type === 'STORIFY_THEME_READY') {
        clearAllReadyTimers();
        finishLoading();
      } else if (type === 'STORIFY_THEME_ERROR') {
        clearAllReadyTimers();
        const message =
          typeof event.data?.message === 'string' && event.data.message.trim()
            ? event.data.message.trim()
            : 'Theme failed to initialize';
        failLoading(message);
      }
    };
    window.addEventListener('message', onThemeMessage);

    function cleanupDom() {
      clearAllReadyTimers();
      while (headNodes.length) {
        const n = headNodes.pop();
        try {
          n?.parentNode?.removeChild(n);
        } catch {
          /* ignore */
        }
      }
      while (bodyNodes.length) {
        const n = bodyNodes.pop();
        try {
          n?.parentNode?.removeChild(n);
        } catch {
          /* ignore */
        }
      }
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    }

    async function ensureHostSdkReady() {
      const payload = themeConfigPayloadRef.current;
      const win = window as Window & {
        StorifySDK?: {
          setStoreConfig?: (config: Record<string, unknown>) => void;
        };
        __storifyNativeNumberFormat?: typeof Intl.NumberFormat;
        __storifyNativeNumberToLocaleString?: Number['toLocaleString'];
        __storifyCurrencyFormatPatchInstalled?: boolean;
      };
      const installCurrencyDisplayPatch = () => {
        if (win.__storifyCurrencyFormatPatchInstalled) return;
        const NativeNumberFormat = win.__storifyNativeNumberFormat ?? Intl.NumberFormat;
        const nativeToLocaleString = win.__storifyNativeNumberToLocaleString ?? Number.prototype.toLocaleString;
        win.__storifyNativeNumberFormat = NativeNumberFormat;
        win.__storifyNativeNumberToLocaleString = nativeToLocaleString;
        const getDisplayOverride = (options?: Intl.NumberFormatOptions) => {
          const currentPayload = themeConfigPayloadRef.current;
          const store = currentPayload.store && typeof currentPayload.store === 'object'
            ? (currentPayload.store as Record<string, unknown>)
            : {};
          const storeCurrency = typeof store.currency === 'string' ? store.currency.trim() : '';
          const display = store.currencyFormat && typeof store.currencyFormat === 'object'
            ? (store.currencyFormat as { symbol?: unknown; decimalPlaces?: unknown })
            : null;
          const requestedCurrency = typeof options?.currency === 'string' ? options.currency.trim() : '';
          const shouldOverride =
            options?.style === 'currency' &&
            storeCurrency &&
            requestedCurrency.toUpperCase() === storeCurrency.toUpperCase() &&
            display &&
            (typeof display.symbol === 'string' || display.decimalPlaces !== undefined);
          if (!shouldOverride || !display) return null;
          const nextOptions: Intl.NumberFormatOptions = { ...(options ?? {}) };
          const digits = Number(display.decimalPlaces);
          if (Number.isFinite(digits) && digits >= 0) {
            const clamped = Math.min(4, Math.max(0, Math.round(digits)));
            nextOptions.minimumFractionDigits = clamped;
            nextOptions.maximumFractionDigits = clamped;
          }
          const symbol = typeof display.symbol === 'string' && display.symbol.trim() ? display.symbol.trim() : '';
          return { nextOptions, symbol };
        };
        const formatWithOverride = (
          value: number,
          locales?: Intl.LocalesArgument,
          options?: Intl.NumberFormatOptions,
        ) => {
          const override = getDisplayOverride(options);
          if (!override) return null;
          const formatter = new NativeNumberFormat(locales, override.nextOptions);
          if (!override.symbol) return formatter.format(value);
          return formatter
            .formatToParts(value)
            .map((part) => (part.type === 'currency' ? override.symbol : part.value))
            .join('');
        };
        const PatchedNumberFormat = function (
          this: unknown,
          locales?: Intl.LocalesArgument,
          options?: Intl.NumberFormatOptions,
        ) {
          const override = getDisplayOverride(options);
          if (!override) {
            return new NativeNumberFormat(locales, options);
          }
          const formatter = new NativeNumberFormat(locales, override.nextOptions);
          if (!override.symbol) return formatter;

          return {
            format(value: number) {
              return formatter
                .formatToParts(value)
                .map((part) => (part.type === 'currency' ? override.symbol : part.value))
                .join('');
            },
            formatToParts(value: number) {
              return formatter
                .formatToParts(value)
                .map((part) => (part.type === 'currency' ? { ...part, value: override.symbol } : part));
            },
            resolvedOptions: () => formatter.resolvedOptions(),
          } as Intl.NumberFormat;
        } as unknown as typeof Intl.NumberFormat;
        PatchedNumberFormat.supportedLocalesOf = NativeNumberFormat.supportedLocalesOf.bind(NativeNumberFormat);
        PatchedNumberFormat.prototype = NativeNumberFormat.prototype;
        Intl.NumberFormat = PatchedNumberFormat;
        Number.prototype.toLocaleString = function (
          locales?: Intl.LocalesArgument,
          options?: Intl.NumberFormatOptions,
        ) {
          const value = Number(this.valueOf());
          const formatted = formatWithOverride(value, locales, options);
          if (formatted != null) return formatted;
          return nativeToLocaleString.call(this, locales, options);
        };
        win.__storifyCurrencyFormatPatchInstalled = true;
      };
      const applyConfig = () => {
        const store = payload.store && typeof payload.store === 'object' ? (payload.store as Record<string, unknown>) : {};
        win.StorifySDK?.setStoreConfig?.({
          ...store,
          id: payload.storeId,
          apiBaseUrl: typeof payload.apiBaseUrl === 'string' ? payload.apiBaseUrl : undefined,
        });
        installCurrencyDisplayPatch();
      };

      if (win.StorifySDK?.setStoreConfig) {
        applyConfig();
        return;
      }
      installCurrencyDisplayPatch();

      const rawSdkUrl =
        typeof payload.sdkScriptUrl === 'string' && payload.sdkScriptUrl.trim()
          ? payload.sdkScriptUrl.trim()
          : '/sdk/storefront-sdk.js?v=currency-format-v2';

      await new Promise<void>((resolve) => {
        let settled = false;
        let capId: number | null = null;
        const settle = () => {
          if (settled) return;
          settled = true;
          if (capId != null) window.clearTimeout(capId);
          resolve();
        };
        /** Avoid hanging forever: `load` does not replay if the script already ran (SPA navigation remount). */
        capId = window.setTimeout(settle, 12_000);
        const onSdkReady = () => {
          applyConfig();
          settle();
        };
        try {
          const sdkUrl = new URL(rawSdkUrl, window.location.origin).toString();
          const safeKey = encodeURIComponent(sdkUrl);
          const existing = document.querySelector(`script[data-storify-host-sdk="${safeKey}"]`) as HTMLScriptElement | null;
          if (existing) {
            if (win.StorifySDK?.setStoreConfig) {
              onSdkReady();
              return;
            }
            existing.addEventListener('load', onSdkReady, { once: true });
            existing.addEventListener('error', settle, { once: true });
            // If the script finished before we attached listeners, SDK appears on the next tick.
            queueMicrotask(() => {
              if (settled) return;
              if (win.StorifySDK?.setStoreConfig) onSdkReady();
            });
            requestAnimationFrame(() => {
              if (settled) return;
              if (win.StorifySDK?.setStoreConfig) onSdkReady();
            });
            return;
          }
          const script = document.createElement('script');
          script.src = sdkUrl;
          script.async = false;
          script.setAttribute('data-storify-host-sdk', safeKey);
          script.onload = () => {
            onSdkReady();
          };
          script.onerror = () => settle();
          document.head.appendChild(script);
        } catch {
          settle();
        }
      });
    }

    async function injectHtml(html: string) {
      if (!active || !containerRef.current) return;

      const themeRoot = containerRef.current.querySelector('#root');
      const alreadyMounted =
        (themeBootstrappedRef.current || readGlobalThemeBootstrapped()) &&
        Boolean(themeRoot?.childElementCount);
      if (alreadyMounted) {
        themeBootstrappedRef.current = true;
        setGlobalThemeBootstrapped(true);
        writeHostStorifyEnvelope();
        finishLoading();
        return;
      }

      cleanupDom();
      readyResolved = false;
      externalScriptsPending = 0;
      setLoading(true);
      setError(null);

      writeHostStorifyEnvelope();

      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const isLocalDevHost =
        typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

      /**
       * روابط الثيم النسبية مثل `/assets/main.js` تُحلّ على `baseUrl` (CDN).
       * لكن `/api/...` (theme-proxy وغيره) يجب أن يبقى على **أصل الستورفرونت** — وإلا
       * `new URL('/api/theme-proxy/...', 'https://cdn.../theme/')` يصبح طلبًا إلى CDN وليس localhost فيفشل التحميل.
       */
      const rewriteExternalUrlToProxy = (absoluteUrl: string): string => {
        try {
          const u = new URL(absoluteUrl);
          const pageOrigin =
            typeof window !== 'undefined' && window.location?.origin
              ? window.location.origin
              : 'http://localhost:3004';
          if (u.origin === pageOrigin) return absoluteUrl;
          const proto = u.protocol.replace(':', '');
          const q = u.search ? u.search.replace(/^\?/, '%3F').replace(/&/g, '%26') : '';
          const segment = `${proto}/${u.host}${u.pathname}${q}`;
          return `${pageOrigin}/api/theme-proxy/asset/${segment}`;
        } catch {
          return absoluteUrl;
        }
      };

      const resolveThemeAssetUrl = (raw: string): string => {
        const t = raw.trim();
        if (!t || t.startsWith('data:') || t.startsWith('blob:')) return raw;
        if (t.startsWith('https://') || t.startsWith('http://')) {
          return rewriteExternalUrlToProxy(t);
        }
        if (t.includes('/theme-proxy/asset') && (t.includes('?url=') || t.includes('&url='))) {
          try {
            const origin =
              typeof window !== 'undefined' && window.location?.origin
                ? window.location.origin
                : 'http://localhost:3004';
            const abs = t.startsWith('http://') || t.startsWith('https://') ? t : new URL(t, origin).toString();
            return normalizeThemeProxyAssetToPathStyle(abs);
          } catch {
            /* fall through */
          }
        }
        if (t.startsWith('/api/') || t === '/api') {
          try {
            const origin =
              typeof window !== 'undefined' && window.location?.origin
                ? window.location.origin
                : 'http://localhost:3004';
            const abs = new URL(t, origin).toString();
            return normalizeThemeProxyAssetToPathStyle(abs);
          } catch {
            return raw;
          }
        }
        try {
          return new URL(t, `${baseUrl.replace(/\/?$/, '/')}`).toString();
        } catch {
          return raw;
        }
      };

      const withDevCacheBust = (url: string): string => {
        const resolved = resolveThemeAssetUrl(url);
        if (!isLocalDevHost) return resolved;
        try {
          const u = new URL(resolved);
          u.searchParams.set('storify_asset_v', devAssetBustRef.current);
          return u.toString();
        } catch {
          return resolved;
        }
      };

      const styles = doc.head.querySelectorAll('link[rel="stylesheet"], style');
      styles.forEach((style) => {
        const clone = style.cloneNode(true);
        if (clone instanceof HTMLLinkElement && clone.href) {
          clone.href = withDevCacheBust(clone.getAttribute('href') || clone.href);
        }
        document.head.appendChild(clone);
        headNodes.push(clone);
      });

      // Inject modulepreload hints so the browser pre-fetches JS chunks before main.js runs.
      doc.head.querySelectorAll('link[rel="modulepreload"]').forEach((link) => {
        const rawHref = (link as HTMLLinkElement).getAttribute('href');
        if (!rawHref) return;
        const resolved = withDevCacheBust(rawHref);
        const clone = document.createElement('link');
        clone.rel = 'modulepreload';
        clone.setAttribute('crossorigin', '');
        clone.href = resolved;
        document.head.appendChild(clone);
        headNodes.push(clone);
      });

      const innerRoot = document.createElement('div');
      innerRoot.id = 'root';
      containerRef.current.appendChild(innerRoot);

      await ensureHostSdkReady();
      if (!active || !containerRef.current) {
        setLoading(false);
        return;
      }

      const scripts = Array.from(doc.querySelectorAll('script'));
      for (const script of scripts) {
        const newScript = document.createElement('script');
        Array.from(script.attributes).forEach((attr) => {
          newScript.setAttribute(attr.name, attr.value);
        });
        const srcAttr = newScript.getAttribute('src');
        if (srcAttr) {
          externalScriptsPending += 1;
          newScript.addEventListener('load', () => {
            if (!active || readyResolved) return;
            externalScriptsPending = Math.max(0, externalScriptsPending - 1);
            if (externalScriptsPending === 0) scheduleReadyFallback();
          });
          newScript.addEventListener('error', () => {
            if (!active || readyResolved) return;
            externalScriptsPending = Math.max(0, externalScriptsPending - 1);
            failLoading(`Failed to load theme script: ${srcAttr}`);
          });
          newScript.setAttribute('src', withDevCacheBust(srcAttr));
        }
        if (script.textContent) {
          newScript.textContent = script.textContent;
        }
        document.body.appendChild(newScript);
        bodyNodes.push(newScript);
      }

      startAbsoluteCap();
      scheduleReadyFallback();
    }

    async function loadTheme() {
      const trimmedPrefetch = prefetchedHtml?.trim();
      if (trimmedPrefetch) {
        await injectHtml(trimmedPrefetch);
        return;
      }

      setLoading(true);
      setError(null);
      const apiUrl = (() => {
        const meta = import.meta as unknown as { env?: Record<string, string> };
        const metaEnv = typeof meta.env === 'object' && meta.env ? meta.env : {};
        const envApiBase = typeof metaEnv.VITE_API_URL === 'string' ? metaEnv.VITE_API_URL.trim() : '';
        if (envApiBase && envApiBase.startsWith('http')) return envApiBase;
        return '/api';
      })();

      try {
        const response = await fetch(`${apiUrl}/theme-proxy?url=${encodeURIComponent(baseUrl)}`, {
          signal: abort.signal,
        });
        if (!response.ok) {
          throw new Error(`Failed to load theme: ${response.statusText}`);
        }
        const html = await response.text();
        if (!active) return;
        await injectHtml(html);
      } catch (err: unknown) {
        if (!active || isAbortError(err)) return;
        console.error('ThemeDirectLoader error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load theme');
        setLoading(false);
      }
    }

    if (baseUrl) {
      void loadTheme();
    }

    return () => {
      active = false;
      window.removeEventListener('message', onThemeMessage);
      abort.abort();
      if (!readGlobalThemeBootstrapped()) {
        cleanupDom();
      }
    };
  }, [baseUrl, prefetchedHtml]);

  return (
    <div
      data-storify-storefront-theme-host=""
      {...(themeDevToolsOn ? { 'data-storify-theme-dev-tools': '' } : {})}
      style={{ width: '100%', minHeight: '100vh', display: 'block' }}
    >
      {loading && !themeBootstrappedRef.current && (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
          جاري تحميل
        </div>
      )}
      {error && (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>
          {error}
        </div>
      )}
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
};

export default ThemeDirectLoader;
