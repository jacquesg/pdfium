import { useCallback } from 'react';
import { commitAtomicStyleOrFallback } from './annotation-style-atomic-committer-support.js';
import type { AnnotationStyleQueueCommittersOptions } from './annotation-style-committers.types.js';

interface UseAnnotationStyleAtomicCommitterOptions
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

export function useAnnotationStyleAtomicCommitter({
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
}: UseAnnotationStyleAtomicCommitterOptions) {
  return useCallback(() => {
    commitAtomicStyleOrFallback({
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
  }, [
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
  ]);
}
