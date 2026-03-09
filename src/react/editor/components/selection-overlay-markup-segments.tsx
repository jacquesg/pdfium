import type { ReactNode } from 'react';
import { SelectionOverlayHighlightSegments } from './selection-overlay-highlight-segments.js';
import type { SelectionMarkupSegmentsProps } from './selection-overlay-markup-segments.types.js';
import { SelectionOverlaySquigglySegments } from './selection-overlay-squiggly-segments.js';
import { SelectionOverlayStrikeoutSegments } from './selection-overlay-strikeout-segments.js';
import { SelectionOverlayUnderlineSegments } from './selection-overlay-underline-segments.js';

export function SelectionMarkupSegments({ markupType, quads, scale }: SelectionMarkupSegmentsProps): ReactNode {
  const markupStrokeWidth = Math.max(1.5, scale);

  if (markupType === 'highlight') {
    return <SelectionOverlayHighlightSegments quads={quads} />;
  }

  if (markupType === 'underline') {
    return <SelectionOverlayUnderlineSegments quads={quads} markupStrokeWidth={markupStrokeWidth} />;
  }

  if (markupType === 'strikeout') {
    return <SelectionOverlayStrikeoutSegments quads={quads} markupStrokeWidth={markupStrokeWidth} />;
  }

  return <SelectionOverlaySquigglySegments quads={quads} scale={scale} />;
}
