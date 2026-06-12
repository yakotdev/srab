import type { StorefrontTrackingEvent, StorefrontTrackingPayload } from '../theme-runtime/types';
import { themeRuntimeCall, shouldUseThemeRuntimeBridge } from '../theme-runtime/theme-client';
import { getHostOrigin } from './host-origin';

export function notifyHostTrackEvent(eventName: StorefrontTrackingEvent, payload: StorefrontTrackingPayload = {}): void {
  if (typeof window === 'undefined') return;

  if (shouldUseThemeRuntimeBridge()) {
    void themeRuntimeCall('track', { eventName, payload }).catch(() => {
      /* host may ignore duplicates; avoid console noise */
    });
    return;
  }

  const message = {
    type: 'STORIFY_TRACK_EVENT',
    eventName,
    payload,
  };

  if (window.parent && window.parent !== window) {
    window.parent.postMessage(message, getHostOrigin() || '*');
    return;
  }

  window.postMessage(message, window.location.origin);
}
