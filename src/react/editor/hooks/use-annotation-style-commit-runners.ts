import type { AnnotationStyleQueueCommittersOptions } from './annotation-style-committers.types.js';
import { useAnnotationStyleAtomicCommitter } from './use-annotation-style-atomic-committer.js';
import { useAnnotationStyleBorderCommitters } from './use-annotation-style-border-committers.js';
import { useAnnotationStyleColourCommitters } from './use-annotation-style-colour-committers.js';

export function useAnnotationStyleCommitRunners({
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
}: Pick<
  AnnotationStyleQueueCommittersOptions,
  | 'annotationIndex'
  | 'borderEditStartRef'
  | 'crud'
  | 'flushPreviewIfStyleIdle'
  | 'getPreservedBorderRef'
  | 'inFlightStyleCommitsRef'
  | 'pendingBorderCommitRef'
  | 'pendingColourCommitRef'
  | 'persistedBorderForCommitRef'
  | 'scheduleStyleCommit'
>) {
  const { commitPendingColours, queueColourCommit } = useAnnotationStyleColourCommitters({
    annotationIndex,
    crud,
    flushPreviewIfStyleIdle,
    getPreservedBorderRef,
    inFlightStyleCommitsRef,
    pendingColourCommitRef,
    scheduleStyleCommit,
  });
  const { commitPendingBorder, queueBorderCommit } = useAnnotationStyleBorderCommitters({
    annotationIndex,
    borderEditStartRef,
    crud,
    flushPreviewIfStyleIdle,
    inFlightStyleCommitsRef,
    pendingBorderCommitRef,
    persistedBorderForCommitRef,
    scheduleStyleCommit,
  });
  const commitPendingStyleAtomic = useAnnotationStyleAtomicCommitter({
    annotationIndex,
    borderEditStartRef,
    commitPendingBorder,
    commitPendingColours,
    crud,
    flushPreviewIfStyleIdle,
    getPreservedBorderRef,
    inFlightStyleCommitsRef,
    pendingBorderCommitRef,
    pendingColourCommitRef,
    persistedBorderForCommitRef,
  });

  return {
    commitPendingStyleAtomic,
    queueBorderCommit,
    queueColourCommit,
  };
}
