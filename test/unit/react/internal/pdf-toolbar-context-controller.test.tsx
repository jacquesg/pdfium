import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PageRotation } from '../../../../src/core/types.js';
import type { UseViewerSetupResult } from '../../../../src/react/hooks/use-viewer-setup.js';
import { usePDFToolbarContextValue } from '../../../../src/react/internal/pdf-toolbar-context-controller.js';
import type { ToolbarSearchState } from '../../../../src/react/internal/pdf-toolbar-types.js';

function createViewer(): UseViewerSetupResult {
  return {
    document: null,
    navigation: {
      pageIndex: 0,
      setPageIndex: vi.fn(),
      pageCount: 3,
      next: vi.fn(),
      prev: vi.fn(),
      canNext: true,
      canPrev: false,
    },
    zoom: {
      scale: 1,
      setScale: vi.fn(),
      zoomIn: vi.fn(),
      zoomOut: vi.fn(),
      reset: vi.fn(),
      canZoomIn: true,
      canZoomOut: true,
    },
    fit: {
      fitWidth: vi.fn(),
      fitHeight: vi.fn(),
      fitPage: vi.fn(),
      fitScale: vi.fn(),
      activeFitMode: null,
    },
    scroll: {
      scrollMode: 'continuous',
      setScrollMode: vi.fn(),
    },
    container: {
      ref: { current: null },
      dimensions: undefined,
      zoomAnchorRef: { current: null },
    },
    rotation: {
      rotations: new Map(),
      getRotation: vi.fn(() => PageRotation.None),
      rotatePage: vi.fn(),
      rotateAllPages: vi.fn(),
      resetPageRotation: vi.fn(),
      resetAllRotations: vi.fn(),
    },
    fullscreen: {
      isFullscreen: false,
      enterFullscreen: vi.fn(async () => {}),
      exitFullscreen: vi.fn(async () => {}),
      toggleFullscreen: vi.fn(async () => {}),
    },
    spread: {
      spreadMode: 'none',
      setSpreadMode: vi.fn(),
    },
    print: {
      isPrinting: false,
      progress: 0,
      print: vi.fn(),
      cancel: vi.fn(),
    },
    interaction: {
      mode: 'pointer',
      setMode: vi.fn(),
      isDragging: false,
      marqueeRect: null,
    },
  };
}

function createSearchState(): ToolbarSearchState {
  return {
    query: 'needle',
    setQuery: vi.fn(),
    totalMatches: 3,
    currentIndex: 1,
    isSearching: false,
    next: vi.fn(),
    prev: vi.fn(),
    isOpen: true,
    toggle: vi.fn(),
  };
}

describe('usePDFToolbarContextValue', () => {
  it('keeps memoized context and callback identities stable across equivalent rerenders', () => {
    const viewer = createViewer();
    const searchState = createSearchState();

    const { result, rerender } = renderHook(
      ({ nextViewer, nextSearchState }) => usePDFToolbarContextValue(nextViewer, nextSearchState),
      { initialProps: { nextViewer: viewer, nextSearchState: searchState } },
    );

    const first = result.current;

    rerender({ nextViewer: viewer, nextSearchState: searchState });

    expect(result.current).toBe(first);
    expect(result.current.navigation).toBe(first.navigation);
    expect(result.current.navigation.goToPage).toBe(first.navigation.goToPage);
    expect(result.current.zoom).toBe(first.zoom);
    expect(result.current.search).toBe(first.search);
  });

  it('recomputes only affected slices when navigation dependencies change', () => {
    const viewer = createViewer();
    const { result, rerender } = renderHook(({ nextViewer }) => usePDFToolbarContextValue(nextViewer, undefined), {
      initialProps: { nextViewer: viewer },
    });

    const first = result.current;

    rerender({ nextViewer: { ...viewer, navigation: { ...viewer.navigation, pageIndex: 1 } } });

    expect(result.current.navigation).not.toBe(first.navigation);
    expect(result.current.navigation.pageIndex).toBe(1);
    expect(result.current.zoom).toBe(first.zoom);
    expect(result.current.fit).toBe(first.fit);
  });

  it('maps optional search state to nullable toolbar search context', () => {
    const viewer = createViewer();
    const searchState = createSearchState();

    const { result, rerender } = renderHook(
      ({ nextSearchState }) => usePDFToolbarContextValue(viewer, nextSearchState),
      { initialProps: { nextSearchState: searchState as ToolbarSearchState | undefined } },
    );

    expect(result.current.search).not.toBeNull();

    rerender({ nextSearchState: undefined });
    expect(result.current.search).toBeNull();
  });
});
