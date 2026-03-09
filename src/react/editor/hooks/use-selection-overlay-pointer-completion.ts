import { type PointerEvent as ReactPointerEvent, useCallback } from 'react';
import { isPenOrTouchPointerType } from '../components/selection-overlay-geometry.js';
import type { UseSelectionOverlayPointerHandlersOptions } from './use-selection-overlay-pointer-handlers.types.js';

type PointerCompletionOptions = Pick<
  UseSelectionOverlayPointerHandlersOptions,
  'cancelActiveSession' | 'dragSessionRef' | 'finishActiveSession'
>;

export function useSelectionOverlayPointerCompletion({
  cancelActiveSession,
  dragSessionRef,
  finishActiveSession,
}: PointerCompletionOptions) {
  const handlePointerUp = useCallback(
    (event: ReactPointerEvent) => {
      const session = dragSessionRef.current;
      if (!session || event.pointerId !== session.pointerId) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      finishActiveSession(session);
    },
    [dragSessionRef, finishActiveSession],
  );

  const handlePointerCancel = useCallback(
    (event: ReactPointerEvent) => {
      if (!isPenOrTouchPointerType(event.pointerType)) {
        return;
      }
      const session = dragSessionRef.current;
      if (session && event.pointerId !== session.pointerId) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      cancelActiveSession(session);
    },
    [cancelActiveSession, dragSessionRef],
  );

  const handleLostPointerCapture = useCallback(() => {
    // Keep the active session alive until explicit up/cancel handlers run.
  }, []);

  return {
    handleLostPointerCapture,
    handlePointerCancel,
    handlePointerUp,
  };
}
