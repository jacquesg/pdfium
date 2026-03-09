import type {
  AnnotationStyleEditingMutationState,
  UseAnnotationStyleEditingMutationStateOptions,
} from './annotation-style-editing-mutation-state.types.js';
import { useAnnotationStyleMutationLocalState } from './use-annotation-style-mutation-local-state.js';
import { useAnnotationStyleMutationQueueState } from './use-annotation-style-mutation-queue-state.js';

export function useAnnotationStyleEditingMutationState({
  annotation,
  canEditBorder,
  clearPreviewPatch,
  crud,
  effectiveType,
  fillColourType,
  getPersistedEditableBorderForAnnotation,
  getPreservedBorderForCommit,
  localBorderWidthRef,
  onToolConfigChange,
}: UseAnnotationStyleEditingMutationStateOptions): AnnotationStyleEditingMutationState {
  const queueState = useAnnotationStyleMutationQueueState({
    annotation,
    clearPreviewPatch,
    crud,
    getPersistedEditableBorderForAnnotation,
    getPreservedBorderForCommit,
  });
  const localState = useAnnotationStyleMutationLocalState({
    annotation,
    canEditBorder,
    effectiveType,
    fillColourType,
    getPersistedEditableBorderForAnnotation,
    inFlightStyleCommitsRef: queueState.inFlightStyleCommitsRef,
    pendingBorderCommitRef: queueState.pendingBorderCommitRef,
    pendingColourCommitRef: queueState.pendingColourCommitRef,
    persistedBorderForCommitRef: queueState.persistedBorderForCommitRef,
    localBorderWidthRef,
    onToolConfigChange,
  });

  return {
    ...queueState,
    ...localState,
  };
}
