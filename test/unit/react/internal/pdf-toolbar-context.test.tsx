import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { PageRotation } from '../../../../src/core/types.js';
import { ToolbarContext, useToolbarContext } from '../../../../src/react/internal/pdf-toolbar-context.js';
import type { ToolbarContextValue } from '../../../../src/react/internal/pdf-toolbar-types.js';

const contextValue: ToolbarContextValue = {
  navigation: {
    pageIndex: 0,
    setPageIndex: () => {},
    next: () => {},
    prev: () => {},
    canNext: true,
    canPrev: false,
    pageCount: 3,
    pageNumber: 1,
    goToPage: () => {},
    getPrevProps: () => ({ type: 'button', disabled: false, onClick: () => {}, 'aria-label': 'Previous page' }),
    getNextProps: () => ({ type: 'button', disabled: false, onClick: () => {}, 'aria-label': 'Next page' }),
    getInputProps: () => ({
      type: 'number',
      min: 1,
      max: 3,
      value: 1,
      disabled: false,
      onChange: () => {},
      'aria-label': 'Page number',
    }),
  },
  zoom: {
    scale: 1,
    setScale: () => {},
    zoomIn: () => {},
    zoomOut: () => {},
    reset: () => {},
    canZoomIn: true,
    canZoomOut: true,
    percentage: 100,
    getZoomInProps: () => ({ type: 'button', disabled: false, onClick: () => {}, 'aria-label': 'Zoom in' }),
    getZoomOutProps: () => ({ type: 'button', disabled: false, onClick: () => {}, 'aria-label': 'Zoom out' }),
    getResetProps: () => ({ type: 'button', disabled: false, onClick: () => {}, 'aria-label': 'Reset zoom' }),
  },
  fit: {
    fitWidth: () => {},
    fitHeight: () => {},
    fitPage: () => {},
    fitScale: () => 1,
    activeFitMode: null,
    getFitWidthProps: () => ({ type: 'button', disabled: false, onClick: () => {}, 'aria-label': 'Fit to width' }),
    getFitHeightProps: () => ({ type: 'button', disabled: false, onClick: () => {}, 'aria-label': 'Fit to height' }),
    getFitPageProps: () => ({ type: 'button', disabled: false, onClick: () => {}, 'aria-label': 'Fit to page' }),
  },
  scrollMode: {
    scrollMode: 'continuous',
    setScrollMode: () => {},
    options: [
      { value: 'continuous', label: 'Continuous' },
      { value: 'single', label: 'Single page' },
      { value: 'horizontal', label: 'Horizontal' },
    ],
    getSelectProps: () => ({ value: 'continuous', onChange: () => {}, 'aria-label': 'Scroll mode' }),
  },
  search: null,
  rotation: {
    rotations: new Map(),
    getRotation: () => PageRotation.None,
    rotatePage: () => {},
    rotateAllPages: () => {},
    resetPageRotation: () => {},
    resetAllRotations: () => {},
    getRotateCwProps: () => ({ type: 'button', disabled: false, onClick: () => {}, 'aria-label': 'Rotate clockwise' }),
    getRotateCcwProps: () => ({
      type: 'button',
      disabled: false,
      onClick: () => {},
      'aria-label': 'Rotate counter-clockwise',
    }),
    getResetRotationProps: () => ({
      type: 'button',
      disabled: false,
      onClick: () => {},
      'aria-label': 'Reset rotation',
    }),
  },
  spread: {
    spreadMode: 'none',
    setSpreadMode: () => {},
    options: [
      { value: 'none', label: 'No spreads' },
      { value: 'odd', label: 'Odd spreads' },
      { value: 'even', label: 'Even spreads' },
    ],
    getSelectProps: () => ({ value: 'none', onChange: () => {}, 'aria-label': 'Spread mode' }),
  },
  fullscreen: {
    isFullscreen: false,
    enterFullscreen: async () => {},
    exitFullscreen: async () => {},
    toggleFullscreen: async () => {},
    getToggleProps: () => ({
      type: 'button',
      disabled: false,
      onClick: () => {},
      'aria-label': 'Enter fullscreen',
      'aria-pressed': false,
    }),
  },
  print: {
    isPrinting: false,
    progress: 0,
    print: () => {},
    cancel: () => {},
    getPrintProps: () => ({ type: 'button', disabled: false, onClick: () => {}, 'aria-label': 'Print' }),
  },
  interaction: {
    mode: 'pointer',
    setMode: () => {},
    isDragging: false,
    marqueeRect: null,
    getPointerProps: () => ({
      type: 'button',
      disabled: false,
      onClick: () => {},
      'aria-label': 'Pointer tool',
      'aria-pressed': true,
    }),
    getPanProps: () => ({
      type: 'button',
      disabled: false,
      onClick: () => {},
      'aria-label': 'Hand tool',
      'aria-pressed': false,
    }),
    getMarqueeProps: () => ({
      type: 'button',
      disabled: false,
      onClick: () => {},
      'aria-label': 'Marquee zoom',
      'aria-pressed': false,
    }),
  },
  firstLastPage: {
    isFirst: true,
    isLast: false,
    getFirstProps: () => ({ type: 'button', disabled: true, onClick: () => {}, 'aria-label': 'First page' }),
    getLastProps: () => ({ type: 'button', disabled: false, onClick: () => {}, 'aria-label': 'Last page' }),
  },
};

function wrapper({ children }: { children: ReactNode }) {
  return <ToolbarContext.Provider value={contextValue}>{children}</ToolbarContext.Provider>;
}

describe('pdf-toolbar-context', () => {
  it('throws when consumed outside provider', () => {
    expect(() => renderHook(() => useToolbarContext())).toThrow(
      'PDFToolbar sub-components must be rendered inside a <PDFToolbar> parent.',
    );
  });

  it('returns provider value when context exists', () => {
    const { result } = renderHook(() => useToolbarContext(), { wrapper });
    expect(result.current).toBe(contextValue);
  });
});
