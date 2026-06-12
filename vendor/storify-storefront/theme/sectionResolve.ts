/** Theme slug resolution only — no registry import (keeps uploaded-theme home path free of @theme-default bundle). */

export type ThemeSlug = 'default-storefront' | 'storedesign' | 'theking';

export const VALID_SLUGS: ThemeSlug[] = ['default-storefront', 'storedesign', 'theking'];

export function themeSlugFromName(name: string | undefined | null): ThemeSlug {
  if (!name || typeof name !== 'string') return 'default-storefront';
  const n = name.trim().toLowerCase().replace(/\s+/g, ' ');
  if (n === 'the king' || n === 'theking') return 'theking';
  if (n === 'storedesign' || n === 'store design') return 'storedesign';
  return 'default-storefront';
}

/** أولوية: uploadedThemeSlug من API ← اسم الثيم ← ?themeSlug= من الرابط ← VITE_THEME_SLUG. */
export function resolveThemeSlug(
  theme: { uploadedThemeSlug?: string | null; uploadedThemeName?: string | null } | undefined | null,
  themeSlugFromUrl?: string | null,
): ThemeSlug {
  const fromApi =
    theme?.uploadedThemeSlug && VALID_SLUGS.includes(theme.uploadedThemeSlug as ThemeSlug)
      ? (theme.uploadedThemeSlug as ThemeSlug)
      : null;
  if (fromApi) return fromApi;
  const fromUrl = themeSlugFromUrl && typeof themeSlugFromUrl === 'string' ? themeSlugFromUrl.trim().toLowerCase() : '';
  if (fromUrl === 'theking' || fromUrl === 'storedesign' || fromUrl === 'default-storefront') return fromUrl as ThemeSlug;
  const envSlug = typeof import.meta !== 'undefined' && (import.meta as { env?: { VITE_THEME_SLUG?: string } }).env?.VITE_THEME_SLUG;
  const forced = typeof envSlug === 'string' ? envSlug.trim() : '';
  if (forced && VALID_SLUGS.includes(forced as ThemeSlug)) return forced as ThemeSlug;
  return themeSlugFromName(theme?.uploadedThemeName);
}
