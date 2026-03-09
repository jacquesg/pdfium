import type { DrawPoint, InkDrawingActions } from '../hooks/use-ink-drawing.js';

/**
 * Props for the `InkCanvas` component.
 */
export interface InkCanvasProps {
  /** Width of the canvas in pixels. */
  readonly width: number;
  /** Height of the canvas in pixels. */
  readonly height: number;
  /** Ink drawing actions from `useInkDrawing`. */
  readonly drawing: InkDrawingActions;
  /** Stroke colour (CSS colour string). */
  readonly strokeColour?: string;
  /** Stroke width in pixels. */
  readonly strokeWidth?: number;
  /** Called when a stroke is completed with the final points. */
  onStrokeComplete?(points: readonly DrawPoint[]): void;
}
