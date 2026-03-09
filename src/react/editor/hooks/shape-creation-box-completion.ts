import { screenToPdf } from '../../coordinates.js';
import type { CompletedShapeCreation } from './shape-creation-drag.types.js';

const MIN_SHAPE_SIZE = 5;

export function completeBoxShapeCreation(options: {
  readonly currentX: number;
  readonly currentY: number;
  readonly originalHeight: number;
  readonly scale: number;
  readonly startX: number;
  readonly startY: number;
}): CompletedShapeCreation | null {
  const minX = Math.min(options.startX, options.currentX);
  const minY = Math.min(options.startY, options.currentY);
  const maxX = Math.max(options.startX, options.currentX);
  const maxY = Math.max(options.startY, options.currentY);
  const widthPx = maxX - minX;
  const heightPx = maxY - minY;

  if (widthPx < MIN_SHAPE_SIZE || heightPx < MIN_SHAPE_SIZE) {
    return null;
  }

  const topLeft = screenToPdf({ x: minX, y: minY }, { scale: options.scale, originalHeight: options.originalHeight });
  const bottomRight = screenToPdf(
    { x: maxX, y: maxY },
    { scale: options.scale, originalHeight: options.originalHeight },
  );

  return {
    rect: {
      left: topLeft.x,
      top: topLeft.y,
      right: bottomRight.x,
      bottom: bottomRight.y,
    },
  };
}
