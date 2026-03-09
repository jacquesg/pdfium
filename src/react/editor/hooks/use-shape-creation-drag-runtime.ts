import type { UseShapeCreationDragOptions, UseShapeCreationDragResult } from './use-shape-creation-drag.types.js';
import { useShapeCreationDragActions } from './use-shape-creation-drag-actions.js';
import { useShapeCreationDragState } from './use-shape-creation-drag-state.js';
import { useShapeCreationPointerLifecycle } from './use-shape-creation-pointer-lifecycle.js';

export function useShapeCreationDragRuntime({
  tool,
  width,
  height,
  scale,
  originalHeight,
  strokeWidth,
  onCreate,
}: UseShapeCreationDragOptions): UseShapeCreationDragResult {
  const { clearDrag, containerRef, drag, dragRef, publishDrag } = useShapeCreationDragState();
  const {
    finishDragAtClientPosition,
    resolveUnmountFallbackClientPoint,
    startDragAtClientPosition,
    updateDragAtClientPosition,
  } = useShapeCreationDragActions({
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
  const pointerLifecycle = useShapeCreationPointerLifecycle({
    clearDrag,
    finishDragAtClientPosition,
    resolveUnmountFallbackClientPoint,
    startDragAtClientPosition,
    updateDragAtClientPosition,
  });

  return {
    containerRef,
    drag,
    ...pointerLifecycle,
  };
}
