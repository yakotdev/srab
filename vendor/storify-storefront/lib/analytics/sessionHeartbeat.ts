import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { captureUtmFromUrl, getAnalyticsHeaders, getSessionId, getStoredUtm, getVisitorId } from './session';

const HEARTBEAT_MS = 30_000;

export type HeartbeatStatus = 'browsing' | 'cart' | 'checkout';

let globalStatus: HeartbeatStatus = 'browsing';
let globalCartValue = 0;
let globalCartItemCount = 0;
let globalEmail: string | undefined;
let globalPhone: string | undefined;

export function setAnalyticsHeartbeatStatus(status: HeartbeatStatus): void {
  globalStatus = status;
}

export function setAnalyticsCartSummary(cartValue: number, cartItemCount: number): void {
  globalCartValue = cartValue;
  globalCartItemCount = cartItemCount;
}

export function setAnalyticsContact(email?: string, phone?: string): void {
  globalEmail = email;
  globalPhone = phone;
}

function sendHeartbeat(path: string, title?: string): void {
  if (typeof window === 'undefined' || typeof fetch !== 'function') return;
  const utm = getStoredUtm();
  const body = {
    sessionId: getSessionId(),
    visitorId: getVisitorId(),
    currentPath: path,
    currentPageTitle: title,
    status: globalStatus,
    cartValue: globalCartValue,
    cartItemCount: globalCartItemCount,
    email: globalEmail,
    phone: globalPhone,
    ...utm,
  };

  void fetch('/api/public/analytics/heartbeat', {
    method: 'POST',
    credentials: 'include',
    keepalive: true,
    headers: getAnalyticsHeaders(),
    body: JSON.stringify(body),
  }).catch(() => {});
}

export function useSessionHeartbeat(): void {
  const location = useLocation();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    captureUtmFromUrl();
  }, []);

  useEffect(() => {
    const path = `${location.pathname}${location.search}`;
    const title = typeof document !== 'undefined' ? document.title : undefined;
    if (path.includes('/checkout')) {
      globalStatus = 'checkout';
    }

    sendHeartbeat(path, title);

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      sendHeartbeat(`${window.location.pathname}${window.location.search}`, document.title);
    }, HEARTBEAT_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [location.pathname, location.search]);
}
