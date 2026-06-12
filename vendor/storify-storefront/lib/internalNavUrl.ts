/**
 * يحوّل روابط القوائم المخزّنة كعنوان كامل على loopback (مثل المنفذ الخاطئ للـ API)
 * إلى مسار SPA حتى يبقى التنقل على نفس أصل المتجر (مثلاً Vite :3000 وليس :3001).
 */
export function normalizeMenuNavUrl(url: string): { mode: 'internal'; path: string } | { mode: 'external'; href: string } {
  const trimmed = (url || '').trim();
  if (!trimmed) return { mode: 'internal', path: '/' };

  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    return { mode: 'internal', path };
  }

  try {
    const u = new URL(trimmed);
    if (u.pathname.startsWith('/api')) {
      return { mode: 'external', href: trimmed };
    }
    const here = typeof window !== 'undefined' ? window.location.origin : '';
    if (here && u.origin === here) {
      return { mode: 'internal', path: `${u.pathname}${u.search}` || '/' };
    }
    const host = u.hostname;
    const isLoopback = host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
    if (isLoopback) {
      return { mode: 'internal', path: `${u.pathname}${u.search}` || '/' };
    }
  } catch {
    /* ignore */
  }

  return { mode: 'external', href: trimmed };
}
