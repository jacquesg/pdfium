import { type PointerEvent as ReactPointerEvent, useCallback } from 'react';
import type { HandlePosition } from '../components/selection-overlay.types.js';
import { createBoxMoveSession, createBoxResizeSession } from './selection-overlay-box-drag.js';
import type {
  SelectionOverlayBoxPointerStartHandlers,
  UseSelectionOverlayBoxStartHandlersOptions,
} from './selection-overlay-box-start-handlers.types.js';
import { startPointerDragSession } from './selection-overlay-drag-start-support.js';

type UseSelectionOverlayBoxPointerStartHandlersOptions = Pick<
  UseSelectionOverlayBoxStartHandlersOptions,
  'capturePointer' | 'getPreviewRectSnapshot' | 'startDragSession'
>;

export function useSelectionOverlayBoxPointerStartHandlers({
  capturePointer,
  getPreviewRectSnapshot,
  startDragSession,
}: UseSelectionOverlayBoxPointerStartHandlersOptions): SelectionOverlayBoxPointerStartHandlers {
  const handleBoxBodyPointerDown = useCallback(
    (event: ReactPointerEvent) => {
      startPointerDragSession({
        buildSession: () =>
          createBoxMoveSession(event.pointerId, event.currentTarget, event.clientX, event.clientY, {
            ...getPreviewRectSnapshot(),
          }),
        capturePointer,
        event,
        startDragSession,
      });
    },
    [capturePointer, getPreviewRectSnapshot, startDragSession],
  );

  const handleBoxHandlePointerDown = useCallback(
    (handle: HandlePosition, event: ReactPointerEvent) => {
      startPointerDragSession({
        buildSession: () =>
          createBoxResizeSession(
            event.pointerId,
            event.currentTarget,
            event.clientX,
            event.clientY,
            { ...getPreviewRectSnapshot() },
            handle,
          ),
        capturePointer,
        event,
        startDragSession,
      });
    },
    [capturePointer, getPreviewRectSnapshot, startDragSession],
  );

  return {
    handleBoxBodyPointerDown,
    handleBoxHandlePointerDown,
  };
}
