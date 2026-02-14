'use client';

import { type Dispatch, type SetStateAction, useCallback } from 'react';
import type { Bookmark } from '../../core/types.js';
import { applyBookmarkKeyboardExpandedUpdate } from './bookmark-keyboard-expanded-update.js';
import { getBookmarkKeyboardOutcome } from './bookmark-keyboard-orchestrator.js';

interface UseBookmarkKeyboardHandlerOptions {
  focusedPath: string | null;
  visiblePaths: readonly string[];
  bookmarks: readonly Bookmark[];
  expandedPaths: ReadonlySet<string>;
  focusElement: (path: string) => void;
  onBookmarkSelect: (pageIndex: number) => void;
  setExpanded: Dispatch<SetStateAction<Set<string>>>;
}

function useBookmarkKeyboardHandler({
  focusedPath,
  visiblePaths,
  bookmarks,
  expandedPaths,
  focusElement,
  onBookmarkSelect,
  setExpanded,
}: UseBookmarkKeyboardHandlerOptions): (event: React.KeyboardEvent) => void {
  return useCallback(
    (event: React.KeyboardEvent) => {
      const outcome = getBookmarkKeyboardOutcome({
        key: event.key,
        targetIsInput: event.target instanceof HTMLInputElement,
        focusedPath,
        visiblePaths,
        bookmarks,
        expandedPaths,
      });
      if (!outcome) return;
      event.preventDefault();

      switch (outcome.reduction.kind) {
        case 'focus':
          focusElement(outcome.reduction.path);
          break;
        case 'select':
          onBookmarkSelect(outcome.reduction.pageIndex);
          break;
        case 'expanded':
          setExpanded((prev) => applyBookmarkKeyboardExpandedUpdate(outcome.action, prev));
          break;
      }
    },
    [focusedPath, visiblePaths, bookmarks, expandedPaths, focusElement, onBookmarkSelect, setExpanded],
  );
}

export { useBookmarkKeyboardHandler };
export type { UseBookmarkKeyboardHandlerOptions };
