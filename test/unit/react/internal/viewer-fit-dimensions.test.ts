import { describe, expect, test } from 'vitest';
import { PageRotation } from '../../../../src/core/types.js';
import { resolveFitPageDimensions } from '../../../../src/react/internal/viewer-fit-dimensions.js';

function createRotationGetter(rotations: Record<number, PageRotation>) {
  return (pageIndex: number): PageRotation => rotations[pageIndex] ?? PageRotation.None;
}

describe('resolveFitPageDimensions', () => {
  test('uses default dimensions when page dimensions are unavailable', () => {
    const result = resolveFitPageDimensions({
      dimensions: undefined,
      pageIndex: 0,
      pageCount: 0,
      spreadMode: 'none',
      pageGap: 16,
      getRotation: createRotationGetter({}),
    });

    expect(result).toEqual({ width: 612, height: 792 });
  });

  test('swaps width and height for 90-degree rotations', () => {
    const result = resolveFitPageDimensions({
      dimensions: [{ width: 600, height: 800 }],
      pageIndex: 0,
      pageCount: 1,
      spreadMode: 'none',
      pageGap: 16,
      getRotation: createRotationGetter({ 0: PageRotation.Clockwise90 }),
    });

    expect(result).toEqual({ width: 800, height: 600 });
  });

  test('adds spread partner width and gap in even spread mode', () => {
    const result = resolveFitPageDimensions({
      dimensions: [
        { width: 600, height: 700 },
        { width: 500, height: 650 },
      ],
      pageIndex: 1,
      pageCount: 2,
      spreadMode: 'even',
      pageGap: 40,
      getRotation: createRotationGetter({}),
    });

    expect(result).toEqual({ width: 1140, height: 700 });
  });

  test('uses rotated partner dimensions when spread partner is rotated', () => {
    const result = resolveFitPageDimensions({
      dimensions: [
        { width: 600, height: 700 },
        { width: 500, height: 900 },
      ],
      pageIndex: 0,
      pageCount: 2,
      spreadMode: 'even',
      pageGap: 20,
      getRotation: createRotationGetter({ 1: PageRotation.CounterClockwise90 }),
    });

    // Partner page (index 1) contributes width=900, height=500 after rotation.
    expect(result).toEqual({ width: 1520, height: 700 });
  });

  test('does not include a partner for odd spread cover page', () => {
    const result = resolveFitPageDimensions({
      dimensions: [
        { width: 620, height: 840 },
        { width: 500, height: 700 },
      ],
      pageIndex: 0,
      pageCount: 2,
      spreadMode: 'odd',
      pageGap: 24,
      getRotation: createRotationGetter({}),
    });

    expect(result).toEqual({ width: 620, height: 840 });
  });
});
