import { useCallback } from 'react';
import type { Colour } from '../../../core/types.js';
import { resolvePresetTarget, withFullAlpha } from './annotation-style-editing-support.js';
import type { UseAnnotationStylePresetsOptions } from './annotation-style-presets.types.js';

export function useAnnotationStyleColourPresets({
  effectiveType,
  localBorderWidth,
  onToolConfigChange,
}: UseAnnotationStylePresetsOptions) {
  const presetTarget = resolvePresetTarget(effectiveType);

  const applyStrokePreset = useCallback(
    (colour: Colour) => {
      if (!onToolConfigChange || !presetTarget) return;
      switch (presetTarget) {
        case 'rectangle':
        case 'circle':
        case 'line':
          onToolConfigChange(presetTarget, { strokeColour: colour });
          return;
        case 'ink':
          onToolConfigChange('ink', { colour, strokeWidth: Math.max(0.25, localBorderWidth) });
          return;
        case 'freetext':
          onToolConfigChange('freetext', { colour });
          return;
        case 'underline':
        case 'strikeout':
          onToolConfigChange(presetTarget, { colour: withFullAlpha(colour), opacity: colour.a / 255 });
          return;
      }
    },
    [localBorderWidth, onToolConfigChange, presetTarget],
  );

  const applyFillPreset = useCallback(
    (colour: Colour, enabled: boolean) => {
      if (!onToolConfigChange || !presetTarget) return;
      switch (presetTarget) {
        case 'rectangle':
        case 'circle':
          onToolConfigChange(presetTarget, { fillColour: enabled ? colour : null });
          return;
        case 'highlight':
          onToolConfigChange('highlight', { colour: withFullAlpha(colour), opacity: colour.a / 255 });
          return;
        case 'redact':
          onToolConfigChange('redact', { fillColour: colour });
          return;
      }
    },
    [onToolConfigChange, presetTarget],
  );

  return {
    applyFillPreset,
    applyStrokePreset,
  };
}
