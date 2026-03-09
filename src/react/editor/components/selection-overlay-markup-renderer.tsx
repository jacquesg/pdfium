import type { ReactNode } from 'react';
import type { ScreenRect } from '../shape-constraints.js';
import type { SelectionMarkupQuad, TextMarkupSelectionKind } from './selection-overlay.types.js';
import { projectSelectionMarkupQuads, SelectionMarkupSegments } from './selection-overlay-markup-support.js';

interface SelectionMarkupOverlayProps {
  readonly markupType: TextMarkupSelectionKind;
  readonly overlayRect: ScreenRect;
  readonly originalHeight: number;
  readonly quads: readonly SelectionMarkupQuad[];
  readonly scale: number;
}

export function SelectionMarkupOverlay({
  markupType,
  overlayRect,
  originalHeight,
  quads,
  scale,
}: SelectionMarkupOverlayProps): ReactNode {
  const previewQuads = projectSelectionMarkupQuads(quads, overlayRect, scale, originalHeight);

  return (
    <svg
      data-testid="selection-body"
      data-selection-kind="text-markup"
      aria-hidden="true"
      focusable="false"
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'visible',
        pointerEvents: 'none',
      }}
    >
      <g data-testid="selection-markup-overlay">
        <SelectionMarkupSegments markupType={markupType} quads={previewQuads} scale={scale} />
      </g>
    </svg>
  );
}
