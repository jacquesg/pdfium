/**
 * Redaction overlay.
 *
 * Renders hatched/striped pattern over pending redaction areas
 * to visually distinguish them from regular annotations.
 *
 * @module react/editor/components/redaction-overlay
 */

import type { ReactNode } from 'react';
import type { SerialisedAnnotation } from '../../../context/protocol.js';
import { pdfRectToScreen } from '../../coordinates.js';
import { isEditorRedactionAnnotation } from '../redaction-utils.js';

/**
 * Props for the `RedactionOverlay` component.
 */
export interface RedactionOverlayProps {
  /** All annotations on this page. */
  readonly annotations: readonly SerialisedAnnotation[];
  /** Scale factor for coordinate conversion. */
  readonly scale: number;
  /** Original page height in PDF points. */
  readonly originalHeight: number;
  /** Container width in pixels. */
  readonly width: number;
  /** Container height in pixels. */
  readonly height: number;
}

const PATTERN_ID = 'redaction-hatch';

/**
 * SVG overlay that renders hatched patterns over pending Redact annotations.
 *
 * Filters annotations by type and draws a hatched rectangle for each.
 */
export function RedactionOverlay({
  annotations,
  scale,
  originalHeight,
  width,
  height,
}: RedactionOverlayProps): ReactNode {
  const redactions = annotations.filter(isEditorRedactionAnnotation);

  if (redactions.length === 0) return null;

  return (
    <svg
      data-testid="redaction-overlay"
      role="img"
      aria-label="Pending redactions"
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      width={width}
      height={height}
    >
      <title>Pending redactions</title>
      <defs>
        <pattern id={PATTERN_ID} patternUnits="userSpaceOnUse" width={8} height={8}>
          <path d="M-1,1 l2,-2 M0,8 l8,-8 M7,9 l2,-2" stroke="#cc0000" strokeWidth={1.5} />
        </pattern>
      </defs>
      {redactions.map((annot) => {
        const screen = pdfRectToScreen(annot.bounds, { scale, originalHeight });
        return (
          <rect
            key={annot.index}
            data-testid={`redaction-rect-${annot.index}`}
            x={screen.x}
            y={screen.y}
            width={screen.width}
            height={screen.height}
            fill={`url(#${PATTERN_ID})`}
            stroke="#cc0000"
            strokeWidth={1}
            opacity={0.6}
          />
        );
      })}
    </svg>
  );
}
