import { useCallback } from 'react';
import type { UseAnnotationStyleColourControlsOptions } from './annotation-style-colour-control.types.js';
import { normalizeOpacityValue } from './annotation-style-opacity-normalization.js';
import { useAnnotationStyleFillOpacityMutation } from './use-annotation-style-fill-opacity-mutation.js';
import { useAnnotationStyleOpacityStrategy } from './use-annotation-style-opacity-strategy.js';
import { useAnnotationStylePrimaryOpacityMutation } from './use-annotation-style-primary-opacity-mutation.js';

interface AnnotationStyleOpacityMutationResult {
  readonly applyOpacityValue: (parsed: number) => void;
}

export function useAnnotationStyleOpacityMutation({
  effectiveType,
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
}: UseAnnotationStyleColourControlsOptions): AnnotationStyleOpacityMutationResult {
  const applyFillOpacityValue = useAnnotationStyleFillOpacityMutation({
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
  });
  const applyPrimaryOpacityValue = useAnnotationStylePrimaryOpacityMutation({
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
  });
  const applyOpacityStrategy = useAnnotationStyleOpacityStrategy({
    applyFillOpacityValue,
    applyPrimaryOpacityValue,
    effectiveType,
  });

  const applyOpacityValue = useCallback(
    (parsed: number) => {
      const normalized = normalizeOpacityValue(parsed);
      if (normalized === null) return;
      applyOpacityStrategy(normalized.nextAlpha, normalized.nextOpacity);
    },
    [applyOpacityStrategy],
  );

  return { applyOpacityValue };
}
