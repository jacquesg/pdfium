/**
 * Ink drawing hook.
 *
 * Captures pointer events to build SVG-like path points for
 * freehand drawing. On completion, creates an Ink annotation.
 *
 * @module react/editor/hooks/use-ink-drawing
 */

import { useCallback } from 'react';
import type { DrawPoint, InkDrawingActions } from './ink-drawing.types.js';
import { useInkDrawingState } from './use-ink-drawing-state.js';

/**
 * Manages freehand drawing state for the ink tool.
 *
 * Consumers are responsible for converting screen coordinates
 * to PDF coordinates and creating the annotation on completion.
 */
export function useInkDrawing(): InkDrawingActions {
  const { isDrawing, points, pointsRef, resetStroke, setStroke } = useInkDrawingState();

  const startStroke = useCallback(
    (point: DrawPoint) => {
      setStroke([point], true);
    },
    [setStroke],
  );

  const addPoint = useCallback(
    (point: DrawPoint) => {
      setStroke([...pointsRef.current, point], true);
    },
    [pointsRef, setStroke],
  );

  const finishStroke = useCallback((): readonly DrawPoint[] => {
    const result = [...pointsRef.current];
    resetStroke();
    return result;
  }, [pointsRef, resetStroke]);

  return { isDrawing, points, startStroke, addPoint, finishStroke, cancelStroke: resetStroke };
}

export type { DrawPoint, InkDrawingActions } from './ink-drawing.types.js';
