'use client';

import type { SpreadMode } from '../hooks/use-visible-pages.js';

type ToolbarScrollMode = 'continuous' | 'single' | 'horizontal';

function parseToolbarScrollMode(value: string): ToolbarScrollMode | null {
  if (value === 'continuous' || value === 'single' || value === 'horizontal') return value;
  return null;
}

function parseToolbarSpreadMode(value: string): SpreadMode | null {
  if (value === 'none' || value === 'odd' || value === 'even') return value;
  return null;
}

function clampPageNumber(pageNumber: number, pageCount: number): number | null {
  if (pageCount <= 0) return null;
  if (!Number.isFinite(pageNumber)) return null;
  return Math.max(1, Math.min(pageCount, pageNumber));
}

function clampZoomPercentage(percentage: number): number {
  return Math.max(10, Math.min(500, percentage));
}

export { clampPageNumber, clampZoomPercentage, parseToolbarScrollMode, parseToolbarSpreadMode };
export type { ToolbarScrollMode };
