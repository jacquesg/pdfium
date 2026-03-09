import { useCallback } from 'react';
import { dispatchEditorMutationError } from './editor-overlay-action-support.js';

interface UseEditorOverlayMutationRunnersOptions {
  readonly pageIndex: number;
  readonly select: (pageIndex: number, annotationIndex: number) => void;
}

export function useEditorOverlayMutationRunners({ pageIndex, select }: UseEditorOverlayMutationRunnersOptions) {
  const runMutation = useCallback((promise: Promise<unknown>, onSuccess?: () => void) => {
    void promise
      .then(() => {
        onSuccess?.();
      })
      .catch((error: unknown) => {
        dispatchEditorMutationError(error);
      });
  }, []);

  const runCreateAndSelectMutation = useCallback(
    (promise: Promise<number | undefined>) => {
      runMutation(
        promise.then((createdIndex) => {
          if (createdIndex !== undefined) {
            select(pageIndex, createdIndex);
          }
          return createdIndex;
        }),
      );
    },
    [pageIndex, runMutation, select],
  );

  return {
    runCreateAndSelectMutation,
    runMutation,
  };
}
