import type { AnnotationBorder } from '../../../core/types.js';
import { useAnnotationStyleCommitQueueActions } from './use-annotation-style-commit-queue-actions.js';
import { useAnnotationStyleCommitQueueRefs } from './use-annotation-style-commit-queue-refs.js';

interface UseAnnotationStyleCommitQueueStateOptions {
  readonly clearPreviewPatch: () => void;
  readonly getPreservedBorder: () => AnnotationBorder | null;
  readonly initialPersistedBorder: AnnotationBorder | null;
}

export function useAnnotationStyleCommitQueueState({
  clearPreviewPatch,
  getPreservedBorder,
  initialPersistedBorder,
}: UseAnnotationStyleCommitQueueStateOptions) {
  const refs = useAnnotationStyleCommitQueueRefs({
    getPreservedBorder,
    initialPersistedBorder,
  });
  const actions = useAnnotationStyleCommitQueueActions({
    borderEditStartRef: refs.borderEditStartRef,
    clearPreviewPatch,
    inFlightStyleCommitsRef: refs.inFlightStyleCommitsRef,
    pendingBorderCommitRef: refs.pendingBorderCommitRef,
    pendingColourCommitRef: refs.pendingColourCommitRef,
  });

  return {
    ...actions,
    ...refs,
  };
}
