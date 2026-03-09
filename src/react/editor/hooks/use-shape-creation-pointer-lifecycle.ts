import { useShapeCreationDocumentEvents } from './use-shape-creation-document-events.js';
import { useShapeCreationDragSession } from './use-shape-creation-drag-session.js';
import { useShapeCreationMouseHandlers } from './use-shape-creation-mouse-handlers.js';
import { useShapeCreationPointerHandlers } from './use-shape-creation-pointer-handlers.js';
import type {
  UseShapeCreationPointerLifecycleOptions,
  UseShapeCreationPointerLifecycleResult,
} from './use-shape-creation-pointer-lifecycle.types.js';

export function useShapeCreationPointerLifecycle({
  clearDrag,
  finishDragAtClientPosition,
  resolveUnmountFallbackClientPoint,
  startDragAtClientPosition,
  updateDragAtClientPosition,
}: UseShapeCreationPointerLifecycleOptions): UseShapeCreationPointerLifecycleResult {
  const { activePointerIdRef, captureElementRef, finishActiveDrag, resetDragLifecycle, startDrag, updateActiveDrag } =
    useShapeCreationDragSession({
      clearDrag,
      finishDragAtClientPosition,
      resolveUnmountFallbackClientPoint,
      startDragAtClientPosition,
      updateDragAtClientPosition,
    });

  useShapeCreationDocumentEvents({
    activePointerIdRef,
    finishActiveDrag,
    resetDragLifecycle,
    updateActiveDrag,
  });

  const pointerHandlers = useShapeCreationPointerHandlers({
    activePointerIdRef,
    captureElementRef,
    finishActiveDrag,
    resetDragLifecycle,
    startDrag,
    updateActiveDrag,
  });

  const mouseHandlers = useShapeCreationMouseHandlers({
    activePointerIdRef,
    captureElementRef,
    finishActiveDrag,
    resetDragLifecycle,
    startDrag,
    updateActiveDrag,
  });

  return {
    ...pointerHandlers,
    ...mouseHandlers,
  };
}
