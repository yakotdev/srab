export const LOCALE_SEGMENT_PATTERN = /^[a-z]{2}(?:-[a-z]{2})?$/i;

export function normalizeLocale(locale?: string | null): string {
  const value = String(locale || '').trim().toLowerCase();
  return value.split('-')[0] || 'ar';
}

export function getLocaleFromPath(pathname: string): string | null {
  const firstSegment = pathname.split('/').filter(Boolean)[0];
  if (!firstSegment || !LOCALE_SEGMENT_PATTERN.test(firstSegment)) return null;
  return normalizeLocale(firstSegment);
}

export function stripLocaleFromPath(pathname: string): string {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length > 0 && LOCALE_SEGMENT_PATTERN.test(parts[0])) {
    parts.shift();
  }
  return parts.length > 0 ? `/${parts.join('/')}` : '/';
}

export function localizePath(pathname: string, locale: string): string {
  const normalizedPath = stripLocaleFromPath(pathname);
  const normalizedLocale = normalizeLocale(locale);
  return normalizedPath === '/' ? `/${normalizedLocale}` : `/${normalizedLocale}${normalizedPath}`;
}
