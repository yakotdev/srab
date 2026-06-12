/**
 * إعدادات الثيم المباشر (ThemeDirectLoader / postMessage): توحيد المفاتيح وتفادي تعارض
 * camelCase قديم من قاعدة البيانات مع snake_case المنشور من config.json.
 *
 * حقول قابلة للترجمة في R2/config تُحفظ أحياناً كـ `{ ar: "…", en: "…" }` — يجب تسويتها قبل إرسالها للثيم.
 */

/** مفاتيح غالباً تكون localizable في manifest الثيمات المرفوعة */
const LIKELY_LOCALIZED_SETTING_KEYS = new Set([
  'primaryColor',
  'accentColor',
  'secondaryColor',
  'primary_color',
  'accent_color',
  'secondary_color',
  'fontFamily',
  'font_family',
  'fontFamilyHeadings',
  'headingFontFamily',
  'heading_font_family',
  'font_family_headings',
  'borderRadius',
  'border_radius',
  'color_schemes',
  'colorSchemes',
  'nav_primary',
  'social_facebook',
  'social_instagram',
  'social_twitter',
  'social_youtube',
]);

const LANG_CODE_KEY_RE = /^[a-z]{2}(-[a-z0-9]{2,10})?$/i;

function isLikelyPerLanguageMap(obj: Record<string, unknown>): boolean {
  const keys = Object.keys(obj);
  if (keys.length === 0) return false;
  if (!keys.every((k) => LANG_CODE_KEY_RE.test(k))) return false;
  // مفتاح وحيد غير لغة شائعة (مثل { id: "…" }) — لا نعتبره خريطة لغات
  if (keys.length === 1) {
    const only = keys[0].toLowerCase();
    if (!['ar', 'en', 'he', 'fr', 'de', 'es', 'it', 'pt', 'ru', 'tr', 'fa', 'ur'].includes(only)) return false;
  }
  return true;
}

/**
 * يستبدل قيم `{ ar: x, en: y }` بالقيمة المناسبة للغة المتجر في `base`.
 */
export function flattenLocalizedThemeSettings(base: Record<string, unknown>, preferredLang: string): void {
  const lang = (preferredLang && String(preferredLang).trim().toLowerCase()) || 'ar';
  const tryOrder = [lang, 'ar', 'en'];

  const maybeFlatten = (key: string) => {
    if (!Object.prototype.hasOwnProperty.call(base, key)) return;
    const v = base[key];
    if (!v || typeof v !== 'object' || Array.isArray(v)) return;
    const o = v as Record<string, unknown>;
    if (!isLikelyPerLanguageMap(o)) return;
    let picked: unknown;
    for (const L of tryOrder) {
      const hit = Object.keys(o).find((k) => k.toLowerCase() === L);
      if (hit != null && o[hit] !== undefined && o[hit] !== null) {
        picked = o[hit];
        break;
      }
    }
    if (picked === undefined) {
      const first = Object.keys(o).map((k) => o[k]).find((x) => x !== undefined && x !== null);
      picked = first;
    }
    if (picked !== undefined) base[key] = picked as unknown;
  };

  for (const key of Object.keys(base)) {
    if (LIKELY_LOCALIZED_SETTING_KEYS.has(key) || /^footer_col_[123]$/.test(key)) {
      maybeFlatten(key);
    }
  }
}

function nonEmptyString(v: unknown): string | undefined {
  if (v == null) return undefined;
  if (typeof v === 'string') {
    const t = v.trim();
    return t || undefined;
  }
  const s = String(v).trim();
  return s || undefined;
}

/**
 * يحدّث `base` في المكان: يفضّل القيم المنشورة (snake_case) ثم يملأ camelCase للثيمات التي تقرأها فقط.
 */
export function canonicalizeThemeSettingsForDirectPayload(base: Record<string, unknown>): void {
  const primary =
    nonEmptyString(base.primary_color) ??
    nonEmptyString(base.primaryColour) ??
    nonEmptyString(base.primaryColor);
  if (primary) base.primaryColor = primary;

  const accent =
    nonEmptyString(base.accent_color) ??
    nonEmptyString(base.accentColor) ??
    nonEmptyString(base.secondaryColor) ??
    nonEmptyString(base.secondary_color);
  if (accent) base.accentColor = accent;

  const font = nonEmptyString(base.font_family) ?? nonEmptyString(base.fontFamily);
  if (font) base.fontFamily = font;

  const fontHead =
    nonEmptyString(base.font_family_headings) ??
    nonEmptyString(base.headingFontFamily) ??
    nonEmptyString(base.heading_font_family) ??
    nonEmptyString(base.fontFamilyHeadings);
  if (fontHead) base.fontFamilyHeadings = fontHead;

  const br = nonEmptyString(base.border_radius) ?? nonEmptyString(base.borderRadius);
  if (br) base.borderRadius = br;

  let cs = base.color_schemes ?? base.colorSchemes;
  if (typeof cs === 'string') {
    try {
      cs = JSON.parse(cs) as unknown;
    } catch {
      cs = undefined;
    }
  }
  if (cs != null) base.color_schemes = cs;
}

const HEX_COLOR_RE = /^#(?:[0-9A-Fa-f]{3,4}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/;
function isHexColor(v: unknown): boolean {
  return typeof v === 'string' && HEX_COLOR_RE.test(v.trim());
}

/**
 * صف ThemeConfig يخزن `primaryColor`/`secondaryColor` كـ hex (#rrggbb) لكن
 * `fontFamily` كـ 'sans'|'serif'|'cairo' و`borderRadius` كـ 'none'|'sm'|'md'|'lg'|'full'.
 * لذا نطبّق hex فقط ونتجاهل القيم التي ليست تنسيق CSS صالح.
 */
export function applyThemeRowAppearanceFallback(
  base: Record<string, unknown>,
  theme:
    | {
        primaryColor?: string;
        secondaryColor?: string;
      }
    | null
    | undefined,
): void {
  if (!theme) return;
  if (!nonEmptyString(base.primaryColor) && isHexColor(theme.primaryColor)) {
    base.primaryColor = String(theme.primaryColor).trim();
  }
  if (!nonEmptyString(base.accentColor) && isHexColor(theme.secondaryColor)) {
    base.accentColor = String(theme.secondaryColor).trim();
  }
}
