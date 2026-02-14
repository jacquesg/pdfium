import { describe, expect, it, vi } from 'vitest';
import {
  createFitRenderProps,
  createZoomRenderProps,
} from '../../../../src/react/internal/pdf-toolbar-context-zoom-fit.js';
import { TOOLBAR_LABELS } from '../../../../src/react/internal/toolbar-config.js';

describe('pdf-toolbar-context-zoom-fit', () => {
  it('builds zoom props with rounded percentage and button handlers', () => {
    const setScale = vi.fn();
    const zoomIn = vi.fn();
    const zoomOut = vi.fn();
    const reset = vi.fn();

    const zoom = createZoomRenderProps({
      scale: 1.234,
      setScale,
      zoomIn,
      zoomOut,
      reset,
      canZoomIn: true,
      canZoomOut: false,
    });

    expect(zoom.percentage).toBe(123);
    expect(zoom.getZoomInProps()['aria-label']).toBe(TOOLBAR_LABELS.zoomIn);
    expect(zoom.getZoomOutProps().disabled).toBe(true);
    expect(zoom.getResetProps()['aria-label']).toBe(TOOLBAR_LABELS.resetZoom);

    zoom.getZoomInProps().onClick();
    zoom.getZoomOutProps().onClick();
    zoom.getResetProps().onClick();

    expect(zoomIn).toHaveBeenCalledTimes(1);
    expect(zoomOut).toHaveBeenCalledTimes(1);
    expect(reset).toHaveBeenCalledTimes(1);
    expect(zoom.setScale).toBe(setScale);
  });

  it('builds fit props that call fit actions', () => {
    const fitWidth = vi.fn();
    const fitHeight = vi.fn();
    const fitPage = vi.fn();

    const fit = createFitRenderProps({
      fitWidth,
      fitHeight,
      fitPage,
      fitScale: vi.fn(() => 0.72),
      activeFitMode: 'page-fit',
    });

    expect(fit.activeFitMode).toBe('page-fit');
    expect(fit.getFitWidthProps()['aria-label']).toBe(TOOLBAR_LABELS.fitToWidth);
    expect(fit.getFitHeightProps()['aria-label']).toBe(TOOLBAR_LABELS.fitToHeight);
    expect(fit.getFitPageProps()['aria-label']).toBe(TOOLBAR_LABELS.fitToPage);

    fit.getFitWidthProps().onClick();
    fit.getFitHeightProps().onClick();
    fit.getFitPageProps().onClick();

    expect(fitWidth).toHaveBeenCalledTimes(1);
    expect(fitHeight).toHaveBeenCalledTimes(1);
    expect(fitPage).toHaveBeenCalledTimes(1);
  });
});
