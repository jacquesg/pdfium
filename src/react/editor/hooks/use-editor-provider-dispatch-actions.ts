import type { Dispatch } from 'react';
import { useCallback } from 'react';
import type { EditorAction } from '../internal/editor-reducer.js';
import type { AnnotationSelection, EditorMode, ToolConfigKey, ToolConfigMap } from '../types.js';

interface UseEditorProviderDispatchActionsOptions {
  readonly dispatch: Dispatch<EditorAction>;
  readonly resetPendingMarkupAction: () => void;
}

export function useEditorProviderDispatchActions({
  dispatch,
  resetPendingMarkupAction,
}: UseEditorProviderDispatchActionsOptions) {
  const setActiveTool = useCallback(
    (tool: EditorMode) => {
      resetPendingMarkupAction();
      dispatch({ type: 'setTool', tool });
    },
    [dispatch, resetPendingMarkupAction],
  );

  const setSelection = useCallback(
    (selection: AnnotationSelection | null) => {
      dispatch({ type: 'setSelection', selection });
    },
    [dispatch],
  );

  const updateToolConfig = useCallback(
    <T extends ToolConfigKey>(tool: T, config: Partial<ToolConfigMap[T]>) => {
      dispatch({ type: 'updateToolConfig', tool, config });
    },
    [dispatch],
  );

  const resetEditorUIState = useCallback(() => {
    resetPendingMarkupAction();
    dispatch({ type: 'setTool', tool: 'idle' });
    dispatch({ type: 'setSelection', selection: null });
  }, [dispatch, resetPendingMarkupAction]);

  return {
    resetEditorUIState,
    setActiveTool,
    setSelection,
    updateToolConfig,
  };
}
