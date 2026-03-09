import type { MutableRefObject } from 'react';
import { type PointerEvent as ReactPointerEvent, useCallback } from 'react';
import type { DrawPoint, InkDrawingActions } from './use-ink-drawing.js';

interface UseInkCanvasPointerCompletionOptions {
  readonly activePointerIdRef: MutableRefObject<number | null>;
  readonly clearSession: () => void;
  readonly drawing: InkDrawingActions;
  readonly onStrokeComplete?: ((points: readonly DrawPoint[]) => void) | undefined;
  readonly resetSession: (pointerId: number) => void;
}

export function useInkCanvasPointerCompletion({
  activePointerIdRef,
  clearSession,
  drawing,
  onStrokeComplete,
  resetSession,
}: UseInkCanvasPointerCompletionOptions) {
  const handlePointerUp = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      if (activePointerIdRef.current === null || event.pointerId !== activePointerIdRef.current) return;
      event.preventDefault();
      event.stopPropagation();
      if (drawing.isDrawing) {
        const points = drawing.finishStroke();
        onStrokeComplete?.(points);
      }
      resetSession(event.pointerId);
    },
    [activePointerIdRef, drawing, onStrokeComplete, resetSession],
  );

  const handlePointerCancel = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      if (activePointerIdRef.current === null || event.pointerId !== activePointerIdRef.current) return;
      event.preventDefault();
      event.stopPropagation();
      if (drawing.isDrawing) {
        drawing.cancelStroke();
      }
      resetSession(event.pointerId);
    },
    [activePointerIdRef, drawing, resetSession],
  );

  const handleLostPointerCapture = useCallback(() => {
    if (drawing.isDrawing) {
      drawing.cancelStroke();
    }
    clearSession();
  }, [clearSession, drawing]);

  return {
    handleLostPointerCapture,
    handlePointerCancel,
    handlePointerUp,
  };
}
