import { type MutableRefObject, type RefObject, useEffect } from 'react';
import type { FreeTextInputActions } from './use-freetext-input.js';

interface UseFreeTextEditorLifecycleOptions {
  readonly commitInFlightRef: MutableRefObject<boolean>;
  readonly input: FreeTextInputActions;
  readonly textareaRef: RefObject<HTMLTextAreaElement | null>;
}

export function useFreeTextEditorLifecycle({
  commitInFlightRef,
  input,
  textareaRef,
}: UseFreeTextEditorLifecycleOptions): void {
  useEffect(() => {
    if (input.state.isActive && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [input.state.isActive, textareaRef]);

  useEffect(() => {
    if (!input.state.isActive) {
      commitInFlightRef.current = false;
    }
  }, [commitInFlightRef, input.state.isActive]);
}
