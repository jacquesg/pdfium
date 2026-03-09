import type { MutableRefObject } from 'react';
import type { AnnotationBorder } from '../../../core/types.js';
import type { PendingBorderCommit, PendingStyleCommitRefs } from './annotation-style-commit-queue.types.js';
import { clampBorderWidth } from './annotation-style-editing-support.js';

export function clearPendingBorderCommit({
  borderEditStartRef,
  pendingBorderCommitRef,
}: Pick<PendingStyleCommitRefs, 'borderEditStartRef' | 'pendingBorderCommitRef'>): void {
  pendingBorderCommitRef.current = null;
  borderEditStartRef.current = null;
}

export function queuePendingBorderCommit({
  borderEditStartRef,
  nextBorderWidth,
  pendingBorderCommitRef,
  persistedBorderForCommitRef,
}: {
  readonly borderEditStartRef: MutableRefObject<AnnotationBorder | null>;
  readonly nextBorderWidth: number;
  readonly pendingBorderCommitRef: MutableRefObject<PendingBorderCommit | null>;
  readonly persistedBorderForCommitRef: MutableRefObject<AnnotationBorder | null>;
}): void {
  const previousPending = pendingBorderCommitRef.current;
  const persistedBorder = persistedBorderForCommitRef.current;
  const templateBorder = previousPending?.newBorder ?? persistedBorder;
  if (templateBorder === null) {
    return;
  }

  pendingBorderCommitRef.current = {
    oldBorder: previousPending?.oldBorder ?? borderEditStartRef.current ?? templateBorder,
    newBorder: {
      ...templateBorder,
      borderWidth: clampBorderWidth(nextBorderWidth),
    },
  };
}
