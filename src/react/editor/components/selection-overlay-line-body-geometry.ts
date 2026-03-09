import type { ScreenRect } from '../shape-constraints.js';
import type { ScreenLine } from './selection-overlay.types.js';

export function resolveSelectionLineLocalPoints(linePreview: ScreenLine, overlayRect: ScreenRect) {
  return {
    lineLocalEnd: { x: linePreview.end.x - overlayRect.x, y: linePreview.end.y - overlayRect.y },
    lineLocalStart: { x: linePreview.start.x - overlayRect.x, y: linePreview.start.y - overlayRect.y },
  };
}
