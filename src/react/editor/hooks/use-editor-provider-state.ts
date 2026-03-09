import { useEditorProviderDispatchActions } from './use-editor-provider-dispatch-actions.js';
import { useEditorProviderMarkupActions } from './use-editor-provider-markup-actions.js';
import {
  type UseEditorProviderReducerStateOptions,
  useEditorProviderReducerState,
} from './use-editor-provider-reducer-state.js';

export type UseEditorProviderStateOptions = UseEditorProviderReducerStateOptions;

export function useEditorProviderState({ initialTool, toolConfigOverrides }: UseEditorProviderStateOptions) {
  const [state, dispatch] = useEditorProviderReducerState({
    ...(initialTool !== undefined ? { initialTool } : {}),
    ...(toolConfigOverrides !== undefined ? { toolConfigOverrides } : {}),
  });
  const { clearPendingMarkupAction, pendingMarkupAction, resetPendingMarkupAction, triggerMarkupAction } =
    useEditorProviderMarkupActions();
  const { resetEditorUIState, setActiveTool, setSelection, updateToolConfig } = useEditorProviderDispatchActions({
    dispatch,
    resetPendingMarkupAction,
  });

  return {
    clearPendingMarkupAction,
    pendingMarkupAction,
    resetEditorUIState,
    resetPendingMarkupAction,
    setActiveTool,
    setSelection,
    state,
    triggerMarkupAction,
    updateToolConfig,
  };
}
