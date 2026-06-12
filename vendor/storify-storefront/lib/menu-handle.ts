/**
 * Theme settings may store a menu as a handle string, JSON string, or { handle }.
 * Used by storefront shell + iframe prefetch so menus resolve from uploadedThemeSettings.*.
 */
export function extractMenuHandleFromSetting(raw: unknown): string | null {
  if (raw == null || raw === '') return null;
  if (typeof raw === 'string') {
    const t = raw.trim();
    if (!t) return null;
    if (t.startsWith('{')) {
      try {
        return extractMenuHandleFromSetting(JSON.parse(t) as unknown);
      } catch {
        return t.startsWith('/') ? null : t;
      }
    }
    return t.startsWith('/') ? null : t;
  }
  if (typeof raw === 'object' && !Array.isArray(raw) && raw !== null) {
    const o = raw as Record<string, unknown>;
    const h = o.handle ?? o.menuHandle ?? o.menuId ?? o.menu_id ?? o.slug ?? o.id;
    if (h != null && String(h).trim() !== '') {
      const s = String(h).trim();
      return s.startsWith('/') ? null : s;
    }
  }
  return null;
}

/** Effective header menu handle: Theme row first, then uploaded theme settings keys. */
export function resolveHeaderMenuHandleFromTheme(theme: {
  headerMenuHandle?: string | null;
  uploadedThemeSettings?: Record<string, unknown> | null;
} | null | undefined): string | null {
  const top = theme?.headerMenuHandle?.trim();
  if (top) return top;
  const s = theme?.uploadedThemeSettings;
  if (!s || typeof s !== 'object') return null;
  return (
    extractMenuHandleFromSetting(s.headerMenuHandle) ??
    extractMenuHandleFromSetting(s.nav_primary) ??
    null
  );
}
