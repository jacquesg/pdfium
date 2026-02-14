/** Allowed URL schemes that are safe to navigate to. */
const SAFE_SCHEMES = new Set(['http:', 'https:', 'mailto:', 'tel:']);

/**
 * Validates whether a URL is safe for navigation (XSS prevention).
 *
 * Allows http, https, mailto, tel schemes, relative URLs, and fragment-only references.
 * Rejects javascript:, data:, vbscript: and empty strings.
 */
function isSafeUrl(url: string): boolean {
  const trimmed = url.trim();
  if (trimmed === '') return false;

  // Fragment-only references are always safe
  if (trimmed.startsWith('#')) return true;

  // Relative URLs (no scheme) are safe — check for a colon before any slash
  const colonIndex = trimmed.indexOf(':');
  if (colonIndex === -1) return true;

  const slashIndex = trimmed.indexOf('/');
  if (slashIndex !== -1 && slashIndex < colonIndex) return true;

  // Extract and validate the scheme
  try {
    const parsed = new URL(trimmed, 'https://placeholder.invalid');
    return SAFE_SCHEMES.has(parsed.protocol.toLowerCase());
  } catch {
    return false;
  }
}

export { isSafeUrl };
