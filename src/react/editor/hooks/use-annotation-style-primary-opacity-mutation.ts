import { useAnnotationStyleInteriorOpacityMutation } from './use-annotation-style-interior-opacity-mutation.js';
import type { UseAnnotationStylePrimaryOpacityMutationOptions } from './use-annotation-style-primary-opacity-mutation.types.js';
import { useAnnotationStyleStrokeOpacityMutation } from './use-annotation-style-stroke-opacity-mutation.js';

export function useAnnotationStylePrimaryOpacityMutation({
  applyFillPreset,
  applyOpacityPreset,
  applyPreviewPatch,
  applyStrokePreset,
  canToggleFill,
  fillEnabled,
  liveInteriorColourRef,
  liveStrokeColourRef,
  primaryColourType,
  queueColourCommit,
  setLocalInteriorColour,
  setLocalStrokeColour,
}: UseAnnotationStylePrimaryOpacityMutationOptions) {
  const applyInteriorOpacityValue = useAnnotationStyleInteriorOpacityMutation({
    applyFillPreset,
    applyOpacityPreset,
    applyPreviewPatch,
    canToggleFill,
    fillEnabled,
    liveInteriorColourRef,
    queueColourCommit,
    setLocalInteriorColour,
  });
  const applyStrokeOpacityValue = useAnnotationStyleStrokeOpacityMutation({
    applyOpacityPreset,
    applyPreviewPatch,
    applyStrokePreset,
    liveStrokeColourRef,
    queueColourCommit,
    setLocalStrokeColour,
  });

  return primaryColourType === 'interior' ? applyInteriorOpacityValue : applyStrokeOpacityValue;
}
