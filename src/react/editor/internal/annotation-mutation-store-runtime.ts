import { createAnnotationMutationStoreLifecycleApi } from './annotation-mutation-store-lifecycle-api.js';
import { createAnnotationMutationStoreQueryApi } from './annotation-mutation-store-query-api.js';
import { createAnnotationMutationStoreState } from './annotation-mutation-store-state.js';
import { createAnnotationMutationStoreWriteApi } from './annotation-mutation-store-write-api.js';

export function createAnnotationMutationStoreRuntime() {
  const state = createAnnotationMutationStoreState();
  const lifecycle = createAnnotationMutationStoreLifecycleApi(state);

  return {
    lifecycle,
    queries: createAnnotationMutationStoreQueryApi(state),
    state,
    writes: createAnnotationMutationStoreWriteApi(state, () => lifecycle.notify()),
  };
}
