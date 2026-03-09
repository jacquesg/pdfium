import type { ReactNode } from 'react';
import { DEFAULT_MARKUP_SELECTION_STROKE } from './selection-overlay.types.js';
import { midpoint } from './selection-overlay-geometry.js';
import type { SelectionMarkupStrokeSegmentsProps } from './selection-overlay-markup-segments.types.js';

export function SelectionOverlayStrikeoutSegments({
  markupStrokeWidth,
  quads,
}: SelectionMarkupStrokeSegmentsProps): ReactNode {
  return quads.map((quad, index) => {
    const leftMid = midpoint(quad.p1, quad.p3);
    const rightMid = midpoint(quad.p2, quad.p4);

    return (
      <line
        key={`markup-strikeout-${String(index)}`}
        data-testid="selection-markup-segment"
        x1={leftMid.x}
        y1={leftMid.y}
        x2={rightMid.x}
        y2={rightMid.y}
        stroke={DEFAULT_MARKUP_SELECTION_STROKE}
        strokeWidth={markupStrokeWidth}
        strokeLinecap="round"
      />
    );
  });
}
