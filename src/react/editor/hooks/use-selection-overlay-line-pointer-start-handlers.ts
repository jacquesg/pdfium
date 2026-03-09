import { type PointerEvent as ReactPointerEvent, useCallback } from 'react';
import type { LineHandlePosition } from '../components/selection-overlay.types.js';
import { startPointerDragSession } from './selection-overlay-drag-start-support.js';
import { buildPointerLineMoveSession, buildPointerLineResizeSession } from './selection-overlay-line-start-support.js';
import type {
  UseSelectionOverlayLineStartHandlersOptions,
  UseSelectionOverlayLineStartPointerHandlersResult,
} from './use-selection-overlay-line-start-handlers.types.js';

type UseSelectionOverlayLinePointerStartHandlersOptions = Pick<
  UseSelectionOverlayLineStartHandlersOptions,
  'capturePointer' | 'getPreviewLineSnapshot' | 'startDragSession'
>;

export function useSelectionOverlayLinePointerStartHandlers({
  capturePointer,
  getPreviewLineSnapshot,
  startDragSession,
}: UseSelectionOverlayLinePointerStartHandlersOptions): UseSelectionOverlayLineStartPointerHandlersResult {
  const handleLineBodyPointerDown = useCallback(
    (event: ReactPointerEvent) => {
      startPointerDragSession({
        buildSession: () =>
          buildPointerLineMoveSession(
            getPreviewLineSnapshot,
            event.pointerId,
            event.currentTarget,
            event.clientX,
            event.clientY,
          ),
        capturePointer,
        event,
        startDragSession,
      });
    },
    [capturePointer, getPreviewLineSnapshot, startDragSession],
  );

  const handleLineHandlePointerDown = useCallback(
    (handle: LineHandlePosition, event: ReactPointerEvent) => {
      startPointerDragSession({
        buildSession: () =>
          buildPointerLineResizeSession(
            getPreviewLineSnapshot,
            event.pointerId,
            event.currentTarget,
            event.clientX,
            event.clientY,
            handle,
          ),
        capturePointer,
        event,
        startDragSession,
      });
    },
    [capturePointer, getPreviewLineSnapshot, startDragSession],
  );

  return {
    handleLineBodyPointerDown,
    handleLineHandlePointerDown,
  };
}
