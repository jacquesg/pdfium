import type {
  UseSelectionOverlayPreviewStateOptions,
  UseSelectionOverlayPreviewStateResult,
} from './selection-overlay-preview-state.types.js';
import { useSelectionOverlayPreviewRuntime } from './use-selection-overlay-preview-runtime.js';

export function useSelectionOverlayPreviewState({
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
  return useSelectionOverlayPreviewRuntime({
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
}
