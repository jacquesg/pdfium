import { useCallback } from 'react';
import type { UseAnnotationStyleColourControlsOptions } from './annotation-style-colour-control.types.js';
import { opacityAffectsFill } from './annotation-style-editing-support.js';

interface UseAnnotationStyleOpacityStrategyOptions {
  readonly applyFillOpacityValue: (nextAlpha: number, nextOpacity: number) => void;
  readonly applyPrimaryOpacityValue: (nextAlpha: number, nextOpacity: number) => void;
  readonly effectiveType: UseAnnotationStyleColourControlsOptions['effectiveType'];
}

export function useAnnotationStyleOpacityStrategy({
  applyFillOpacityValue,
  applyPrimaryOpacityValue,
  effectiveType,
}: UseAnnotationStyleOpacityStrategyOptions) {
  return useCallback(
    (nextAlpha: number, nextOpacity: number) => {
      if (opacityAffectsFill(effectiveType)) {
        applyFillOpacityValue(nextAlpha, nextOpacity);
        return;
      }

      applyPrimaryOpacityValue(nextAlpha, nextOpacity);
    },
    [applyFillOpacityValue, applyPrimaryOpacityValue, effectiveType],
  );
}
