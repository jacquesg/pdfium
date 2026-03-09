import type { Dispatch, SetStateAction } from 'react';
import { useCallback } from 'react';
import type { FreeTextInputState } from './use-freetext-input.js';

export const INITIAL_FREE_TEXT_INPUT_STATE: FreeTextInputState = {
  isActive: false,
  position: null,
  text: '',
};

interface UseFreeTextInputStateActionsOptions {
  readonly setState: Dispatch<SetStateAction<FreeTextInputState>>;
}

export function useFreeTextInputStateActions({ setState }: UseFreeTextInputStateActionsOptions) {
  const activate = useCallback(
    (position: { x: number; y: number }) => {
      setState({ isActive: true, position, text: '' });
    },
    [setState],
  );

  const setText = useCallback(
    (text: string) => {
      setState((prev) => ({ ...prev, text }));
    },
    [setState],
  );

  const cancel = useCallback(() => {
    setState(INITIAL_FREE_TEXT_INPUT_STATE);
  }, [setState]);

  return {
    activate,
    cancel,
    setText,
  };
}
