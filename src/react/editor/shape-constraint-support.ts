import type { ScreenBounds, ScreenPoint, ScreenRect } from './shape-constraints.types.js';

export function clampScreenPoint(point: ScreenPoint, bounds: ScreenBounds): ScreenPoint {
  return {
    x: Number.isFinite(bounds.width) ? clamp(point.x, 0, bounds.width) : point.x,
    y: Number.isFinite(bounds.height) ? clamp(point.y, 0, bounds.height) : point.y,
  };
}

export function maxDistanceFromPoint(origin: number, direction: -1 | 1, limit: number): number {
  const safeLimit = finiteOrInfinity(limit);
  if (!Number.isFinite(safeLimit)) {
    return Number.POSITIVE_INFINITY;
  }
  return direction > 0 ? Math.max(0, safeLimit - origin) : Math.max(0, origin);
}

export function maxSymmetricSizeAroundCenter(center: number, limit: number): number {
  const safeLimit = finiteOrInfinity(limit);
  if (!Number.isFinite(safeLimit)) {
    return Number.POSITIVE_INFINITY;
  }
  return Math.max(0, Math.min(center, safeLimit - center) * 2);
}

export function rectFromPoints(a: ScreenPoint, b: ScreenPoint): ScreenRect {
  const left = Math.min(a.x, b.x);
  const top = Math.min(a.y, b.y);
  const right = Math.max(a.x, b.x);
  const bottom = Math.max(a.y, b.y);
  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  };
}

export function resolveFiniteBound(limit: number, fallback: number): number {
  return Number.isFinite(limit) ? limit : fallback;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function finiteOrInfinity(value: number): number {
  return Number.isFinite(value) ? value : Number.POSITIVE_INFINITY;
}
