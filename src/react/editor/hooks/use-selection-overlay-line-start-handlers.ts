import { useSelectionOverlayLineMouseStartHandlers } from './use-selection-overlay-line-mouse-start-handlers.js';
import { useSelectionOverlayLinePointerStartHandlers } from './use-selection-overlay-line-pointer-start-handlers.js';
import type {
  UseSelectionOverlayLineStartHandlersOptions,
  UseSelectionOverlayLineStartHandlersResult,
} from './use-selection-overlay-line-start-handlers.types.js';

export function useSelectionOverlayLineStartHandlers({
  capturePointer,
  getPreviewLineSnapshot,
  startDragSession,
}: UseSelectionOverlayLineStartHandlersOptions): UseSelectionOverlayLineStartHandlersResult {
  const pointerHandlers = useSelectionOverlayLinePointerStartHandlers({
    capturePointer,
    getPreviewLineSnapshot,
    startDragSession,
  });
  const mouseHandlers = useSelectionOverlayLineMouseStartHandlers({
    getPreviewLineSnapshot,
    startDragSession,
  });

  return {
    ...pointerHandlers,
    ...mouseHandlers,
  };
}
