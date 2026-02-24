import type { Bookmark } from '../../core/types.js';
import { collectExpandableSiblingPaths, parentPath, resolveBookmark } from './bookmark-tree.js';

interface BookmarkKeyboardInput {
  key: string;
  focusedPath: string | null;
  visiblePaths: readonly string[];
  bookmarks: readonly Bookmark[];
  expandedPaths: ReadonlySet<string>;
}

type BookmarkKeyboardAction =
  | { type: 'focus'; path: string }
  | { type: 'expand'; path: string }
  | { type: 'collapse'; path: string }
  | { type: 'select'; pageIndex: number }
  | { type: 'expandSiblings'; paths: string[] };

function getBookmarkKeyboardAction({
  key,
  focusedPath,
  visiblePaths,
  bookmarks,
  expandedPaths,
}: BookmarkKeyboardInput): BookmarkKeyboardAction | null {
  const currentIndex = focusedPath !== null ? visiblePaths.indexOf(focusedPath) : -1;

  switch (key) {
    case 'ArrowDown': {
      const nextPath = visiblePaths[currentIndex + 1];
      return nextPath !== undefined ? { type: 'focus', path: nextPath } : null;
    }
    case 'ArrowUp': {
      const previousPath = visiblePaths[currentIndex - 1];
      return previousPath !== undefined ? { type: 'focus', path: previousPath } : null;
    }
    case 'ArrowRight': {
      if (focusedPath === null) return null;
      const bookmark = resolveBookmark(bookmarks, focusedPath);
      if (!bookmark || bookmark.children.length === 0) return null;
      if (!expandedPaths.has(focusedPath)) return { type: 'expand', path: focusedPath };

      const firstChildPath = `${focusedPath}-0`;
      return visiblePaths.includes(firstChildPath) ? { type: 'focus', path: firstChildPath } : null;
    }
    case 'ArrowLeft': {
      if (focusedPath === null) return null;
      const bookmark = resolveBookmark(bookmarks, focusedPath);
      if (bookmark && bookmark.children.length > 0 && expandedPaths.has(focusedPath)) {
        return { type: 'collapse', path: focusedPath };
      }
      const parent = parentPath(focusedPath);
      return parent !== null ? { type: 'focus', path: parent } : null;
    }
    case 'Home': {
      const firstPath = visiblePaths[0];
      return firstPath !== undefined ? { type: 'focus', path: firstPath } : null;
    }
    case 'End': {
      const lastPath = visiblePaths[visiblePaths.length - 1];
      return lastPath !== undefined ? { type: 'focus', path: lastPath } : null;
    }
    case 'Enter':
    case ' ': {
      if (focusedPath === null) return null;
      const bookmark = resolveBookmark(bookmarks, focusedPath);
      return bookmark?.pageIndex !== undefined ? { type: 'select', pageIndex: bookmark.pageIndex } : null;
    }
    case '*': {
      if (focusedPath === null) return null;
      const siblingsToExpand = collectExpandableSiblingPaths(bookmarks, parentPath(focusedPath));
      return siblingsToExpand.length > 0 ? { type: 'expandSiblings', paths: siblingsToExpand } : null;
    }
    default:
      return null;
  }
}

export { getBookmarkKeyboardAction };
export type { BookmarkKeyboardAction, BookmarkKeyboardInput };
