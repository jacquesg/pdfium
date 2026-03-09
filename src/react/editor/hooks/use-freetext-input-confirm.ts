import type { Dispatch, SetStateAction } from 'react';
import { useCallback } from 'react';
import type { AnnotationType, Rect } from '../../../core/types.js';
import type { AnnotationCrudActions } from './use-annotation-crud.js';
import type { FreeTextInputState } from './use-freetext-input.js';
import { INITIAL_FREE_TEXT_INPUT_STATE } from './use-freetext-input-state-actions.js';

interface UseFreeTextInputConfirmOptions {
  readonly crud: AnnotationCrudActions;
  readonly setState: Dispatch<SetStateAction<FreeTextInputState>>;
  readonly text: string;
}

export function useFreeTextInputConfirm({ crud, setState, text }: UseFreeTextInputConfirmOptions) {
  return useCallback(
    async (subtype: AnnotationType, rect: Rect): Promise<number | undefined> => {
      if (!text) {
        setState(INITIAL_FREE_TEXT_INPUT_STATE);
        return undefined;
      }

      const index = await crud.createAnnotation(subtype, rect, { contents: text });
      setState(INITIAL_FREE_TEXT_INPUT_STATE);
      return index;
    },
    [crud, setState, text],
  );
}
