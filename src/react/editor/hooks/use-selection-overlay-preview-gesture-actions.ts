import { useSelectionOverlayBoxPreviewActions } from './use-selection-overlay-box-preview-actions.js';
import { useSelectionOverlayLinePreviewActions } from './use-selection-overlay-line-preview-actions.js';
import type { UseSelectionOverlayPreviewActionsOptions } from './use-selection-overlay-preview-actions.types.js';

export function useSelectionOverlayPreviewGestureActions({
  boxAppearance,
  getPreviewLineSnapshot,
  getPreviewRectSnapshot,
  maxHeight,
  maxWidth,
  onMove,
  onMoveLine,
  onPreviewLine,
  onPreviewRect,
  onResize,
  onResizeLine,
  originalHeight,
  scale,
  setPreviewLineValue,
  setPreviewRectValue,
}: UseSelectionOverlayPreviewActionsOptions) {
  const { applyBoxDragPreview, finishBoxPreviewSession } = useSelectionOverlayBoxPreviewActions({
    boxAppearance,
    getPreviewRectSnapshot,
    maxHeight,
    maxWidth,
    onMove,
    onPreviewRect,
    onResize,
    originalHeight,
    scale,
    setPreviewRectValue,
  });
  const { applyLineDragPreview, finishLinePreviewSession } = useSelectionOverlayLinePreviewActions({
    getPreviewLineSnapshot,
    maxHeight,
    maxWidth,
    onMove,
    onMoveLine,
    onPreviewLine,
    onResize,
    onResizeLine,
    originalHeight,
    scale,
    setPreviewLineValue,
  });

  return {
    applyBoxDragPreview,
    applyLineDragPreview,
    finishBoxPreviewSession,
    finishLinePreviewSession,
  };
}
