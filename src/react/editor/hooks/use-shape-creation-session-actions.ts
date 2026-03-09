import { type MutableRefObject, useCallback } from 'react';
import type { UseShapeCreationActiveSessionOptions } from './shape-creation-active-session.types.js';

interface UseShapeCreationSessionActionsOptions
  extends Pick<
    UseShapeCreationActiveSessionOptions,
    'finishDragAtClientPosition' | 'startDragAtClientPosition' | 'updateDragAtClientPosition'
  > {
  readonly activePointerIdRef: MutableRefObject<number | null>;
  readonly captureElementRef: MutableRefObject<Element | null>;
  readonly resetDragLifecycle: (pointerId?: number) => void;
}

export function useShapeCreationSessionActions({
  activePointerIdRef,
  captureElementRef,
  finishDragAtClientPosition,
  resetDragLifecycle,
  startDragAtClientPosition,
  updateDragAtClientPosition,
}: UseShapeCreationSessionActionsOptions) {
  const startDrag = useCallback(
    (pointerId: number, captureElement: Element | null, clientX: number, clientY: number) => {
      if (!startDragAtClientPosition(clientX, clientY)) {
        return;
      }
      activePointerIdRef.current = pointerId;
      captureElementRef.current = captureElement;
    },
    [activePointerIdRef, captureElementRef, startDragAtClientPosition],
  );

  const updateActiveDrag = useCallback(
    (pointerId: number, clientX: number, clientY: number, shiftKey: boolean) => {
      if (activePointerIdRef.current === null || pointerId !== activePointerIdRef.current) {
        return;
      }
      updateDragAtClientPosition(clientX, clientY, shiftKey);
    },
    [activePointerIdRef, updateDragAtClientPosition],
  );

  const finishActiveDrag = useCallback(
    (pointerId: number, clientX: number, clientY: number, shiftKey: boolean) => {
      if (activePointerIdRef.current === null || pointerId !== activePointerIdRef.current) {
        return;
      }
      finishDragAtClientPosition(clientX, clientY, shiftKey);
      resetDragLifecycle(pointerId);
    },
    [activePointerIdRef, finishDragAtClientPosition, resetDragLifecycle],
  );

  return {
    finishActiveDrag,
    startDrag,
    updateActiveDrag,
  };
}
