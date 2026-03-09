import type {
  UseSelectionOverlayPreviewStateOptions,
  UseSelectionOverlayPreviewStateResult,
} from './selection-overlay-preview-state.types.js';
import { useSelectionOverlayPreviewActions } from './use-selection-overlay-preview-actions.js';
import { useSelectionOverlayPreviewModel } from './use-selection-overlay-preview-model.js';

export function useSelectionOverlayPreviewRuntime({
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
}: UseSelectionOverlayPreviewStateOptions): UseSelectionOverlayPreviewStateResult {
  const {
    boxAppearance,
    getPreviewLineSnapshot,
    getPreviewRectSnapshot,
    previewLine,
    previewRect,
    setPreviewLineValue,
    setPreviewRectValue,
    syncPreviewFromInputs,
  } = useSelectionOverlayPreviewModel({
    appearance,
    maxHeight,
    maxWidth,
    onPreviewClear,
    originalHeight,
    rect,
    scale,
  });

  const actions = useSelectionOverlayPreviewActions({
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

  return {
    ...actions,
    getPreviewLineSnapshot,
    getPreviewRectSnapshot,
    previewLine,
    previewRect,
    syncPreviewFromInputs,
  };
}
