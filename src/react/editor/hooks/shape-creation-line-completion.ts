import { screenToPdf } from '../../coordinates.js';
import type { CompletedShapeCreation } from './shape-creation-drag.types.js';

const MIN_SHAPE_SIZE = 5;
const MIN_LINE_AXIS_SIZE = 1;

export function completeLineShapeCreation(options: {
  readonly currentX: number;
  readonly currentY: number;
  readonly originalHeight: number;
  readonly scale: number;
  readonly startX: number;
  readonly startY: number;
  readonly strokeWidth: number;
}): CompletedShapeCreation | null {
  const minX = Math.min(options.startX, options.currentX);
  const minY = Math.min(options.startY, options.currentY);
  const maxX = Math.max(options.startX, options.currentX);
  const maxY = Math.max(options.startY, options.currentY);
  const widthPx = maxX - minX;
  const heightPx = maxY - minY;
  const length = Math.hypot(options.currentX - options.startX, options.currentY - options.startY);

  if (length <= MIN_SHAPE_SIZE) {
    return null;
  }

  let lineMinX = minX;
  let lineMaxX = maxX;
  let lineMinY = minY;
  let lineMaxY = maxY;

  const minLineAxisSize = Math.max(MIN_LINE_AXIS_SIZE, options.strokeWidth * 2);
  if (widthPx < minLineAxisSize) {
    const midX = (options.startX + options.currentX) / 2;
    lineMinX = midX - minLineAxisSize / 2;
    lineMaxX = midX + minLineAxisSize / 2;
  }
  if (heightPx < minLineAxisSize) {
    const midY = (options.startY + options.currentY) / 2;
    lineMinY = midY - minLineAxisSize / 2;
    lineMaxY = midY + minLineAxisSize / 2;
  }

  const topLeft = screenToPdf(
    { x: lineMinX, y: lineMinY },
    { scale: options.scale, originalHeight: options.originalHeight },
  );
  const bottomRight = screenToPdf(
    { x: lineMaxX, y: lineMaxY },
    { scale: options.scale, originalHeight: options.originalHeight },
  );
  const start = screenToPdf(
    { x: options.startX, y: options.startY },
    { scale: options.scale, originalHeight: options.originalHeight },
  );
  const end = screenToPdf(
    { x: options.currentX, y: options.currentY },
    { scale: options.scale, originalHeight: options.originalHeight },
  );

  return {
    rect: {
      left: topLeft.x,
      top: topLeft.y,
      right: bottomRight.x,
      bottom: bottomRight.y,
    },
    detail: { start, end },
  };
}
