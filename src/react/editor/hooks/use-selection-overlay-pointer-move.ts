import { type PointerEvent as ReactPointerEvent, useCallback } from 'react';
import type { UseSelectionOverlayPointerHandlersOptions } from './use-selection-overlay-pointer-handlers.types.js';

type PointerMoveOptions = Pick<
  UseSelectionOverlayPointerHandlersOptions,
  'applyDragAtClientPosition' | 'dragSessionRef' | 'dragging' | 'resolveShiftKey'
>;

export function useSelectionOverlayPointerMove({
  applyDragAtClientPosition,
  dragSessionRef,
  dragging,
  resolveShiftKey,
}: PointerMoveOptions) {
  return useCallback(
    (event: ReactPointerEvent) => {
      const session = dragSessionRef.current;
      if (!session || !dragging || event.pointerId !== session.pointerId) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      applyDragAtClientPosition(session, event.clientX, event.clientY, { shiftKey: resolveShiftKey(event.shiftKey) });
    },
    [applyDragAtClientPosition, dragSessionRef, dragging, resolveShiftKey],
  );
}
