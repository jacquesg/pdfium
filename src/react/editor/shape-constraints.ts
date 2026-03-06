/**
 * Shared geometry constraints for shape creation and resizing.
 *
 * Keeps creation and transform semantics aligned:
 * - rectangle/circle: Shift constrains to 1:1
 * - line: Shift snaps to 45-degree increments
 *
 * @module react/editor/shape-constraints
 */

import type { EditorTool } from './types.js';

export interface ScreenPoint {
  x: number;
  y: number;
}

export interface ScreenRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ScreenBounds {
  width: number;
  height: number;
}

export type BoxResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function finiteOrInfinity(value: number): number {
  return Number.isFinite(value) ? value : Number.POSITIVE_INFINITY;
}

function maxDistanceFromPoint(origin: number, direction: -1 | 1, limit: number): number {
  const safeLimit = finiteOrInfinity(limit);
  if (!Number.isFinite(safeLimit)) {
    return Number.POSITIVE_INFINITY;
  }
  return direction > 0 ? Math.max(0, safeLimit - origin) : Math.max(0, origin);
}

function maxSymmetricSizeAroundCenter(center: number, limit: number): number {
  const safeLimit = finiteOrInfinity(limit);
  if (!Number.isFinite(safeLimit)) {
    return Number.POSITIVE_INFINITY;
  }
  return Math.max(0, Math.min(center, safeLimit - center) * 2);
}

function rectFromPoints(a: ScreenPoint, b: ScreenPoint): ScreenRect {
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

function resolveFiniteBound(limit: number, fallback: number): number {
  return Number.isFinite(limit) ? limit : fallback;
}

export function clampScreenPoint(point: ScreenPoint, bounds: ScreenBounds): ScreenPoint {
  return {
    x: Number.isFinite(bounds.width) ? clamp(point.x, 0, bounds.width) : point.x,
    y: Number.isFinite(bounds.height) ? clamp(point.y, 0, bounds.height) : point.y,
  };
}

function constrainSquareFromDynamicQuadrant(
  anchor: ScreenPoint,
  current: ScreenPoint,
  bounds: ScreenBounds,
): ScreenPoint {
  const dx = current.x - anchor.x;
  const dy = current.y - anchor.y;
  const xDirection = (dx === 0 ? 1 : Math.sign(dx)) as -1 | 1;
  const yDirection = (dy === 0 ? 1 : Math.sign(dy)) as -1 | 1;
  const requestedSize = Math.max(Math.abs(dx), Math.abs(dy));
  const maxSizeX = maxDistanceFromPoint(anchor.x, xDirection, bounds.width);
  const maxSizeY = maxDistanceFromPoint(anchor.y, yDirection, bounds.height);
  const size = Math.min(requestedSize, maxSizeX, maxSizeY);
  return {
    x: anchor.x + size * xDirection,
    y: anchor.y + size * yDirection,
  };
}

function snapLineEndpoint(anchor: ScreenPoint, current: ScreenPoint, bounds: ScreenBounds): ScreenPoint {
  const dx = current.x - anchor.x;
  const dy = current.y - anchor.y;
  const requestedLength = Math.hypot(dx, dy);
  if (requestedLength <= 0) {
    return clampScreenPoint(current, bounds);
  }

  const angle = Math.atan2(dy, dx);
  const snap = Math.PI / 4;
  const snappedAngle = Math.round(angle / snap) * snap;
  const direction = {
    x: Math.cos(snappedAngle),
    y: Math.sin(snappedAngle),
  };
  const maxLengthX =
    Math.abs(direction.x) < 1e-6
      ? Number.POSITIVE_INFINITY
      : maxDistanceFromPoint(anchor.x, direction.x >= 0 ? 1 : -1, bounds.width) / Math.abs(direction.x);
  const maxLengthY =
    Math.abs(direction.y) < 1e-6
      ? Number.POSITIVE_INFINITY
      : maxDistanceFromPoint(anchor.y, direction.y >= 0 ? 1 : -1, bounds.height) / Math.abs(direction.y);
  const length = Math.min(requestedLength, maxLengthX, maxLengthY);
  return {
    x: anchor.x + length * direction.x,
    y: anchor.y + length * direction.y,
  };
}

export function applyConstrainedCreationPoint(
  tool: EditorTool,
  start: ScreenPoint,
  current: ScreenPoint,
  shiftKey: boolean,
  bounds: ScreenBounds,
): ScreenPoint {
  if (!shiftKey) {
    return clampScreenPoint(current, bounds);
  }

  if (tool === 'rectangle' || tool === 'circle') {
    return constrainSquareFromDynamicQuadrant(start, current, bounds);
  }

  if (tool === 'line') {
    return snapLineEndpoint(start, current, bounds);
  }

  return clampScreenPoint(current, bounds);
}

export function getBoxHandlePoint(rect: ScreenRect, handle: BoxResizeHandle): ScreenPoint {
  const right = rect.x + rect.width;
  const bottom = rect.y + rect.height;
  const centerX = rect.x + rect.width / 2;
  const centerY = rect.y + rect.height / 2;

  const xMap: Record<BoxResizeHandle, number> = {
    nw: rect.x,
    n: centerX,
    ne: right,
    e: right,
    se: right,
    s: centerX,
    sw: rect.x,
    w: rect.x,
  };
  const yMap: Record<BoxResizeHandle, number> = {
    nw: rect.y,
    n: rect.y,
    ne: rect.y,
    e: centerY,
    se: bottom,
    s: bottom,
    sw: bottom,
    w: centerY,
  };

  return {
    x: xMap[handle],
    y: yMap[handle],
  };
}

function resizeUnconstrainedRect(
  rect: ScreenRect,
  handle: BoxResizeHandle,
  point: ScreenPoint,
  bounds: ScreenBounds,
  minSize: number,
): ScreenRect {
  let left = rect.x;
  let top = rect.y;
  let right = rect.x + rect.width;
  let bottom = rect.y + rect.height;

  const maxWidth = resolveFiniteBound(bounds.width, Number.POSITIVE_INFINITY);
  const maxHeight = resolveFiniteBound(bounds.height, Number.POSITIVE_INFINITY);

  if (handle.includes('w')) {
    left = clamp(point.x, 0, right - minSize);
  }
  if (handle.includes('e')) {
    right = clamp(point.x, left + minSize, maxWidth);
  }
  if (handle.includes('n')) {
    top = clamp(point.y, 0, bottom - minSize);
  }
  if (handle.includes('s')) {
    bottom = clamp(point.y, top + minSize, maxHeight);
  }

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  };
}

