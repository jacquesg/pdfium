import { runAtomicStyleCommit } from './annotation-style-atomic-commit-runner.js';
import { takeAtomicStyleCommitPayload } from './annotation-style-commit-queue-support.js';
import type { AnnotationStyleQueueCommittersOptions } from './annotation-style-committers.types.js';

interface CommitAtomicStyleOrFallbackOptions
  extends Pick<
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
  > {
  readonly commitPendingBorder: () => void;
  readonly commitPendingColours: () => void;
}

export function commitAtomicStyleOrFallback({
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
}: CommitAtomicStyleOrFallbackOptions): void {
  if (crud.setAnnotationStyle === undefined) {
    commitPendingColours();
    commitPendingBorder();
    return;
  }

  const styleCommit = takeAtomicStyleCommitPayload({
    borderEditStartRef,
    getPreservedBorder: getPreservedBorderRef.current,
    pendingBorderCommitRef,
    pendingColourCommitRef,
  });

  runAtomicStyleCommit({
    annotationIndex,
    crud,
    flushPreviewIfStyleIdle,
    inFlightStyleCommitsRef,
    persistedBorderForCommitRef,
    styleCommit,
  });
}
