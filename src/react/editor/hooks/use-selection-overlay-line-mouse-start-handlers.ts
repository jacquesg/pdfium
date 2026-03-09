import { type MouseEvent as ReactMouseEvent, useCallback } from 'react';
import type { LineHandlePosition } from '../components/selection-overlay.types.js';
import { startMouseDragSession } from './selection-overlay-drag-start-support.js';
import { buildMouseLineMoveSession, buildMouseLineResizeSession } from './selection-overlay-line-start-support.js';
import type {
  UseSelectionOverlayLineStartHandlersOptions,
  UseSelectionOverlayLineStartMouseHandlersResult,
} from './use-selection-overlay-line-start-handlers.types.js';

type UseSelectionOverlayLineMouseStartHandlersOptions = Pick<
  UseSelectionOverlayLineStartHandlersOptions,
  'getPreviewLineSnapshot' | 'startDragSession'
>;

export function useSelectionOverlayLineMouseStartHandlers({
  getPreviewLineSnapshot,
  startDragSession,
}: UseSelectionOverlayLineMouseStartHandlersOptions): UseSelectionOverlayLineStartMouseHandlersResult {
  const handleLineBodyMouseDown = useCallback(
    (event: ReactMouseEvent) => {
      startMouseDragSession({
        buildSession: () => buildMouseLineMoveSession(getPreviewLineSnapshot, event.clientX, event.clientY),
        event,
        startDragSession,
      });
    },
    [getPreviewLineSnapshot, startDragSession],
  );

  const handleLineHandleMouseDown = useCallback(
    (handle: LineHandlePosition, event: ReactMouseEvent) => {
      startMouseDragSession({
        buildSession: () => buildMouseLineResizeSession(getPreviewLineSnapshot, event.clientX, event.clientY, handle),
        event,
        startDragSession,
      });
    },
    [getPreviewLineSnapshot, startDragSession],
  );

  return {
    handleLineBodyMouseDown,
    handleLineHandleMouseDown,
  };
}