function resizeSquareFromCorner(
  rect: ScreenRect,
  handle: Extract<BoxResizeHandle, 'nw' | 'ne' | 'se' | 'sw'>,
  point: ScreenPoint,
  bounds: ScreenBounds,
  minSize: number,
): ScreenRect {
  const right = rect.x + rect.width;
  const bottom = rect.y + rect.height;
  const anchorMap: Record<typeof handle, ScreenPoint> = {
    nw: { x: right, y: bottom },
    ne: { x: rect.x, y: bottom },
    se: { x: rect.x, y: rect.y },
    sw: { x: right, y: rect.y },
  };
  const directionMap: Record<typeof handle, { x: -1 | 1; y: -1 | 1 }> = {
    nw: { x: -1, y: -1 },
    ne: { x: 1, y: -1 },
    se: { x: 1, y: 1 },
    sw: { x: -1, y: 1 },
  };

  const anchor = anchorMap[handle];
  const direction = directionMap[handle];
  const requestedWidth = direction.x > 0 ? point.x - anchor.x : anchor.x - point.x;
  const requestedHeight = direction.y > 0 ? point.y - anchor.y : anchor.y - point.y;
  const requestedSize = Math.max(requestedWidth, requestedHeight, minSize);
  const maxSizeX = maxDistanceFromPoint(anchor.x, direction.x, bounds.width);
  const maxSizeY = maxDistanceFromPoint(anchor.y, direction.y, bounds.height);
  const size = clamp(requestedSize, minSize, Math.min(maxSizeX, maxSizeY));
  const corner = {
    x: anchor.x + size * direction.x,
    y: anchor.y + size * direction.y,
  };
  return rectFromPoints(anchor, corner);
}

function resizeSquareFromHorizontalEdge(
  rect: ScreenRect,
  handle: Extract<BoxResizeHandle, 'e' | 'w'>,
  point: ScreenPoint,
  bounds: ScreenBounds,
  minSize: number,
): ScreenRect {
  const centerY = rect.y + rect.height / 2;
  const anchorX = handle === 'e' ? rect.x : rect.x + rect.width;
  const requestedSize = handle === 'e' ? point.x - anchorX : anchorX - point.x;
  const maxSizeX = maxDistanceFromPoint(anchorX, handle === 'e' ? 1 : -1, bounds.width);
  const maxSizeY = maxSymmetricSizeAroundCenter(centerY, bounds.height);
  const size = clamp(requestedSize, minSize, Math.min(maxSizeX, maxSizeY));
  return {
    x: handle === 'e' ? anchorX : anchorX - size,
    y: centerY - size / 2,
    width: size,
    height: size,
  };
}

function resizeSquareFromVerticalEdge(
  rect: ScreenRect,
  handle: Extract<BoxResizeHandle, 'n' | 's'>,
  point: ScreenPoint,
  bounds: ScreenBounds,
  minSize: number,
): ScreenRect {
  const centerX = rect.x + rect.width / 2;
  const anchorY = handle === 's' ? rect.y : rect.y + rect.height;
  const requestedSize = handle === 's' ? point.y - anchorY : anchorY - point.y;
  const maxSizeY = maxDistanceFromPoint(anchorY, handle === 's' ? 1 : -1, bounds.height);
  const maxSizeX = maxSymmetricSizeAroundCenter(centerX, bounds.width);
  const size = clamp(requestedSize, minSize, Math.min(maxSizeX, maxSizeY));
  return {
    x: centerX - size / 2,
    y: handle === 's' ? anchorY : anchorY - size,
    width: size,
    height: size,
  };
}

export function resizeScreenRectFromHandle(
  rect: ScreenRect,
  handle: BoxResizeHandle,
  point: ScreenPoint,
  bounds: ScreenBounds,
  options: {
    lockAspectRatio?: boolean;
    minSize?: number;
  } = {},
): ScreenRect {
  const minSize = options.minSize ?? 0;
  if (!options.lockAspectRatio) {
    return resizeUnconstrainedRect(rect, handle, point, bounds, minSize);
  }

  if (handle === 'e' || handle === 'w') {
    return resizeSquareFromHorizontalEdge(rect, handle, point, bounds, minSize);
  }
  if (handle === 'n' || handle === 's') {
    return resizeSquareFromVerticalEdge(rect, handle, point, bounds, minSize);
  }
  return resizeSquareFromCorner(rect, handle, point, bounds, minSize);
}
