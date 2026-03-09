import type { MutableRefObject } from 'react';
import { useCallback } from 'react';
import type { AnnotationBorder, AnnotationColourType } from '../../../core/types.js';
import type { PendingBorderCommit, PendingColourCommitMap } from './annotation-style-commit-queue.types.js';
import {
  clearPendingBorderCommit as clearPendingBorderCommitState,
  clearPendingColourCommit as clearPendingColourCommitState,
  hasQueuedStyleCommits as hasQueuedStyleCommitState,
} from './annotation-style-commit-queue-support.js';

interface UseAnnotationStyleCommitQueueActionsOptions {
  readonly borderEditStartRef: MutableRefObject<AnnotationBorder | null>;
  readonly clearPreviewPatch: () => void;
  readonly inFlightStyleCommitsRef: MutableRefObject<number>;
  readonly pendingBorderCommitRef: MutableRefObject<PendingBorderCommit | null>;
  readonly pendingColourCommitRef: MutableRefObject<PendingColourCommitMap>;
}

export function useAnnotationStyleCommitQueueActions({
  borderEditStartRef,
  clearPreviewPatch,
  inFlightStyleCommitsRef,
  pendingBorderCommitRef,
  pendingColourCommitRef,
}: UseAnnotationStyleCommitQueueActionsOptions) {
  const hasQueuedStyleCommits = useCallback(() => {
    return hasQueuedStyleCommitState(pendingColourCommitRef.current, pendingBorderCommitRef.current);
  }, [pendingBorderCommitRef, pendingColourCommitRef]);

  const flushPreviewIfStyleIdle = useCallback(() => {
    if (hasQueuedStyleCommits()) {
      return;
    }
    if (inFlightStyleCommitsRef.current > 0) {
      return;
    }
    clearPreviewPatch();
  }, [clearPreviewPatch, hasQueuedStyleCommits, inFlightStyleCommitsRef]);

  const clearPendingColourCommit = useCallback(
    (colourType?: AnnotationColourType) => {
      clearPendingColourCommitState(pendingColourCommitRef, colourType);
    },
    [pendingColourCommitRef],
  );

  const clearPendingBorderCommit = useCallback(() => {
    clearPendingBorderCommitState({
      borderEditStartRef,
      pendingBorderCommitRef,
    });
  }, [borderEditStartRef, pendingBorderCommitRef]);

  return {
    clearPendingBorderCommit,
    clearPendingColourCommit,
    flushPreviewIfStyleIdle,
    hasQueuedStyleCommits,
  };
}
