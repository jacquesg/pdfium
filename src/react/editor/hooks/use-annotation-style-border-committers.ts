import { useCallback } from 'react';
import { queuePendingBorderCommit } from './annotation-style-commit-queue-support.js';
import type {
  AnnotationStyleBorderCommitterOptions,
  AnnotationStyleBorderCommittersResult,
} from './annotation-style-committers.types.js';

export function useAnnotationStyleBorderCommitters({
  annotationIndex,
  borderEditStartRef,
  crud,
  flushPreviewIfStyleIdle,
  inFlightStyleCommitsRef,
  pendingBorderCommitRef,
  persistedBorderForCommitRef,
  scheduleStyleCommit,
}: AnnotationStyleBorderCommitterOptions): AnnotationStyleBorderCommittersResult {
  const commitPendingBorder = useCallback(() => {
    const pending = pendingBorderCommitRef.current;
    if (!pending) {
      borderEditStartRef.current = null;
      return;
    }

    pendingBorderCommitRef.current = null;

    if (Math.abs(pending.oldBorder.borderWidth - pending.newBorder.borderWidth) < 0.001) {
      borderEditStartRef.current = null;
      flushPreviewIfStyleIdle();
      return;
    }

    inFlightStyleCommitsRef.current += 1;
    void crud.setAnnotationBorder(annotationIndex, pending.oldBorder, pending.newBorder).finally(() => {
      borderEditStartRef.current = null;
      persistedBorderForCommitRef.current = pending.newBorder;
      inFlightStyleCommitsRef.current = Math.max(0, inFlightStyleCommitsRef.current - 1);
      flushPreviewIfStyleIdle();
    });
  }, [
    annotationIndex,
    borderEditStartRef,
    crud,
    flushPreviewIfStyleIdle,
    inFlightStyleCommitsRef,
    pendingBorderCommitRef,
    persistedBorderForCommitRef,
  ]);

  const queueBorderCommit = useCallback(
    (nextBorderWidth: number) => {
      queuePendingBorderCommit({
        borderEditStartRef,
        nextBorderWidth,
        pendingBorderCommitRef,
        persistedBorderForCommitRef,
      });
      scheduleStyleCommit();
    },
    [borderEditStartRef, pendingBorderCommitRef, persistedBorderForCommitRef, scheduleStyleCommit],
  );

  return {
    commitPendingBorder,
    queueBorderCommit,
  };
}
