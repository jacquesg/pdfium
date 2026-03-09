/**
 * Shape creation overlay.
 *
 * Provides drag-to-draw feedback for rectangle, circle, and line tools.
 * On pointer-up, calls `onCreate` with the PDF rect.
 *
 * @module react/editor/components/shape-creation-overlay
 */

import type { ReactNode } from 'react';
import type { Rect } from '../../../core/types.js';
import { useShapeCreationOverlayController } from '../hooks/use-shape-creation-overlay-controller.js';
import type { EditorTool } from '../types.js';
import type { ShapeCreateDetail } from './shape-creation-overlay.types.js';
import { ShapeCreationOverlayView } from './shape-creation-overlay-view.js';

export type { ShapeCreateDetail } from './shape-creation-overlay.types.js';

/**
 * Props for the `ShapeCreationOverlay` component.
 */
export interface ShapeCreationOverlayProps {
  /** The active shape tool ('rectangle', 'circle', or 'line'). */
  readonly tool: EditorTool;
  /** Container width in pixels. */
  readonly width: number;
  /** Container height in pixels. */
  readonly height: number;
  /** Scale factor for coordinate conversion. */
  readonly scale: number;
  /** Original page height in PDF points. */
  readonly originalHeight: number;
  /** Stroke colour (CSS). */
  readonly strokeColour?: string;
  /** Stroke width in screen pixels (used for preview + line bbox robustness). */
  readonly strokeWidth?: number;
  /** Called when the shape is completed with the PDF rect. */
  onCreate?(rect: Rect, detail?: ShapeCreateDetail): void;
}

/**
 * Transparent overlay that captures pointer events for shape creation.
 *
 * Shows a preview outline during drag, then calls `onCreate` with
 * the final PDF rect on pointer-up.
 */
export function ShapeCreationOverlay({
  tool,
  width,
  height,
  scale,
  originalHeight,
  strokeColour = '#000000',
  strokeWidth = 2,
  onCreate,
}: ShapeCreationOverlayProps): ReactNode {
  const controller = useShapeCreationOverlayController({
    height,
    originalHeight,
    scale,
    strokeColour,
    strokeWidth,
    tool,
    width,
    ...(onCreate !== undefined ? { onCreate } : {}),
  });

  return <ShapeCreationOverlayView controller={controller} />;
}
