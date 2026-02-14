'use client';

/** Toggle a bookmark path in the expanded set. */
function toggleExpandedPath(expandedPaths: ReadonlySet<string>, path: string): Set<string> {
  const next = new Set(expandedPaths);
  if (next.has(path)) {
    next.delete(path);
  } else {
    next.add(path);
  }
  return next;
}

/** Ensure a bookmark path is expanded. */
function expandPath(expandedPaths: ReadonlySet<string>, path: string): Set<string> {
  const next = new Set(expandedPaths);
  next.add(path);
  return next;
}

/** Ensure a bookmark path is collapsed. */
function collapsePath(expandedPaths: ReadonlySet<string>, path: string): Set<string> {
  const next = new Set(expandedPaths);
  next.delete(path);
  return next;
}

/** Ensure multiple bookmark paths are expanded. */
function expandPaths(expandedPaths: ReadonlySet<string>, paths: readonly string[]): Set<string> {
  const next = new Set(expandedPaths);
  for (const path of paths) {
    next.add(path);
  }
  return next;
}

export { collapsePath, expandPath, expandPaths, toggleExpandedPath };
