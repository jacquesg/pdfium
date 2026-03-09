import type { Point, Rect } from '../../../core/types.js';
import type { SelectionOverlayAppearance } from '../components/selection-overlay.types.js';

export interface UseSelectionOverlayControllerOptions {
  readonly appearance?: SelectionOverlayAppearance | undefined;
  readonly interactive?: boolean | undefined;
  readonly maxHeight?: number | undefined;
  readonly maxWidth?: number | undefined;
  readonly onMove?: ((newRect: Rect) => void) | undefined;
  readonly onMoveLine?: ((nextLine: { start: Point; end: Point }) => void) | undefined;
  readonly onPreviewClear?: (() => void) | undefined;
  readonly onPreviewLine?: ((previewLine: { start: Point; end: Point }) => void) | undefined;
  readonly onPreviewRect?: ((previewRect: Rect) => void) | undefined;
  readonly onResize?: ((newRect: Rect) => void) | undefined;
  readonly onResizeLine?: ((nextLine: { start: Point; end: Point }) => void) | undefined;
  readonly originalHeight: number;
  readonly rect: Rect;
  readonly scale: number;
}
