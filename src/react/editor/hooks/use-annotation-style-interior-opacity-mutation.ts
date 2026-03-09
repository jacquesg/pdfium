import { useCallback } from 'react';
import type { UseAnnotationStylePrimaryOpacityMutationOptions } from './use-annotation-style-primary-opacity-mutation.types.js';

type InteriorOptions = Pick<
  UseAnnotationStylePrimaryOpacityMutationOptions,
  | 'applyFillPreset'
  | 'applyOpacityPreset'
  | 'applyPreviewPatch'
  | 'canToggleFill'
  | 'fillEnabled'
  | 'liveInteriorColourRef'
  | 'queueColourCommit'
  | 'setLocalInteriorColour'
>;

export function useAnnotationStyleInteriorOpacityMutation({
  applyFillPreset,
  applyOpacityPreset,
  applyPreviewPatch,
  canToggleFill,
  fillEnabled,
  liveInteriorColourRef,
  queueColourCommit,
  setLocalInteriorColour,
}: InteriorOptions) {
  return useCallback(
    (nextAlpha: number, nextOpacity: number) => {
      const currentInterior = liveInteriorColourRef.current;
      if (currentInterior.a === nextAlpha) {
        return;
      }
      const next = { ...currentInterior, a: nextAlpha };
      setLocalInteriorColour(next);
      liveInteriorColourRef.current = next;
      applyPreviewPatch({
        colour: {
          interior: next,
        },
      });
      applyFillPreset(next, !canToggleFill || fillEnabled);
      applyOpacityPreset(nextOpacity);
      queueColourCommit('interior', currentInterior, next);
    },
    [
      applyFillPreset,
      applyOpacityPreset,
      applyPreviewPatch,
      canToggleFill,
      fillEnabled,
      liveInteriorColourRef,
      queueColourCommit,
      setLocalInteriorColour,
    ],
  );
}
