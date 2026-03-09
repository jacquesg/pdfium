import type { UseSelectionOverlayDragOptions } from './use-selection-overlay-drag.types.js';
import { useSelectionOverlayPointerLifecycle } from './use-selection-overlay-pointer-lifecycle.js';
import { useSelectionOverlayPreviewState } from './use-selection-overlay-preview-state.js';
import { useSelectionOverlayPreviewSync } from './use-selection-overlay-preview-sync.js';

export function useSelectionOverlayDragState({
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
}: UseSelectionOverlayDragOptions) {
  const {
    applyDragAtClientPosition,
    cancelDragSession,
    finishDragSession,
    getPreviewLineSnapshot,
    getPreviewRectSnapshot,
    previewLine,
    previewRect,
    syncPreviewFromInputs,
  } = useSelectionOverlayPreviewState({
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

  const pointerLifecycle = useSelectionOverlayPointerLifecycle({
    applyDragAtClientPosition,
    cancelDragSession,
    finishDragSession,
  });

  useSelectionOverlayPreviewSync(pointerLifecycle.dragging, syncPreviewFromInputs);

  return {
    ...pointerLifecycle,
    getPreviewLineSnapshot,
    getPreviewRectSnapshot,
    previewLine,
    previewRect,
  };
}
