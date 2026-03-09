import type { UseAnnotationStyleColourControlsOptions } from './annotation-style-colour-control.types.js';
import {
  buildFillOpacityPreviewPatch,
  resolveNextFillOpacityColours,
} from './annotation-style-fill-opacity-support.js';

type UseAnnotationStyleFillOpacityStateOptions = Pick<
  UseAnnotationStyleColourControlsOptions,
  | 'applyFillPreset'
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

export function useAnnotationStyleFillOpacityState({
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
}: UseAnnotationStyleFillOpacityStateOptions) {
  return (nextAlpha: number) => {
    const currentStroke = liveStrokeColourRef.current;
    const currentInterior = liveInteriorColourRef.current;
    const { nextInterior, nextStroke, interiorChanged, strokeChanged } = resolveNextFillOpacityColours(
      currentStroke,
      currentInterior,
      nextAlpha,
      fillEnabled,
    );

    if (!strokeChanged && !interiorChanged) {
      return false;
    }
    if (strokeChanged) {
      setLocalStrokeColour(nextStroke);
      liveStrokeColourRef.current = nextStroke;
      applyStrokePreset(nextStroke);
      queueColourCommit('stroke', currentStroke, nextStroke);
    }
    if (interiorChanged) {
      setLocalInteriorColour(nextInterior);
      liveInteriorColourRef.current = nextInterior;
      applyFillPreset(nextInterior, !canToggleFill || fillEnabled);
      queueColourCommit('interior', currentInterior, nextInterior);
    }

    applyPreviewPatch(
      buildFillOpacityPreviewPatch({
        interiorChanged,
        nextInterior,
        nextStroke,
        strokeChanged,
      }),
    );
    return true;
  };
}
