import type { TextMarkupSelectionKind } from './selection-overlay.types.js';
import type { ProjectedSelectionMarkupQuad } from './selection-overlay-markup-projection.js';

export interface SelectionMarkupSegmentsProps {
  readonly markupType: TextMarkupSelectionKind;
  readonly quads: readonly ProjectedSelectionMarkupQuad[];
  readonly scale: number;
}

export interface SelectionMarkupQuadSegmentsProps {
  readonly quads: readonly ProjectedSelectionMarkupQuad[];
}

export interface SelectionMarkupStrokeSegmentsProps extends SelectionMarkupQuadSegmentsProps {
  readonly markupStrokeWidth: number;
}
