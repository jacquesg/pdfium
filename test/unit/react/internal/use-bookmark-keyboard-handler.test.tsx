import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Bookmark } from '../../../../src/core/types.js';
import { useBookmarkKeyboardHandler } from '../../../../src/react/internal/use-bookmark-keyboard-handler.js';

const bookmarks: Bookmark[] = [
  {
    title: 'Part One',
    pageIndex: 0,
    children: [{ title: 'Chapter 1', pageIndex: 1, children: [] }],
  },
  { title: 'Appendix', pageIndex: 2, children: [] },
];

function createKeyboardEvent(key: string, target: EventTarget = document.createElement('div')) {
  return {
    key,
    target,
    preventDefault: vi.fn(),
  } as unknown as React.KeyboardEvent;
}

describe('useBookmarkKeyboardHandler', () => {
  it('does nothing when event target is an input element', () => {
    const focusElement = vi.fn();
    const onBookmarkSelect = vi.fn();
    const setExpanded = vi.fn();
    const { result } = renderHook(() =>
      useBookmarkKeyboardHandler({
        focusedPath: '0',
        visiblePaths: ['0', '0-0', '1'],
        bookmarks,
        expandedPaths: new Set<string>(),
        focusElement,
        onBookmarkSelect,
        setExpanded,
      }),
    );

    const event = createKeyboardEvent('ArrowDown', document.createElement('input'));
    act(() => {
      result.current(event);
    });

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(focusElement).not.toHaveBeenCalled();
    expect(onBookmarkSelect).not.toHaveBeenCalled();
    expect(setExpanded).not.toHaveBeenCalled();
  });

  it('focuses next visible path for focus reductions', () => {
    const focusElement = vi.fn();
    const onBookmarkSelect = vi.fn();
    const setExpanded = vi.fn();
    const { result } = renderHook(() =>
      useBookmarkKeyboardHandler({
        focusedPath: '0',
        visiblePaths: ['0', '0-0', '1'],
        bookmarks,
        expandedPaths: new Set<string>(['0']),
        focusElement,
        onBookmarkSelect,
        setExpanded,
      }),
    );

    const event = createKeyboardEvent('ArrowDown');
    act(() => {
      result.current(event);
    });

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(focusElement).toHaveBeenCalledWith('0-0');
    expect(onBookmarkSelect).not.toHaveBeenCalled();
    expect(setExpanded).not.toHaveBeenCalled();
  });

  it('calls onBookmarkSelect for select reductions', () => {
    const focusElement = vi.fn();
    const onBookmarkSelect = vi.fn();
    const setExpanded = vi.fn();
    const { result } = renderHook(() =>
      useBookmarkKeyboardHandler({
        focusedPath: '0-0',
        visiblePaths: ['0', '0-0', '1'],
        bookmarks,
        expandedPaths: new Set<string>(['0']),
        focusElement,
        onBookmarkSelect,
        setExpanded,
      }),
    );

    const event = createKeyboardEvent('Enter');
    act(() => {
      result.current(event);
    });

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(onBookmarkSelect).toHaveBeenCalledWith(1);
    expect(focusElement).not.toHaveBeenCalled();
    expect(setExpanded).not.toHaveBeenCalled();
  });

  it('applies expanded updates for expanded reductions', () => {
    const focusElement = vi.fn();
    const onBookmarkSelect = vi.fn();
    const setExpanded = vi.fn();
    const { result } = renderHook(() =>
      useBookmarkKeyboardHandler({
        focusedPath: '0',
        visiblePaths: ['0', '1'],
        bookmarks,
        expandedPaths: new Set<string>(),
        focusElement,
        onBookmarkSelect,
        setExpanded,
      }),
    );

    const event = createKeyboardEvent('ArrowRight');
    act(() => {
      result.current(event);
    });

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(setExpanded).toHaveBeenCalledTimes(1);
    const updater = setExpanded.mock.calls[0]?.[0] as ((prev: Set<string>) => Set<string>) | undefined;
    expect(updater).toBeTypeOf('function');
    const previous = new Set<string>();
    const next = updater!(previous);
    expect(Array.from(next)).toEqual(['0']);
    expect(Array.from(previous)).toEqual([]);
  });
});
