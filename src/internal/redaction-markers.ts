/**
 * Internal marker keys/values for editor redaction fallbacks.
 *
 * @module internal/redaction-markers
 */

/**
 * Marker stored in annotation `Contents` for pseudo-redaction fallback
 * regions when native Redact annotation creation is unavailable.
 */
export const REDACTION_FALLBACK_CONTENTS_MARKER = '__pdfium_pseudo_redaction__';
