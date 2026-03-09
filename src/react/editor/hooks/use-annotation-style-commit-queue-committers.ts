import type { AnnotationStyleQueueCommittersOptions } from './annotation-style-committers.types.js';
import { useAnnotationStyleCommitQueueFlushers } from './use-annotation-style-commit-queue-flushers.js';
import { useAnnotationStyleCommitRunners } from './use-annotation-style-commit-runners.js';

export function useAnnotationStyleCommitQueueCommitters({
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
}: AnnotationStyleQueueCommittersOptions) {
  const { commitPendingStyleAtomic, queueBorderCommit, queueColourCommit } = useAnnotationStyleCommitRunners({
    annotationIndex,
    borderEditStartRef,
    crud,
    flushPreviewIfStyleIdle,
    getPreservedBorderRef,
    inFlightStyleCommitsRef,
    pendingBorderCommitRef,
    pendingColourCommitRef,
    persistedBorderForCommitRef,
    scheduleStyleCommit,
  });

  const { flushStyleCommits, flushTransientEditingState } = useAnnotationStyleCommitQueueFlushers({
    clearPendingBorderCommit,
    clearPendingColourCommit,
    clearStyleCommitTimer,
    commitPendingStyleAtomic,
    flushPreviewIfStyleIdle,
    flushStyleCommitsRef,
  });

  return {
    flushStyleCommits,
    flushTransientEditingState,
    queueBorderCommit,
    queueColourCommit,
  };
}
