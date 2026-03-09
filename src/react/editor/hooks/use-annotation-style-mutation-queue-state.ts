import type { UseAnnotationStyleEditingMutationStateOptions } from './annotation-style-editing-mutation-state.types.js';
import { useAnnotationStyleCommitQueue } from './use-annotation-style-commit-queue.js';

type UseAnnotationStyleMutationQueueStateOptions = Pick<
  UseAnnotationStyleEditingMutationStateOptions,
  | 'annotation'
  | 'clearPreviewPatch'
  | 'crud'
  | 'getPersistedEditableBorderForAnnotation'
  | 'getPreservedBorderForCommit'
>;

export function useAnnotationStyleMutationQueueState({
  annotation,
  clearPreviewPatch,
  crud,
  getPersistedEditableBorderForAnnotation,
  getPreservedBorderForCommit,
}: UseAnnotationStyleMutationQueueStateOptions) {
  return useAnnotationStyleCommitQueue({
    annotationIndex: annotation.index,
    clearPreviewPatch,
    crud,
    getPreservedBorder: getPreservedBorderForCommit,
    initialPersistedBorder: getPersistedEditableBorderForAnnotation(),
  });
}
