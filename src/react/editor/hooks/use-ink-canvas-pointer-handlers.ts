import { type PointerEvent as ReactPointerEvent, useCallback } from 'react';
import {
  isInkSecondaryMouseButton,
  resolveInkCanvasPoint,
  setInkPointerCaptureIfSupported,
} from '../components/ink-canvas-support.js';
import { useInkCanvasPointerCompletion } from './use-ink-canvas-pointer-completion.js';
import { useInkCanvasPointerSession } from './use-ink-canvas-pointer-session.js';
import type { DrawPoint, InkDrawingActions } from './use-ink-drawing.js';

interface UseInkCanvasPointerHandlersOptions {
  readonly drawing: InkDrawingActions;
  readonly onStrokeComplete?: ((points: readonly DrawPoint[]) => void) | undefined;
}

export function useInkCanvasPointerHandlers({ drawing, onStrokeComplete }: UseInkCanvasPointerHandlersOptions) {
  const { activePointerIdRef, beginSession, clearSession, resetSession } = useInkCanvasPointerSession();

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      if (isInkSecondaryMouseButton(event)) return;
      if (activePointerIdRef.current !== null) return;
      event.preventDefault();
      event.stopPropagation();
      setInkPointerCaptureIfSupported(event.currentTarget, event.pointerId);
      beginSession(event.pointerId, event.currentTarget);
      drawing.startStroke(resolveInkCanvasPoint(event));
    },
    [activePointerIdRef, beginSession, drawing],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      if (activePointerIdRef.current === null || event.pointerId !== activePointerIdRef.current) return;
      if (!drawing.isDrawing) return;
      event.preventDefault();
      event.stopPropagation();
      drawing.addPoint(resolveInkCanvasPoint(event));
    },
    [activePointerIdRef, drawing],
  );
  const { handleLostPointerCapture, handlePointerCancel, handlePointerUp } = useInkCanvasPointerCompletion({
    activePointerIdRef,
    clearSession,
    drawing,
    onStrokeComplete,
    resetSession,
  });

  return {
    handleLostPointerCapture,
    handlePointerCancel,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
}
