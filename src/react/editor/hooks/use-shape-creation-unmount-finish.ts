import type { MutableRefObject } from 'react';
import { useEffect } from 'react';

interface UseShapeCreationUnmountFinishOptions {
  readonly activePointerIdRef: MutableRefObject<number | null>;
  readonly finishDragAtClientPosition: (clientX: number, clientY: number, shiftKey: boolean) => void;
  readonly resetDragLifecycle: (pointerId?: number) => void;
  readonly resolveUnmountFallbackClientPoint: () => { clientX: number; clientY: number } | null;
}

export function useShapeCreationUnmountFinish({
  activePointerIdRef,
  finishDragAtClientPosition,
  resetDragLifecycle,
  resolveUnmountFallbackClientPoint,
}: UseShapeCreationUnmountFinishOptions): void {
  useEffect(() => {
    return () => {
      const activePointerId = activePointerIdRef.current;
      if (activePointerId === null) {
        return;
      }
      const fallbackClientPoint = resolveUnmountFallbackClientPoint();
      if (fallbackClientPoint === null) {
        return;
      }
      finishDragAtClientPosition(fallbackClientPoint.clientX, fallbackClientPoint.clientY, false);
      resetDragLifecycle(activePointerId);
    };
  }, [activePointerIdRef, finishDragAtClientPosition, resetDragLifecycle, resolveUnmountFallbackClientPoint]);
}
