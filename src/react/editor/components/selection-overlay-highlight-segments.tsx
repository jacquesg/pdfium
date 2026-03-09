import type { ReactNode } from 'react';
import { DEFAULT_MARKUP_SELECTION_FILL, DEFAULT_MARKUP_SELECTION_STROKE } from './selection-overlay.types.js';
import type { SelectionMarkupQuadSegmentsProps } from './selection-overlay-markup-segments.types.js';

export function SelectionOverlayHighlightSegments({ quads }: SelectionMarkupQuadSegmentsProps): ReactNode {
  return quads.map((quad, index) => (
    <polygon
      key={`markup-highlight-${String(index)}`}
      data-testid="selection-markup-segment"
      points={`${quad.p3.x},${quad.p3.y} ${quad.p4.x},${quad.p4.y} ${quad.p2.x},${quad.p2.y} ${quad.p1.x},${quad.p1.y}`}
      fill={DEFAULT_MARKUP_SELECTION_FILL}
      stroke={DEFAULT_MARKUP_SELECTION_STROKE}
      strokeWidth={1}
    />
  ));
}
