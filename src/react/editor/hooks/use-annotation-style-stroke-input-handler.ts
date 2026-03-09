import { useCallback } from 'react';
import type {
  InputEvent,
  UseAnnotationStyleColourControlsOptions,
  UseAnnotationStyleColourControlsResult,
} from './annotation-style-colour-control.types.js';
import { coloursEqual, parseHexToColour } from './annotation-style-editing-support.js';

type StrokeInputHandlerResult = Pick<UseAnnotationStyleColourControlsResult, 'handleStrokeColourChange'>;

type UseAnnotationStyleStrokeInputHandlerOptions = Pick<
  UseAnnotationStyleColourControlsOptions,
  | 'applyPreviewPatch'
  | 'applyStrokePreset'
  | 'canEditStroke'
  | 'liveStrokeColourRef'
  | 'queueColourCommit'
  | 'setLocalStrokeColour'
>;

export function useAnnotationStyleStrokeInputHandler({
  applyPreviewPatch,
  applyStrokePreset,
  canEditStroke,
  liveStrokeColourRef,
  queueColourCommit,
  setLocalStrokeColour,
}: UseAnnotationStyleStrokeInputHandlerOptions): StrokeInputHandlerResult {
  const handleStrokeColourChange = useCallback(
    (event: InputEvent) => {
      if (!canEditStroke) return;
      const oldColour = liveStrokeColourRef.current;
      const newColour = parseHexToColour(event.currentTarget.value, oldColour.a);
      if (newColour === null || coloursEqual(oldColour, newColour)) {
        return;
      }
      setLocalStrokeColour(newColour);
      liveStrokeColourRef.current = newColour;
      applyPreviewPatch({
        colour: {
          stroke: newColour,
        },
      });
      applyStrokePreset(newColour);
      queueColourCommit('stroke', oldColour, newColour);
    },
    [applyPreviewPatch, applyStrokePreset, canEditStroke, liveStrokeColourRef, queueColourCommit, setLocalStrokeColour],
  );

  return { handleStrokeColourChange };
}
