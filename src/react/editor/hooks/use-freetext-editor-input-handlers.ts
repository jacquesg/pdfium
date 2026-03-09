import { type ChangeEvent, type KeyboardEvent, useCallback } from 'react';
import type { FreeTextInputActions } from './use-freetext-input.js';

interface UseFreeTextEditorInputHandlersOptions {
  readonly commit: () => Promise<void>;
  readonly input: FreeTextInputActions;
}

export function useFreeTextEditorInputHandlers({ commit, input }: UseFreeTextEditorInputHandlersOptions) {
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      input.setText(event.target.value);
    },
    [input],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        input.cancel();
        return;
      }

      if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        void commit();
      }
    },
    [commit, input],
  );

  const handleBlur = useCallback(() => {
    void commit();
  }, [commit]);

  return {
    handleBlur,
    handleChange,
    handleKeyDown,
  };
}
