import type {
  SelectionOverlayLinePreviewActionsResult,
  UseSelectionOverlayLinePreviewActionsOptions,
} from './selection-overlay-line-preview-actions.types.js';
import { useSelectionOverlayLinePreviewApply } from './use-selection-overlay-line-preview-apply.js';
import { useSelectionOverlayLinePreviewFinish } from './use-selection-overlay-line-preview-finish.js';

export function useSelectionOverlayLinePreviewActions({
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
}: UseSelectionOverlayLinePreviewActionsOptions): SelectionOverlayLinePreviewActionsResult {
  const applyLineDragPreview = useSelectionOverlayLinePreviewApply({
    maxHeight,
    maxWidth,
    onPreviewLine,
    originalHeight,
    scale,
    setPreviewLineValue,
  });
  const finishLinePreviewSession = useSelectionOverlayLinePreviewFinish({
    getPreviewLineSnapshot,
    onMove,
    onMoveLine,
    onResize,
    onResizeLine,
    originalHeight,
    scale,
  });

  return {
    applyLineDragPreview,
    finishLinePreviewSession,
  };
}
