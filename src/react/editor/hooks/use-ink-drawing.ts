/**
 * Ink drawing hook.
 *
 * Captures pointer events to build SVG-like path points for
 * freehand drawing. On completion, creates an Ink annotation.
 *
 * @module react/editor/hooks/use-ink-drawing
 */

import { useCallback, useRef, useState } from 'react';

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

/**
 * Manages freehand drawing state for the ink tool.
 *
 * Consumers are responsible for converting screen coordinates
 * to PDF coordinates and creating the annotation on completion.
 */
export function useInkDrawing(): InkDrawingActions {
  const [isDrawing, setIsDrawing] = useState(false);
  const [points, setPoints] = useState<readonly DrawPoint[]>([]);
  const pointsRef = useRef<DrawPoint[]>([]);

  const startStroke = useCallback((point: DrawPoint) => {
    pointsRef.current = [point];
    setPoints([point]);
    setIsDrawing(true);
  }, []);

  const addPoint = useCallback((point: DrawPoint) => {
    pointsRef.current.push(point);
    setPoints([...pointsRef.current]);
  }, []);

  const finishStroke = useCallback((): readonly DrawPoint[] => {
    const result = [...pointsRef.current];
    pointsRef.current = [];
    setPoints([]);
    setIsDrawing(false);
    return result;
  }, []);

  const cancelStroke = useCallback(() => {
    pointsRef.current = [];
    setPoints([]);
    setIsDrawing(false);
  }, []);

  return { isDrawing, points, startStroke, addPoint, finishStroke, cancelStroke };
}
