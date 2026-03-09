import type { SerialisedAnnotation } from '../../../context/protocol.js';
import type { Rect } from '../../../core/types.js';
import {
  buildLineSelectionAppearance,
  buildMarkupSelectionAppearance,
  buildShapeSelectionAppearance,
} from './editor-overlay-selection-appearance-support.js';
import type { SelectionOverlayAppearance } from './selection-overlay.types.js';

export function buildSelectionOverlayAppearance(annotation: SerialisedAnnotation): SelectionOverlayAppearance {
  const strokeWidth = Math.max(0.25, annotation.border?.borderWidth ?? 1);
  const markupAppearance = buildMarkupSelectionAppearance(annotation, strokeWidth);
  if (markupAppearance !== null) {
    return markupAppearance;
  }

  const shapeAppearance = buildShapeSelectionAppearance(annotation, strokeWidth);
  if (shapeAppearance !== null) {
    return shapeAppearance;
  }

  const lineAppearance = buildLineSelectionAppearance(annotation, strokeWidth);
  if (lineAppearance !== null) {
    return lineAppearance;
  }

  return { kind: 'bounds' };
}

export { buildFallbackLineRect } from './editor-overlay-fallback-line-rect.js';
export type { Rect };
