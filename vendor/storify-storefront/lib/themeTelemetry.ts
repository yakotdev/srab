/**
 * Theme lifecycle telemetry (Theme Store plan §9.3). Safe no-op if window unavailable.
 */
export type ThemeTelemetryEvent =
  | 'theme_store_list_viewed'
  | 'theme_store_theme_viewed'
  | 'theme_installed'
  | 'theme_applied'
  | 'theme_rollback'
  | 'theme_apply_failed';

export function recordThemeTelemetry(
  event: ThemeTelemetryEvent,
  detail: Record<string, unknown> = {},
): void {
  if (typeof window === 'undefined') return;
  try {
    const payload = { event, ts: Date.now(), ...detail };
    window.dispatchEvent(new CustomEvent('storify:theme', { detail: payload }));
  } catch {
    /* ignore */
  }
}
