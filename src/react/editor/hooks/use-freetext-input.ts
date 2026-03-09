/**
 * FreeText input hook.
 *
 * Manages the state for placing and editing free text annotations.
 *
 * @module react/editor/hooks/use-freetext-input
 */

import { useState } from 'react';
import type { AnnotationType, Rect } from '../../../core/types.js';
import type { AnnotationCrudActions } from './use-annotation-crud.js';
import { useFreeTextInputConfirm } from './use-freetext-input-confirm.js';
import { INITIAL_FREE_TEXT_INPUT_STATE, useFreeTextInputStateActions } from './use-freetext-input-state-actions.js';

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
  const [state, setState] = useState<FreeTextInputState>(INITIAL_FREE_TEXT_INPUT_STATE);
  const { activate, cancel, setText } = useFreeTextInputStateActions({ setState });
  const confirm = useFreeTextInputConfirm({
    crud,
    setState,
    text: state.text,
  });

  return { state, activate, setText, confirm, cancel };
}
