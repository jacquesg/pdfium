import { useCallback } from 'react';
import type { UseAnnotationStyleColourControlsOptions } from './annotation-style-colour-control.types.js';
import { useAnnotationStyleFillOpacityState } from './use-annotation-style-fill-opacity-state.js';

type UseAnnotationStyleFillOpacityMutationOptions = Pick<
  UseAnnotationStyleColourControlsOptions,
  | 'applyFillPreset'
  | 'applyOpacityPreset'
  | 'applyPreviewPatch'
  | 'applyStrokePreset'
  | 'canToggleFill'
  | 'fillEnabled'
  | 'liveInteriorColourRef'
  | 'liveStrokeColourRef'
  | 'queueColourCommit'
  | 'setLocalInteriorColour'
  | 'setLocalStrokeColour'
>;

export function useAnnotationStyleFillOpacityMutation({
  applyFillPreset,
  applyOpacityPreset,
  applyPreviewPatch,
  applyStrokePreset,
  canToggleFill,
  fillEnabled,
  liveInteriorColourRef,
  liveStrokeColourRef,
  queueColourCommit,
  setLocalInteriorColour,
  setLocalStrokeColour,
}: UseAnnotationStyleFillOpacityMutationOptions) {
  const applyFillOpacityState = useAnnotationStyleFillOpacityState({
    applyFillPreset,
    applyPreviewPatch,
    applyStrokePreset,
    canToggleFill,
    fillEnabled,
    liveInteriorColourRef,
    liveStrokeColourRef,
    queueColourCommit,
    setLocalInteriorColour,
    setLocalStrokeColour,
  });

  return useCallback(
    (nextAlpha: number, nextOpacity: number) => {
      if (!applyFillOpacityState(nextAlpha)) {
        return;
      }
      applyOpacityPreset(nextOpacity);
    },
    [applyFillOpacityState, applyOpacityPreset],
  );
}
