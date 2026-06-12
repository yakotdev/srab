import type { CSSProperties } from 'react';

/** Matches shared/admin-central ThemeColorScheme shape (subset for runtime). */
export interface ThemeColorSchemeRuntime {
  id: string;
  name?: string;
  colors: {
    background: string;
    backgroundGradient: string;
    primary: string;
    text: string;
    headings: string;
    link: string;
    linkHover: string;
    border: string;
    buttonPrimary: {
      color: string;
      background: string;
      hoverColor: string;
      hoverBackground: string;
    };
    buttonSecondary: {
      color: string;
      border: string;
      background: string;
      hoverColor: string;
      hoverBackground: string;
    };
    buttonLink: {
      color: string;
      hoverColor: string;
    };
  };
}

function mergeColorRecord<T extends Record<string, string>>(base: T, patch: unknown): T {
  if (!patch || typeof patch !== 'object') return base;
  return { ...base, ...(patch as T) };
}

/** Merge API/persisted partial scheme with defaults so CSS vars never read undefined. */
export function coerceSchemeRuntime(
  raw: ThemeColorSchemeRuntime | Record<string, unknown> | null | undefined,
): ThemeColorSchemeRuntime | null {
  if (!raw || typeof raw !== 'object') return null;
  const def = defaultRuntimeColorSchemes()[0];
  const o = raw as Record<string, unknown>;
  const id = String(o.id ?? def.id).trim() || def.id;
  const name = o.name != null ? String(o.name) : def.name;
  const cIn = o.colors && typeof o.colors === 'object' ? (o.colors as Record<string, unknown>) : {};
  const bp0 = def.colors.buttonPrimary;
  const bs0 = def.colors.buttonSecondary;
  const bl0 = def.colors.buttonLink;
  const colors: ThemeColorSchemeRuntime['colors'] = {
    background: cIn.background != null ? String(cIn.background) : def.colors.background,
    backgroundGradient:
      cIn.backgroundGradient != null ? String(cIn.backgroundGradient) : def.colors.backgroundGradient,
    primary: cIn.primary != null ? String(cIn.primary) : def.colors.primary,
    text: cIn.text != null ? String(cIn.text) : def.colors.text,
    headings: cIn.headings != null ? String(cIn.headings) : def.colors.headings,
    link: cIn.link != null ? String(cIn.link) : def.colors.link,
    linkHover: cIn.linkHover != null ? String(cIn.linkHover) : def.colors.linkHover,
    border: cIn.border != null ? String(cIn.border) : def.colors.border,
    buttonPrimary: mergeColorRecord(
      { ...bp0 },
      cIn.buttonPrimary,
    ),
    buttonSecondary: mergeColorRecord(
      { ...bs0 },
      cIn.buttonSecondary,
    ),
    buttonLink: mergeColorRecord({ ...bl0 }, cIn.buttonLink),
  };
  return { id, name, colors };
}

/** Color tokens only — tied to the selected color scheme. */
export function buildSchemeCssVariables(
  scheme: ThemeColorSchemeRuntime | undefined | null,
): CSSProperties {
  const coerced = coerceSchemeRuntime(scheme ?? null);
  if (!coerced?.colors) return {};
  const c = coerced.colors;
  const bg =
    c.backgroundGradient && String(c.backgroundGradient).trim()
      ? String(c.backgroundGradient).trim()
      : c.background;

  return {
    ['--storify-bg' as string]: bg,
    ['--storify-primary' as string]: c.primary,
    ['--storify-text' as string]: c.text,
    ['--storify-headings' as string]: c.headings,
    ['--storify-link' as string]: c.link,
    ['--storify-link-hover' as string]: c.linkHover,
    ['--storify-border' as string]: c.border,
    ['--storify-btn-primary-fg' as string]: c.buttonPrimary.color,
    ['--storify-btn-primary-bg' as string]: c.buttonPrimary.background,
    ['--storify-btn-primary-hover-fg' as string]: c.buttonPrimary.hoverColor,
    ['--storify-btn-primary-hover-bg' as string]: c.buttonPrimary.hoverBackground,
    ['--storify-btn-secondary-fg' as string]: c.buttonSecondary.color,
    ['--storify-btn-secondary-border' as string]: c.buttonSecondary.border,
    ['--storify-btn-secondary-bg' as string]: c.buttonSecondary.background,
    ['--storify-btn-secondary-hover-fg' as string]: c.buttonSecondary.hoverColor,
    ['--storify-btn-secondary-hover-bg' as string]: c.buttonSecondary.hoverBackground,
    ['--storify-btn-link-fg' as string]: c.buttonLink.color,
    ['--storify-btn-link-hover-fg' as string]: c.buttonLink.hoverColor,
  };
}

/** Typography — global theme settings (not per color scheme). */
export function buildThemeFontCssVariables(settings: Record<string, unknown>): CSSProperties {
  const body = String(settings?.fontFamily ?? 'Almarai').trim() || 'Almarai';
  const headRaw = settings?.fontFamilyHeadings ?? settings?.headingFontFamily;
  const head = typeof headRaw === 'string' && headRaw.trim() ? headRaw.trim() : body;
  return {
    ['--storify-font-body' as string]: `"${body}", sans-serif`,
    ['--storify-font-headings' as string]: `"${head}", sans-serif`,
  };
}

