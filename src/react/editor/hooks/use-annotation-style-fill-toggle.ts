import { type ChangeEvent, useCallback } from 'react';
import type {
  UseAnnotationStyleColourControlsOptions,
  UseAnnotationStyleColourControlsResult,
} from './annotation-style-colour-control.types.js';
import { coloursEqual } from './annotation-style-editing-support.js';

type FillToggleResult = Pick<UseAnnotationStyleColourControlsResult, 'handleFillEnabledChange'>;

export function useAnnotationStyleFillToggle({
  annotationInteriorColour,
  canToggleFill,
  fillColourType,
  liveInteriorColourRef,
  liveStrokeColourRef,
  queueColourCommit,
  setFillEnabled,
  setLocalInteriorColour,
  flushPreviewIfStyleIdle,
  applyFillPreset,
  applyPreviewPatch,
}: UseAnnotationStyleColourControlsOptions): FillToggleResult {
  const handleFillEnabledChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (!canToggleFill) return;
      const nextEnabled = event.currentTarget.checked;
      const previousInterior = liveInteriorColourRef.current;
      const sourceInterior = annotationInteriorColour ?? previousInterior;
      const fallbackAlpha = liveStrokeColourRef.current.a > 0 ? liveStrokeColourRef.current.a : 255;
      const nextColour = nextEnabled
        ? { ...previousInterior, a: previousInterior.a > 0 ? previousInterior.a : fallbackAlpha }
        : { ...previousInterior, a: 0 };
      setFillEnabled(nextEnabled);
      setLocalInteriorColour(nextColour);
      liveInteriorColourRef.current = nextColour;
      applyPreviewPatch({
        colour: {
          interior: nextColour,
        },
      });
      applyFillPreset(nextColour, nextEnabled);
      if (!coloursEqual(sourceInterior, nextColour)) {
        queueColourCommit(fillColourType, sourceInterior, nextColour);
        return;
      }
      flushPreviewIfStyleIdle();
    },
    [
      annotationInteriorColour,
      applyFillPreset,
      applyPreviewPatch,
      canToggleFill,
      fillColourType,
      flushPreviewIfStyleIdle,
      liveInteriorColourRef,
      liveStrokeColourRef,
      queueColourCommit,
      setFillEnabled,
      setLocalInteriorColour,
    ],
  );

  return { handleFillEnabledChange };
}
