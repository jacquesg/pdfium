import { useCallback } from 'react';
import type { AnnotationMutationStore } from '../internal/annotation-mutation-store.js';
import { flushPendingEditorCommits } from '../internal/flush-pending-editor-commits.js';
import type { ObservableCommandStack } from '../observable-command-stack.js';

interface UseEditorProviderHistoryOptions {
  readonly bumpDocumentRevision: () => void;
  readonly mutationStore: AnnotationMutationStore;
  readonly onClearPendingMarkupAction: () => void;
  readonly onClearSelection: () => void;
  readonly stack: ObservableCommandStack;
}

export function useEditorProviderHistory({
  bumpDocumentRevision,
  mutationStore,
  onClearPendingMarkupAction,
  onClearSelection,
  stack,
}: UseEditorProviderHistoryOptions) {
  const flushPendingMutationsBeforeHistoryNavigation = useCallback(async () => {
    await flushPendingEditorCommits(mutationStore);
  }, [mutationStore]);

  const undo = useCallback(async () => {
    if (!stack.canUndo) {
      return;
    }
    await flushPendingMutationsBeforeHistoryNavigation();
    if (!stack.canUndo) {
      return;
    }
    onClearPendingMarkupAction();
    await stack.undo();
    onClearSelection();
    bumpDocumentRevision();
  }, [
    bumpDocumentRevision,
    flushPendingMutationsBeforeHistoryNavigation,
    onClearPendingMarkupAction,
    onClearSelection,
    stack,
  ]);

  const redo = useCallback(async () => {
    if (!stack.canRedo) {
      return;
    }
    await flushPendingMutationsBeforeHistoryNavigation();
    if (!stack.canRedo) {
      return;
    }
    onClearPendingMarkupAction();
    await stack.redo();
    onClearSelection();
    bumpDocumentRevision();
  }, [
    bumpDocumentRevision,
    flushPendingMutationsBeforeHistoryNavigation,
    onClearPendingMarkupAction,
    onClearSelection,
    stack,
  ]);

  const markClean = useCallback(() => {
    stack.markClean();
  }, [stack]);

  return {
    markClean,
    redo,
    undo,
  };
}
