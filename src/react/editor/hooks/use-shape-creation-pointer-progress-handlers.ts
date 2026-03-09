import { type PointerEvent as ReactPointerEvent, useCallback } from 'react';
import { isPenOrTouchPointerType } from './shape-creation-drag-support.js';
import type { ShapeCreationDragSessionActions } from './use-shape-creation-pointer-lifecycle.types.js';

export function useShapeCreationPointerProgressHandlers({
  activePointerIdRef,
  captureElementRef,
  finishActiveDrag,
  resetDragLifecycle,
  updateActiveDrag,
}: Pick<
  ShapeCreationDragSessionActions,
  'activePointerIdRef' | 'captureElementRef' | 'finishActiveDrag' | 'resetDragLifecycle' | 'updateActiveDrag'
>) {
  const handlePointerMove = useCallback(
    (event: ReactPointerEvent) => {
      if (activePointerIdRef.current === null || event.pointerId !== activePointerIdRef.current) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      updateActiveDrag(event.pointerId, event.clientX, event.clientY, event.shiftKey);
    },
    [activePointerIdRef, updateActiveDrag],
  );

  const handlePointerUp = useCallback(
    (event: ReactPointerEvent) => {
      event.preventDefault();
      event.stopPropagation();
      finishActiveDrag(event.pointerId, event.clientX, event.clientY, event.shiftKey);
    },
    [finishActiveDrag],
  );

  const handlePointerCancel = useCallback(
    (event: ReactPointerEvent) => {
      if (!isPenOrTouchPointerType(event.pointerType)) return;
      if (activePointerIdRef.current === null || event.pointerId !== activePointerIdRef.current) return;
      event.preventDefault();
      event.stopPropagation();
      resetDragLifecycle(event.pointerId);
    },
    [activePointerIdRef, resetDragLifecycle],
  );

  const handleLostPointerCapture = useCallback(() => {
    // Pointer-up can race with lostcapture in Firefox; keep drag active until
    // an explicit pointerup/pointercancel finalises or resets the session.
    captureElementRef.current = null;
  }, [captureElementRef]);

  return {
    handleLostPointerCapture,
    handlePointerCancel,
    handlePointerMove,
    handlePointerUp,
  };
}
