/**
 * Ink drawing canvas overlay.
 *
 * Renders an SVG overlay that captures pointer events for
 * freehand drawing and displays the in-progress stroke.
 *
 * @module react/editor/components/ink-canvas
 */

import type { ReactNode } from 'react';
import { useInkCanvasPointerHandlers } from '../hooks/use-ink-canvas-pointer-handlers.js';
import type { InkCanvasProps } from './ink-canvas.types.js';
import { getInkCanvasPathProps, getInkCanvasStyle } from './ink-canvas-style.js';
import { buildInkPathData } from './ink-canvas-support.js';

/**
 * SVG overlay for freehand drawing.
 *
 * Captures pointer events and renders the in-progress stroke
 * as an SVG path in real time.
 */
export function InkCanvas({
  width,
  height,
  drawing,
  strokeColour = '#000000',
  strokeWidth = 2,
  onStrokeComplete,
}: InkCanvasProps): ReactNode {
  const { handleLostPointerCapture, handlePointerCancel, handlePointerDown, handlePointerMove, handlePointerUp } =
    useInkCanvasPointerHandlers({
      drawing,
      onStrokeComplete,
    });
  const pathData = buildInkPathData(drawing.points);

  return (
    <svg
      data-testid="ink-canvas"
      role="img"
      aria-label="Drawing canvas"
      width={width}
      height={height}
      style={getInkCanvasStyle()}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onLostPointerCapture={handleLostPointerCapture}
    >
      <title>Drawing canvas</title>
      {pathData && <path d={pathData} {...getInkCanvasPathProps(strokeColour, strokeWidth)} />}
    </svg>
  );
}

export type { InkCanvasProps } from './ink-canvas.types.js';
