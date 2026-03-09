import { completeBoxShapeCreation } from './shape-creation-box-completion.js';
import { resolveConstrainedCurrentPoint } from './shape-creation-constrained-current-point.js';
import type { CompletedShapeCreation, ShapeCreationCompletionOptions } from './shape-creation-drag.types.js';
import { completeLineShapeCreation } from './shape-creation-line-completion.js';

export function completeShapeCreationDrag(
  containerElement: HTMLDivElement | null,
  options: ShapeCreationCompletionOptions,
): CompletedShapeCreation | null {
  const constrainedCurrent = resolveConstrainedCurrentPoint(containerElement, options);
  const finalDrag = {
    ...options.currentDrag,
    currentX: constrainedCurrent.x,
    currentY: constrainedCurrent.y,
  };

  if (options.tool === 'line') {
    return completeLineShapeCreation({
      currentX: finalDrag.currentX,
      currentY: finalDrag.currentY,
      originalHeight: options.originalHeight,
      scale: options.scale,
      startX: finalDrag.startX,
      startY: finalDrag.startY,
      strokeWidth: options.strokeWidth,
    });
  }

  return completeBoxShapeCreation({
    currentX: finalDrag.currentX,
    currentY: finalDrag.currentY,
    originalHeight: options.originalHeight,
    scale: options.scale,
    startX: finalDrag.startX,
    startY: finalDrag.startY,
  });
}
