import { type FocusEvent as ReactFocusEvent, useCallback } from 'react';
import type {
  UseAnnotationStyleColourControlsOptions,
  UseAnnotationStyleColourControlsResult,
} from './annotation-style-colour-control.types.js';
import { useAnnotationStyleFillToggle } from './use-annotation-style-fill-toggle.js';
import { useAnnotationStyleOpacityInputControls } from './use-annotation-style-opacity-input-controls.js';
import { useAnnotationStyleOpacityMutation } from './use-annotation-style-opacity-mutation.js';

type OpacityFillControlsResult = Pick<
  UseAnnotationStyleColourControlsResult,
  | 'handleFillEnabledChange'
  | 'handleOpacityClick'
  | 'handleOpacityInputChange'
  | 'handleOpacityMouseEnd'
  | 'handleOpacityPointerEnd'
  | 'handleStyleInputBlur'
>;

export function useAnnotationStyleOpacityFillControls({
  panelRootRef,
  flushStyleCommits,
  ...options
}: UseAnnotationStyleColourControlsOptions): OpacityFillControlsResult {
  const { handleFillEnabledChange } = useAnnotationStyleFillToggle({ panelRootRef, flushStyleCommits, ...options });
  const { applyOpacityValue } = useAnnotationStyleOpacityMutation({ panelRootRef, flushStyleCommits, ...options });
  const { handleOpacityClick, handleOpacityInputChange, handleOpacityMouseEnd, handleOpacityPointerEnd } =
    useAnnotationStyleOpacityInputControls({
      applyOpacityValue,
      flushStyleCommits,
    });

  const handleStyleInputBlur = useCallback(
    (event: ReactFocusEvent<HTMLInputElement>) => {
      const nextTarget = event.relatedTarget;
      if (nextTarget instanceof Element && panelRootRef.current?.contains(nextTarget)) {
        return;
      }
      flushStyleCommits();
    },
    [flushStyleCommits, panelRootRef],
  );

  return {
    handleFillEnabledChange,
    handleOpacityClick,
    handleOpacityInputChange,
    handleOpacityMouseEnd,
    handleOpacityPointerEnd,
    handleStyleInputBlur,
  };
}
