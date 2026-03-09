import { pdfToScreen } from '../../coordinates.js';
import type { ScreenRect } from '../shape-constraints.js';
import type { SelectionMarkupQuad } from './selection-overlay.types.js';

export interface ProjectedSelectionMarkupQuad {
  readonly p1: { x: number; y: number };
  readonly p2: { x: number; y: number };
  readonly p3: { x: number; y: number };
  readonly p4: { x: number; y: number };
}

export function projectSelectionMarkupQuads(
  quads: readonly SelectionMarkupQuad[],
  overlayRect: ScreenRect,
  scale: number,
  originalHeight: number,
): readonly ProjectedSelectionMarkupQuad[] {
  return quads.map((quad) => {
    const p1 = pdfToScreen({ x: quad.x1, y: quad.y1 }, { scale, originalHeight });
    const p2 = pdfToScreen({ x: quad.x2, y: quad.y2 }, { scale, originalHeight });
    const p3 = pdfToScreen({ x: quad.x3, y: quad.y3 }, { scale, originalHeight });
    const p4 = pdfToScreen({ x: quad.x4, y: quad.y4 }, { scale, originalHeight });

    return {
      p1: { x: p1.x - overlayRect.x, y: p1.y - overlayRect.y },
      p2: { x: p2.x - overlayRect.x, y: p2.y - overlayRect.y },
      p3: { x: p3.x - overlayRect.x, y: p3.y - overlayRect.y },
      p4: { x: p4.x - overlayRect.x, y: p4.y - overlayRect.y },
    };
  });
}
