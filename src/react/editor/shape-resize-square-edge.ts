import { clamp, maxDistanceFromPoint, maxSymmetricSizeAroundCenter } from './shape-constraint-support.js';
import type { ScreenBounds, ScreenPoint, ScreenRect } from './shape-constraints.types.js';

export function resizeSquareFromHorizontalEdge(
  rect: ScreenRect,
  handle: 'e' | 'w',
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

export function resizeSquareFromVerticalEdge(
  rect: ScreenRect,
  handle: 'n' | 's',
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
