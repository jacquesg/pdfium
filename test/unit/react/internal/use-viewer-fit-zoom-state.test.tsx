import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PageRotation } from '../../../../src/core/types.js';
import { useViewerFitZoomState } from '../../../../src/react/internal/use-viewer-fit-zoom-state.js';

const { fitScale, resolveFitPageDimensions, reset, setScale, zoomIn, zoomOut } = vi.hoisted(() => ({
  setScale: vi.fn(),
  zoomIn: vi.fn(),
  zoomOut: vi.fn(),
  reset: vi.fn(),
  fitScale: vi.fn((mode: 'page-width' | 'page-height' | 'page-fit') => {
    if (mode === 'page-width') return 1.5;
    if (mode === 'page-height') return 0.8;
    return 1.1;
  }),
  resolveFitPageDimensions: vi.fn(() => ({ width: 640, height: 480 })),
}));

vi.mock('../../../../src/react/hooks/use-zoom.js', () => ({
  useZoom: vi.fn(() => ({
    scale: 1,
    setScale,
    zoomIn,
    zoomOut,
    reset,
    canZoomIn: true,
    canZoomOut: false,
  })),
}));

vi.mock('../../../../src/react/hooks/use-fit-zoom.js', () => ({
  useFitZoom: vi.fn(() => ({
    fitScale,
  })),
}));

vi.mock('../../../../src/react/internal/viewer-fit-dimensions.js', () => ({
  resolveFitPageDimensions,
}));

describe('useViewerFitZoomState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderState() {
    return renderHook(() =>
      useViewerFitZoomState({
        containerRef: { current: document.createElement('div') },
        dimensions: [{ width: 600, height: 800 }],
        pageIndex: 0,
        pageCount: 1,
        spreadMode: 'none',
        pageGap: 16,
        getRotation: () => PageRotation.None,
        initialScale: 1.25,
      }),
    );
  }

  it('clears active fit mode for manual zoom operations', () => {
    const { result } = renderState();

    act(() => {
      result.current.fitWidth();
    });
    expect(result.current.activeFitMode).toBe('page-width');

    act(() => {
      result.current.setScaleManual(2);
      result.current.zoomInManual();
      result.current.zoomOutManual();
      result.current.resetManual();
    });

    expect(result.current.activeFitMode).toBeNull();
    expect(setScale).toHaveBeenCalledWith(2);
    expect(zoomIn).toHaveBeenCalledTimes(1);
    expect(zoomOut).toHaveBeenCalledTimes(1);
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it('computes fit scales and applies the selected fit mode', () => {
    const { result } = renderState();

    expect(result.current.scale).toBe(1);
    expect(result.current.canZoomIn).toBe(true);
    expect(result.current.canZoomOut).toBe(false);
    expect(result.current.fitScale('page-fit')).toBe(1.1);

    act(() => {
      result.current.fitWidth();
      result.current.fitHeight();
      result.current.fitPage();
    });

    expect(fitScale).toHaveBeenCalledWith('page-width');
    expect(fitScale).toHaveBeenCalledWith('page-height');
    expect(fitScale).toHaveBeenCalledWith('page-fit');
    expect(setScale).toHaveBeenCalledWith(1.5);
    expect(setScale).toHaveBeenCalledWith(0.8);
    expect(setScale).toHaveBeenCalledWith(1.1);
    expect(result.current.activeFitMode).toBe('page-fit');
  });

  it('clears the active fit mode without changing the current scale', () => {
    const { result } = renderState();

    act(() => {
      result.current.fitHeight();
    });
    expect(result.current.activeFitMode).toBe('page-height');

    act(() => {
      result.current.clearFitMode();
    });

    expect(result.current.activeFitMode).toBeNull();
  });
});
