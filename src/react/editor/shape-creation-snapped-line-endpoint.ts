import { clampScreenPoint, maxDistanceFromPoint } from './shape-constraint-support.js';
import type { ScreenBounds, ScreenPoint } from './shape-constraints.types.js';

export function snapLineEndpoint(anchor: ScreenPoint, current: ScreenPoint, bounds: ScreenBounds): ScreenPoint {
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
