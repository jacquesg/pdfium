import { describe, expect, it } from 'vitest';
import { PageRotation } from '../../../../src/core/types.js';
import type { PageDimension } from '../../../../src/react/hooks/use-page-dimensions.js';
import {
  buildSpreadRows,
  getEffectivePageDimension,
  resolveVisiblePagesGeometry,
} from '../../../../src/react/internal/visible-pages-geometry.js';

describe('visible-pages-geometry', () => {
  it('builds spread rows for none, odd, and even modes', () => {
    expect(buildSpreadRows(4, 'none')).toEqual([[0], [1], [2], [3]]);
    expect(buildSpreadRows(5, 'odd')).toEqual([[0], [1, 2], [3, 4]]);
    expect(buildSpreadRows(5, 'even')).toEqual([[0, 1], [2, 3], [4]]);
  });

  it('derives effective page dimensions including rotation and defaults', () => {
    expect(getEffectivePageDimension(undefined, 0, undefined)).toEqual({ width: 612, height: 792 });

    const rotated = getEffectivePageDimension({ width: 300, height: 500 }, 1, (pageIndex) =>
      pageIndex === 1 ? PageRotation.Clockwise90 : PageRotation.None,
    );

    expect(rotated).toEqual({ width: 500, height: 300 });
  });

  it('computes vertical geometry with spread rows, offsets, and max content width', () => {
    const dimensions: PageDimension[] = [
      { width: 100, height: 200 },
      { width: 120, height: 150 },
      { width: 80, height: 300 },
    ];

    const geometry = resolveVisiblePagesGeometry({
      dimensions,
      scale: 1,
      gap: 10,
      spreadMode: 'odd',
      getRotation: undefined,
      scrollMode: 'continuous',
    });

    expect(geometry.spreadRows).toEqual([[0], [1, 2]]);
    expect(geometry.rowOffsets).toEqual([0, 210, 510]);
    expect(geometry.pageOffsets).toEqual([0, 210, 210]);
    expect(geometry.totalHeight).toBe(510);
    expect(geometry.totalWidth).toBeUndefined();
    expect(geometry.maxContentWidth).toBe(210);
  });

  it('computes horizontal geometry with per-page X offsets', () => {
    const dimensions: PageDimension[] = [
      { width: 100, height: 200 },
      { width: 120, height: 150 },
      { width: 80, height: 300 },
    ];

    const geometry = resolveVisiblePagesGeometry({
      dimensions,
      scale: 1,
      gap: 10,
      spreadMode: 'even',
      getRotation: undefined,
      scrollMode: 'horizontal',
    });

    expect(geometry.spreadRows).toEqual([[0, 1], [2]]);
    expect(geometry.rowOffsets).toEqual([0, 240, 320]);
    expect(geometry.pageOffsets).toEqual([0, 110, 240]);
    expect(geometry.totalHeight).toBe(0);
    expect(geometry.totalWidth).toBe(320);
    expect(geometry.maxContentWidth).toBe(0);
  });
});
