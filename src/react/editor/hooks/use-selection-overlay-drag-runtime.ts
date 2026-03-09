import type {
  UseSelectionOverlayDragOptions,
  UseSelectionOverlayDragResult,
} from './use-selection-overlay-drag.types.js';
import { useSelectionOverlayDragState } from './use-selection-overlay-drag-state.js';
import { useSelectionOverlayStartHandlers } from './use-selection-overlay-start-handlers.js';

export function useSelectionOverlayDragRuntime({
  rect,
  scale,
  originalHeight,
  maxWidth,
  maxHeight,
  appearance,
  onPreviewRect,
  onPreviewLine,
  onPreviewClear,
  onMove,
  onResize,
  onMoveLine,
  onResizeLine,
}: UseSelectionOverlayDragOptions): UseSelectionOverlayDragResult {
  const dragState = useSelectionOverlayDragState({
    appearance,
    maxHeight,
    maxWidth,
    onMove,
    onMoveLine,
    onPreviewClear,
    onPreviewLine,
    onPreviewRect,
    onResize,
    onResizeLine,
    originalHeight,
    rect,
    scale,
  });

  const {
    handleBoxBodyMouseDown,
    handleBoxBodyPointerDown,
    handleBoxHandleMouseDown,
    handleBoxHandlePointerDown,
    handleLineBodyMouseDown,
    handleLineBodyPointerDown,
    handleLineHandleMouseDown,
    handleLineHandlePointerDown,
  } = useSelectionOverlayStartHandlers({
    capturePointer: dragState.capturePointer,
    getPreviewLineSnapshot: dragState.getPreviewLineSnapshot,
    getPreviewRectSnapshot: dragState.getPreviewRectSnapshot,
    startDragSession: dragState.startDragSession,
  });

  return {
    dragging: dragState.dragging,
    previewLine: dragState.previewLine,
    previewRect: dragState.previewRect,
    handleBoxBodyMouseDown,
    handleBoxBodyPointerDown,
    handleBoxHandleMouseDown,
    handleBoxHandlePointerDown,
    handleLineBodyMouseDown,
    handleLineBodyPointerDown,
    handleLineHandleMouseDown,
    handleLineHandlePointerDown,
    handleLostPointerCapture: dragState.handleLostPointerCapture,
    handlePointerCancel: dragState.handlePointerCancel,
    handlePointerMove: dragState.handlePointerMove,
    handlePointerUp: dragState.handlePointerUp,
  };
}
