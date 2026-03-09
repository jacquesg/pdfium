import { useSelectionOverlayPreviewActionRuntime } from './use-selection-overlay-preview-action-runtime.js';
import type {
  UseSelectionOverlayPreviewActionsOptions,
  UseSelectionOverlayPreviewActionsResult,
} from './use-selection-overlay-preview-actions.types.js';

export function useSelectionOverlayPreviewActions({
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
}: UseSelectionOverlayPreviewActionsOptions): UseSelectionOverlayPreviewActionsResult {
  return useSelectionOverlayPreviewActionRuntime({
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
}
