import { type ChangeEvent, type MouseEvent as ReactMouseEvent, useCallback } from 'react';
import type { UseAnnotationStyleColourControlsResult } from './annotation-style-colour-control.types.js';
import { resolveOpacitySliderValue } from './annotation-style-opacity-slider.js';
import { useAnnotationStyleOpacityCommitHandlers } from './use-annotation-style-opacity-commit-handlers.js';

interface UseAnnotationStyleOpacityInputControlsOptions {
  readonly applyOpacityValue: (parsed: number) => void;
  readonly flushStyleCommits: () => void;
}

type OpacityInputControlsResult = Pick<
  UseAnnotationStyleColourControlsResult,
  'handleOpacityClick' | 'handleOpacityInputChange' | 'handleOpacityMouseEnd' | 'handleOpacityPointerEnd'
>;

export function useAnnotationStyleOpacityInputControls({
  applyOpacityValue,
  flushStyleCommits,
}: UseAnnotationStyleOpacityInputControlsOptions): OpacityInputControlsResult {
  const { handleOpacityMouseEnd, handleOpacityPointerEnd } = useAnnotationStyleOpacityCommitHandlers(flushStyleCommits);

  const handleOpacityInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      applyOpacityValue(Number(event.currentTarget.value));
    },
    [applyOpacityValue],
  );

  const applyOpacityFromClientX = useCallback(
    (slider: HTMLInputElement, clientX: number) => {
      const pointerValue = resolveOpacitySliderValue(slider, clientX);
      if (pointerValue === null) {
        return;
      }
      applyOpacityValue(pointerValue);
    },
    [applyOpacityValue],
  );

  const handleOpacityClick = useCallback(
    (event: ReactMouseEvent<HTMLInputElement>) => {
      applyOpacityFromClientX(event.currentTarget, event.clientX);
      flushStyleCommits();
    },
    [applyOpacityFromClientX, flushStyleCommits],
  );

  return {
    handleOpacityClick,
    handleOpacityInputChange,
    handleOpacityMouseEnd,
    handleOpacityPointerEnd,
  };
}
