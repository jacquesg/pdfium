import type { ReactNode } from 'react';
import { DEFAULT_MARKUP_SELECTION_STROKE } from './selection-overlay.types.js';
import { buildSquigglyPath } from './selection-overlay-geometry.js';
import type { SelectionMarkupSegmentsProps } from './selection-overlay-markup-segments.types.js';

export function SelectionOverlaySquigglySegments({
  quads,
  scale,
}: Pick<SelectionMarkupSegmentsProps, 'quads' | 'scale'>): ReactNode {
  return quads.map((quad, index) => (
    <path
      key={`markup-squiggly-${String(index)}`}
      data-testid="selection-markup-segment"
      d={buildSquigglyPath(quad.p1, quad.p2)}
      fill="none"
      stroke={DEFAULT_MARKUP_SELECTION_STROKE}
      strokeWidth={Math.max(1.25, scale)}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ));
}
