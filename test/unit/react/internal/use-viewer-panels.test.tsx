import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useViewerPanels } from '../../../../src/react/internal/use-viewer-panels.js';

function FocusHarness() {
  const panelState = useViewerPanels({});

  return (
    <div>
      <button type="button" data-testid="activity-button" ref={panelState.lastFocusedButtonRef}>
        Activity
      </button>
      <button type="button" data-testid="toggle-thumbnails" onClick={() => panelState.togglePanel('thumbnails')}>
        Toggle Thumbnails
      </button>
      <button type="button" data-testid="toggle-bookmarks" onClick={() => panelState.togglePanel('bookmarks')}>
        Toggle Bookmarks
      </button>
      {panelState.activePanel !== null && (
        <div ref={panelState.panelContainerRef}>
          <button type="button" data-testid={`focus-target-${panelState.activePanel}`}>
            {panelState.activePanel}
          </button>
        </div>
      )}
    </div>
  );
}

describe('useViewerPanels', () => {
  let rafSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    rafSpy = vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
  });

  afterEach(() => {
    cleanup();
    rafSpy.mockRestore();
  });

  it('clears panel overlays and increments overlayVersion on overlay updates and panel toggles', () => {
    const { result } = renderHook(() => useViewerPanels({ initialPanel: 'thumbnails' }));

    expect(result.current.overlayVersion).toBe(0);
    expect(result.current.activePanel).toBe('thumbnails');
    expect(result.current.panelOverlayRef.current).toBeNull();

    act(() => {
      result.current.setPanelOverlay(() => null);
    });

    expect(result.current.overlayVersion).toBe(1);
    expect(result.current.panelOverlayRef.current).not.toBeNull();

    act(() => {
      result.current.togglePanel('bookmarks');
    });

    expect(result.current.activePanel).toBe('bookmarks');
    expect(result.current.overlayVersion).toBe(2);
    expect(result.current.panelOverlayRef.current).toBeNull();
  });

  it('focuses the panel heading when opening or switching panels', () => {
    render(<FocusHarness />);

    fireEvent.click(screen.getByTestId('toggle-thumbnails'));
    const thumbnailsTarget = screen.getByTestId('focus-target-thumbnails');
    expect(document.activeElement).toBe(thumbnailsTarget);

    fireEvent.click(screen.getByTestId('toggle-bookmarks'));
    const bookmarksTarget = screen.getByTestId('focus-target-bookmarks');
    expect(document.activeElement).toBe(bookmarksTarget);
  });

  it('returns focus to the last focused activity button when closing the panel', () => {
    render(<FocusHarness />);

    const activityButton = screen.getByTestId('activity-button') as HTMLButtonElement;
    activityButton.focus();
    expect(document.activeElement).toBe(activityButton);

    fireEvent.click(screen.getByTestId('toggle-thumbnails'));
    expect(document.activeElement).toBe(screen.getByTestId('focus-target-thumbnails'));

    fireEvent.click(screen.getByTestId('toggle-thumbnails'));
    expect(document.activeElement).toBe(activityButton);
  });

  it('cancels pending focus requestAnimationFrame on unmount', () => {
    rafSpy.mockRestore();

    let rafId = 0;
    const rafCallbacks = new Map<number, FrameRequestCallback>();
    const requestSpy = vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
      const id = ++rafId;
      rafCallbacks.set(id, cb);
      return id;
    });
    const cancelSpy = vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation((id: number) => {
      rafCallbacks.delete(id);
    });

    const { result, unmount } = renderHook(() => useViewerPanels({}));

    act(() => {
      result.current.togglePanel('thumbnails');
    });

    unmount();

    expect(cancelSpy).toHaveBeenCalled();

    requestSpy.mockRestore();
    cancelSpy.mockRestore();
  });

  it('ignores stale close-focus callback after panel is reopened', () => {
    rafSpy.mockRestore();

    let rafId = 0;
    const callbacksById = new Map<number, FrameRequestCallback>();
    const requestSpy = vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
      const id = ++rafId;
      callbacksById.set(id, cb);
      return id;
    });
    const cancelSpy = vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation((id: number) => {
      callbacksById.delete(id);
    });

    render(<FocusHarness />);

    const activityButton = screen.getByTestId('activity-button') as HTMLButtonElement;
    activityButton.focus();
    expect(document.activeElement).toBe(activityButton);

    fireEvent.click(screen.getByTestId('toggle-thumbnails')); // open
    fireEvent.click(screen.getByTestId('toggle-thumbnails')); // close
    fireEvent.click(screen.getByTestId('toggle-bookmarks')); // reopen with another panel

    const staleCloseCallback = requestSpy.mock.calls[1]?.[0] as FrameRequestCallback | undefined;
    const latestOpenCallback = requestSpy.mock.calls[2]?.[0] as FrameRequestCallback | undefined;
    expect(staleCloseCallback).toBeDefined();
    expect(latestOpenCallback).toBeDefined();

    act(() => {
      latestOpenCallback?.(0);
    });
    expect(document.activeElement).toBe(screen.getByTestId('focus-target-bookmarks'));

    // Simulate a stale callback firing after the reopen callback.
    act(() => {
      staleCloseCallback?.(0);
    });
    expect(document.activeElement).toBe(screen.getByTestId('focus-target-bookmarks'));

    requestSpy.mockRestore();
    cancelSpy.mockRestore();
  });

  it('ignores late overlay updates after the active panel is closed', () => {
    const { result } = renderHook(() => useViewerPanels({ initialPanel: 'thumbnails' }));

    act(() => {
      result.current.setPanelOverlay(() => null);
    });
    expect(result.current.panelOverlayRef.current).not.toBeNull();

    act(() => {
      result.current.togglePanel('thumbnails');
    });
    expect(result.current.activePanel).toBeNull();
    expect(result.current.panelOverlayRef.current).toBeNull();

    act(() => {
      result.current.setPanelOverlay(() => null);
    });

    expect(result.current.panelOverlayRef.current).toBeNull();
  });

  it('ignores stale overlay updates from a previously active panel after switching panels', () => {
    const { result } = renderHook(() => useViewerPanels({ initialPanel: 'thumbnails' }));

    act(() => {
      result.current.setPanelOverlay(() => 'thumb-overlay', 'thumbnails');
    });
    expect(result.current.panelOverlayRef.current).not.toBeNull();

    act(() => {
      result.current.togglePanel('bookmarks');
    });
    expect(result.current.activePanel).toBe('bookmarks');
    expect(result.current.panelOverlayRef.current).toBeNull();

    act(() => {
      result.current.setPanelOverlay(() => 'stale-thumb-overlay', 'thumbnails');
    });
    expect(result.current.panelOverlayRef.current).toBeNull();

    act(() => {
      result.current.setPanelOverlay(() => 'bookmark-overlay', 'bookmarks');
    });
    expect(result.current.panelOverlayRef.current).not.toBeNull();
  });
});