function readColorSchemesArray(settings: Record<string, unknown> | undefined | null): unknown[] | null {
  if (!settings || typeof settings !== 'object') return null;
  const a = settings.color_schemes;
  const b = (settings as { colorSchemes?: unknown }).colorSchemes;
  if (Array.isArray(a) && a.length > 0) return a;
  if (Array.isArray(b) && b.length > 0) return b;
  if (Array.isArray(a)) return a;
  if (Array.isArray(b)) return b;
  return null;
}

export function resolveSchemeFromSettings(
  settings: Record<string, unknown> | undefined | null,
  colorSchemeId: string | undefined | null,
): ThemeColorSchemeRuntime | null {
  const raw = readColorSchemesArray(settings ?? undefined);
  if (!raw || raw.length === 0) return null;
  const want = String(colorSchemeId || '').trim().toLowerCase();
  let picked: Record<string, unknown> | null = null;
  if (want) {
    for (const s of raw) {
      if (!s || typeof s !== 'object') continue;
      const sid = String((s as { id?: string }).id || '')
        .trim()
        .toLowerCase();
      if (sid === want) {
        picked = s as Record<string, unknown>;
        break;
      }
    }
  }
  if (!picked && raw[0] && typeof raw[0] === 'object') {
    picked = raw[0] as Record<string, unknown>;
  }
  return coerceSchemeRuntime(picked);
}

/** Default schemes aligned with admin `defaultColorSchemes()` (persisted when store has not saved yet). */
export function defaultRuntimeColorSchemes(): ThemeColorSchemeRuntime[] {
  const light: ThemeColorSchemeRuntime = {
    id: 'scheme-light',
    name: 'فاتح / Light',
    colors: {
      background: '#ffffff',
      backgroundGradient: '',
      primary: '#6366f1',
      text: '#0f172a',
      headings: '#020617',
      link: '#6366f1',
      linkHover: '#4f46e5',
      border: '#e2e8f0',
      buttonPrimary: {
        color: '#ffffff',
        background: '#0f172a',
        hoverColor: '#ffffff',
        hoverBackground: '#334155',
      },
      buttonSecondary: {
        color: '#0f172a',
        border: '#e2e8f0',
        background: '#ffffff',
        hoverColor: '#020617',
        hoverBackground: '#f1f5f9',
      },
      buttonLink: { color: '#6366f1', hoverColor: '#4f46e5' },
    },
  };
  const dark: ThemeColorSchemeRuntime = {
    id: 'scheme-dark',
    name: 'داكن / Dark',
    colors: {
      background: '#0f172a',
      backgroundGradient: '',
      primary: '#818cf8',
      text: '#e2e8f0',
      headings: '#f8fafc',
      link: '#a5b4fc',
      linkHover: '#c7d2fe',
      border: '#334155',
      buttonPrimary: {
        color: '#0f172a',
        background: '#f8fafc',
        hoverColor: '#0f172a',
        hoverBackground: '#e2e8f0',
      },
      buttonSecondary: {
        color: '#e2e8f0',
        border: '#475569',
        background: '#1e293b',
        hoverColor: '#f8fafc',
        hoverBackground: '#334155',
      },
      buttonLink: { color: '#a5b4fc', hoverColor: '#e0e7ff' },
    },
  };
  return [light, dark];
}

/** Normalize persisted/API schemes so preview + storefront always get complete tokens. */
export function normalizeColorSchemesList(raw: unknown): ThemeColorSchemeRuntime[] {
  let arr = raw;
  if (typeof raw === 'string') {
    try {
      arr = JSON.parse(raw);
    } catch {
      arr = null;
    }
  }
  if (!Array.isArray(arr) || arr.length === 0) return defaultRuntimeColorSchemes();
  const out: ThemeColorSchemeRuntime[] = [];
  for (const item of arr) {
    const c = coerceSchemeRuntime(item as ThemeColorSchemeRuntime);
    if (c) out.push(c);
  }
  return out.length > 0 ? out : defaultRuntimeColorSchemes();
}

export function collectFontFamiliesFromSettings(settings: Record<string, unknown>): string[] {
  const out = new Set<string>();
  const add = (name: unknown) => {
    if (typeof name === 'string' && name.trim()) out.add(name.trim());
  };
  add(settings?.fontFamily);
  add(settings?.fontFamilyHeadings);
  add(settings?.headingFontFamily);
  return [...out];
}

const GOOGLE_FONTS_LINK_ID = 'storify-theme-google-fonts';

/** Load Google Fonts for `fontFamily` and all scheme body/headings fonts (single stylesheet). */
export function injectGoogleFontsForThemeSettings(settings: Record<string, unknown>): void {
  if (typeof document === 'undefined') return;
  const families = collectFontFamiliesFromSettings(settings);
  if (families.length === 0) return;
  const q = families
    .map((name) => `family=${encodeURIComponent(name).replace(/%20/g, '+')}:wght@300;400;500;600;700;800`)
    .join('&');
  const href = `https://fonts.googleapis.com/css2?${q}&display=swap`;
  let link = document.getElementById(GOOGLE_FONTS_LINK_ID) as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.id = GOOGLE_FONTS_LINK_ID;
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }
  if (link.getAttribute('href') !== href) {
    link.setAttribute('href', href);
  }
}
