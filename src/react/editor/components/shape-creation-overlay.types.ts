import type { Point } from '../../../core/types.js';

export interface DragState {
  readonly startX: number;
  readonly startY: number;
  readonly currentX: number;
  readonly currentY: number;
}

/**
 * Optional metadata emitted alongside a created shape.
 *
 * For line tool this carries the explicit start/end points.
 */
export interface ShapeCreateDetail {
  readonly start?: Point;
  readonly end?: Point;
}
