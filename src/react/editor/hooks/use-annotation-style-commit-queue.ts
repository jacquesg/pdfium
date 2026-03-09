import type { UseAnnotationStyleCommitQueueOptions } from './annotation-style-commit-queue.types.js';
import { useAnnotationStyleCommitQueueCommitters } from './use-annotation-style-commit-queue-committers.js';
import { useAnnotationStyleCommitQueueLifecycle } from './use-annotation-style-commit-queue-lifecycle.js';
import { useAnnotationStyleCommitQueueScheduler } from './use-annotation-style-commit-queue-scheduler.js';
import { useAnnotationStyleCommitQueueState } from './use-annotation-style-commit-queue-state.js';

export function useAnnotationStyleCommitQueue({
  annotationIndex,
  clearPreviewPatch,
  crud,
  getPreservedBorder,
  initialPersistedBorder,
}: UseAnnotationStyleCommitQueueOptions) {
  const {
    borderEditStartRef,
    clearPendingBorderCommit,
    flushPreviewIfStyleIdle,
    getPreservedBorderRef,
    inFlightStyleCommitsRef,
    pendingBorderCommitRef,
    pendingColourCommitRef,
    persistedBorderForCommitRef,
    skipBorderCommitOnBlurRef,
    clearPendingColourCommit,
  } = useAnnotationStyleCommitQueueState({
    clearPreviewPatch,
    getPreservedBorder,
    initialPersistedBorder,
  });
  const { clearStyleCommitTimer, flushStyleCommitsRef, scheduleStyleCommit } = useAnnotationStyleCommitQueueScheduler();
  const { flushStyleCommits, flushTransientEditingState, queueBorderCommit, queueColourCommit } =
    useAnnotationStyleCommitQueueCommitters({
      annotationIndex,
      borderEditStartRef,
      clearPendingBorderCommit,
      clearPendingColourCommit,
      clearStyleCommitTimer,
      crud,
      flushPreviewIfStyleIdle,
      flushStyleCommitsRef,
      getPreservedBorderRef,
      inFlightStyleCommitsRef,
      pendingBorderCommitRef,
      pendingColourCommitRef,
      persistedBorderForCommitRef,
      scheduleStyleCommit,
    });

  useAnnotationStyleCommitQueueLifecycle({
    annotationIndex,
    flushStyleCommitsRef,
    flushTransientEditingState,
    skipBorderCommitOnBlurRef,
  });

  return {
    borderEditStartRef,
    clearPendingBorderCommit,
    clearStyleCommitTimer,
    flushPreviewIfStyleIdle,
    flushStyleCommits,
    inFlightStyleCommitsRef,
    pendingBorderCommitRef,
    pendingColourCommitRef,
    persistedBorderForCommitRef,
    queueBorderCommit,
    queueColourCommit,
    skipBorderCommitOnBlurRef,
  };
}
