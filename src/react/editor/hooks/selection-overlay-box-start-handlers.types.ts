import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react';
import type { DragSession, HandlePosition } from '../components/selection-overlay.types.js';
import type { ScreenRect } from '../shape-constraints.js';

export interface UseSelectionOverlayBoxStartHandlersOptions {
  readonly capturePointer: (event: ReactPointerEvent) => void;
  readonly getPreviewRectSnapshot: () => ScreenRect;
  readonly startDragSession: (session: DragSession, shiftKey: boolean) => void;
}

export interface SelectionOverlayBoxPointerStartHandlers {
  readonly handleBoxBodyPointerDown: (event: ReactPointerEvent) => void;
  readonly handleBoxHandlePointerDown: (handle: HandlePosition, event: ReactPointerEvent) => void;
}

export interface SelectionOverlayBoxMouseStartHandlers {
  readonly handleBoxBodyMouseDown: (event: ReactMouseEvent) => void;
  readonly handleBoxHandleMouseDown: (handle: HandlePosition, event: ReactMouseEvent) => void;
}

export interface UseSelectionOverlayBoxStartHandlersResult
  extends SelectionOverlayBoxMouseStartHandlers,
    SelectionOverlayBoxPointerStartHandlers {}
