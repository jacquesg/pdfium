import { applyConstrainedCreationPoint } from '../shape-constraints.js';
import type { ShapeCreationCompletionOptions } from './shape-creation-drag.types.js';
import { toShapeCreationBounds } from './shape-creation-drag-geometry.js';

export function resolveConstrainedCurrentPoint(
  containerElement: HTMLDivElement | null,
  options: ShapeCreationCompletionOptions,
): { x: number; y: number } {
  const rect = containerElement?.getBoundingClientRect();
  if (!rect) {
    return {
      x: options.currentDrag.currentX,
      y: options.currentDrag.currentY,
    };
  }

  return applyConstrainedCreationPoint(
    options.tool,
    { x: options.currentDrag.startX, y: options.currentDrag.startY },
    { x: options.clientX - rect.left, y: options.clientY - rect.top },
    options.shiftKey,
    toShapeCreationBounds(options),
  );
}
