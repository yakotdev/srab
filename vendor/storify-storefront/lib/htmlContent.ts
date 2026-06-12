import DOMPurify from 'dompurify';

/**
 * Decode common HTML entities so content stored/returned escaped still renders correctly.
 * Used for rich text from theme editor and policy content.
 * Handles named, decimal (&#60;) and hex (&#x3c;) entities; runs in a loop to fix double-encoding.
 */
export function decodeHtmlEntities(s: string): string {
  if (typeof s !== 'string') return '';
  let out = s;
  let prev = '';
  let rounds = 0;
  const maxRounds = 5;
  while (out !== prev && rounds < maxRounds) {
    prev = out;
    out = out
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#x27;/g, "'")
      .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
      .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));
    rounds++;
  }
  return out;
}

/** Allowed tags for rich text (GAP-003 remediation — XSS). */
const ALLOWED_HTML_TAGS = ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'a', 'ul', 'ol', 'li', 'h2', 'h3', 'span', 'div'];

export function prepareHtmlContent(html: string): string {
  if (!html || typeof html !== 'string') return '';
  const decoded = decodeHtmlEntities(html);
  return DOMPurify.sanitize(decoded, { ALLOWED_TAGS: ALLOWED_HTML_TAGS });
}
