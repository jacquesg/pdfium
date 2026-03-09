import type { SerialisedAnnotation } from '../../../context/protocol.js';
import type { OptimisticAnnotationPatch } from './annotation-mutation-patch.types.js';
import { buildOptionalPatchProperty, resolveOptionalPatchValue } from './annotation-mutation-patch-value-support.js';

type PatchColour = OptimisticAnnotationPatch['colour'];

export function mergeColourPatch(
  base: PatchColour | undefined,
  incoming: PatchColour | undefined,
): PatchColour | undefined {
  if (incoming === undefined) return base;
  if (base === undefined) return incoming;

  const stroke = resolveOptionalPatchValue(base.stroke, incoming.stroke);
  const interior = resolveOptionalPatchValue(base.interior, incoming.interior);
  if (stroke === undefined && interior === undefined) {
    return undefined;
  }

  return {
    ...buildOptionalPatchProperty('stroke', stroke),
    ...buildOptionalPatchProperty('interior', interior),
  };
}

export function buildPatchedAnnotationColour(
  annotation: SerialisedAnnotation,
  patch: PatchColour | undefined,
): SerialisedAnnotation['colour'] {
  if (patch === undefined) {
    return annotation.colour;
  }

  return {
    stroke: resolveOptionalPatchValue(annotation.colour.stroke, patch.stroke),
    interior: resolveOptionalPatchValue(annotation.colour.interior, patch.interior),
  };
}
