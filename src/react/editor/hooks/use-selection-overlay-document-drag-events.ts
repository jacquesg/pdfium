import { type MutableRefObject, useEffect } from 'react';
import type { DragSession } from '../components/selection-overlay.types.js';

interface UseSelectionOverlayDocumentDragEventsOptions {
  readonly applyDragAtClientPosition: (
    session: DragSession,
    clientX: number,
    clientY: number,
    modifiers?: { shiftKey?: boolean },
  ) => void;
  readonly dragModifierStateRef: MutableRefObject<{ shiftKey: boolean }>;
  readonly dragSessionRef: MutableRefObject<DragSession | null>;
  readonly dragging: boolean;
  readonly finishActiveSession: (session: DragSession) => void;
  readonly resolveShiftKey: (eventShiftKey?: boolean) => boolean;
}

export function useSelectionOverlayDocumentDragEvents({
  applyDragAtClientPosition,
  dragModifierStateRef,
  dragSessionRef,
  dragging,
  finishActiveSession,
  resolveShiftKey,
}: UseSelectionOverlayDocumentDragEventsOptions): void {
  useEffect(() => {
    if (!dragging) {
      return;
    }

    const handleDocumentKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Shift') {
        dragModifierStateRef.current = { shiftKey: true };
      }
    };
    const handleDocumentKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'Shift') {
        dragModifierStateRef.current = { shiftKey: false };
      }
    };
    const handleDocumentMouseMove = (event: MouseEvent) => {
      const session = dragSessionRef.current;
      if (!session || !dragging) return;
      applyDragAtClientPosition(session, event.clientX, event.clientY, { shiftKey: resolveShiftKey(event.shiftKey) });
    };
    const handleDocumentMouseUp = () => {
      const session = dragSessionRef.current;
      if (!session) return;
      finishActiveSession(session);
    };

    globalThis.document.addEventListener('keydown', handleDocumentKeyDown);
    globalThis.document.addEventListener('keyup', handleDocumentKeyUp);
    globalThis.document.addEventListener('mousemove', handleDocumentMouseMove);
    globalThis.document.addEventListener('mouseup', handleDocumentMouseUp);
    return () => {
      globalThis.document.removeEventListener('keydown', handleDocumentKeyDown);
      globalThis.document.removeEventListener('keyup', handleDocumentKeyUp);
      globalThis.document.removeEventListener('mousemove', handleDocumentMouseMove);
      globalThis.document.removeEventListener('mouseup', handleDocumentMouseUp);
    };
  }, [applyDragAtClientPosition, dragModifierStateRef, dragSessionRef, dragging, finishActiveSession, resolveShiftKey]);
}
