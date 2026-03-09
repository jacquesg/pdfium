import { useCallback } from 'react';
import type { BoxDragSession, DragSession, LineDragSession } from '../components/selection-overlay.types.js';

interface UseSelectionOverlayPreviewDragActionsOptions {
  readonly applyBoxDragPreview: (
    session: BoxDragSession,
    clientX: number,
    clientY: number,
    modifiers?: { shiftKey?: boolean },
  ) => void;
  readonly applyLineDragPreview: (
    session: LineDragSession,
    clientX: number,
    clientY: number,
    modifiers?: { shiftKey?: boolean },
  ) => void;
  readonly finishBoxPreviewSession: (session: BoxDragSession) => void;
  readonly finishLinePreviewSession: (session: LineDragSession) => void;
  readonly onPreviewClear?: (() => void) | undefined;
}

function isBoxDragSession(session: DragSession): session is BoxDragSession {
  return session.mode === 'move' || session.mode === 'resize';
}

export function useSelectionOverlayPreviewDragActions({
  applyBoxDragPreview,
  applyLineDragPreview,
  finishBoxPreviewSession,
  finishLinePreviewSession,
  onPreviewClear,
}: UseSelectionOverlayPreviewDragActionsOptions) {
  const applyDragAtClientPosition = useCallback(
    (session: DragSession, clientX: number, clientY: number, modifiers?: { shiftKey?: boolean }) => {
      if (isBoxDragSession(session)) {
        applyBoxDragPreview(session, clientX, clientY, modifiers);
        return;
      }
      applyLineDragPreview(session, clientX, clientY, modifiers);
    },
    [applyBoxDragPreview, applyLineDragPreview],
  );

  const finishDragSession = useCallback(
    (session: DragSession) => {
      if (isBoxDragSession(session)) {
        finishBoxPreviewSession(session);
      } else {
        finishLinePreviewSession(session);
      }

      onPreviewClear?.();
    },
    [finishBoxPreviewSession, finishLinePreviewSession, onPreviewClear],
  );

  return {
    applyDragAtClientPosition,
    finishDragSession,
  };
}
