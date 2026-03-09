import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react';
import type {
  HandlePosition,
  LineHandlePosition,
  ScreenLine,
  SelectionOverlayAppearance,
} from '../components/selection-overlay.types.js';
import type { ScreenRect } from '../shape-constraints.js';

export interface UseSelectionOverlayDragOptions {
  readonly rect: { left: number; top: number; right: number; bottom: number };
  readonly scale: number;
  readonly originalHeight: number;
  readonly maxWidth: number;
  readonly maxHeight: number;
  readonly appearance: SelectionOverlayAppearance;
  readonly onPreviewRect?:
    | ((previewRect: { left: number; top: number; right: number; bottom: number }) => void)
    | undefined;
  readonly onPreviewLine?:
    | ((previewLine: { start: { x: number; y: number }; end: { x: number; y: number } }) => void)
    | undefined;
  readonly onPreviewClear?: (() => void) | undefined;
  readonly onMove?: ((newRect: { left: number; top: number; right: number; bottom: number }) => void) | undefined;
  readonly onResize?: ((newRect: { left: number; top: number; right: number; bottom: number }) => void) | undefined;
  readonly onMoveLine?:
    | ((nextLine: { start: { x: number; y: number }; end: { x: number; y: number } }) => void)
    | undefined;
  readonly onResizeLine?:
    | ((nextLine: { start: { x: number; y: number }; end: { x: number; y: number } }) => void)
    | undefined;
}

export interface UseSelectionOverlayDragResult {
  readonly dragging: boolean;
  readonly previewLine: ScreenLine | null;
  readonly previewRect: ScreenRect;
  readonly handleBoxBodyMouseDown: (event: ReactMouseEvent) => void;
  readonly handleBoxBodyPointerDown: (event: ReactPointerEvent) => void;
  readonly handleBoxHandleMouseDown: (handle: HandlePosition, event: ReactMouseEvent) => void;
  readonly handleBoxHandlePointerDown: (handle: HandlePosition, event: ReactPointerEvent) => void;
  readonly handleLineBodyMouseDown: (event: ReactMouseEvent) => void;
  readonly handleLineBodyPointerDown: (event: ReactPointerEvent) => void;
  readonly handleLineHandleMouseDown: (handle: LineHandlePosition, event: ReactMouseEvent) => void;
  readonly handleLineHandlePointerDown: (handle: LineHandlePosition, event: ReactPointerEvent) => void;
  readonly handleLostPointerCapture: () => void;
  readonly handlePointerCancel: (event: ReactPointerEvent) => void;
  readonly handlePointerMove: (event: ReactPointerEvent) => void;
  readonly handlePointerUp: (event: ReactPointerEvent) => void;
}
