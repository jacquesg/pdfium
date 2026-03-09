import type { Point, Rect } from '../../../core/types.js';
import { screenToPdf } from '../../coordinates.js';
import type { ScreenPoint, ScreenRect } from '../shape-constraints.js';
import type { ScreenLine } from './selection-overlay.types.js';
import { getLineBounds } from './selection-overlay-line-geometry.js';

export function screenRectToPdfRect(screenRect: ScreenRect, scale: number, originalHeight: number): Rect {
  const topLeft = screenToPdf({ x: screenRect.x, y: screenRect.y }, { scale, originalHeight });
  const bottomRight = screenToPdf(
    { x: screenRect.x + screenRect.width, y: screenRect.y + screenRect.height },
    { scale, originalHeight },
  );
  return {
    left: topLeft.x,
    top: topLeft.y,
    right: bottomRight.x,
    bottom: bottomRight.y,
  };
}

export function screenPointToPdfPoint(point: ScreenPoint, scale: number, originalHeight: number): Point {
  return screenToPdf(point, { scale, originalHeight });
}

export function screenLineToPdfRect(line: ScreenLine, scale: number, originalHeight: number): Rect {
  return screenRectToPdfRect(getLineBounds(line), scale, originalHeight);
}
