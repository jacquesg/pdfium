import { useEffect, useMemo, useState } from 'react';
import { isInitialFillEnabled } from './annotation-style-editing-support.js';
import type {
  AnnotationStyleLocalState,
  UseAnnotationStyleLocalStateOptions,
} from './annotation-style-local-state.types.js';

type UseAnnotationStyleFillLocalStateOptions = Pick<
  UseAnnotationStyleLocalStateOptions,
  'annotation' | 'effectiveType' | 'fillColourType' | 'inFlightStyleCommitsRef' | 'pendingColourCommitRef'
>;

type AnnotationStyleFillLocalState = Pick<AnnotationStyleLocalState, 'fillEnabled' | 'setFillEnabled'>;

export function useAnnotationStyleFillLocalState({
  annotation,
  effectiveType,
  fillColourType,
  inFlightStyleCommitsRef,
  pendingColourCommitRef,
}: UseAnnotationStyleFillLocalStateOptions): AnnotationStyleFillLocalState {
  const initialFillEnabled = useMemo(
    () => isInitialFillEnabled(annotation.colour, effectiveType),
    [annotation.colour, effectiveType],
  );
  const [fillEnabled, setFillEnabled] = useState(initialFillEnabled);

  useEffect(() => {
    if (pendingColourCommitRef.current[fillColourType] !== null) return;
    if (inFlightStyleCommitsRef.current > 0) return;
    setFillEnabled(initialFillEnabled);
  }, [fillColourType, inFlightStyleCommitsRef, initialFillEnabled, pendingColourCommitRef]);

  return {
    fillEnabled,
    setFillEnabled,
  };
}
