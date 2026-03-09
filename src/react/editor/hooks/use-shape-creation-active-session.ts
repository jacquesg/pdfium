import { useRef } from 'react';
import type {
  UseShapeCreationActiveSessionOptions,
  UseShapeCreationActiveSessionResult,
} from './shape-creation-active-session.types.js';
import { useShapeCreationSessionActions } from './use-shape-creation-session-actions.js';
import { useShapeCreationSessionReset } from './use-shape-creation-session-reset.js';

export function useShapeCreationActiveSession({
  clearDrag,
  finishDragAtClientPosition,
  startDragAtClientPosition,
  updateDragAtClientPosition,
}: UseShapeCreationActiveSessionOptions): UseShapeCreationActiveSessionResult {
  const activePointerIdRef = useRef<number | null>(null);
  const captureElementRef = useRef<Element | null>(null);
  const resetDragLifecycle = useShapeCreationSessionReset({
    activePointerIdRef,
    captureElementRef,
    clearDrag,
  });
  const { finishActiveDrag, startDrag, updateActiveDrag } = useShapeCreationSessionActions({
    activePointerIdRef,
    captureElementRef,
    finishDragAtClientPosition,
    resetDragLifecycle,
    startDragAtClientPosition,
    updateDragAtClientPosition,
  });

  return {
    activePointerIdRef,
    captureElementRef,
    finishActiveDrag,
    resetDragLifecycle,
    startDrag,
    updateActiveDrag,
  };
}
