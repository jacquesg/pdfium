import { describe, expect, it } from 'vitest';
import {
  applyConstrainedCreationPoint,
  getBoxHandlePoint,
  resizeScreenRectFromHandle,
} from '../../../../src/react/editor/shape-constraints.js';

describe('shape-constraints', () => {
  it('keeps square creation constrained when Shift hits page bounds', () => {
    const point = applyConstrainedCreationPoint('rectangle', { x: 80, y: 80 }, { x: 170, y: 150 }, true, {
      width: 140,
      height: 200,
    });

    expect(point).toEqual({ x: 140, y: 140 });
  });

  it('keeps snapped line creation constrained when Shift hits page bounds', () => {
    const point = applyConstrainedCreationPoint('line', { x: 20, y: 20 }, { x: 200, y: 35 }, true, {
      width: 90,
      height: 100,
    });

    expect(point.y).toBeCloseTo(20, 6);
    expect(point.x).toBeCloseTo(90, 6);
  });

  it('returns the correct handle anchor for a west-side resize', () => {
    expect(getBoxHandlePoint({ x: 40, y: 60, width: 120, height: 80 }, 'w')).toEqual({ x: 40, y: 100 });
  });

  it('resizes a box from the west handle without moving the opposite edge', () => {
    const rect = resizeScreenRectFromHandle(
      { x: 40, y: 60, width: 120, height: 80 },
      'w',
      { x: 10, y: 100 },
      { width: 500, height: 500 },
      { minSize: 10 },
    );

    expect(rect).toEqual({ x: 10, y: 60, width: 150, height: 80 });
  });

  it('resizes to a square from the east handle when aspect ratio is locked', () => {
    const rect = resizeScreenRectFromHandle(
      { x: 40, y: 60, width: 120, height: 80 },
      'e',
      { x: 190, y: 100 },
      { width: 500, height: 500 },
      { lockAspectRatio: true, minSize: 10 },
    );

    expect(rect).toEqual({ x: 40, y: 25, width: 150, height: 150 });
  });

  it('resizes to a square from the south-east handle when aspect ratio is locked', () => {
    const rect = resizeScreenRectFromHandle(
      { x: 40, y: 60, width: 120, height: 80 },
      'se',
      { x: 210, y: 150 },
      { width: 500, height: 500 },
      { lockAspectRatio: true, minSize: 10 },
    );

    expect(rect).toEqual({ x: 40, y: 60, width: 170, height: 170 });
  });
});
