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
import { buildRedactionOverlayRects } from './redaction-overlay-support.js';
import { RedactionOverlayView } from './redaction-overlay-view.js';

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
  const rects = buildRedactionOverlayRects({
    annotations,
    originalHeight,
    scale,
  });

  if (rects.length === 0) return null;
  return <RedactionOverlayView height={height} rects={rects} width={width} />;
}
