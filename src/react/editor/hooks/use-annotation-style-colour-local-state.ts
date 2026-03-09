import { useRef, useState } from 'react';
import type { Colour } from '../../../core/types.js';
import { getInitialInteriorColour, getInitialStrokeColour } from './annotation-style-editing-support.js';
import { useAnnotationStyleColourLiveRefs } from './use-annotation-style-colour-live-refs.js';
import type {
  AnnotationStyleColourLocalState,
  UseAnnotationStyleColourLocalStateOptions,
} from './use-annotation-style-colour-local-state.types.js';
import { useAnnotationStyleColourStateSync } from './use-annotation-style-colour-state-sync.js';

export function useAnnotationStyleColourLocalState({
  annotation,
  effectiveType,
  fillColourType,
  inFlightStyleCommitsRef,
  pendingColourCommitRef,
}: UseAnnotationStyleColourLocalStateOptions): AnnotationStyleColourLocalState {
  const initialStrokeColour = getInitialStrokeColour(annotation.colour, effectiveType);
  const initialInteriorColour = getInitialInteriorColour(annotation.colour, effectiveType);
  const [localStrokeColour, setLocalStrokeColour] = useState<Colour>(initialStrokeColour);
  const [localInteriorColour, setLocalInteriorColour] = useState<Colour>(initialInteriorColour);
  const liveStrokeColourRef = useRef<Colour>(initialStrokeColour);
  const liveInteriorColourRef = useRef<Colour>(initialInteriorColour);

  useAnnotationStyleColourStateSync({
    annotation,
    effectiveType,
    fillColourType,
    inFlightStyleCommitsRef,
    liveInteriorColourRef,
    liveStrokeColourRef,
    pendingColourCommitRef,
    setLocalInteriorColour,
    setLocalStrokeColour,
  });
  useAnnotationStyleColourLiveRefs({
    liveInteriorColourRef,
    liveStrokeColourRef,
    localInteriorColour,
    localStrokeColour,
  });

  return {
    liveInteriorColourRef,
    liveStrokeColourRef,
    localInteriorColour,
    localStrokeColour,
    setLocalInteriorColour,
    setLocalStrokeColour,
  };
}
