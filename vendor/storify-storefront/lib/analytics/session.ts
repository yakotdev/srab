import { getResolvedStoreId } from '../store-id';

const VISITOR_KEY = 'storify_vid';
const SESSION_KEY = 'storify_sid';
const UTM_KEY = 'storify_utm';

export interface StoredUtm {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  landingPath?: string;
  referrer?: string;
}

function randomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getVisitorId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem(VISITOR_KEY);
  if (!id) {
    id = randomId();
    localStorage.setItem(VISITOR_KEY, id);
  }
  return id;
}

export function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = randomId();
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export function captureUtmFromUrl(): StoredUtm {
  if (typeof window === 'undefined') return {};
  const params = new URLSearchParams(window.location.search);
  const utmSource = params.get('utm_source') || undefined;
  const utmMedium = params.get('utm_medium') || undefined;
  const utmCampaign = params.get('utm_campaign') || undefined;
  const hasUtm = Boolean(utmSource || utmMedium || utmCampaign);

  const existing = getStoredUtm();
  if (!hasUtm && existing.utmSource) return existing;

  const next: StoredUtm = {
    utmSource: utmSource || existing.utmSource,
    utmMedium: utmMedium || existing.utmMedium,
    utmCampaign: utmCampaign || existing.utmCampaign,
    landingPath: existing.landingPath || `${window.location.pathname}${window.location.search}`,
    referrer: existing.referrer || (document.referrer || undefined),
  };

  if (hasUtm || !existing.landingPath) {
    localStorage.setItem(UTM_KEY, JSON.stringify(next));
  }
  return next;
}

export function getStoredUtm(): StoredUtm {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(UTM_KEY);
    return raw ? (JSON.parse(raw) as StoredUtm) : {};
  } catch {
    return {};
  }
}

export function getAnalyticsHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (typeof window === 'undefined') return headers;
  const storeId = getResolvedStoreId();
  if (storeId?.trim()) headers['X-Store-Id'] = storeId.trim();
  return headers;
}
