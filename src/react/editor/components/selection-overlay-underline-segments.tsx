import type { ReactNode } from 'react';
import { DEFAULT_MARKUP_SELECTION_STROKE } from './selection-overlay.types.js';
import type { SelectionMarkupStrokeSegmentsProps } from './selection-overlay-markup-segments.types.js';

export function SelectionOverlayUnderlineSegments({
  markupStrokeWidth,
  quads,
}: SelectionMarkupStrokeSegmentsProps): ReactNode {
  return quads.map((quad, index) => (
    <line
      key={`markup-underline-${String(index)}`}
      data-testid="selection-markup-segment"
      x1={quad.p1.x}
      y1={quad.p1.y}
      x2={quad.p2.x}
      y2={quad.p2.y}
      stroke={DEFAULT_MARKUP_SELECTION_STROKE}
      strokeWidth={markupStrokeWidth}
      strokeLinecap="round"
    />
  ));
}
