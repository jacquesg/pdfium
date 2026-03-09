import type { ScreenLine, SelectionOverlayAppearance } from '../components/selection-overlay.types.js';
import { buildSelectionOverlayViewModel } from '../components/selection-overlay-support.js';
import type { ScreenRect } from '../shape-constraints.js';

interface UseSelectionOverlayViewModelOptions {
  readonly appearance: SelectionOverlayAppearance;
  readonly dragging: boolean;
  readonly interactive: boolean;
  readonly maxHeight: number;
  readonly maxWidth: number;
  readonly previewLine: ScreenLine | null;
  readonly previewRect: ScreenRect;
  readonly scale: number;
}

export function useSelectionOverlayViewModel(options: UseSelectionOverlayViewModelOptions) {
  return buildSelectionOverlayViewModel(options);
}
