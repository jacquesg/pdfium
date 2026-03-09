import type { BoxAppearance, ScreenLine } from '../components/selection-overlay.types.js';
import type { ScreenRect } from '../shape-constraints.js';
import type { UseSelectionOverlayPreviewStateOptions } from './selection-overlay-preview-state.types.js';
import { useSelectionOverlayPreviewClearLifecycle } from './use-selection-overlay-preview-clear-lifecycle.js';
import { useSelectionOverlayPreviewValues } from './use-selection-overlay-preview-values.js';

interface SelectionOverlayPreviewModel {
  readonly boxAppearance: BoxAppearance;
  readonly getPreviewLineSnapshot: () => ScreenLine | null;
  readonly getPreviewRectSnapshot: () => ScreenRect;
  readonly previewLine: ScreenLine | null;
  readonly previewRect: ScreenRect;
  readonly setPreviewLineValue: (screenLine: ScreenLine | null) => void;
  readonly setPreviewRectValue: (screenRect: ScreenRect) => void;
  readonly syncPreviewFromInputs: () => void;
}

export function useSelectionOverlayPreviewModel({
  appearance,
  maxHeight,
  maxWidth,
  onPreviewClear,
  originalHeight,
  rect,
  scale,
}: UseSelectionOverlayPreviewStateOptions): SelectionOverlayPreviewModel {
  const model = useSelectionOverlayPreviewValues({
    appearance,
    maxHeight,
    maxWidth,
    originalHeight,
    rect,
    scale,
  });

  useSelectionOverlayPreviewClearLifecycle(onPreviewClear);

  return model;
}
