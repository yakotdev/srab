import ar from './ar.json';
import en from './en.json';
import fr from './fr.json';

export type ThemeLocaleMessages = Record<string, string>;

/** Bundled UI strings for the template (fallback when host does not supply translations). */
export const THEME_LOCALE_MESSAGES: Record<string, ThemeLocaleMessages> = {
  ar: ar as ThemeLocaleMessages,
  en: en as ThemeLocaleMessages,
  fr: fr as ThemeLocaleMessages,
};

export function pickThemeMessages(locale: string): ThemeLocaleMessages {
  const base = String(locale || 'ar')
    .trim()
    .toLowerCase()
    .split('-')[0];
  return THEME_LOCALE_MESSAGES[base] ?? THEME_LOCALE_MESSAGES.ar;
}

/**
 * Build a translator for the given locale.
 *
 * `overrides` lets the host (e.g. the storefront's STORIFY_THEME_CONFIG payload) inject
 * translations saved in the admin Translations editor. Lookup order: overrides → bundled
 * locale → bundled `ar` (fallback) → key itself. This lets merchants override any bundled
 * theme key without rebuilding the theme.
 */
export function createThemeTranslator(
  locale: string,
  overrides?: Record<string, string> | null,
): (key: string) => string {
  const messages = pickThemeMessages(locale);
  const fallback = THEME_LOCALE_MESSAGES.ar;
  const overrideMap = overrides && typeof overrides === 'object' ? overrides : null;
  return (key: string) => {
    if (overrideMap) {
      const override = overrideMap[key];
      if (typeof override === 'string' && override.trim()) return override;
    }
    const v = messages[key];
    if (typeof v === 'string' && v.trim()) return v;
    const fb = fallback[key];
    return typeof fb === 'string' && fb.trim() ? fb : key;
  };
}

/** Replace `{{name}}` placeholders in theme locale strings. */
export function interpolateTheme(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => {
    const v = vars[key];
    return v != null ? String(v) : '';
  });
}
