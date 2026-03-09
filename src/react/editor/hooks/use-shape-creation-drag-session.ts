import type { MutableRefObject } from 'react';
import { useShapeCreationActiveSession } from './use-shape-creation-active-session.js';
import { useShapeCreationUnmountFinish } from './use-shape-creation-unmount-finish.js';

interface UseShapeCreationDragSessionOptions {
  readonly clearDrag: () => void;
  readonly finishDragAtClientPosition: (clientX: number, clientY: number, shiftKey: boolean) => void;
  readonly resolveUnmountFallbackClientPoint: () => { clientX: number; clientY: number } | null;
  readonly startDragAtClientPosition: (clientX: number, clientY: number) => boolean;
  readonly updateDragAtClientPosition: (clientX: number, clientY: number, shiftKey: boolean) => void;
}

interface UseShapeCreationDragSessionResult {
  readonly activePointerIdRef: MutableRefObject<number | null>;
  readonly captureElementRef: MutableRefObject<Element | null>;
  readonly finishActiveDrag: (pointerId: number, clientX: number, clientY: number, shiftKey: boolean) => void;
  readonly resetDragLifecycle: (pointerId?: number) => void;
  readonly startDrag: (pointerId: number, captureElement: Element | null, clientX: number, clientY: number) => void;
  readonly updateActiveDrag: (pointerId: number, clientX: number, clientY: number, shiftKey: boolean) => void;
}

export function useShapeCreationDragSession({
  clearDrag,
  finishDragAtClientPosition,
  resolveUnmountFallbackClientPoint,
  startDragAtClientPosition,
  updateDragAtClientPosition,
}: UseShapeCreationDragSessionOptions): UseShapeCreationDragSessionResult {
  const session = useShapeCreationActiveSession({
    clearDrag,
    finishDragAtClientPosition,
    startDragAtClientPosition,
    updateDragAtClientPosition,
  });

  useShapeCreationUnmountFinish({
    activePointerIdRef: session.activePointerIdRef,
    finishDragAtClientPosition,
    resetDragLifecycle: session.resetDragLifecycle,
    resolveUnmountFallbackClientPoint,
  });

  return {
    ...session,
  };
}
