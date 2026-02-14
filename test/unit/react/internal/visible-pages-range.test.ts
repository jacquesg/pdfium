import { describe, expect, it } from 'vitest';
import { PageRotation } from '../../../../src/core/types.js';
import type { PageDimension } from '../../../../src/react/hooks/use-page-dimensions.js';
import {
  resolveCurrentPageIndex,
  resolveVisiblePagesInRange,
} from '../../../../src/react/internal/visible-pages-range.js';

describe('visible-pages-range', () => {
  it('selects visible rows using binary search and optional buffer', () => {
    const spreadRows = [[0], [1], [2]];
    const rowOffsets = [0, 100, 220, 360];
    const pageOffsets = [0, 100, 220];

    const withoutBuffer = resolveVisiblePagesInRange({
      spreadRows,
      rowOffsets,
      pageOffsets,
      scrollMode: 'continuous',
      scrollPosition: 110,
      viewportSize: 80,
      bufferPages: 0,
    });

    expect(withoutBuffer.map((page) => page.pageIndex)).toEqual([1]);

    const withBuffer = resolveVisiblePagesInRange({
      spreadRows,
      rowOffsets,
      pageOffsets,
      scrollMode: 'continuous',
      scrollPosition: 110,
      viewportSize: 80,
      bufferPages: 1,
    });

    expect(withBuffer.map((page) => page.pageIndex)).toEqual([0, 1, 2]);
  });

  it('produces horizontal placements with offsetX coordinates', () => {
    const pages = resolveVisiblePagesInRange({
      spreadRows: [[0, 1], [2]],
      rowOffsets: [0, 200, 320],
      pageOffsets: [0, 100, 200],
      scrollMode: 'horizontal',
      scrollPosition: 0,
      viewportSize: 150,
      bufferPages: 0,
    });

    expect(pages).toEqual([
      { pageIndex: 0, offsetY: 0, offsetX: 0, rowIndex: 0 },
      { pageIndex: 1, offsetY: 0, offsetX: 100, rowIndex: 0 },
    ]);
  });

  it('selects the page with the most visible area', () => {
    const dimensions: PageDimension[] = [
      { width: 100, height: 100 },
      { width: 100, height: 300 },
    ];

    const currentPageIndex = resolveCurrentPageIndex({
      visiblePages: [
        { pageIndex: 0, offsetY: 0 },
        { pageIndex: 1, offsetY: 100 },
      ],
      dimensions,
      scale: 1,
      scrollMode: 'continuous',
      scrollPosition: 120,
      viewportSize: 100,
      getRotation: undefined,
    });

    expect(currentPageIndex).toBe(1);
  });

  it('accounts for rotation when computing horizontal visible area', () => {
    const dimensions: PageDimension[] = [
      { width: 200, height: 100 },
      { width: 100, height: 100 },
    ];

    const currentPageIndex = resolveCurrentPageIndex({
      visiblePages: [
        { pageIndex: 0, offsetY: 0, offsetX: 0 },
        { pageIndex: 1, offsetY: 0, offsetX: 100 },
      ],
      dimensions,
      scale: 1,
      scrollMode: 'horizontal',
      scrollPosition: 90,
      viewportSize: 40,
      getRotation: (pageIndex) => (pageIndex === 0 ? PageRotation.Clockwise90 : PageRotation.None),
    });

    expect(currentPageIndex).toBe(1);
  });
});
