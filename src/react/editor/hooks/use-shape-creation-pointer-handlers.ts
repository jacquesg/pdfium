import type { UseShapeCreationPointerHandlersResult } from './shape-creation-pointer-handlers.types.js';
import type { ShapeCreationDragSessionActions } from './use-shape-creation-pointer-lifecycle.types.js';
import { useShapeCreationPointerProgressHandlers } from './use-shape-creation-pointer-progress-handlers.js';
import { useShapeCreationPointerStartHandler } from './use-shape-creation-pointer-start-handler.js';

export function useShapeCreationPointerHandlers({
  activePointerIdRef,
  captureElementRef,
  finishActiveDrag,
  resetDragLifecycle,
  startDrag,
  updateActiveDrag,
}: ShapeCreationDragSessionActions): UseShapeCreationPointerHandlersResult {
  const handlePointerDown = useShapeCreationPointerStartHandler({
    activePointerIdRef,
    startDrag,
  });
  const progressHandlers = useShapeCreationPointerProgressHandlers({
    activePointerIdRef,
    captureElementRef,
    finishActiveDrag,
    resetDragLifecycle,
    updateActiveDrag,
  });

  return {
    ...progressHandlers,
    handlePointerDown,
  };
}
