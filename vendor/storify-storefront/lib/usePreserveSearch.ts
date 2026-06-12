import { useLocation, useSearchParams } from 'react-router-dom';
import { useMemo } from 'react';
import { getLocaleFromPath, localizePath } from './locale-routing';

/**
 * إلحاق query الحالي (مثل storeId) بالمسار حتى لا يُفقد عند التنقل.
 * استخدم الدالة المُرجعة مع Link to={to('/shop')} أو navigate(to('/shop')).
 */
export function pathWithSearch(path: string, search: string): string {
  if (!search) return path;
  return path.includes('?') ? `${path}&${search}` : `${path}?${search}`;
}

export function usePreserveSearch(): (path: string) => string {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const searchString = searchParams.toString();
  const locale = getLocaleFromPath(location.pathname);
  return useMemo(() => (path: string) => {
    const localizedPath = locale && path.startsWith('/') ? localizePath(path, locale) : path;
    return pathWithSearch(localizedPath, searchString);
  }, [locale, searchString]);
}
