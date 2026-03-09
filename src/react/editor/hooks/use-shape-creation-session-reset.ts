import { type MutableRefObject, useCallback } from 'react';
import { MOUSE_DRAG_POINTER_ID, releasePointerCaptureIfHeld } from './shape-creation-drag-support.js';

interface UseShapeCreationSessionResetOptions {
  readonly activePointerIdRef: MutableRefObject<number | null>;
  readonly captureElementRef: MutableRefObject<Element | null>;
  readonly clearDrag: () => void;
}

export function useShapeCreationSessionReset({
  activePointerIdRef,
  captureElementRef,
  clearDrag,
}: UseShapeCreationSessionResetOptions) {
  return useCallback(
    (pointerId?: number) => {
      if (pointerId !== undefined && pointerId !== MOUSE_DRAG_POINTER_ID) {
        releasePointerCaptureIfHeld(captureElementRef.current, pointerId);
      }
      activePointerIdRef.current = null;
      captureElementRef.current = null;
      clearDrag();
    },
    [activePointerIdRef, captureElementRef, clearDrag],
  );
}
