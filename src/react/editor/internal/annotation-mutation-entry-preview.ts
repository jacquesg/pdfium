import { mergePatch } from './annotation-mutation-patch-merge.js';
import type { OptimisticAnnotationPatch } from './annotation-mutation-patch-utils.js';
import { makeKey } from './annotation-mutation-patch-utils.js';
import type { AnnotationMutationStoreCollections } from './annotation-mutation-store-entry.types.js';

export function previewMutationEntry(
  { previewPatches }: Pick<AnnotationMutationStoreCollections, 'previewPatches'>,
  pageIndex: number,
  annotationIndex: number,
  patch: OptimisticAnnotationPatch,
  notify: () => void,
): void {
  const key = makeKey(pageIndex, annotationIndex);
  const existing = previewPatches.get(key);
  const nextPatch = existing ? mergePatch(existing, patch) : patch;
  previewPatches.set(key, nextPatch);
  notify();
}

export function clearPreviewMutationEntry(
  { previewPatches }: Pick<AnnotationMutationStoreCollections, 'previewPatches'>,
  pageIndex: number,
  annotationIndex: number,
  notify: () => void,
): void {
  const key = makeKey(pageIndex, annotationIndex);
  if (!previewPatches.has(key)) return;
  previewPatches.delete(key);
  notify();
}
