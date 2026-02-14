'use client';

import type { BookmarkKeyboardAction } from './bookmark-keyboard.js';
import { reduceBookmarkKeyboardAction } from './bookmark-keyboard-reducer.js';

function applyBookmarkKeyboardExpandedUpdate(
  action: BookmarkKeyboardAction,
  expandedPaths: ReadonlySet<string>,
): Set<string> {
  const reduction = reduceBookmarkKeyboardAction(action, expandedPaths);
  if (reduction.kind !== 'expanded') {
    return new Set(expandedPaths);
  }
  return reduction.expandedPaths;
}

export { applyBookmarkKeyboardExpandedUpdate };
