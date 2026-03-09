import { useCallback } from 'react';
import type { UseAnnotationStylePrimaryOpacityMutationOptions } from './use-annotation-style-primary-opacity-mutation.types.js';

type StrokeOptions = Pick<
  UseAnnotationStylePrimaryOpacityMutationOptions,
  | 'applyOpacityPreset'
  | 'applyPreviewPatch'
  | 'applyStrokePreset'
  | 'liveStrokeColourRef'
  | 'queueColourCommit'
  | 'setLocalStrokeColour'
>;

export function useAnnotationStyleStrokeOpacityMutation({
  applyOpacityPreset,
  applyPreviewPatch,
  applyStrokePreset,
  liveStrokeColourRef,
  queueColourCommit,
  setLocalStrokeColour,
}: StrokeOptions) {
  return useCallback(
    (nextAlpha: number, nextOpacity: number) => {
      const currentStroke = liveStrokeColourRef.current;
      if (currentStroke.a === nextAlpha) {
        return;
      }
      const next = { ...currentStroke, a: nextAlpha };
      setLocalStrokeColour(next);
      liveStrokeColourRef.current = next;
      applyPreviewPatch({
        colour: {
          stroke: next,
        },
      });
      applyStrokePreset(next);
      applyOpacityPreset(nextOpacity);
      queueColourCommit('stroke', currentStroke, next);
    },
    [
      applyOpacityPreset,
      applyPreviewPatch,
      applyStrokePreset,
      liveStrokeColourRef,
      queueColourCommit,
      setLocalStrokeColour,
    ],
  );
}
