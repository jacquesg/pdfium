import type { PageRotation } from '../../core/types.js';
import type { PageDimension } from '../hooks/use-page-dimensions.js';
import type { ScrollMode } from './visible-pages-geometry.js';
import { getEffectivePageDimension } from './visible-pages-geometry.js';

interface VisiblePagePlacement {
  pageIndex: number;
  offsetY: number;
  offsetX?: number | undefined;
  rowIndex?: number | undefined;
}

interface ResolveVisiblePagesInRangeArgs {
  spreadRows: number[][];
  rowOffsets: number[];
  pageOffsets: number[];
  scrollMode: ScrollMode;
  scrollPosition: number;
  viewportSize: number;
  bufferPages: number;
}

interface ResolveCurrentPageIndexArgs {
  visiblePages: VisiblePagePlacement[];
  dimensions: PageDimension[] | undefined;
  scale: number;
  scrollMode: ScrollMode;
  scrollPosition: number;
  viewportSize: number;
  getRotation: ((pageIndex: number) => PageRotation) | undefined;
  defaultPageIndex?: number | undefined;
}

function resolveVisiblePagesInRange({
  spreadRows,
  rowOffsets,
  pageOffsets,
  scrollMode,
  scrollPosition,
  viewportSize,
  bufferPages,
}: ResolveVisiblePagesInRangeArgs): VisiblePagePlacement[] {
  const rowCount = spreadRows.length;
  if (rowCount === 0 || rowOffsets.length <= 1) return [];

  let low = 0;
  let high = rowCount - 1;

  while (low < high) {
    const middle = (low + high) >>> 1;
    const rowEnd = rowOffsets[middle + 1] ?? 0;
    if (rowEnd <= scrollPosition) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }

  const firstRow = low;
  const viewportEnd = scrollPosition + viewportSize;
  let lastRow = firstRow;

  while (lastRow < rowCount - 1 && (rowOffsets[lastRow + 1] ?? 0) <= viewportEnd) {
    lastRow += 1;
  }

  const startRow = Math.max(0, firstRow - bufferPages);
  const endRow = Math.min(rowCount - 1, lastRow + bufferPages);
  const horizontal = scrollMode === 'horizontal';

  const visiblePages: VisiblePagePlacement[] = [];

  for (let rowIndex = startRow; rowIndex <= endRow; rowIndex++) {
    const row = spreadRows[rowIndex] ?? [];
    for (const pageIndex of row) {
      visiblePages.push({
        pageIndex,
        offsetY: horizontal ? 0 : (pageOffsets[pageIndex] ?? 0),
        offsetX: horizontal ? (pageOffsets[pageIndex] ?? 0) : undefined,
        rowIndex,
      });
    }
  }

  return visiblePages;
}

function resolveCurrentPageIndex({
  visiblePages,
  dimensions,
  scale,
  scrollMode,
  scrollPosition,
  viewportSize,
  getRotation,
  defaultPageIndex = 0,
}: ResolveCurrentPageIndexArgs): number {
  if (!dimensions || visiblePages.length === 0) return defaultPageIndex;

  const horizontal = scrollMode === 'horizontal';
  const viewportEnd = scrollPosition + viewportSize;
  let bestPageIndex = defaultPageIndex;
  let bestVisibleArea = 0;

  for (const page of visiblePages) {
    const pageIndex = page.pageIndex;
    const pageOffset = horizontal ? (page.offsetX ?? 0) : page.offsetY;
    const effective = getEffectivePageDimension(dimensions[pageIndex], pageIndex, getRotation);
    const pageSize = horizontal ? effective.width * scale : effective.height * scale;
    const pageEnd = pageOffset + pageSize;
    const visibleStart = Math.max(pageOffset, scrollPosition);
    const visibleEnd = Math.min(pageEnd, viewportEnd);
    const visibleArea = Math.max(0, visibleEnd - visibleStart);

    if (visibleArea > bestVisibleArea) {
      bestVisibleArea = visibleArea;
      bestPageIndex = pageIndex;
    }
  }

  return bestPageIndex;
}

export { resolveCurrentPageIndex, resolveVisiblePagesInRange };
export type { ResolveCurrentPageIndexArgs, ResolveVisiblePagesInRangeArgs, VisiblePagePlacement };
