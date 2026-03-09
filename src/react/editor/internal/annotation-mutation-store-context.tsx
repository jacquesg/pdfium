import { createContext, type ReactNode, useContext, useEffect, useMemo } from 'react';
import { AnnotationMutationStore } from './annotation-mutation-store-core.js';

const AnnotationMutationStoreContext = createContext<AnnotationMutationStore | null>(null);

/**
 * Provider for annotation mutation optimistic state.
 */
export interface AnnotationMutationStoreProviderProps {
  readonly children: ReactNode;
  /** Optional externally managed store instance. */
  readonly store?: AnnotationMutationStore;
}

export function AnnotationMutationStoreProvider({
  children,
  store: providedStore,
}: AnnotationMutationStoreProviderProps): ReactNode {
  const ownedStore = useMemo(() => new AnnotationMutationStore(), []);
  const store = providedStore ?? ownedStore;
  useEffect(
    () => () => {
      if (providedStore === undefined) {
        ownedStore.destroy();
      }
    },
    [ownedStore, providedStore],
  );
  return <AnnotationMutationStoreContext.Provider value={store}>{children}</AnnotationMutationStoreContext.Provider>;
}

/**
 * Access the shared annotation mutation store.
 */
export function useAnnotationMutationStore(): AnnotationMutationStore {
  const store = useContext(AnnotationMutationStoreContext);
  if (store === null) {
    throw new Error('useAnnotationMutationStore must be used within an EditorProvider');
  }
  return store;
}
