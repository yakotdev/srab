/**
 * الثيم داخل iframe (لوحة/معاينة) أو مُحقَن مباشرة في الستورفرونت (ThemeDirectLoader + directRendering).
 */
export function isStorifyThemeEmbedded(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.parent !== window ||
    Boolean(
      (window as unknown as { __STORIFY_THEME_CONFIG__?: { payload?: { directRendering?: boolean } } })
        .__STORIFY_THEME_CONFIG__?.payload?.directRendering,
    )
  );
}
