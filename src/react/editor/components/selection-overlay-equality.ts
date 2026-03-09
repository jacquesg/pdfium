import type { Point, Rect } from '../../../core/types.js';
import type { ScreenRect } from '../shape-constraints.js';
import { RECT_EPSILON, type ScreenLine } from './selection-overlay.types.js';

export function isSameRect(a: Rect, b: Rect): boolean {
  return (
    Math.abs(a.left - b.left) < RECT_EPSILON &&
    Math.abs(a.top - b.top) < RECT_EPSILON &&
    Math.abs(a.right - b.right) < RECT_EPSILON &&
    Math.abs(a.bottom - b.bottom) < RECT_EPSILON
  );
}

export function isSameScreenRect(a: ScreenRect, b: ScreenRect): boolean {
  return (
    Math.abs(a.x - b.x) < RECT_EPSILON &&
    Math.abs(a.y - b.y) < RECT_EPSILON &&
    Math.abs(a.width - b.width) < RECT_EPSILON &&
    Math.abs(a.height - b.height) < RECT_EPSILON
  );
}

export function isSamePoint(a: Point, b: Point): boolean {
  return Math.abs(a.x - b.x) < RECT_EPSILON && Math.abs(a.y - b.y) < RECT_EPSILON;
}

export function isSameScreenLine(a: ScreenLine | null, b: ScreenLine | null): boolean {
  if (a === null || b === null) {
    return a === b;
  }
  return (
    Math.abs(a.start.x - b.start.x) < RECT_EPSILON &&
    Math.abs(a.start.y - b.start.y) < RECT_EPSILON &&
    Math.abs(a.end.x - b.end.x) < RECT_EPSILON &&
    Math.abs(a.end.y - b.end.y) < RECT_EPSILON
  );
}
