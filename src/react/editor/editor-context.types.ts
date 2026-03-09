import type { ReactNode } from 'react';
import type { CommandStack } from './command.js';
import type { AnnotationSelection, EditorMode, TextMarkupActionTool, ToolConfigKey, ToolConfigMap } from './types.js';

export interface EditorContextValue {
  readonly activeTool: EditorMode;
  setActiveTool(tool: EditorMode): void;
  readonly pendingMarkupAction: { tool: TextMarkupActionTool; requestId: number } | null;
  triggerMarkupAction(tool: TextMarkupActionTool): void;
  clearPendingMarkupAction(requestId?: number): void;
  readonly selection: AnnotationSelection | null;
  setSelection(selection: AnnotationSelection | null): void;
  readonly toolConfigs: ToolConfigMap;
  updateToolConfig<T extends ToolConfigKey>(tool: T, config: Partial<ToolConfigMap[T]>): void;
  readonly isDirty: boolean;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  undo(): Promise<void>;
  redo(): Promise<void>;
  markClean(): void;
  readonly commandStack: CommandStack;
}

export interface EditorProviderProps {
  readonly initialTool?: EditorMode;
  readonly toolConfigs?: Partial<ToolConfigMap>;
  readonly maxUndoDepth?: number;
  readonly children: ReactNode;
}
