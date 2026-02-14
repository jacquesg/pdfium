import { describe, expect, it } from 'vitest';
import type { Bookmark } from '../../../../src/core/types.js';
import { getBookmarkKeyboardOutcome } from '../../../../src/react/internal/bookmark-keyboard-orchestrator.js';

const bookmarks: Bookmark[] = [
  {
    title: 'Part One',
    pageIndex: 0,
    children: [
      { title: 'Chapter 1', pageIndex: 1, children: [] },
      {
        title: 'Chapter 2',
        pageIndex: 2,
        children: [{ title: 'Section 2.1', pageIndex: 3, children: [] }],
      },
    ],
  },
  { title: 'Appendix', pageIndex: 4, children: [] },
];

function outcomeFor(
  key: string,
  overrides?: {
    targetIsInput?: boolean;
    focusedPath?: string | null;
    visiblePaths?: readonly string[];
    expandedPaths?: ReadonlySet<string>;
  },
) {
  return getBookmarkKeyboardOutcome({
    key,
    targetIsInput: overrides?.targetIsInput ?? false,
    focusedPath: overrides?.focusedPath ?? '0',
    visiblePaths: overrides?.visiblePaths ?? ['0', '0-0', '0-1', '0-1-0', '1'],
    bookmarks,
    expandedPaths: overrides?.expandedPaths ?? new Set<string>(['0', '0-1']),
  });
}

describe('getBookmarkKeyboardOutcome', () => {
  it('returns null when keyboard event originates from input target', () => {
    expect(outcomeFor('ArrowDown', { targetIsInput: true })).toBeNull();
  });

  it('returns null when key does not map to a bookmark keyboard action', () => {
    expect(outcomeFor('Tab')).toBeNull();
  });

  it('returns focus reduction for navigational focus actions', () => {
    expect(outcomeFor('ArrowDown', { focusedPath: '0' })).toEqual({
      action: { type: 'focus', path: '0-0' },
      reduction: { kind: 'focus', path: '0-0' },
    });
  });

  it('returns select reduction for activation actions', () => {
    expect(outcomeFor('Enter', { focusedPath: '0-1-0' })).toEqual({
      action: { type: 'select', pageIndex: 3 },
      reduction: { kind: 'select', pageIndex: 3 },
    });
  });

  it('returns expanded reduction and computes it from provided expanded paths', () => {
    expect(outcomeFor('ArrowRight', { focusedPath: '0', expandedPaths: new Set<string>() })).toEqual({
      action: { type: 'expand', path: '0' },
      reduction: { kind: 'expanded', expandedPaths: new Set<string>(['0']) },
    });
  });
});
