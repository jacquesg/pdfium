import { useMemo } from 'react';
import type { EditorContextValue } from '../editor-context.types.js';
import type { useEditorProviderState } from './use-editor-provider-state.js';

interface UseEditorContextValueOptions {
  readonly clearPendingMarkupAction: ReturnType<typeof useEditorProviderState>['clearPendingMarkupAction'];
  readonly markClean: () => void;
  readonly pendingMarkupAction: ReturnType<typeof useEditorProviderState>['pendingMarkupAction'];
  readonly redo: () => Promise<void>;
  readonly setActiveTool: ReturnType<typeof useEditorProviderState>['setActiveTool'];
  readonly setSelection: ReturnType<typeof useEditorProviderState>['setSelection'];
  readonly stack: EditorContextValue['commandStack'];
  readonly stackVersion: number;
  readonly state: ReturnType<typeof useEditorProviderState>['state'];
  readonly triggerMarkupAction: ReturnType<typeof useEditorProviderState>['triggerMarkupAction'];
  readonly undo: () => Promise<void>;
  readonly updateToolConfig: ReturnType<typeof useEditorProviderState>['updateToolConfig'];
}

export function useEditorContextValue({
  clearPendingMarkupAction,
  markClean,
  pendingMarkupAction,
  redo,
  setActiveTool,
  setSelection,
  stack,
  stackVersion,
  state,
  triggerMarkupAction,
  undo,
  updateToolConfig,
}: UseEditorContextValueOptions): EditorContextValue {
  return useMemo<EditorContextValue>(() => {
    void stackVersion;

    return {
      activeTool: state.activeTool,
      setActiveTool,
      pendingMarkupAction,
      triggerMarkupAction,
      clearPendingMarkupAction,
      selection: state.selection,
      setSelection,
      toolConfigs: state.toolConfigs,
      updateToolConfig,
      isDirty: stack.isDirty,
      canUndo: stack.canUndo,
      canRedo: stack.canRedo,
      undo,
      redo,
      markClean,
      commandStack: stack,
    };
  }, [
    state.activeTool,
    pendingMarkupAction,
    state.selection,
    state.toolConfigs,
    setActiveTool,
    triggerMarkupAction,
    clearPendingMarkupAction,
    setSelection,
    updateToolConfig,
    stack,
    stackVersion,
    undo,
    redo,
    markClean,
  ]);
}
