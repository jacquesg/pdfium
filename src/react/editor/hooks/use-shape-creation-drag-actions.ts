import type { UseShapeCreationDragActionsOptions } from './use-shape-creation-drag-actions.types.js';
import { useShapeCreationDragFinish } from './use-shape-creation-drag-finish.js';
import { useShapeCreationDragStart } from './use-shape-creation-drag-start.js';
import { useShapeCreationDragUpdate } from './use-shape-creation-drag-update.js';

export function useShapeCreationDragActions({
  containerRef,
  dragRef,
  height,
  onCreate,
  originalHeight,
  publishDrag,
  scale,
  strokeWidth,
  tool,
  width,
}: UseShapeCreationDragActionsOptions) {
  const startDragAtClientPosition = useShapeCreationDragStart({
    containerRef,
    height,
    publishDrag,
    width,
  });
  const updateDragAtClientPosition = useShapeCreationDragUpdate({
    containerRef,
    dragRef,
    height,
    publishDrag,
    tool,
    width,
  });
  const { finishDragAtClientPosition, resolveUnmountFallbackClientPoint } = useShapeCreationDragFinish({
    containerRef,
    dragRef,
    height,
    onCreate,
    originalHeight,
    publishDrag,
    scale,
    strokeWidth,
    tool,
    width,
  });

  return {
    finishDragAtClientPosition,
    resolveUnmountFallbackClientPoint,
    startDragAtClientPosition,
    updateDragAtClientPosition,
  };
}
