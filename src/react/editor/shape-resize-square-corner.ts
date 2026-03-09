import { clamp, maxDistanceFromPoint, rectFromPoints } from './shape-constraint-support.js';
import type { ScreenBounds, ScreenPoint, ScreenRect } from './shape-constraints.types.js';

export function resizeSquareFromCorner(
  rect: ScreenRect,
  handle: 'nw' | 'ne' | 'se' | 'sw',
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
