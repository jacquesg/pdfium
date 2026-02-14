import { describe, expect, it } from 'vitest';
import type { BookmarkKeyboardAction } from '../../../../src/react/internal/bookmark-keyboard.js';
import { reduceBookmarkKeyboardAction } from '../../../../src/react/internal/bookmark-keyboard-reducer.js';

describe('reduceBookmarkKeyboardAction', () => {
  it('returns focus reduction for focus actions', () => {
    const action: BookmarkKeyboardAction = { type: 'focus', path: '0-1' };
    expect(reduceBookmarkKeyboardAction(action, new Set<string>(['0']))).toEqual({ kind: 'focus', path: '0-1' });
  });

  it('returns select reduction for select actions', () => {
    const action: BookmarkKeyboardAction = { type: 'select', pageIndex: 5 };
    expect(reduceBookmarkKeyboardAction(action, new Set<string>(['0']))).toEqual({ kind: 'select', pageIndex: 5 });
  });

  it('expands a path for expand actions without mutating previous set', () => {
    const previous = new Set<string>(['0']);
    const action: BookmarkKeyboardAction = { type: 'expand', path: '1' };
    const reduction = reduceBookmarkKeyboardAction(action, previous);

    expect(reduction.kind).toBe('expanded');
    if (reduction.kind === 'expanded') {
      expect(Array.from(reduction.expandedPaths).sort()).toEqual(['0', '1']);
      expect(reduction.expandedPaths).not.toBe(previous);
    }
    expect(Array.from(previous)).toEqual(['0']);
  });

  it('collapses a path for collapse actions without mutating previous set', () => {
    const previous = new Set<string>(['0', '1']);
    const action: BookmarkKeyboardAction = { type: 'collapse', path: '1' };
    const reduction = reduceBookmarkKeyboardAction(action, previous);

    expect(reduction.kind).toBe('expanded');
    if (reduction.kind === 'expanded') {
      expect(Array.from(reduction.expandedPaths)).toEqual(['0']);
      expect(reduction.expandedPaths).not.toBe(previous);
    }
    expect(Array.from(previous).sort()).toEqual(['0', '1']);
  });

  it('expands multiple sibling paths for expandSiblings actions', () => {
    const previous = new Set<string>(['0']);
    const action: BookmarkKeyboardAction = { type: 'expandSiblings', paths: ['1', '2', '1'] };
    const reduction = reduceBookmarkKeyboardAction(action, previous);

    expect(reduction.kind).toBe('expanded');
    if (reduction.kind === 'expanded') {
      expect(Array.from(reduction.expandedPaths).sort()).toEqual(['0', '1', '2']);
      expect(reduction.expandedPaths).not.toBe(previous);
    }
    expect(Array.from(previous)).toEqual(['0']);
  });
});
