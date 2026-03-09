import type { ReactNode } from 'react';
import { AnnotationSelectionBridgeContext } from '../../internal/annotation-selection-bridge-context.js';
import type { EditorContextValue } from '../editor-context.types.js';
import { EditorContext } from '../editor-context-instance.js';
import { AnnotationMutationStoreProvider } from '../internal/annotation-mutation-store.js';

interface EditorProviderTreeProps {
  readonly children: ReactNode;
  readonly contextValue: EditorContextValue;
  readonly mutationStore: Parameters<typeof AnnotationMutationStoreProvider>[0]['store'];
  readonly selectionBridgeValue: Parameters<typeof AnnotationSelectionBridgeContext.Provider>[0]['value'];
}

export function EditorProviderTree({
  children,
  contextValue,
  mutationStore,
  selectionBridgeValue,
}: EditorProviderTreeProps): ReactNode {
  return (
    <AnnotationSelectionBridgeContext.Provider value={selectionBridgeValue}>
      <AnnotationMutationStoreProvider {...(mutationStore !== undefined ? { store: mutationStore } : {})}>
        <EditorContext.Provider value={contextValue}>{children}</EditorContext.Provider>
      </AnnotationMutationStoreProvider>
    </AnnotationSelectionBridgeContext.Provider>
  );
}
