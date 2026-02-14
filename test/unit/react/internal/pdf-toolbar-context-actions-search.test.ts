import { describe, expect, it, vi } from 'vitest';
import {
  createFirstLastPageRenderProps,
  createFullscreenRenderProps,
  createPrintRenderProps,
  createSearchRenderProps,
  createToolbarContextValue,
} from '../../../../src/react/internal/pdf-toolbar-context-actions-search.js';
import type { ToolbarSearchState } from '../../../../src/react/internal/pdf-toolbar-types.js';
import { TOOLBAR_LABELS } from '../../../../src/react/internal/toolbar-config.js';

describe('pdf-toolbar-context-actions-search', () => {
  it('builds fullscreen props with the right label and toggle handler', () => {
    const toggleFullscreen = vi.fn();

    const fullscreen = createFullscreenRenderProps({
      isFullscreen: false,
      enterFullscreen: vi.fn(),
      exitFullscreen: vi.fn(),
      toggleFullscreen,
    });

    expect(fullscreen.getToggleProps()['aria-label']).toBe(TOOLBAR_LABELS.enterFullscreen);
    expect(fullscreen.getToggleProps()['aria-pressed']).toBe(false);

    fullscreen.getToggleProps().onClick();
    expect(toggleFullscreen).toHaveBeenCalledTimes(1);
  });

  it('switches print button action between print and cancel', () => {
    const print = vi.fn();
    const cancel = vi.fn();

    const idle = createPrintRenderProps({
      isPrinting: false,
      progress: 0,
      print,
      cancel,
    });
    idle.getPrintProps().onClick();

    const active = createPrintRenderProps({
      isPrinting: true,
      progress: 40,
      print,
      cancel,
    });
    active.getPrintProps().onClick();

    expect(idle.getPrintProps()['aria-label']).toBe(TOOLBAR_LABELS.print);
    expect(active.getPrintProps()['aria-label']).toBe(TOOLBAR_LABELS.cancelPrint);
    expect(print).toHaveBeenCalledTimes(1);
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it('computes first/last controls and handles page jumps', () => {
    const setPageIndex = vi.fn();

    const firstPage = createFirstLastPageRenderProps(0, 3, setPageIndex);
    expect(firstPage.isFirst).toBe(true);
    expect(firstPage.getFirstProps().disabled).toBe(true);
    firstPage.getLastProps().onClick();

    const lastPage = createFirstLastPageRenderProps(2, 3, setPageIndex);
    expect(lastPage.isLast).toBe(true);
    expect(lastPage.getLastProps().disabled).toBe(true);

    const emptyDoc = createFirstLastPageRenderProps(0, 0, setPageIndex);
    expect(emptyDoc.getFirstProps().disabled).toBe(true);
    expect(emptyDoc.getLastProps().disabled).toBe(true);

    expect(setPageIndex).toHaveBeenCalledWith(2);
  });

  it('returns null without search state and wires search callbacks when state is present', () => {
    expect(createSearchRenderProps(undefined)).toBeNull();

    const setQuery = vi.fn();
    const next = vi.fn();
    const prev = vi.fn();
    const toggle = vi.fn();

    const searchState: ToolbarSearchState = {
      query: 'needle',
      setQuery,
      totalMatches: 2,
      currentIndex: 1,
      isSearching: false,
      next,
      prev,
      isOpen: true,
      toggle,
    };

    const search = createSearchRenderProps(searchState);
    if (!search) throw new Error('expected search props');

    search.getInputProps().onChange({ target: { value: 'updated' } } as never);
    search.getNextProps().onClick();
    search.getPrevProps().onClick();
    search.getToggleProps().onClick();

    expect(search.getToggleProps()['aria-label']).toBe(TOOLBAR_LABELS.searchClose);
    expect(search.getNextProps().disabled).toBe(false);
    expect(search.getPrevProps().disabled).toBe(false);
    expect(setQuery).toHaveBeenCalledWith('updated');
    expect(next).toHaveBeenCalledTimes(1);
    expect(prev).toHaveBeenCalledTimes(1);
    expect(toggle).toHaveBeenCalledTimes(1);
  });

  it('returns toolbar context value without cloning', () => {
    const contextValue = {
      a: 1,
      nested: { b: 2 },
    } as unknown as Parameters<typeof createToolbarContextValue>[0];

    expect(createToolbarContextValue(contextValue)).toBe(contextValue);
  });
});
