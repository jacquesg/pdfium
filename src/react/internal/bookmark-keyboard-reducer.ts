'use client';

import { collapsePath, expandPath, expandPaths } from './bookmark-expansion.js';
import type { BookmarkKeyboardAction } from './bookmark-keyboard.js';

type BookmarkKeyboardReduction =
  | { kind: 'focus'; path: string }
  | { kind: 'select'; pageIndex: number }
  | { kind: 'expanded'; expandedPaths: Set<string> };

function reduceBookmarkKeyboardAction(
  action: BookmarkKeyboardAction,
  expandedPaths: ReadonlySet<string>,
): BookmarkKeyboardReduction {
  switch (action.type) {
    case 'focus':
      return { kind: 'focus', path: action.path };
    case 'select':
      return { kind: 'select', pageIndex: action.pageIndex };
    case 'expand':
      return { kind: 'expanded', expandedPaths: expandPath(expandedPaths, action.path) };
    case 'collapse':
      return { kind: 'expanded', expandedPaths: collapsePath(expandedPaths, action.path) };
    case 'expandSiblings':
      return { kind: 'expanded', expandedPaths: expandPaths(expandedPaths, action.paths) };
  }
}

export { reduceBookmarkKeyboardAction };
export type { BookmarkKeyboardReduction };
