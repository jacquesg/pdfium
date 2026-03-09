import { useEffect, useMemo } from 'react';
import { AnnotationType } from '../../../core/types.js';
import { getInitialInteriorColour, getInitialStrokeColour } from './annotation-style-editing-support.js';
import type { UseAnnotationStyleColourStateSyncOptions } from './use-annotation-style-colour-local-state.types.js';

export function useAnnotationStyleColourStateSync({
  annotation,
  effectiveType,
  fillColourType,
  inFlightStyleCommitsRef,
  liveInteriorColourRef,
  liveStrokeColourRef,
  pendingColourCommitRef,
  setLocalInteriorColour,
  setLocalStrokeColour,
}: UseAnnotationStyleColourStateSyncOptions): void {
  const initialStrokeColour = useMemo(
    () => getInitialStrokeColour(annotation.colour, effectiveType),
    [annotation.colour, effectiveType],
  );
  const initialInteriorColour = useMemo(
    () => getInitialInteriorColour(annotation.colour, effectiveType),
    [annotation.colour, effectiveType],
  );

  useEffect(() => {
    if (pendingColourCommitRef.current.stroke !== null) return;
    if (inFlightStyleCommitsRef.current > 0) return;
    setLocalStrokeColour(initialStrokeColour);
    liveStrokeColourRef.current = initialStrokeColour;
  }, [inFlightStyleCommitsRef, initialStrokeColour, liveStrokeColourRef, pendingColourCommitRef, setLocalStrokeColour]);

  useEffect(() => {
    if (pendingColourCommitRef.current[fillColourType] !== null) return;
    if (inFlightStyleCommitsRef.current > 0) return;
    setLocalInteriorColour(initialInteriorColour);
    liveInteriorColourRef.current = initialInteriorColour;
  }, [
    fillColourType,
    inFlightStyleCommitsRef,
    initialInteriorColour,
    liveInteriorColourRef,
    pendingColourCommitRef,
    setLocalInteriorColour,
  ]);

  useEffect(() => {
    if (effectiveType !== AnnotationType.Highlight) return;
    const nextInterior = liveStrokeColourRef.current;
    setLocalInteriorColour(nextInterior);
    liveInteriorColourRef.current = nextInterior;
  }, [effectiveType, setLocalInteriorColour, liveInteriorColourRef, liveStrokeColourRef]);
}
