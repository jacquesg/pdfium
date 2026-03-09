import type { DragSession } from '../components/selection-overlay.types.js';
import { useSelectionOverlayDocumentDragEvents } from './use-selection-overlay-document-drag-events.js';
import { useSelectionOverlayDragSession } from './use-selection-overlay-drag-session.js';

interface UseSelectionOverlayPointerRuntimeOptions {
  readonly applyDragAtClientPosition: (
    session: DragSession,
    clientX: number,
    clientY: number,
    modifiers?: { shiftKey?: boolean },
  ) => void;
  readonly cancelDragSession: (session: DragSession | null) => void;
  readonly finishDragSession: (session: DragSession) => void;
}

export function useSelectionOverlayPointerRuntime({
  applyDragAtClientPosition,
  cancelDragSession,
  finishDragSession,
}: UseSelectionOverlayPointerRuntimeOptions) {
  const dragSession = useSelectionOverlayDragSession({
    cancelDragSession,
    finishDragSession,
  });

  useSelectionOverlayDocumentDragEvents({
    applyDragAtClientPosition,
    dragModifierStateRef: dragSession.dragModifierStateRef,
    dragSessionRef: dragSession.dragSessionRef,
    dragging: dragSession.dragging,
    finishActiveSession: dragSession.finishActiveSession,
    resolveShiftKey: dragSession.resolveShiftKey,
  });

  return dragSession;
}
