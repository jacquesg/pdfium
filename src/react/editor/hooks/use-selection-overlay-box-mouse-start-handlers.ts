import { type MouseEvent as ReactMouseEvent, useCallback } from 'react';
import { type HandlePosition, MOUSE_DRAG_POINTER_ID } from '../components/selection-overlay.types.js';
import { createBoxMoveSession, createBoxResizeSession } from './selection-overlay-box-drag.js';
import type {
  SelectionOverlayBoxMouseStartHandlers,
  UseSelectionOverlayBoxStartHandlersOptions,
} from './selection-overlay-box-start-handlers.types.js';
import { startMouseDragSession } from './selection-overlay-drag-start-support.js';

type UseSelectionOverlayBoxMouseStartHandlersOptions = Pick<
  UseSelectionOverlayBoxStartHandlersOptions,
  'getPreviewRectSnapshot' | 'startDragSession'
>;

export function useSelectionOverlayBoxMouseStartHandlers({
  getPreviewRectSnapshot,
  startDragSession,
}: UseSelectionOverlayBoxMouseStartHandlersOptions): SelectionOverlayBoxMouseStartHandlers {
  const handleBoxBodyMouseDown = useCallback(
    (event: ReactMouseEvent) => {
      startMouseDragSession({
        buildSession: () =>
          createBoxMoveSession(MOUSE_DRAG_POINTER_ID, null, event.clientX, event.clientY, {
            ...getPreviewRectSnapshot(),
          }),
        event,
        startDragSession,
      });
    },
    [getPreviewRectSnapshot, startDragSession],
  );

  const handleBoxHandleMouseDown = useCallback(
    (handle: HandlePosition, event: ReactMouseEvent) => {
      startMouseDragSession({
        buildSession: () =>
          createBoxResizeSession(
            MOUSE_DRAG_POINTER_ID,
            null,
            event.clientX,
            event.clientY,
            { ...getPreviewRectSnapshot() },
            handle,
          ),
        event,
        startDragSession,
      });
    },
    [getPreviewRectSnapshot, startDragSession],
  );

  return {
    handleBoxBodyMouseDown,
    handleBoxHandleMouseDown,
  };
}
