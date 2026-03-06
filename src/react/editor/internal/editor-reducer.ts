/**
 * State management for the editor context.
 *
 * @module react/editor/internal/editor-reducer
 */

import type { AnnotationSelection, EditorMode, ToolConfigKey, ToolConfigMap } from '../types.js';
import { DEFAULT_TOOL_CONFIGS } from '../types.js';

// ────────────────────────────────────────────────────────────
// State
// ────────────────────────────────────────────────────────────

export interface EditorState {
  readonly activeTool: EditorMode;
  readonly selection: AnnotationSelection | null;
  readonly toolConfigs: ToolConfigMap;
}

export function createInitialState(overrides?: Partial<EditorState>): EditorState {
  return {
    activeTool: overrides?.activeTool ?? 'idle',
    selection: overrides?.selection ?? null,
    toolConfigs: overrides?.toolConfigs ?? DEFAULT_TOOL_CONFIGS,
  };
}

// ────────────────────────────────────────────────────────────
// Actions
// ────────────────────────────────────────────────────────────

export type EditorAction =
  | { type: 'setTool'; tool: EditorMode }
  | { type: 'setSelection'; selection: AnnotationSelection | null }
  | { type: 'updateToolConfig'; tool: ToolConfigKey; config: Partial<ToolConfigMap[ToolConfigKey]> };

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

/**
 * Produces a new ToolConfigMap with a single tool's configuration merged.
 *
 * Generic parameter `T` preserves the key–value correlation that TypeScript
 * loses when using a computed property key with a union type.
 */
function mergeToolConfig<T extends ToolConfigKey>(
  configs: ToolConfigMap,
  tool: T,
  partial: Partial<ToolConfigMap[T]>,
): ToolConfigMap {
  const merged: ToolConfigMap[T] = { ...configs[tool], ...partial };
  const result: { -readonly [K in keyof ToolConfigMap]: ToolConfigMap[K] } = { ...configs };
  result[tool] = merged;
  return result;
}

// ────────────────────────────────────────────────────────────
// Reducer
// ────────────────────────────────────────────────────────────

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
      if (state.selection === action.selection) return state;
      if (
        state.selection !== null &&
        action.selection !== null &&
        state.selection.pageIndex === action.selection.pageIndex &&
        state.selection.annotationIndex === action.selection.annotationIndex
      ) {
        return state;
      }
      return { ...state, selection: action.selection };

    case 'updateToolConfig':
      return { ...state, toolConfigs: mergeToolConfig(state.toolConfigs, action.tool, action.config) };
  }
}
