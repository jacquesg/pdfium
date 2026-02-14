import type { PageRotation } from '../../core/types.js';
import type { PageDimension } from '../hooks/use-page-dimensions.js';
import type { ScrollMode } from './visible-pages-geometry.js';
import { resolveCurrentPageIndex, resolveVisiblePagesInRange } from './visible-pages-range.js';

export interface VisiblePage {
  pageIndex: number;
  offsetY: number;
  offsetX?: number | undefined;
  rowIndex?: number | undefined;
}

interface ComputeVisiblePagesInput {
  spreadRows: number[][];
  rowOffsets: number[];
  pageOffsets: number[];
  scrollMode: ScrollMode;
  scrollTop: number;
  scrollLeft: number;
  viewportHeight: number;
  viewportWidth: number;
  bufferPages: number;
}

interface ComputeCurrentPageIndexInput {
  visiblePages: VisiblePage[];
  pageOffsets: number[];
  dimensions: PageDimension[] | undefined;
  scrollMode: ScrollMode;
  scrollTop: number;
  scrollLeft: number;
  viewportHeight: number;
  viewportWidth: number;
  scale: number;
  getRotation: ((pageIndex: number) => PageRotation) | undefined;
}

function resolveViewportSize(axis: 'x' | 'y', width: number, height: number): number {
  if (axis === 'x') {
    if (width > 0) return width;
    if (typeof window !== 'undefined') return window.innerWidth;
    return 1200;
  }
  if (height > 0) return height;
  if (typeof window !== 'undefined') return window.innerHeight;
  return 800;
}

function areVisiblePagesEqual(previous: VisiblePage[], next: VisiblePage[]): boolean {
  return (
    previous.length === next.length &&
    next.every((page, index) => {
      const prior = previous[index];
      return (
        prior?.pageIndex === page.pageIndex &&
        prior?.offsetY === page.offsetY &&
        prior?.offsetX === page.offsetX &&
        prior?.rowIndex === page.rowIndex
      );
    })
  );
}

function computeVisiblePages(input: ComputeVisiblePagesInput): VisiblePage[] {
  const {
    spreadRows,
    rowOffsets,
    pageOffsets,
    scrollMode,
    scrollTop,
    scrollLeft,
    viewportHeight,
    viewportWidth,
    bufferPages,
  } = input;
  if (rowOffsets.length <= 1) return [];

  const isHorizontal = scrollMode === 'horizontal';
  const scrollPosition = isHorizontal ? scrollLeft : scrollTop;
  const viewportSize = resolveViewportSize(isHorizontal ? 'x' : 'y', viewportWidth, viewportHeight);

  return resolveVisiblePagesInRange({
    spreadRows,
    rowOffsets,
    pageOffsets,
    scrollMode,
    scrollPosition,
    viewportSize,
    bufferPages,
  });
}

function computeCurrentPageIndex(input: ComputeCurrentPageIndexInput): number {
  const {
    visiblePages,
    pageOffsets,
    dimensions,
    scrollMode,
    scrollTop,
    scrollLeft,
    viewportHeight,
    viewportWidth,
    scale,
    getRotation,
  } = input;
  if (!dimensions || pageOffsets.length === 0) return 0;

  const isHorizontal = scrollMode === 'horizontal';
  const scrollPosition = isHorizontal ? scrollLeft : scrollTop;
  const viewportSize = resolveViewportSize(isHorizontal ? 'x' : 'y', viewportWidth, viewportHeight);

  return resolveCurrentPageIndex({
    visiblePages,
    dimensions,
    scale,
    scrollMode,
    scrollPosition,
    viewportSize,
    getRotation,
    defaultPageIndex: 0,
  });
}

export { areVisiblePagesEqual, computeCurrentPageIndex, computeVisiblePages, resolveViewportSize };
