/**
 * HTML escaping for the handful of host-supplied strings waavy places into
 * markup outside React (title text, attribute values, asset URLs).
 */

const HTML_ESCAPES: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
};

/**
 * Escapes `&`, `<`, `>`, `"` and `'`. The result is safe both as element text
 * and inside a double- or single-quoted attribute value.
 */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => HTML_ESCAPES[character] ?? character);
}
