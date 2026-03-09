import type { PointerEvent as ReactPointerEvent } from 'react';
import type { DragSession } from '../components/selection-overlay.types.js';

export interface UseSelectionOverlayPointerHandlersOptions {
  readonly applyDragAtClientPosition: (
    session: DragSession,
    clientX: number,
    clientY: number,
    modifiers?: { shiftKey?: boolean },
  ) => void;
  readonly cancelActiveSession: (session: DragSession | null) => void;
  readonly dragging: boolean;
  readonly dragSessionRef: { current: DragSession | null };
  readonly finishActiveSession: (session: DragSession) => void;
  readonly resolveShiftKey: (eventShiftKey?: boolean) => boolean;
}

export interface UseSelectionOverlayPointerHandlersResult {
  readonly capturePointer: (event: ReactPointerEvent) => void;
  readonly handleLostPointerCapture: () => void;
  readonly handlePointerCancel: (event: ReactPointerEvent) => void;
  readonly handlePointerMove: (event: ReactPointerEvent) => void;
  readonly handlePointerUp: (event: ReactPointerEvent) => void;
}
