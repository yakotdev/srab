/**
 * عرض اللغة في مبدّل اللغة: اسم إنجليزي، اسم محلي، علم، ورمز ISO (متطابق تقريباً مع COMMON_LANGUAGES في الإدارة).
 */
export type LanguageDisplayRow = {
  name: string;
  nativeName: string;
  /** علم تقريبي للمنطقة/الدولة الأكثر شيوعاً للغة */
  flag: string;
};

const LANGUAGE_DISPLAY_BY_CODE: Record<string, LanguageDisplayRow> = {
  ar: { name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
  en: { name: 'English', nativeName: 'English', flag: '🇬🇧' },
  af: { name: 'Afrikaans', nativeName: 'Afrikaans', flag: '🇿🇦' },
  am: { name: 'Amharic', nativeName: 'አማርኛ', flag: '🇪🇹' },
  az: { name: 'Azerbaijani', nativeName: 'Azərbaycan', flag: '🇦🇿' },
  be: { name: 'Belarusian', nativeName: 'Беларуская', flag: '🇧🇾' },
  bg: { name: 'Bulgarian', nativeName: 'Български', flag: '🇧🇬' },
  bn: { name: 'Bengali', nativeName: 'বাংলা', flag: '🇧🇩' },
  bs: { name: 'Bosnian', nativeName: 'Bosanski', flag: '🇧🇦' },
  ca: { name: 'Catalan', nativeName: 'Català', flag: '🇪🇸' },
  cs: { name: 'Czech', nativeName: 'Čeština', flag: '🇨🇿' },
  cy: { name: 'Welsh', nativeName: 'Cymraeg', flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿' },
  da: { name: 'Danish', nativeName: 'Dansk', flag: '🇩🇰' },
  de: { name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  el: { name: 'Greek', nativeName: 'Ελληνικά', flag: '🇬🇷' },
  es: { name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  et: { name: 'Estonian', nativeName: 'Eesti', flag: '🇪🇪' },
  fa: { name: 'Persian', nativeName: 'فارسی', flag: '🇮🇷' },
  fi: { name: 'Finnish', nativeName: 'Suomi', flag: '🇫🇮' },
  fr: { name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  ga: { name: 'Irish', nativeName: 'Gaeilge', flag: '🇮🇪' },
  gu: { name: 'Gujarati', nativeName: 'ગુજરાતી', flag: '🇮🇳' },
  he: { name: 'Hebrew', nativeName: 'עברית', flag: '🕎' },
  hi: { name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  hr: { name: 'Croatian', nativeName: 'Hrvatski', flag: '🇭🇷' },
  hu: { name: 'Hungarian', nativeName: 'Magyar', flag: '🇭🇺' },
  hy: { name: 'Armenian', nativeName: 'Հայերեն', flag: '🇦🇲' },
  id: { name: 'Indonesian', nativeName: 'Bahasa Indonesia', flag: '🇮🇩' },
  is: { name: 'Icelandic', nativeName: 'Íslenska', flag: '🇮🇸' },
  it: { name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
  ja: { name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  ka: { name: 'Georgian', nativeName: 'ქართული', flag: '🇬🇪' },
  kk: { name: 'Kazakh', nativeName: 'Қазақша', flag: '🇰🇿' },
  km: { name: 'Khmer', nativeName: 'ខ្មែរ', flag: '🇰🇭' },
  kn: { name: 'Kannada', nativeName: 'ಕನ್ನಡ', flag: '🇮🇳' },
  ko: { name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  ku: { name: 'Kurdish', nativeName: 'Kurdî', flag: '🏳️' },
  lo: { name: 'Lao', nativeName: 'ລາວ', flag: '🇱🇦' },
  lt: { name: 'Lithuanian', nativeName: 'Lietuvių', flag: '🇱🇹' },
  lv: { name: 'Latvian', nativeName: 'Latviešu', flag: '🇱🇻' },
  mk: { name: 'Macedonian', nativeName: 'Македонски', flag: '🇲🇰' },
  ml: { name: 'Malayalam', nativeName: 'മലയാളം', flag: '🇮🇳' },
  mn: { name: 'Mongolian', nativeName: 'Монгол', flag: '🇲🇳' },
  mr: { name: 'Marathi', nativeName: 'मराठी', flag: '🇮🇳' },
  ms: { name: 'Malay', nativeName: 'Bahasa Melayu', flag: '🇲🇾' },
  my: { name: 'Burmese', nativeName: 'မြန်မာ', flag: '🇲🇲' },
  nl: { name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱' },
  no: { name: 'Norwegian', nativeName: 'Norsk', flag: '🇳🇴' },
  pa: { name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', flag: '🇮🇳' },
  pl: { name: 'Polish', nativeName: 'Polski', flag: '🇵🇱' },
  pt: { name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹' },
  ro: { name: 'Romanian', nativeName: 'Română', flag: '🇷🇴' },
  ru: { name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  sk: { name: 'Slovak', nativeName: 'Slovenčina', flag: '🇸🇰' },
  sl: { name: 'Slovenian', nativeName: 'Slovenščina', flag: '🇸🇮' },
  sq: { name: 'Albanian', nativeName: 'Shqip', flag: '🇦🇱' },
  sr: { name: 'Serbian', nativeName: 'Српски', flag: '🇷🇸' },
  sv: { name: 'Swedish', nativeName: 'Svenska', flag: '🇸🇪' },
  sw: { name: 'Swahili', nativeName: 'Kiswahili', flag: '🇹🇿' },
  ta: { name: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳' },
  te: { name: 'Telugu', nativeName: 'తెలుగు', flag: '🇮🇳' },
  th: { name: 'Thai', nativeName: 'ไทย', flag: '🇹🇭' },
  tr: { name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷' },
  uk: { name: 'Ukrainian', nativeName: 'Українська', flag: '🇺🇦' },
  ur: { name: 'Urdu', nativeName: 'اردو', flag: '🇵🇰' },
  uz: { name: 'Uzbek', nativeName: 'Oʻzbek', flag: '🇺🇿' },
  vi: { name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳' },
  zh: { name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  'zh-hans': { name: 'Chinese (Simplified)', nativeName: '简体中文', flag: '🇨🇳' },
  'zh-hant': { name: 'Chinese (Traditional)', nativeName: '繁體中文', flag: '🇹🇼' },
};

/** رمز اللغة للعرض (مثل AR، ZH-HANS، EN-US). */
function formatCodeLabel(code: string): string {
  return code
    .trim()
    .toLowerCase()
    .replace(/_/g, '-')
    .split('-')
    .filter(Boolean)
    .map((p) => p.toUpperCase())
    .join('-');
}

/** يدمج بيانات المتجر (nativeName) إن وُجدت مع القاموس الثابت. */
export function getLanguageDisplay(
  codeRaw: string,
  rowFromStore?: { name?: string; nativeName?: string | null } | null,
): LanguageDisplayRow & { codeLabel: string } {
  const lower = String(codeRaw || '')
    .trim()
    .toLowerCase()
    .replace(/_/g, '-');
  const codeLabel = formatCodeLabel(lower || 'xx');

  const tryKeys = [lower, lower.split('-')[0]];
  let base: LanguageDisplayRow | undefined;
  for (const k of tryKeys) {
    if (k && LANGUAGE_DISPLAY_BY_CODE[k]) {
      base = LANGUAGE_DISPLAY_BY_CODE[k];
      break;
    }
  }

  if (!base) {
    const name = rowFromStore?.name?.trim() || codeLabel;
    const nativeName = rowFromStore?.nativeName?.trim() || name;
    return { name, nativeName, flag: '🌐', codeLabel };
  }

  const name = rowFromStore?.name?.trim() || base.name;
  const nativeName = rowFromStore?.nativeName?.trim() || base.nativeName;
  return { name, nativeName, flag: base.flag, codeLabel };
}
