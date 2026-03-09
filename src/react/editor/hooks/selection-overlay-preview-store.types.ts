import type { BoxAppearance, ScreenLine, SelectionOverlayAppearance } from '../components/selection-overlay.types.js';
import type { ScreenRect } from '../shape-constraints.js';

export interface UseSelectionOverlayPreviewStoreOptions {
  readonly appearance: SelectionOverlayAppearance;
  readonly maxHeight: number;
  readonly maxWidth: number;
  readonly originalHeight: number;
  readonly rect: { left: number; top: number; right: number; bottom: number };
  readonly scale: number;
}

export interface UseSelectionOverlayPreviewStoreResult {
  readonly boxAppearance: BoxAppearance;
  readonly getPreviewLineSnapshot: () => ScreenLine | null;
  readonly getPreviewRectSnapshot: () => ScreenRect;
  readonly previewLine: ScreenLine | null;
  readonly previewRect: ScreenRect;
  readonly setPreviewLineValue: (screenLine: ScreenLine | null) => void;
  readonly setPreviewRectValue: (screenRect: ScreenRect) => void;
}
