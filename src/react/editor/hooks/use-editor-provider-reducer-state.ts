import { useReducer } from 'react';
import { createInitialState, editorReducer } from '../internal/editor-reducer.js';
import { DEFAULT_TOOL_CONFIGS, type EditorMode, type ToolConfigMap } from '../types.js';

export interface UseEditorProviderReducerStateOptions {
  readonly initialTool?: EditorMode;
  readonly toolConfigOverrides?: Partial<ToolConfigMap>;
}

export function useEditorProviderReducerState({
  initialTool,
  toolConfigOverrides,
}: UseEditorProviderReducerStateOptions) {
  return useReducer(editorReducer, undefined, () =>
    createInitialState({
      ...(initialTool !== undefined ? { activeTool: initialTool } : {}),
      ...(toolConfigOverrides !== undefined
        ? { toolConfigs: { ...DEFAULT_TOOL_CONFIGS, ...toolConfigOverrides } }
        : {}),
    }),
  );
}
