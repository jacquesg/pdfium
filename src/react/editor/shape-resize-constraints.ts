import type { BoxResizeHandle, ScreenBounds, ScreenPoint, ScreenRect } from './shape-constraints.types.js';
import { getBoxHandlePoint } from './shape-resize-handle-point.js';
import {
  resizeSquareFromCorner,
  resizeSquareFromHorizontalEdge,
  resizeSquareFromVerticalEdge,
} from './shape-resize-square.js';
import { resizeUnconstrainedRect } from './shape-resize-unconstrained.js';

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
export { getBoxHandlePoint };
