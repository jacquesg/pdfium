import { describe, expect, it } from 'vitest';
import type { BookmarkKeyboardAction } from '../../../../src/react/internal/bookmark-keyboard.js';
import { applyBookmarkKeyboardExpandedUpdate } from '../../../../src/react/internal/bookmark-keyboard-expanded-update.js';

describe('applyBookmarkKeyboardExpandedUpdate', () => {
  it('applies expand actions to add a path', () => {
    const previous = new Set<string>(['0']);
    const next = applyBookmarkKeyboardExpandedUpdate({ type: 'expand', path: '1' }, previous);

    expect(Array.from(next).sort()).toEqual(['0', '1']);
    expect(next).not.toBe(previous);
    expect(Array.from(previous)).toEqual(['0']);
  });

  it('applies collapse actions to remove a path', () => {
    const previous = new Set<string>(['0', '1']);
    const next = applyBookmarkKeyboardExpandedUpdate({ type: 'collapse', path: '1' }, previous);

    expect(Array.from(next)).toEqual(['0']);
    expect(next).not.toBe(previous);
    expect(Array.from(previous).sort()).toEqual(['0', '1']);
  });

  it('applies expandSiblings actions to merge sibling paths', () => {
    const previous = new Set<string>(['0']);
    const next = applyBookmarkKeyboardExpandedUpdate({ type: 'expandSiblings', paths: ['1', '2', '1'] }, previous);

    expect(Array.from(next).sort()).toEqual(['0', '1', '2']);
    expect(next).not.toBe(previous);
    expect(Array.from(previous)).toEqual(['0']);
  });

  it('returns a cloned set when called with non-expanded actions', () => {
    const previous = new Set<string>(['0']);
    const nonExpandedAction: BookmarkKeyboardAction = { type: 'focus', path: '0-0' };
    const next = applyBookmarkKeyboardExpandedUpdate(nonExpandedAction, previous);

    expect(Array.from(next)).toEqual(['0']);
    expect(next).not.toBe(previous);
  });
});
