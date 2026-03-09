import type { AnnotationMutationStoreState } from './annotation-mutation-store-state.js';
import {
  destroyAnnotationMutationStoreState,
  notifyAnnotationMutationStore,
  resetAnnotationMutationStoreState,
  subscribeToAnnotationMutationStore,
} from './annotation-mutation-store-state.js';

export function createAnnotationMutationStoreLifecycleApi(state: AnnotationMutationStoreState) {
  const notify = () => {
    notifyAnnotationMutationStore(state);
  };

  return {
    subscribe(listener: () => void): () => void {
      return subscribeToAnnotationMutationStore(state, listener);
    },
    getSnapshot(): number {
      return state.version;
    },
    destroy(): void {
      destroyAnnotationMutationStoreState(state);
    },
    reset(): void {
      if (!resetAnnotationMutationStoreState(state)) {
        return;
      }
      notify();
    },
    notify,
  };
}
