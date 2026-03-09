import type { UseAnnotationStylePresetsOptions } from './annotation-style-presets.types.js';
import { useAnnotationStyleBorderOpacityPresets } from './use-annotation-style-border-opacity-presets.js';
import { useAnnotationStyleColourPresets } from './use-annotation-style-colour-presets.js';

export function useAnnotationStylePresets({
  effectiveType,
  localBorderWidth,
  onToolConfigChange,
}: UseAnnotationStylePresetsOptions) {
  const { applyFillPreset, applyStrokePreset } = useAnnotationStyleColourPresets({
    effectiveType,
    localBorderWidth,
    onToolConfigChange,
  });
  const { applyBorderPreset, applyOpacityPreset } = useAnnotationStyleBorderOpacityPresets({
    effectiveType,
    onToolConfigChange,
  });

  return {
    applyBorderPreset,
    applyFillPreset,
    applyOpacityPreset,
    applyStrokePreset,
  };
}

export type { UseAnnotationStylePresetsOptions } from './annotation-style-presets.types.js';
