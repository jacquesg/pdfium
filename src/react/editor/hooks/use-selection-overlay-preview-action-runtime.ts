import type { UseSelectionOverlayPreviewActionsOptions } from './use-selection-overlay-preview-actions.types.js';
import { useSelectionOverlayPreviewCancelAction } from './use-selection-overlay-preview-cancel-action.js';
import { useSelectionOverlayPreviewDragActions } from './use-selection-overlay-preview-drag-actions.js';
import { useSelectionOverlayPreviewGestureActions } from './use-selection-overlay-preview-gesture-actions.js';

export function useSelectionOverlayPreviewActionRuntime({
  boxAppearance,
  getPreviewLineSnapshot,
  getPreviewRectSnapshot,
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
  scale,
  setPreviewLineValue,
  setPreviewRectValue,
  syncPreviewFromInputs,
}: UseSelectionOverlayPreviewActionsOptions) {
  const { applyBoxDragPreview, applyLineDragPreview, finishBoxPreviewSession, finishLinePreviewSession } =
    useSelectionOverlayPreviewGestureActions({
      boxAppearance,
      getPreviewLineSnapshot,
      getPreviewRectSnapshot,
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
      scale,
      setPreviewLineValue,
      setPreviewRectValue,
      syncPreviewFromInputs,
    });

  const dragActions = useSelectionOverlayPreviewDragActions({
    applyBoxDragPreview,
    applyLineDragPreview,
    finishBoxPreviewSession,
    finishLinePreviewSession,
    onPreviewClear,
  });
  const cancelDragSession = useSelectionOverlayPreviewCancelAction({
    onPreviewClear,
    syncPreviewFromInputs,
  });

  return {
    ...dragActions,
    cancelDragSession,
  };
}
