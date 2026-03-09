export type {
  OptimisticAnnotationEntry,
  OptimisticAnnotationPatch,
  ResolvedEditorAnnotationsOptions,
} from './annotation-mutation-patch.types.js';
export { FLOAT_TOLERANCE, STALE_SETTLED_PATCH_GRACE_MS } from './annotation-mutation-patch.types.js';
export { type AnnotationMutationKeyParts, isFiniteNumber, makeKey, parseKey } from './annotation-mutation-patch-key.js';
export { annotationMatchesPatch } from './annotation-mutation-patch-match.js';
export { applyPatch, mergePatch } from './annotation-mutation-patch-merge.js';
