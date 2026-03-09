import type {
  UseSelectionOverlayBoxStartHandlersOptions,
  UseSelectionOverlayBoxStartHandlersResult,
} from './selection-overlay-box-start-handlers.types.js';
import { useSelectionOverlayBoxMouseStartHandlers } from './use-selection-overlay-box-mouse-start-handlers.js';
import { useSelectionOverlayBoxPointerStartHandlers } from './use-selection-overlay-box-pointer-start-handlers.js';

export function useSelectionOverlayBoxStartHandlers({
  capturePointer,
  getPreviewRectSnapshot,
  startDragSession,
}: UseSelectionOverlayBoxStartHandlersOptions): UseSelectionOverlayBoxStartHandlersResult {
  const pointerHandlers = useSelectionOverlayBoxPointerStartHandlers({
    capturePointer,
    getPreviewRectSnapshot,
    startDragSession,
  });
  const mouseHandlers = useSelectionOverlayBoxMouseStartHandlers({
    getPreviewRectSnapshot,
    startDragSession,
  });

  return {
    ...mouseHandlers,
    ...pointerHandlers,
  };
}
