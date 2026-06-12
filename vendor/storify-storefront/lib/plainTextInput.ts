/** Strip markup from user-submitted plain-text fields (checkout names, addresses, notes). */
export function sanitizePlainTextInput(value: string): string {
  if (typeof value !== 'string') return '';
  let out = value.replace(/\0/g, '');
  let prev = '';
  let rounds = 0;
  while (out !== prev && rounds < 3) {
    prev = out;
    out = out
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&amp;/g, '&');
    rounds++;
  }
  out = out.replace(/<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\s*(script|style)\s*>/gi, '');
  out = out.replace(/<[^>]*>/g, '');
  return out;
}
