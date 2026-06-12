/** Legacy theme font values → CSS font family (for backward compatibility) */
const LEGACY_MAP: Record<string, string> = {
  sans: 'Inter',
  serif: 'Playfair Display',
  cairo: 'Cairo',
};

/**
 * Returns the CSS font-family value for the theme (supports legacy sans/serif/cairo and Google Font names).
 */
export function getFontFamilyCss(fontFamily: string | undefined): string {
  if (!fontFamily) return '"Cairo", sans-serif';
  const family = LEGACY_MAP[fontFamily] || fontFamily;
  return `"${family}", sans-serif`;
}
