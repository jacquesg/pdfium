import { type MutableRefObject, type RefObject, useCallback } from 'react';
import { AnnotationType } from '../../../core/types.js';
import { buildFreeTextBounds, getFreeTextEditorSize } from '../components/freetext-editor-support.js';
import type { FreeTextInputActions } from './use-freetext-input.js';

interface UseFreeTextEditorCommitOptions {
  readonly commitInFlightRef: MutableRefObject<boolean>;
  readonly input: FreeTextInputActions;
  readonly originalHeight: number;
  readonly scale: number;
  readonly textareaRef: RefObject<HTMLTextAreaElement | null>;
}

export function useFreeTextEditorCommit({
  commitInFlightRef,
  input,
  originalHeight,
  scale,
  textareaRef,
}: UseFreeTextEditorCommitOptions) {
  return useCallback(async () => {
    if (commitInFlightRef.current) {
      return;
    }
    if (!input.state.position || !input.state.text) {
      input.cancel();
      return;
    }

    commitInFlightRef.current = true;
    const size = getFreeTextEditorSize(textareaRef.current);

    try {
      await input.confirm(
        AnnotationType.FreeText,
        buildFreeTextBounds({
          height: size.height,
          originalHeight,
          position: input.state.position,
          scale,
          width: size.width,
        }),
      );
    } catch (error) {
      commitInFlightRef.current = false;
      throw error;
    }
  }, [commitInFlightRef, input, originalHeight, scale, textareaRef]);
}
