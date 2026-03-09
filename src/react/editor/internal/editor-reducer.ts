import type { EditorAction } from './editor-actions.js';
import { mergeToolConfig, selectionsMatch } from './editor-reducer-support.js';
import type { EditorState } from './editor-state.js';

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'setTool':
      if (state.activeTool === action.tool) return state;
      return {
        ...state,
        activeTool: action.tool,
        // Clear selection when switching tools
        selection: null,
      };

    case 'setSelection':
      if (selectionsMatch(state.selection, action.selection)) {
        return state;
      }
      return { ...state, selection: action.selection };

    case 'updateToolConfig':
      return { ...state, toolConfigs: mergeToolConfig(state.toolConfigs, action.tool, action.config) };
  }
}

export type { EditorAction } from './editor-actions.js';
export type { EditorState } from './editor-state.js';
export { createInitialState } from './editor-state.js';
