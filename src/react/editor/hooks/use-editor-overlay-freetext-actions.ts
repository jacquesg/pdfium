import { type PointerEvent as ReactPointerEvent, useCallback } from 'react';
import { getPointerOffsetWithinCurrentTarget, isSecondaryMouseButton } from './editor-overlay-action-support.js';
import type { FreeTextInputActions } from './use-freetext-input.js';

interface UseEditorOverlayFreetextActionsOptions {
  readonly freetextInput: FreeTextInputActions;
}

export function useEditorOverlayFreetextActions({ freetextInput }: UseEditorOverlayFreetextActionsOptions) {
  const freetextIsActive = freetextInput.state.isActive;

  const handleFreeTextClick = useCallback(
    (event: ReactPointerEvent) => {
      if (isSecondaryMouseButton(event) || freetextIsActive) return;
      event.preventDefault();
      freetextInput.activate(getPointerOffsetWithinCurrentTarget(event));
    },
    [freetextInput, freetextIsActive],
  );

  return {
    freetextIsActive,
    handleFreeTextClick,
  };
}
