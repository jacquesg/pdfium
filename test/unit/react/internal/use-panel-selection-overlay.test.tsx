import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { PageOverlayInfo } from '../../../../src/react/components/pdf-page-view.js';
import { usePanelSelectionOverlay } from '../../../../src/react/internal/use-panel-selection-overlay.js';

describe('use-panel-selection-overlay', () => {
  it('clears panel overlay when no selection exists', () => {
    const setPanelOverlay = vi.fn();
    const createOverlayRenderer = vi.fn();

    renderHook(() =>
      usePanelSelectionOverlay({
        selectedItem: null,
        pageIndex: 2,
        setPanelOverlay,
        createOverlayRenderer,
      }),
    );

    expect(setPanelOverlay).toHaveBeenCalledWith(null);
    expect(createOverlayRenderer).not.toHaveBeenCalled();
  });

  it('sets overlay renderer when selection exists and cleans up on unmount', () => {
    const setPanelOverlay = vi.fn();
    const renderer = vi.fn(() => 'overlay');
    const createOverlayRenderer = vi.fn(() => renderer);

    const { unmount } = renderHook(() =>
      usePanelSelectionOverlay({
        selectedItem: { id: 'a' },
        pageIndex: 4,
        setPanelOverlay,
        createOverlayRenderer,
      }),
    );

    expect(createOverlayRenderer).toHaveBeenCalledWith({ id: 'a' }, 4);
    const overlayFn = setPanelOverlay.mock.calls[0]?.[0] as ((info: PageOverlayInfo) => unknown) | null;
    expect(typeof overlayFn).toBe('function');
    if (!overlayFn) throw new Error('overlay function missing');
    expect(overlayFn({} as PageOverlayInfo)).toBe('overlay');
    expect(renderer).toHaveBeenCalledTimes(1);

    unmount();
    expect(setPanelOverlay).toHaveBeenLastCalledWith(null);
  });

  it('updates overlay when selection changes', () => {
    const setPanelOverlay = vi.fn();
    const createOverlayRenderer = vi.fn((selection: { id: string }) => () => selection.id);

    const { rerender } = renderHook(
      ({ selectedItem }: { selectedItem: { id: string } | null }) =>
        usePanelSelectionOverlay({
          selectedItem,
          pageIndex: 1,
          setPanelOverlay,
          createOverlayRenderer,
        }),
      { initialProps: { selectedItem: { id: 'first' } } },
    );

    rerender({ selectedItem: { id: 'second' } });

    expect(createOverlayRenderer).toHaveBeenNthCalledWith(1, { id: 'first' }, 1);
    expect(createOverlayRenderer).toHaveBeenNthCalledWith(2, { id: 'second' }, 1);
  });
});
