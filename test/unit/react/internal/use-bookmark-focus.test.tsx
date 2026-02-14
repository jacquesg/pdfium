import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useBookmarkFocus } from '../../../../src/react/internal/use-bookmark-focus.js';

describe('useBookmarkFocus', () => {
  let container: HTMLDivElement;
  let treeRef: { current: HTMLDivElement | null };

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    treeRef = { current: container };
  });

  afterEach(() => {
    cleanup();
    container.remove();
  });

  it('starts with no focused bookmark path', () => {
    const { result } = renderHook(() => useBookmarkFocus({ treeRef }));

    expect(result.current.focusedPath).toBeNull();
  });

  it('updates focused path via handleFocus', () => {
    const { result } = renderHook(() => useBookmarkFocus({ treeRef }));

    act(() => {
      result.current.handleFocus('0-1');
    });

    expect(result.current.focusedPath).toBe('0-1');
  });

  it('focuses matching tree element by data-path and updates focused path', () => {
    const item = document.createElement('div');
    item.setAttribute('data-path', '2-0');
    item.tabIndex = -1;
    container.appendChild(item);

    const { result } = renderHook(() => useBookmarkFocus({ treeRef }));

    act(() => {
      result.current.focusElement('2-0');
    });

    expect(result.current.focusedPath).toBe('2-0');
    expect(document.activeElement).toBe(item);
  });

  it('updates focused path even when requested element is missing', () => {
    const { result } = renderHook(() => useBookmarkFocus({ treeRef }));

    act(() => {
      result.current.focusElement('9-9');
    });

    expect(result.current.focusedPath).toBe('9-9');
  });
});
