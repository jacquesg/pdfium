import type { Bookmark } from '../../core/types.js';

interface FilteredBookmarkEntry {
  bookmark: Bookmark;
  originalIndex: number;
}

interface BookmarkFilterCounts {
  totalCount: number;
  matchCount: number;
}

/** Collect all paths for bookmark nodes that have children. */
function collectAllParentPaths(bookmarks: readonly Bookmark[], prefix = ''): Set<string> {
  const result = new Set<string>();
  for (const [i, bookmark] of bookmarks.entries()) {
    const path = prefix ? `${prefix}-${i}` : `${i}`;
    if (bookmark.children.length > 0) {
      result.add(path);
      for (const childPath of collectAllParentPaths(bookmark.children, path)) {
        result.add(childPath);
      }
    }
  }
  return result;
}

/** Count total bookmarks (flat). */
function countBookmarks(bookmarks: readonly Bookmark[]): number {
  let count = 0;
  for (const bookmark of bookmarks) {
    count += 1 + countBookmarks(bookmark.children);
  }
  return count;
}

/** Test if a bookmark or any descendant matches a filter query. */
function matchesFilter(bookmark: Bookmark, query: string): boolean {
  if (bookmark.title.toLowerCase().includes(query)) return true;
  return bookmark.children.some((child) => matchesFilter(child, query));
}

/** Count matching bookmarks (leaf matches only). */
function countMatches(bookmarks: readonly Bookmark[], query: string): number {
  let count = 0;
  for (const bookmark of bookmarks) {
    if (bookmark.title.toLowerCase().includes(query)) count++;
    count += countMatches(bookmark.children, query);
  }
  return count;
}

/** Collect root-level entries, preserving original indices for tree path stability. */
function collectFilteredBookmarkEntries(bookmarks: readonly Bookmark[], filterQuery: string): FilteredBookmarkEntry[] {
  const entries = bookmarks.map((bookmark, originalIndex) => ({ bookmark, originalIndex }));
  if (!filterQuery) return entries;
  return entries.filter(({ bookmark }) => matchesFilter(bookmark, filterQuery));
}

/** Derive filter count metadata for the bookmark panel UI. */
function getBookmarkFilterCounts(bookmarks: readonly Bookmark[], filterQuery: string): BookmarkFilterCounts {
  const totalCount = countBookmarks(bookmarks);
  return {
    totalCount,
    matchCount: filterQuery ? countMatches(bookmarks, filterQuery) : totalCount,
  };
}

/** Collect paths of all visible items in order (for keyboard navigation). */
function collectVisiblePaths(
  bookmarks: readonly Bookmark[],
  expanded: ReadonlySet<string>,
  filterQuery: string,
  prefix = '',
): string[] {
  const paths: string[] = [];
  for (const [i, bookmark] of bookmarks.entries()) {
    const path = prefix ? `${prefix}-${i}` : `${i}`;
    if (filterQuery && !matchesFilter(bookmark, filterQuery)) continue;
    paths.push(path);
    if (bookmark.children.length > 0 && expanded.has(path)) {
      paths.push(...collectVisiblePaths(bookmark.children, expanded, filterQuery, path));
    }
  }
  return paths;
}

/** Collect parent paths that should auto-expand for a non-empty filter query. */
function collectAutoExpandedPaths(bookmarks: readonly Bookmark[], filterQuery: string, prefix = ''): Set<string> {
  if (!filterQuery) return new Set<string>();

  const result = new Set<string>();
  for (const [i, bookmark] of bookmarks.entries()) {
    const path = prefix ? `${prefix}-${i}` : `${i}`;
    if (bookmark.children.length === 0) continue;
    if (matchesFilter(bookmark, filterQuery)) {
      result.add(path);
    }
    for (const childPath of collectAutoExpandedPaths(bookmark.children, filterQuery, path)) {
      result.add(childPath);
    }
  }
  return result;
}

/** Merge user expansion state with filter-driven auto-expansion. */
function deriveEffectiveExpandedPaths(
  bookmarks: readonly Bookmark[],
  expandedPaths: ReadonlySet<string>,
  filterQuery: string,
): ReadonlySet<string> {
  if (!filterQuery) return expandedPaths;
  const effectiveExpanded = new Set(expandedPaths);
  for (const path of collectAutoExpandedPaths(bookmarks, filterQuery)) {
    effectiveExpanded.add(path);
  }
  return effectiveExpanded;
}

/** Get the parent path of a given path. Returns null for root items. */
function parentPath(path: string): string | null {
  const lastDash = path.lastIndexOf('-');
  return lastDash === -1 ? null : path.substring(0, lastDash);
}

/** Resolve a path to its Bookmark. */
function resolveBookmark(bookmarks: readonly Bookmark[], path: string): Bookmark | undefined {
  const indices = path.split('-').map(Number);
  let currentBookmarks: readonly Bookmark[] = bookmarks;
  let result: Bookmark | undefined;

  for (const index of indices) {
    result = currentBookmarks[index];
    if (!result) return undefined;
    currentBookmarks = result.children;
  }

  return result;
}

/** Collect sibling paths with children for `*` tree keyboard behavior. */
function collectExpandableSiblingPaths(bookmarks: readonly Bookmark[], parent: string | null): string[] {
  const siblings = parent !== null ? resolveBookmark(bookmarks, parent)?.children : bookmarks;
  if (!siblings) return [];

  const siblingPaths: string[] = [];
  for (const [i, sibling] of siblings.entries()) {
    if (sibling.children.length === 0) continue;
    siblingPaths.push(parent !== null ? `${parent}-${i}` : `${i}`);
  }
  return siblingPaths;
}

export {
  collectAllParentPaths,
  collectAutoExpandedPaths,
  collectExpandableSiblingPaths,
  collectFilteredBookmarkEntries,
  collectVisiblePaths,
  countBookmarks,
  countMatches,
  deriveEffectiveExpandedPaths,
  getBookmarkFilterCounts,
  matchesFilter,
  parentPath,
  resolveBookmark,
};
export type { BookmarkFilterCounts, FilteredBookmarkEntry };
