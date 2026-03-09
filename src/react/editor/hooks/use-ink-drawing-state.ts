import { useCallback, useRef, useState } from 'react';
import type { DrawPoint } from './ink-drawing.types.js';

export function useInkDrawingState() {
  const [isDrawing, setIsDrawing] = useState(false);
  const [points, setPoints] = useState<readonly DrawPoint[]>([]);
  const pointsRef = useRef<DrawPoint[]>([]);

  const setStroke = useCallback((nextPoints: readonly DrawPoint[], drawing: boolean) => {
    pointsRef.current = [...nextPoints];
    setPoints(pointsRef.current);
    setIsDrawing(drawing);
  }, []);

  const resetStroke = useCallback(() => {
    pointsRef.current = [];
    setPoints([]);
    setIsDrawing(false);
  }, []);

  return {
    isDrawing,
    points,
    pointsRef,
    resetStroke,
    setStroke,
  };
}
