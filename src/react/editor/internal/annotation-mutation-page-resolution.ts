import type { SerialisedAnnotation } from '../../../context/protocol.js';
import {
  type OptimisticAnnotationEntry,
  type OptimisticAnnotationPatch,
  STALE_SETTLED_PATCH_GRACE_MS,
} from './annotation-mutation-patch.types.js';
import { makeKey, parseKey } from './annotation-mutation-patch-key.js';
import { annotationMatchesPatch } from './annotation-mutation-patch-match.js';
import { applyPatch } from './annotation-mutation-patch-merge.js';

export function mergeResolvedAnnotationsForPage(
  pageIndex: number,
  annotations: readonly SerialisedAnnotation[],
  entries: ReadonlyMap<string, OptimisticAnnotationEntry>,
  previewPatches: ReadonlyMap<string, OptimisticAnnotationPatch>,
  includePreview = true,
): readonly SerialisedAnnotation[] {
  let changed = false;
  const merged = annotations.map((annotation) => {
    const key = makeKey(pageIndex, annotation.index);
    const mutationPatch = entries.get(key)?.patch;
    const previewPatch = includePreview ? previewPatches.get(key) : undefined;
    if (mutationPatch === undefined && previewPatch === undefined) {
      return annotation;
    }
    changed = true;
    const withMutation = mutationPatch === undefined ? annotation : applyPatch(annotation, mutationPatch);
    return previewPatch === undefined ? withMutation : applyPatch(withMutation, previewPatch);
  });
  return changed ? merged : annotations;
}

export function collectAcknowledgedMutationKeys(
  pageIndex: number,
  annotations: readonly SerialisedAnnotation[],
  entries: ReadonlyMap<string, OptimisticAnnotationEntry>,
  nowMs = Date.now(),
): readonly string[] {
  const byIndex = new Map<number, SerialisedAnnotation>();
  for (const annotation of annotations) {
    byIndex.set(annotation.index, annotation);
  }

  const acknowledgedKeys: string[] = [];
  for (const [key, entry] of entries.entries()) {
    const keyParts = parseKey(key);
    if (keyParts === null) {
      continue;
    }
    if (keyParts.pageIndex !== pageIndex || entry.pendingCount > 0) {
      continue;
    }

    const annotation = byIndex.get(keyParts.annotationIndex);
    const stalePatchExpired = entry.settledAtMs !== null && nowMs - entry.settledAtMs >= STALE_SETTLED_PATCH_GRACE_MS;
    if (annotation === undefined || annotationMatchesPatch(annotation, entry.patch) || stalePatchExpired) {
      acknowledgedKeys.push(key);
    }
  }

  return acknowledgedKeys;
}
