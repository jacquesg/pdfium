import { useEffect, useState } from 'react';
import type {
  AnnotationStyleLocalState,
  UseAnnotationStyleLocalStateOptions,
} from './annotation-style-local-state.types.js';

type UseAnnotationStyleBorderLocalStateOptions = Pick<
  UseAnnotationStyleLocalStateOptions,
  | 'annotation'
  | 'canEditBorder'
  | 'getPersistedEditableBorderForAnnotation'
  | 'inFlightStyleCommitsRef'
  | 'pendingBorderCommitRef'
  | 'persistedBorderForCommitRef'
>;

type AnnotationStyleBorderLocalState = Pick<AnnotationStyleLocalState, 'localBorderWidth' | 'setLocalBorderWidth'>;

export function useAnnotationStyleBorderLocalState({
  annotation,
  canEditBorder,
  getPersistedEditableBorderForAnnotation,
  inFlightStyleCommitsRef,
  pendingBorderCommitRef,
  persistedBorderForCommitRef,
}: UseAnnotationStyleBorderLocalStateOptions): AnnotationStyleBorderLocalState {
  const [localBorderWidth, setLocalBorderWidth] = useState<number>(
    annotation.border?.borderWidth ?? (canEditBorder ? 1 : 0),
  );

  useEffect(() => {
    if (pendingBorderCommitRef.current !== null) return;
    if (inFlightStyleCommitsRef.current > 0) return;
    const persistedBorder = getPersistedEditableBorderForAnnotation();
    persistedBorderForCommitRef.current = persistedBorder;
    setLocalBorderWidth(persistedBorder?.borderWidth ?? 0);
  }, [
    getPersistedEditableBorderForAnnotation,
    inFlightStyleCommitsRef,
    pendingBorderCommitRef,
    persistedBorderForCommitRef,
  ]);

  return {
    localBorderWidth,
    setLocalBorderWidth,
  };
}
