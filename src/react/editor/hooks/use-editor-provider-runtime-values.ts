import { useEditorContextValue } from './use-editor-context-value.js';
import type { useEditorProviderHistory } from './use-editor-provider-history.js';
import type { useEditorProviderSession } from './use-editor-provider-session.js';
import type { useEditorProviderState } from './use-editor-provider-state.js';
import { useEditorSelectionBridgeValue } from './use-editor-selection-bridge-value.js';

interface UseEditorProviderRuntimeValuesOptions {
  readonly history: ReturnType<typeof useEditorProviderHistory>;
  readonly providerState: ReturnType<typeof useEditorProviderState>;
  readonly session: ReturnType<typeof useEditorProviderSession>;
}

export function useEditorProviderRuntimeValues({
  history,
  providerState,
  session,
}: UseEditorProviderRuntimeValuesOptions) {
  return {
    contextValue: useEditorContextValue({
      clearPendingMarkupAction: providerState.clearPendingMarkupAction,
      markClean: history.markClean,
      pendingMarkupAction: providerState.pendingMarkupAction,
      redo: history.redo,
      setActiveTool: providerState.setActiveTool,
      setSelection: providerState.setSelection,
      stack: session.stack,
      stackVersion: session.stackVersion,
      state: providerState.state,
      triggerMarkupAction: providerState.triggerMarkupAction,
      undo: history.undo,
      updateToolConfig: providerState.updateToolConfig,
    }),
    selectionBridgeValue: useEditorSelectionBridgeValue(providerState.state.selection, providerState.setSelection),
  };
}
