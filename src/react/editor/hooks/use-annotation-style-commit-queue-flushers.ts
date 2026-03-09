import type { MutableRefObject } from 'react';
import { useCallback } from 'react';
import type { AnnotationColourType } from '../../../core/types.js';

interface UseAnnotationStyleCommitQueueFlushersOptions {
  readonly clearPendingBorderCommit: () => void;
  readonly clearPendingColourCommit: (colourType?: AnnotationColourType) => void;
  readonly clearStyleCommitTimer: () => void;
  readonly commitPendingStyleAtomic: () => void;
  readonly flushPreviewIfStyleIdle: () => void;
  readonly flushStyleCommitsRef: MutableRefObject<() => void>;
}

export function useAnnotationStyleCommitQueueFlushers({
  clearPendingBorderCommit,
  clearPendingColourCommit,
  clearStyleCommitTimer,
  commitPendingStyleAtomic,
  flushPreviewIfStyleIdle,
  flushStyleCommitsRef,
}: UseAnnotationStyleCommitQueueFlushersOptions) {
  const flushStyleCommits = useCallback(() => {
    clearStyleCommitTimer();
    commitPendingStyleAtomic();
  }, [clearStyleCommitTimer, commitPendingStyleAtomic]);

  flushStyleCommitsRef.current = flushStyleCommits;

  const flushTransientEditingState = useCallback(() => {
    flushStyleCommitsRef.current();
    clearPendingColourCommit();
    clearPendingBorderCommit();
    flushPreviewIfStyleIdle();
  }, [clearPendingBorderCommit, clearPendingColourCommit, flushPreviewIfStyleIdle, flushStyleCommitsRef]);

  return {
    flushStyleCommits,
    flushTransientEditingState,
  };
}
