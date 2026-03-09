import { useCallback } from 'react';
import type {
  InputEvent,
  UseAnnotationStyleColourControlsOptions,
  UseAnnotationStyleColourControlsResult,
} from './annotation-style-colour-control.types.js';
import { useAnnotationStyleFillInputCommit } from './use-annotation-style-fill-input-commit.js';

type FillInputHandlerResult = Pick<UseAnnotationStyleColourControlsResult, 'handleInteriorColourChange'>;

export type UseAnnotationStyleFillInputHandlerOptions = Pick<
  UseAnnotationStyleColourControlsOptions,
  | 'applyFillPreset'
  | 'applyPreviewPatch'
  | 'canEditFill'
  | 'canToggleFill'
  | 'fillColourType'
  | 'fillEnabled'
  | 'liveInteriorColourRef'
  | 'liveStrokeColourRef'
  | 'queueColourCommit'
  | 'setLocalInteriorColour'
  | 'setLocalStrokeColour'
>;

export function useAnnotationStyleFillInputHandler({
  applyFillPreset,
  applyPreviewPatch,
  canEditFill,
  canToggleFill,
  fillColourType,
  fillEnabled,
  liveInteriorColourRef,
  liveStrokeColourRef,
  queueColourCommit,
  setLocalInteriorColour,
  setLocalStrokeColour,
}: UseAnnotationStyleFillInputHandlerOptions): FillInputHandlerResult {
  const commitFillColourChange = useAnnotationStyleFillInputCommit({
    applyFillPreset,
    applyPreviewPatch,
    canToggleFill,
    fillColourType,
    fillEnabled,
    liveInteriorColourRef,
    liveStrokeColourRef,
    queueColourCommit,
    setLocalInteriorColour,
    setLocalStrokeColour,
  });

  const handleInteriorColourChange = useCallback(
    (event: InputEvent) => {
      if (!canEditFill) return;
      commitFillColourChange(event.currentTarget.value);
    },
    [canEditFill, commitFillColourChange],
  );

  return { handleInteriorColourChange };
}
