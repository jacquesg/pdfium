import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react';
import type { DragSession } from '../components/selection-overlay.types.js';
import { isSecondaryMouseButton } from '../components/selection-overlay-geometry.js';

interface StartPointerDragSessionOptions {
  readonly buildSession: () => DragSession | null;
  readonly capturePointer: (event: ReactPointerEvent) => void;
  readonly event: ReactPointerEvent;
  readonly startDragSession: (session: DragSession, shiftKey: boolean) => void;
}

export function startPointerDragSession({
  buildSession,
  capturePointer,
  event,
  startDragSession,
}: StartPointerDragSessionOptions): void {
  if (isSecondaryMouseButton(event)) {
    return;
  }
  const session = buildSession();
  if (session === null) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  capturePointer(event);
  startDragSession(session, event.shiftKey);
}

interface StartMouseDragSessionOptions {
  readonly buildSession: () => DragSession | null;
  readonly event: ReactMouseEvent;
  readonly startDragSession: (session: DragSession, shiftKey: boolean) => void;
}

export function startMouseDragSession({ buildSession, event, startDragSession }: StartMouseDragSessionOptions): void {
  if (event.button > 0) {
    return;
  }
  const session = buildSession();
  if (session === null) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  startDragSession(session, event.shiftKey);
}
