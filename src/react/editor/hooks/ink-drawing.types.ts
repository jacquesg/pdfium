/**
 * A single point in a drawing stroke.
 */
export interface DrawPoint {
  readonly x: number;
  readonly y: number;
}

/**
 * Return type of `useInkDrawing`.
 */
export interface InkDrawingActions {
  /** Whether the user is currently drawing. */
  readonly isDrawing: boolean;
  /** The current in-progress stroke points. */
  readonly points: readonly DrawPoint[];
  /** Start a new stroke at the given point. */
  startStroke(point: DrawPoint): void;
  /** Add a point to the current stroke. */
  addPoint(point: DrawPoint): void;
  /** Finish the current stroke and return the points. */
  finishStroke(): readonly DrawPoint[];
  /** Cancel the current stroke. */
  cancelStroke(): void;
}
