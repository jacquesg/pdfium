import type { AnnotationSelection, EditorMode, ToolConfigMap } from '../types.js';
import { DEFAULT_TOOL_CONFIGS } from '../types.js';

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
