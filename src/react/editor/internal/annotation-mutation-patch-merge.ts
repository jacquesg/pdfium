import type { SerialisedAnnotation } from '../../../context/protocol.js';
import { buildPatchedAnnotationColour, mergeColourPatch } from './annotation-mutation-colour-merge.js';
import type { OptimisticAnnotationPatch } from './annotation-mutation-patch.types.js';
import { buildOptionalPatchProperty, resolveOptionalPatchValue } from './annotation-mutation-patch-value-support.js';

export function mergePatch(
  base: OptimisticAnnotationPatch,
  incoming: OptimisticAnnotationPatch,
): OptimisticAnnotationPatch {
  const mergedColour = mergeColourPatch(base.colour, incoming.colour);
  return {
    ...buildOptionalPatchProperty('bounds', resolveOptionalPatchValue(base.bounds, incoming.bounds)),
    ...buildOptionalPatchProperty('border', resolveOptionalPatchValue(base.border, incoming.border)),
    ...buildOptionalPatchProperty('line', resolveOptionalPatchValue(base.line, incoming.line)),
    ...buildOptionalPatchProperty('inkPaths', resolveOptionalPatchValue(base.inkPaths, incoming.inkPaths)),
    ...buildOptionalPatchProperty('contents', resolveOptionalPatchValue(base.contents, incoming.contents)),
    ...buildOptionalPatchProperty('author', resolveOptionalPatchValue(base.author, incoming.author)),
    ...buildOptionalPatchProperty('subject', resolveOptionalPatchValue(base.subject, incoming.subject)),
    ...buildOptionalPatchProperty('colour', mergedColour),
  };
}

export function applyPatch(annotation: SerialisedAnnotation, patch: OptimisticAnnotationPatch): SerialisedAnnotation {
  return {
    ...annotation,
    ...(patch.bounds !== undefined ? { bounds: patch.bounds } : {}),
    ...(patch.border !== undefined ? { border: patch.border } : {}),
    ...(patch.line !== undefined ? { line: patch.line } : {}),
    ...(patch.inkPaths !== undefined ? { inkPaths: patch.inkPaths } : {}),
    ...(patch.contents !== undefined ? { contents: patch.contents } : {}),
    ...(patch.author !== undefined ? { author: patch.author } : {}),
    ...(patch.subject !== undefined ? { subject: patch.subject } : {}),
    ...(patch.colour !== undefined ? { colour: buildPatchedAnnotationColour(annotation, patch.colour) } : {}),
  };
}
