import { clamp, resolveFiniteBound } from './shape-constraint-support.js';
import type { BoxResizeHandle, ScreenBounds, ScreenPoint, ScreenRect } from './shape-constraints.types.js';

export function resizeUnconstrainedRect(
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
