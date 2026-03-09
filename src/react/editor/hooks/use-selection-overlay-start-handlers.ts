import type { PointerEvent as ReactPointerEvent } from 'react';
import type { DragSession, ScreenLine } from '../components/selection-overlay.types.js';
import type { ScreenRect } from '../shape-constraints.js';
import { useSelectionOverlayBoxStartHandlers } from './use-selection-overlay-box-start-handlers.js';
import { useSelectionOverlayLineStartHandlers } from './use-selection-overlay-line-start-handlers.js';

interface UseSelectionOverlayStartHandlersOptions {
  readonly capturePointer: (event: ReactPointerEvent) => void;
  readonly getPreviewLineSnapshot: () => ScreenLine | null;
  readonly getPreviewRectSnapshot: () => ScreenRect;
  readonly startDragSession: (session: DragSession, shiftKey: boolean) => void;
}

export function useSelectionOverlayStartHandlers({
  capturePointer,
  getPreviewLineSnapshot,
  getPreviewRectSnapshot,
  startDragSession,
}: UseSelectionOverlayStartHandlersOptions) {
  const boxHandlers = useSelectionOverlayBoxStartHandlers({
    capturePointer,
    getPreviewRectSnapshot,
    startDragSession,
  });
  const lineHandlers = useSelectionOverlayLineStartHandlers({
    capturePointer,
    getPreviewLineSnapshot,
    startDragSession,
  });

  return {
    ...boxHandlers,
    ...lineHandlers,
  };
}
