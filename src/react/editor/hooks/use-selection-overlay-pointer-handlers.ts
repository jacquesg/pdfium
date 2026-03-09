import { useCallback } from 'react';
import { captureSelectionOverlayPointer } from './selection-overlay-pointer-capture.js';
import { useSelectionOverlayPointerCompletion } from './use-selection-overlay-pointer-completion.js';
import type {
  UseSelectionOverlayPointerHandlersOptions,
  UseSelectionOverlayPointerHandlersResult,
} from './use-selection-overlay-pointer-handlers.types.js';
import { useSelectionOverlayPointerMove } from './use-selection-overlay-pointer-move.js';

export function useSelectionOverlayPointerHandlers({
  applyDragAtClientPosition,
  cancelActiveSession,
  dragging,
  dragSessionRef,
  finishActiveSession,
  resolveShiftKey,
}: UseSelectionOverlayPointerHandlersOptions): UseSelectionOverlayPointerHandlersResult {
  const capturePointer = useCallback(captureSelectionOverlayPointer, []);
  const handlePointerMove = useSelectionOverlayPointerMove({
    applyDragAtClientPosition,
    dragSessionRef,
    dragging,
    resolveShiftKey,
  });
  const { handleLostPointerCapture, handlePointerCancel, handlePointerUp } = useSelectionOverlayPointerCompletion({
    cancelActiveSession,
    dragSessionRef,
    finishActiveSession,
  });

  return {
    capturePointer,
    handleLostPointerCapture,
    handlePointerCancel,
    handlePointerMove,
    handlePointerUp,
  };
}
