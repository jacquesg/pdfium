import type { UseSelectionOverlayControllerOptions } from './selection-overlay-controller.types.js';
import { useSelectionOverlayDrag } from './use-selection-overlay-drag.js';
import { useSelectionOverlayViewModel } from './use-selection-overlay-view-model.js';

export function useSelectionOverlayControllerRuntime({
  rect,
  scale,
  originalHeight,
  maxWidth = Number.POSITIVE_INFINITY,
  maxHeight = Number.POSITIVE_INFINITY,
  appearance = { kind: 'bounds' },
  interactive = true,
  onPreviewRect,
  onPreviewLine,
  onPreviewClear,
  onMove,
  onResize,
  onMoveLine,
  onResizeLine,
}: UseSelectionOverlayControllerOptions) {
  const drag = useSelectionOverlayDrag({
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
  });

  const viewModel = useSelectionOverlayViewModel({
    appearance,
    dragging: drag.dragging,
    interactive,
    maxHeight,
    maxWidth,
    previewLine: drag.previewLine,
    previewRect: drag.previewRect,
    scale,
  });

  return {
    appearance,
    interactive,
    maxHeight,
    maxWidth,
    originalHeight,
    scale,
    ...drag,
    ...viewModel,
  };
}
