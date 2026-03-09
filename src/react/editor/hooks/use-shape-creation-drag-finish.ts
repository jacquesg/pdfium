import { useCallback } from 'react';
import { completeShapeCreationDrag, resolveShapeDragFallbackClientPoint } from './shape-creation-drag-support.js';
import type { UseShapeCreationDragActionsOptions } from './use-shape-creation-drag-actions.types.js';

export function useShapeCreationDragFinish({
  containerRef,
  dragRef,
  height,
  onCreate,
  originalHeight,
  scale,
  strokeWidth,
  tool,
  width,
}: UseShapeCreationDragActionsOptions) {
  const finishDragAtClientPosition = useCallback(
    (clientX: number, clientY: number, shiftKey: boolean) => {
      const currentDrag = dragRef.current;
      if (currentDrag === null) {
        return;
      }
      const completedShape = completeShapeCreationDrag(containerRef.current, {
        clientX,
        clientY,
        currentDrag,
        height,
        originalHeight,
        scale,
        shiftKey,
        strokeWidth,
        tool,
        width,
      });
      if (completedShape === null) {
        return;
      }
      if (completedShape.detail === undefined) {
        onCreate?.(completedShape.rect);
        return;
      }
      onCreate?.(completedShape.rect, completedShape.detail);
    },
    [containerRef, dragRef, height, onCreate, originalHeight, scale, strokeWidth, tool, width],
  );

  const resolveUnmountFallbackClientPoint = useCallback(() => {
    const currentDrag = dragRef.current;
    if (currentDrag === null) {
      return null;
    }
    return resolveShapeDragFallbackClientPoint(containerRef.current, currentDrag);
  }, [containerRef, dragRef]);

  return {
    finishDragAtClientPosition,
    resolveUnmountFallbackClientPoint,
  };
}
