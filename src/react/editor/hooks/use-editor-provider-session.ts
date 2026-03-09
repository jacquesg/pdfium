import { useEffect, useRef } from 'react';
import { useAnnotationMutationStoreSession } from './use-annotation-mutation-store-session.js';
import { useCommandStackSession } from './use-command-stack-session.js';
import { useObservableCommandStackVersion } from './use-observable-command-stack-version.js';

interface UseEditorProviderSessionOptions {
  readonly documentId: string | null;
  readonly maxUndoDepth?: number;
  readonly onDocumentSessionReset: () => void;
}

export function useEditorProviderSession({
  documentId,
  maxUndoDepth,
  onDocumentSessionReset,
}: UseEditorProviderSessionOptions) {
  const stack = useCommandStackSession(maxUndoDepth);
  const mutationStore = useAnnotationMutationStoreSession();
  const sessionDocumentIdRef = useRef<string | null>(documentId);

  useEffect(() => {
    if (sessionDocumentIdRef.current === documentId) {
      return;
    }
    sessionDocumentIdRef.current = documentId;
    onDocumentSessionReset();
    stack.clear();
    mutationStore.reset();
  }, [documentId, mutationStore, onDocumentSessionReset, stack]);

  const stackVersion = useObservableCommandStackVersion(stack);

  return {
    mutationStore,
    stack,
    stackVersion,
  };
}
