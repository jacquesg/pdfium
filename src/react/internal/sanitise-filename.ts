/**
 * Sanitises a filename by removing path traversal sequences, directory separators,
 * null bytes, and leading dots. Returns "download" as fallback for empty results.
 */
function sanitiseFilename(name: string): string {
  const sanitised = name
    .replace(/\0/g, '') // Strip null bytes
    .replace(/[/\\]/g, '') // Strip directory separators
    .replace(/\.\.\/?/g, '') // Strip path traversal sequences
    .replace(/^\.+/, '') // Strip leading dots
    .trim();

  return sanitised || 'download';
}

export { sanitiseFilename };
