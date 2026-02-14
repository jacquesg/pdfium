/**
 * Helper used internally by all hooks to build cache keys.
 *
 * Uses null-byte (\0) separator to prevent collisions when user-supplied
 * string values (e.g. search queries) contain the delimiter character.
 * Undefined params are omitted to avoid collisions with a literal "undefined" string value.
 */
function buildCacheKey(
  documentId: string,
  hookName: string,
  revision: number,
  ...params: (string | number | boolean | undefined)[]
): string {
  return [documentId, hookName, revision, ...params.filter((p) => p !== undefined)].join('\0');
}

export { buildCacheKey };
