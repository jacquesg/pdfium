'use client';

import type { SpreadMode } from '../hooks/use-visible-pages.js';

const TOOLBAR_SCROLL_MODE_OPTIONS: ReadonlyArray<{ value: 'continuous' | 'single' | 'horizontal'; label: string }> = [
  { value: 'continuous', label: 'Continuous' },
  { value: 'single', label: 'Single page' },
  { value: 'horizontal', label: 'Horizontal' },
];

const TOOLBAR_SPREAD_MODE_OPTIONS: ReadonlyArray<{ value: SpreadMode; label: string }> = [
  { value: 'none', label: 'No spreads' },
  { value: 'odd', label: 'Odd spreads' },
  { value: 'even', label: 'Even spreads' },
];

const TOOLBAR_LABELS = {
  previousPage: 'Previous page',
  nextPage: 'Next page',
  pageNumber: 'Page number',
  zoomIn: 'Zoom in',
  zoomOut: 'Zoom out',
  resetZoom: 'Reset zoom',
  fitToWidth: 'Fit to width',
  fitToHeight: 'Fit to height',
  fitToPage: 'Fit to page',
  scrollMode: 'Scroll mode',
  rotateClockwise: 'Rotate clockwise',
  rotateCounterClockwise: 'Rotate counter-clockwise',
  resetRotation: 'Reset rotation',
  spreadMode: 'Spread mode',
  enterFullscreen: 'Enter fullscreen',
  exitFullscreen: 'Exit fullscreen',
  print: 'Print',
  cancelPrint: 'Cancel print',
  pointerTool: 'Pointer tool',
  handTool: 'Hand tool',
  marqueeZoom: 'Marquee zoom',
  firstPage: 'First page',
  lastPage: 'Last page',
  searchInput: 'Search in document',
  searchOpen: 'Open search',
  searchClose: 'Close search',
  searchNextMatch: 'Next match',
  searchPrevMatch: 'Previous match',
} as const;

const TOOLBAR_SEARCH_PLACEHOLDER = 'Search...';

export { TOOLBAR_LABELS, TOOLBAR_SCROLL_MODE_OPTIONS, TOOLBAR_SEARCH_PLACEHOLDER, TOOLBAR_SPREAD_MODE_OPTIONS };
