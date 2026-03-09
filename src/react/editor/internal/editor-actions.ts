import type { AnnotationSelection, EditorMode, ToolConfigKey, ToolConfigMap } from '../types.js';

export type EditorAction =
  | { type: 'setTool'; tool: EditorMode }
  | { type: 'setSelection'; selection: AnnotationSelection | null }
  | { type: 'updateToolConfig'; tool: ToolConfigKey; config: Partial<ToolConfigMap[ToolConfigKey]> };
