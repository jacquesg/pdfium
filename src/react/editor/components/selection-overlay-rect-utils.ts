import type { ScreenRect } from '../shape-constraints.js';
import type { ScreenLine, SelectionOverlayAppearance } from './selection-overlay.types.js';
import { getLineOverlayRect } from './selection-overlay-geometry.js';

interface ResolveSelectionOverlayRectOptions {
  readonly appearance: SelectionOverlayAppearance;
  readonly maxHeight: number;
  readonly maxWidth: number;
  readonly previewLine: ScreenLine | null;
  readonly previewRect: ScreenRect;
}

export function resolveSelectionOverlayRect({
  appearance,
  maxHeight,
  maxWidth,
  previewLine,
  previewRect,
}: ResolveSelectionOverlayRectOptions): ScreenRect {
  return appearance.kind === 'line' && previewLine !== null
    ? getLineOverlayRect(previewLine, maxWidth, maxHeight)
    : previewRect;
}
