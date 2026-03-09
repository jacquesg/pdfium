import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { AnnotationColourType, Colour } from '../../../core/types.js';
import type { OptimisticAnnotationPatch } from '../internal/annotation-mutation-store.js';
import { coloursEqual, parseHexToColour } from './annotation-style-editing-support.js';

export function resolveFillInputColourChange(value: string, currentColour: Colour): Colour | null {
  const newColour = parseHexToColour(value, currentColour.a);
  if (newColour === null || coloursEqual(currentColour, newColour)) {
    return null;
  }
  return newColour;
}

export function applyLocalFillColourChange({
  fillColourType,
  liveInteriorColourRef,
  liveStrokeColourRef,
  newColour,
  setLocalInteriorColour,
  setLocalStrokeColour,
}: {
  readonly fillColourType: AnnotationColourType;
  readonly liveInteriorColourRef: MutableRefObject<Colour>;
  readonly liveStrokeColourRef: MutableRefObject<Colour>;
  readonly newColour: Colour;
  readonly setLocalInteriorColour: Dispatch<SetStateAction<Colour>>;
  readonly setLocalStrokeColour: Dispatch<SetStateAction<Colour>>;
}): void {
  if (fillColourType === 'stroke') {
    setLocalStrokeColour(newColour);
    liveStrokeColourRef.current = newColour;
  }
  setLocalInteriorColour(newColour);
  liveInteriorColourRef.current = newColour;
}

export function buildFillPreviewPatch(
  fillColourType: AnnotationColourType,
  newColour: Colour,
): OptimisticAnnotationPatch {
  return {
    colour:
      fillColourType === 'stroke'
        ? {
            stroke: newColour,
          }
        : {
            interior: newColour,
          },
  };
}
