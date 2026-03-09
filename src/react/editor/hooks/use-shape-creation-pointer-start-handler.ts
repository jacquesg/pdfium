import { type PointerEvent as ReactPointerEvent, useCallback } from 'react';
import { isSecondaryMouseButton, setPointerCaptureIfSupported } from './shape-creation-drag-support.js';
import type { ShapeCreationDragSessionActions } from './use-shape-creation-pointer-lifecycle.types.js';

export function useShapeCreationPointerStartHandler({
  activePointerIdRef,
  startDrag,
}: Pick<ShapeCreationDragSessionActions, 'activePointerIdRef' | 'startDrag'>) {
  return useCallback(
    (event: ReactPointerEvent) => {
      if (activePointerIdRef.current !== null) return;
      if (isSecondaryMouseButton(event)) return;
      event.preventDefault();
      setPointerCaptureIfSupported(event.currentTarget, event.pointerId);
      startDrag(event.pointerId, event.currentTarget, event.clientX, event.clientY);
    },
    [activePointerIdRef, startDrag],
  );
}
