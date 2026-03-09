import { useCallback, useRef, useState } from 'react';
import type { DragSession } from '../components/selection-overlay.types.js';
import { releasePointerCaptureIfHeld } from '../components/selection-overlay-geometry.js';

interface UseSelectionOverlayDragSessionOptions {
  readonly cancelDragSession: (session: DragSession | null) => void;
  readonly finishDragSession: (session: DragSession) => void;
}

export function useSelectionOverlayDragSession({
  cancelDragSession,
  finishDragSession,
}: UseSelectionOverlayDragSessionOptions) {
  const [dragging, setDragging] = useState(false);
  const dragSessionRef = useRef<DragSession | null>(null);
  const dragModifierStateRef = useRef<{ shiftKey: boolean }>({ shiftKey: false });

  const resolveShiftKey = useCallback((eventShiftKey?: boolean): boolean => {
    return eventShiftKey === true || dragModifierStateRef.current.shiftKey;
  }, []);

  const resetDragLifecycle = useCallback((session: DragSession | null) => {
    if (session !== null) {
      releasePointerCaptureIfHeld(session.captureElement, session.pointerId);
    }
    dragModifierStateRef.current = { shiftKey: false };
    dragSessionRef.current = null;
    setDragging(false);
  }, []);

  const startDragSession = useCallback((session: DragSession, shiftKey: boolean) => {
    dragSessionRef.current = session;
    dragModifierStateRef.current = { shiftKey };
    setDragging(true);
  }, []);

  const finishActiveSession = useCallback(
    (session: DragSession) => {
      finishDragSession(session);
      resetDragLifecycle(session);
    },
    [finishDragSession, resetDragLifecycle],
  );

  const cancelActiveSession = useCallback(
    (session: DragSession | null) => {
      cancelDragSession(session);
      resetDragLifecycle(session);
    },
    [cancelDragSession, resetDragLifecycle],
  );

  return {
    cancelActiveSession,
    dragModifierStateRef,
    dragSessionRef,
    dragging,
    finishActiveSession,
    resolveShiftKey,
    startDragSession,
  };
}
