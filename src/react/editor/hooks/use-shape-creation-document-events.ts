import { type MutableRefObject, useEffect } from 'react';
import { isPenOrTouchPointerType } from './shape-creation-drag-support.js';

interface UseShapeCreationDocumentEventsOptions {
  readonly activePointerIdRef: MutableRefObject<number | null>;
  readonly finishActiveDrag: (pointerId: number, clientX: number, clientY: number, shiftKey: boolean) => void;
  readonly resetDragLifecycle: (pointerId?: number) => void;
  readonly updateActiveDrag: (pointerId: number, clientX: number, clientY: number, shiftKey: boolean) => void;
}

export function useShapeCreationDocumentEvents({
  activePointerIdRef,
  finishActiveDrag,
  resetDragLifecycle,
  updateActiveDrag,
}: UseShapeCreationDocumentEventsOptions): void {
  useEffect(() => {
    const handleDocumentPointerUp = (event: PointerEvent) => {
      finishActiveDrag(event.pointerId, event.clientX, event.clientY, event.shiftKey);
    };
    const handleDocumentPointerCancel = (event: PointerEvent) => {
      if (!isPenOrTouchPointerType(event.pointerType)) return;
      if (activePointerIdRef.current === null || event.pointerId !== activePointerIdRef.current) return;
      resetDragLifecycle(event.pointerId);
    };
    const handleDocumentMouseMove = (event: MouseEvent) => {
      const activePointerId = activePointerIdRef.current;
      if (activePointerId === null) return;
      updateActiveDrag(activePointerId, event.clientX, event.clientY, event.shiftKey);
    };
    const handleDocumentMouseUp = (event: MouseEvent) => {
      const activePointerId = activePointerIdRef.current;
      if (activePointerId === null) return;
      finishActiveDrag(activePointerId, event.clientX, event.clientY, event.shiftKey);
    };

    globalThis.document.addEventListener('pointerup', handleDocumentPointerUp);
    globalThis.document.addEventListener('pointercancel', handleDocumentPointerCancel);
    globalThis.document.addEventListener('mousemove', handleDocumentMouseMove);
    globalThis.document.addEventListener('mouseup', handleDocumentMouseUp);
    return () => {
      globalThis.document.removeEventListener('pointerup', handleDocumentPointerUp);
      globalThis.document.removeEventListener('pointercancel', handleDocumentPointerCancel);
      globalThis.document.removeEventListener('mousemove', handleDocumentMouseMove);
      globalThis.document.removeEventListener('mouseup', handleDocumentMouseUp);
    };
  }, [activePointerIdRef, finishActiveDrag, resetDragLifecycle, updateActiveDrag]);
}
