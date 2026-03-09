import type { PointerEvent as ReactPointerEvent } from 'react';
import type { DragSession } from '../components/selection-overlay.types.js';
import { useSelectionOverlayPointerHandlers } from './use-selection-overlay-pointer-handlers.js';
import { useSelectionOverlayPointerRuntime } from './use-selection-overlay-pointer-runtime.js';

interface UseSelectionOverlayPointerLifecycleOptions {
  readonly applyDragAtClientPosition: (
    session: DragSession,
    clientX: number,
    clientY: number,
    modifiers?: { shiftKey?: boolean },
  ) => void;
  readonly cancelDragSession: (session: DragSession | null) => void;
  readonly finishDragSession: (session: DragSession) => void;
}

interface UseSelectionOverlayPointerLifecycleResult {
  readonly capturePointer: (event: ReactPointerEvent) => void;
  readonly dragging: boolean;
  readonly handleLostPointerCapture: () => void;
  readonly handlePointerCancel: (event: ReactPointerEvent) => void;
  readonly handlePointerMove: (event: ReactPointerEvent) => void;
  readonly handlePointerUp: (event: ReactPointerEvent) => void;
  readonly startDragSession: (session: DragSession, shiftKey: boolean) => void;
}

export function useSelectionOverlayPointerLifecycle({
  applyDragAtClientPosition,
  cancelDragSession,
  finishDragSession,
}: UseSelectionOverlayPointerLifecycleOptions): UseSelectionOverlayPointerLifecycleResult {
  const { cancelActiveSession, dragSessionRef, dragging, finishActiveSession, resolveShiftKey, startDragSession } =
    useSelectionOverlayPointerRuntime({
      applyDragAtClientPosition,
      cancelDragSession,
      finishDragSession,
    });

  const { capturePointer, handleLostPointerCapture, handlePointerCancel, handlePointerMove, handlePointerUp } =
    useSelectionOverlayPointerHandlers({
      applyDragAtClientPosition,
      cancelActiveSession,
      dragging,
      dragSessionRef,
      finishActiveSession,
      resolveShiftKey,
    });

  return {
    capturePointer,
    dragging,
    handleLostPointerCapture,
    handlePointerCancel,
    handlePointerMove,
    handlePointerUp,
    startDragSession,
  };
}
