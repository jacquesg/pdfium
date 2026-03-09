import { type MouseEvent as ReactMouseEvent, useCallback } from 'react';
import { isSecondaryMouseButton, MOUSE_DRAG_POINTER_ID } from './shape-creation-drag-support.js';
import type { ShapeCreationDragSessionActions } from './use-shape-creation-pointer-lifecycle.types.js';

interface UseShapeCreationMouseHandlersResult {
  readonly handleMouseDown: (event: ReactMouseEvent) => void;
  readonly handleMouseMove: (event: ReactMouseEvent) => void;
  readonly handleMouseUp: (event: ReactMouseEvent) => void;
}

export function useShapeCreationMouseHandlers({
  activePointerIdRef,
  finishActiveDrag,
  startDrag,
  updateActiveDrag,
}: ShapeCreationDragSessionActions): UseShapeCreationMouseHandlersResult {
  const handleMouseDown = useCallback(
    (event: ReactMouseEvent) => {
      if (activePointerIdRef.current !== null) return;
      if (isSecondaryMouseButton(event)) return;
      event.preventDefault();
      startDrag(MOUSE_DRAG_POINTER_ID, null, event.clientX, event.clientY);
    },
    [activePointerIdRef, startDrag],
  );

  const handleMouseMove = useCallback(
    (event: ReactMouseEvent) => {
      if (activePointerIdRef.current !== MOUSE_DRAG_POINTER_ID) return;
      event.preventDefault();
      updateActiveDrag(MOUSE_DRAG_POINTER_ID, event.clientX, event.clientY, event.shiftKey);
    },
    [activePointerIdRef, updateActiveDrag],
  );

  const handleMouseUp = useCallback(
    (event: ReactMouseEvent) => {
      if (activePointerIdRef.current !== MOUSE_DRAG_POINTER_ID) return;
      event.preventDefault();
      finishActiveDrag(MOUSE_DRAG_POINTER_ID, event.clientX, event.clientY, event.shiftKey);
    },
    [activePointerIdRef, finishActiveDrag],
  );

  return {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
  };
}
