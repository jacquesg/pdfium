import { describe, expect, it } from 'vitest';
import type { Bookmark } from '../../../../src/core/types.js';
import { getBookmarkKeyboardAction } from '../../../../src/react/internal/bookmark-keyboard.js';

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
  {
    title: 'Part Two',
    pageIndex: 4,
    children: [{ title: 'Chapter 3', pageIndex: 5, children: [] }],
  },
  {
    title: 'External Link',
    pageIndex: undefined,
    children: [],
  },
];

function actionFor(
  key: string,
  overrides?: {
    focusedPath?: string | null;
    visiblePaths?: readonly string[];
    expandedPaths?: ReadonlySet<string>;
  },
) {
  const focusedPath: string | null =
    overrides && Object.hasOwn(overrides, 'focusedPath') ? (overrides.focusedPath ?? null) : '0';

  return getBookmarkKeyboardAction({
    key,
    focusedPath,
    visiblePaths: overrides?.visiblePaths ?? ['0', '0-0', '0-1', '0-1-0', '1', '2'],
    bookmarks,
    expandedPaths: overrides?.expandedPaths ?? new Set<string>(['0', '0-1']),
  });
}

describe('getBookmarkKeyboardAction', () => {
  it('moves focus down and up when adjacent visible paths exist', () => {
    expect(actionFor('ArrowDown', { focusedPath: '0' })).toEqual({ type: 'focus', path: '0-0' });
    expect(actionFor('ArrowUp', { focusedPath: '0-1' })).toEqual({ type: 'focus', path: '0-0' });
  });

  it('returns null for ArrowDown and ArrowUp at list boundaries', () => {
    expect(actionFor('ArrowDown', { focusedPath: '2' })).toBeNull();
    expect(actionFor('ArrowUp', { focusedPath: '0' })).toBeNull();
  });

  it('expands collapsed parent on ArrowRight', () => {
    expect(actionFor('ArrowRight', { focusedPath: '1', expandedPaths: new Set<string>() })).toEqual({
      type: 'expand',
      path: '1',
    });
  });

  it('moves focus to first visible child on ArrowRight when parent is already expanded', () => {
    expect(actionFor('ArrowRight', { focusedPath: '0' })).toEqual({ type: 'focus', path: '0-0' });
  });

  it('returns null on ArrowRight when no focus, target has no children, child is not visible, or path is stale', () => {
    expect(actionFor('ArrowRight', { focusedPath: null })).toBeNull();
    expect(actionFor('ArrowRight', { focusedPath: '0-0' })).toBeNull();
    expect(actionFor('ArrowRight', { focusedPath: '0', visiblePaths: ['0', '1', '2'] })).toBeNull();
    expect(actionFor('ArrowRight', { focusedPath: '99' })).toBeNull();
  });

  it('collapses expanded parent on ArrowLeft', () => {
    expect(actionFor('ArrowLeft', { focusedPath: '0' })).toEqual({ type: 'collapse', path: '0' });
  });

  it('moves focus to parent on ArrowLeft when current item is not an expanded parent', () => {
    expect(actionFor('ArrowLeft', { focusedPath: '0-0' })).toEqual({ type: 'focus', path: '0' });
  });

  it('returns null on ArrowLeft when no focus or focused item is a root without collapse action', () => {
    expect(actionFor('ArrowLeft', { focusedPath: null })).toBeNull();
    expect(actionFor('ArrowLeft', { focusedPath: '2' })).toBeNull();
  });

  it('focuses first and last item for Home and End', () => {
    expect(actionFor('Home')).toEqual({ type: 'focus', path: '0' });
    expect(actionFor('End')).toEqual({ type: 'focus', path: '2' });
  });

  it('returns null for Home and End when there are no visible paths', () => {
    expect(actionFor('Home', { visiblePaths: [] })).toBeNull();
    expect(actionFor('End', { visiblePaths: [] })).toBeNull();
  });

  it('selects bookmark page on Enter and Space when focused item has a destination', () => {
    expect(actionFor('Enter', { focusedPath: '0-1-0' })).toEqual({ type: 'select', pageIndex: 3 });
    expect(actionFor(' ', { focusedPath: '1' })).toEqual({ type: 'select', pageIndex: 4 });
  });

  it('returns null on Enter and Space when no focus, stale path, or no destination page', () => {
    expect(actionFor('Enter', { focusedPath: null })).toBeNull();
    expect(actionFor('Enter', { focusedPath: '99' })).toBeNull();
    expect(actionFor(' ', { focusedPath: '2' })).toBeNull();
  });

  it('expands sibling groups on * for root and nested contexts', () => {
    expect(actionFor('*', { focusedPath: '0' })).toEqual({ type: 'expandSiblings', paths: ['0', '1'] });
    expect(actionFor('*', { focusedPath: '0-0' })).toEqual({ type: 'expandSiblings', paths: ['0-1'] });
  });

  it('returns null on * when no focus or no expandable siblings exist', () => {
    expect(actionFor('*', { focusedPath: null })).toBeNull();
    expect(actionFor('*', { focusedPath: '0-1-0' })).toBeNull();
  });

  it('returns null for unsupported keys', () => {
    expect(actionFor('Tab')).toBeNull();
  });
});
