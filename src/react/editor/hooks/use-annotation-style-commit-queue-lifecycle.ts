import { type MutableRefObject, useEffect, useRef } from 'react';

interface UseAnnotationStyleCommitQueueLifecycleOptions {
  readonly annotationIndex: number;
  readonly flushTransientEditingState: () => void;
  readonly flushStyleCommitsRef: MutableRefObject<() => void>;
  readonly skipBorderCommitOnBlurRef: MutableRefObject<boolean>;
}

export function useAnnotationStyleCommitQueueLifecycle({
  annotationIndex,
  flushTransientEditingState,
  flushStyleCommitsRef,
  skipBorderCommitOnBlurRef,
}: UseAnnotationStyleCommitQueueLifecycleOptions): void {
  const previousAnnotationIndexRef = useRef(annotationIndex);

  useEffect(() => {
    if (previousAnnotationIndexRef.current === annotationIndex) {
      return;
    }

    flushTransientEditingState();
    skipBorderCommitOnBlurRef.current = false;
    previousAnnotationIndexRef.current = annotationIndex;
  }, [annotationIndex, flushTransientEditingState, skipBorderCommitOnBlurRef]);

  useEffect(() => {
    return () => {
      flushTransientEditingState();
    };
  }, [flushTransientEditingState]);

  useEffect(() => {
    const handleFlushPendingCommits = () => {
      flushStyleCommitsRef.current();
    };

    globalThis.addEventListener('pdfium-editor-flush-pending-commits', handleFlushPendingCommits);
    return () => {
      globalThis.removeEventListener('pdfium-editor-flush-pending-commits', handleFlushPendingCommits);
    };
  }, [flushStyleCommitsRef]);
}
