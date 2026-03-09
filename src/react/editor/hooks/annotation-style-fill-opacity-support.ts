import type { Colour } from '../../../core/types.js';
import type { OptimisticAnnotationPatch } from '../internal/annotation-mutation-store.js';

export function resolveNextFillOpacityColours(
  currentStroke: Colour,
  currentInterior: Colour,
  nextAlpha: number,
  fillEnabled: boolean,
): {
  readonly nextInterior: Colour;
  readonly nextStroke: Colour;
  readonly interiorChanged: boolean;
  readonly strokeChanged: boolean;
} {
  const nextStroke = currentStroke.a === nextAlpha ? currentStroke : { ...currentStroke, a: nextAlpha };
  const nextInteriorAlpha = fillEnabled ? nextAlpha : 0;
  const nextInterior =
    currentInterior.a === nextInteriorAlpha ? currentInterior : { ...currentInterior, a: nextInteriorAlpha };

  return {
    nextInterior,
    nextStroke,
    interiorChanged: currentInterior.a !== nextInterior.a,
    strokeChanged: currentStroke.a !== nextStroke.a,
  };
}

export function buildFillOpacityPreviewPatch({
  interiorChanged,
  nextInterior,
  nextStroke,
  strokeChanged,
}: {
  readonly interiorChanged: boolean;
  readonly nextInterior: Colour;
  readonly nextStroke: Colour;
  readonly strokeChanged: boolean;
}): OptimisticAnnotationPatch {
  return {
    colour: {
      ...(strokeChanged ? { stroke: nextStroke } : {}),
      ...(interiorChanged ? { interior: nextInterior } : {}),
    },
  };
}
