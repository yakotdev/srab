export type CurrencyOption = {
  code: string;
  label: string;
};

const FALLBACK_CURRENCIES = [
  'USD',
  'EUR',
  'GBP',
  'ILS',
  'SAR',
  'EGP',
  'AED',
  'JOD',
  'KWD',
  'QAR',
  'BHD',
  'OMR',
  'MAD',
  'TND',
  'DZD',
  'LYD',
  'TRY',
  'INR',
  'PKR',
  'BDT',
  'IDR',
  'JPY',
  'CNY',
  'KRW',
  'CAD',
  'AUD',
  'NZD',
  'CHF',
  'SEK',
  'NOK',
  'DKK',
  'BRL',
  'MXN',
  'ZAR',
];

const getSupportedCurrencyCodes = (): string[] => {
  const supportedValuesOf = (Intl as any).supportedValuesOf;
  if (typeof supportedValuesOf === 'function') {
    const codes = supportedValuesOf('currency');
    if (Array.isArray(codes) && codes.length > 0) {
      return codes;
    }
  }
  return FALLBACK_CURRENCIES;
};

const getCurrencySymbol = (code: string, locale: string): string => {
  try {
    const parts = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: code,
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).formatToParts(1);
    const symbol = parts.find(part => part.type === 'currency')?.value;
    return symbol || code;
  } catch {
    return code;
  }
};

export const getCurrencyOptions = (locale: string): CurrencyOption[] => {
  const codes = Array.from(new Set(getSupportedCurrencyCodes())).sort((a, b) => a.localeCompare(b));
  return codes.map(code => ({
    code,
    label: `${code} (${getCurrencySymbol(code, locale)})`,
  }));
};

/** Optional overrides from store settings (General → currency display). */
export type CurrencyDisplayFormat = {
  symbol?: string | null;
  /** 0–4 fixed digits, or null/undefined for locale default */
  decimalPlaces?: number | null;
};

function clampFractionDigits(n: number | null | undefined): number | null {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return null;
  const r = Math.round(Number(n));
  if (r < 0) return null;
  return Math.min(4, Math.max(0, r));
}

export const formatCurrency = (
  amount: number,
  currency: string,
  locale: string,
  display?: CurrencyDisplayFormat | null,
): string => {
  const loc = locale && String(locale).trim() ? String(locale).trim() : 'en';
  const cur = currency && String(currency).trim() ? String(currency).trim() : 'USD';
  const fr = clampFractionDigits(
    display && 'decimalPlaces' in display ? (display as CurrencyDisplayFormat).decimalPlaces : null,
  );
  const symbolOverride =
    typeof display?.symbol === 'string' && display.symbol.trim() !== '' ? display.symbol.trim() : '';

  const intlBase: Intl.NumberFormatOptions = {
    style: 'currency',
    currency: cur,
    currencyDisplay: 'narrowSymbol',
  };
  if (fr !== null) {
    intlBase.minimumFractionDigits = fr;
    intlBase.maximumFractionDigits = fr;
  }

  try {
    const fmt = new Intl.NumberFormat(loc, intlBase);
    if (!symbolOverride) {
      return fmt.format(amount);
    }
    return fmt
      .formatToParts(amount)
      .map((part) => (part.type === 'currency' ? symbolOverride : part.value))
      .join('');
  } catch {
    const value = fr !== null ? amount.toFixed(fr) : amount.toFixed(2);
    return loc.startsWith('ar') || loc.startsWith('he') ? `${value} ${cur}` : `${cur} ${value}`;
  }
};
