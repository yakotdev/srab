/**
 * Storefront host origin for links (target=_top) and for `${origin}/api` fallbacks in storefront-api.
 *
 * Never derive navigation origin from apiBaseUrl — locally API is often :3001 while Vite storefront is :3000.
 * Sources (in order): parent sets `parentOrigin` on the iframe URL query (see StoreFront); STORIFY_THEME_CONFIG
 * `storefrontOrigin` / event.origin; setHostOriginFromString only.
 */

let hostOriginOverride: string | null = null;

/** @deprecated No-op — apiBaseUrl must not set the storefront origin used for links. Kept for call-site compatibility. */
export function setHostOriginFromApiBase(_apiBaseUrl?: string): void {
  /* intentionally empty */
}

export function setHostOriginFromString(origin: string | undefined): void {
  hostOriginOverride = null;
  if (!origin || typeof origin !== 'string') return;
  try {
    hostOriginOverride = new URL(origin).origin;
  } catch {
    hostOriginOverride = null;
  }
}

export function getHostOriginOverride(): string | null {
  return hostOriginOverride;
}

export function getHostOrigin(): string {
  if (hostOriginOverride) return hostOriginOverride;
  try {
    if (document.referrer) return new URL(document.referrer).origin;
  } catch {
    /* ignore */
  }
  return typeof window !== 'undefined' ? window.location.origin : '';
}

/** Call as early as possible: parent passes real storefront origin when iframe src is on another port (e.g. API :3001). */
export function initHostOriginFromParentQueryParam(): void {
  if (typeof window === 'undefined') return;
  try {
    const q = new URLSearchParams(window.location.search);
    const raw = q.get('parentOrigin');
    if (!raw) return;
    const decoded = decodeURIComponent(raw.trim());
    if (decoded.startsWith('http://') || decoded.startsWith('https://')) {
      setHostOriginFromString(decoded);
    }
  } catch {
    /* ignore */
  }
}

initHostOriginFromParentQueryParam();
