import { useCallback } from 'react';
import { resolvePresetTarget } from './annotation-style-editing-support.js';
import type { UseAnnotationStylePresetsOptions } from './annotation-style-presets.types.js';

export function useAnnotationStyleBorderOpacityPresets({
  effectiveType,
  onToolConfigChange,
}: Omit<UseAnnotationStylePresetsOptions, 'localBorderWidth'>) {
  const presetTarget = resolvePresetTarget(effectiveType);

  const applyBorderPreset = useCallback(
    (borderWidth: number) => {
      if (!onToolConfigChange || !presetTarget) return;
      switch (presetTarget) {
        case 'rectangle':
        case 'circle':
        case 'line':
          onToolConfigChange(presetTarget, { strokeWidth: borderWidth });
          return;
        case 'ink':
          onToolConfigChange('ink', { strokeWidth: Math.max(0.25, borderWidth) });
          return;
      }
    },
    [onToolConfigChange, presetTarget],
  );

  const applyOpacityPreset = useCallback(
    (opacity: number) => {
      if (!onToolConfigChange || !presetTarget) return;
      if (presetTarget === 'highlight' || presetTarget === 'underline' || presetTarget === 'strikeout') {
        onToolConfigChange(presetTarget, { opacity });
      }
    },
    [onToolConfigChange, presetTarget],
  );

  return {
    applyBorderPreset,
    applyOpacityPreset,
  };
}
