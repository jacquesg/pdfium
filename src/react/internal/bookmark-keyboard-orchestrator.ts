import type { Bookmark } from '../../core/types.js';
import { type BookmarkKeyboardAction, getBookmarkKeyboardAction } from './bookmark-keyboard.js';
import { type BookmarkKeyboardReduction, reduceBookmarkKeyboardAction } from './bookmark-keyboard-reducer.js';

interface BookmarkKeyboardOrchestratorInput {
  key: string;
  targetIsInput: boolean;
  focusedPath: string | null;
  visiblePaths: readonly string[];
  bookmarks: readonly Bookmark[];
  expandedPaths: ReadonlySet<string>;
}

interface BookmarkKeyboardOutcome {
  action: BookmarkKeyboardAction;
  reduction: BookmarkKeyboardReduction;
}

function getBookmarkKeyboardOutcome({
  key,
  targetIsInput,
  focusedPath,
  visiblePaths,
  bookmarks,
  expandedPaths,
}: BookmarkKeyboardOrchestratorInput): BookmarkKeyboardOutcome | null {
  if (targetIsInput) return null;

  const action = getBookmarkKeyboardAction({
    key,
    focusedPath,
    visiblePaths,
    bookmarks,
    expandedPaths,
  });
  if (!action) return null;

  return {
    action,
    reduction: reduceBookmarkKeyboardAction(action, expandedPaths),
  };
}

export { getBookmarkKeyboardOutcome };
export type { BookmarkKeyboardOrchestratorInput, BookmarkKeyboardOutcome };
