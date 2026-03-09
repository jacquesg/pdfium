import { useEffect, useMemo, useSyncExternalStore } from 'react';
import type { SerialisedAnnotation } from '../../../context/protocol.js';
import type { ResolvedEditorAnnotationsOptions } from './annotation-mutation-patch-utils.js';
import { useAnnotationMutationStore } from './annotation-mutation-store-context.js';

/**
 * Resolve page annotations with optimistic patches from in-flight mutations.
 */
export function useResolvedEditorAnnotations(
  pageIndex: number,
  annotations: readonly SerialisedAnnotation[],
  options?: ResolvedEditorAnnotationsOptions,
): readonly SerialisedAnnotation[] {
  const store = useAnnotationMutationStore();
  const includePreview = options?.includePreview ?? true;
  const version = useSyncExternalStore(
    (listener) => store.subscribe(listener),
    () => store.getSnapshot(),
    () => store.getSnapshot(),
  );

  const resolved = useMemo(() => {
    void version;
    return store.mergeForPage(pageIndex, annotations, includePreview);
  }, [store, pageIndex, annotations, includePreview, version]);

  useEffect(() => {
    void version;
    store.acknowledge(pageIndex, annotations);
  }, [store, pageIndex, annotations, version]);

  return resolved;
}
