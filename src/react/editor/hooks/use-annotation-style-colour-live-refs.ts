import type { MutableRefObject } from 'react';
import { useEffect } from 'react';
import type { Colour } from '../../../core/types.js';

interface UseAnnotationStyleColourLiveRefsOptions {
  readonly liveInteriorColourRef: MutableRefObject<Colour>;
  readonly liveStrokeColourRef: MutableRefObject<Colour>;
  readonly localInteriorColour: Colour;
  readonly localStrokeColour: Colour;
}

export function useAnnotationStyleColourLiveRefs({
  liveInteriorColourRef,
  liveStrokeColourRef,
  localInteriorColour,
  localStrokeColour,
}: UseAnnotationStyleColourLiveRefsOptions): void {
  useEffect(() => {
    liveStrokeColourRef.current = localStrokeColour;
  }, [liveStrokeColourRef, localStrokeColour]);

  useEffect(() => {
    liveInteriorColourRef.current = localInteriorColour;
  }, [liveInteriorColourRef, localInteriorColour]);
}
