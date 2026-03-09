import { maxDistanceFromPoint } from './shape-constraint-support.js';
import type { ScreenBounds, ScreenPoint } from './shape-constraints.types.js';

export function constrainSquareFromDynamicQuadrant(
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
