import { useRef } from 'react';
import type { AnnotationBorder } from '../../../core/types.js';
import type { PendingBorderCommit, PendingColourCommitMap } from './annotation-style-commit-queue.types.js';

interface UseAnnotationStyleCommitQueueRefsOptions {
  readonly getPreservedBorder: () => AnnotationBorder | null;
  readonly initialPersistedBorder: AnnotationBorder | null;
}

export function useAnnotationStyleCommitQueueRefs({
  getPreservedBorder,
  initialPersistedBorder,
}: UseAnnotationStyleCommitQueueRefsOptions) {
  const pendingColourCommitRef = useRef<PendingColourCommitMap>({
    stroke: null,
    interior: null,
  });
  const pendingBorderCommitRef = useRef<PendingBorderCommit | null>(null);
  const borderEditStartRef = useRef<AnnotationBorder | null>(null);
  const inFlightStyleCommitsRef = useRef(0);
  const skipBorderCommitOnBlurRef = useRef(false);
  const getPreservedBorderRef = useRef(getPreservedBorder);
  getPreservedBorderRef.current = getPreservedBorder;
  const persistedBorderForCommitRef = useRef<AnnotationBorder | null>(initialPersistedBorder);

  return {
    borderEditStartRef,
    getPreservedBorderRef,
    inFlightStyleCommitsRef,
    pendingBorderCommitRef,
    pendingColourCommitRef,
    persistedBorderForCommitRef,
    skipBorderCommitOnBlurRef,
  };
}
