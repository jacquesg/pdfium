import { useRef } from 'react';
import { useFreeTextEditorCommit } from './use-freetext-editor-commit.js';
import { useFreeTextEditorInputHandlers } from './use-freetext-editor-input-handlers.js';
import { useFreeTextEditorLifecycle } from './use-freetext-editor-lifecycle.js';
import type { FreeTextInputActions } from './use-freetext-input.js';

interface UseFreeTextEditorControllerOptions {
  readonly input: FreeTextInputActions;
  readonly originalHeight: number;
  readonly scale: number;
}

export function useFreeTextEditorController({ input, originalHeight, scale }: UseFreeTextEditorControllerOptions) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const commitInFlightRef = useRef(false);

  const commit = useFreeTextEditorCommit({
    commitInFlightRef,
    input,
    originalHeight,
    scale,
    textareaRef,
  });
  useFreeTextEditorLifecycle({
    commitInFlightRef,
    input,
    textareaRef,
  });
  const { handleBlur, handleChange, handleKeyDown } = useFreeTextEditorInputHandlers({
    commit,
    input,
  });

  return {
    handleBlur,
    handleChange,
    handleKeyDown,
    textareaRef,
  };
}
