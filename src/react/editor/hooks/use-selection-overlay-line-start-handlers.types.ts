import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react';
import type { DragSession, LineHandlePosition, ScreenLine } from '../components/selection-overlay.types.js';

export interface UseSelectionOverlayLineStartHandlersOptions {
  readonly capturePointer: (event: ReactPointerEvent) => void;
  readonly getPreviewLineSnapshot: () => ScreenLine | null;
  readonly startDragSession: (session: DragSession, shiftKey: boolean) => void;
}

export interface UseSelectionOverlayLineStartPointerHandlersResult {
  readonly handleLineBodyPointerDown: (event: ReactPointerEvent) => void;
  readonly handleLineHandlePointerDown: (handle: LineHandlePosition, event: ReactPointerEvent) => void;
}

export interface UseSelectionOverlayLineStartMouseHandlersResult {
  readonly handleLineBodyMouseDown: (event: ReactMouseEvent) => void;
  readonly handleLineHandleMouseDown: (handle: LineHandlePosition, event: ReactMouseEvent) => void;
}

export type UseSelectionOverlayLineStartHandlersResult = UseSelectionOverlayLineStartPointerHandlersResult &
  UseSelectionOverlayLineStartMouseHandlersResult;
