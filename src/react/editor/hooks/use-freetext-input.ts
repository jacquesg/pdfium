/**
 * FreeText input hook.
 *
 * Manages the state for placing and editing free text annotations.
 *
 * @module react/editor/hooks/use-freetext-input
 */

import { useCallback, useState } from 'react';
import type { AnnotationType, Rect } from '../../../core/types.js';
import type { AnnotationCrudActions } from './use-annotation-crud.js';

/**
 * State for the freetext input.
 */
export interface FreeTextInputState {
  /** Whether the input is currently active. */
  readonly isActive: boolean;
  /** The position where the text should be placed (PDF coordinates). */
  readonly position: { x: number; y: number } | null;
  /** The current text content. */
  readonly text: string;
}

/**
 * Return type of `useFreeTextInput`.
 */
export interface FreeTextInputActions {
  /** The current input state. */
  readonly state: FreeTextInputState;
  /** Activate the input at a given PDF position. */
  activate(position: { x: number; y: number }): void;
  /** Update the text content. */
  setText(text: string): void;
  /** Confirm and create the annotation. */
  confirm(subtype: AnnotationType, rect: Rect): Promise<number | undefined>;
  /** Cancel the input. */
  cancel(): void;
}

const INITIAL_STATE: FreeTextInputState = {
  isActive: false,
  position: null,
  text: '',
};

/**
 * Manages FreeText annotation creation workflow.
 *
 * 1. User clicks on page → `activate(position)`
 * 2. User types text → `setText(text)`
 * 3. User confirms → `confirm(subtype, rect)` creates annotation
 *
 * Must be used with `useAnnotationCrud`.
 */
export function useFreeTextInput(crud: AnnotationCrudActions): FreeTextInputActions {
  const [state, setState] = useState<FreeTextInputState>(INITIAL_STATE);

  const activate = useCallback((position: { x: number; y: number }) => {
    setState({ isActive: true, position, text: '' });
  }, []);

  const setText = useCallback((text: string) => {
    setState((prev) => ({ ...prev, text }));
  }, []);

  const confirm = useCallback(
    async (subtype: AnnotationType, rect: Rect): Promise<number | undefined> => {
      if (!state.text) {
        setState(INITIAL_STATE);
        return undefined;
      }

      const index = await crud.createAnnotation(subtype, rect, { contents: state.text });
      setState(INITIAL_STATE);
      return index;
    },
    [crud, state.text],
  );

  const cancel = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  return { state, activate, setText, confirm, cancel };
}
