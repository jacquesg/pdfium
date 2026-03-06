/**
 * Editor tool hook.
 *
 * Wraps `setActiveTool` from the editor context, clearing
 * the selection when the tool changes.
 *
 * @module react/editor/hooks/use-editor-tool
 */

import { useCallback } from 'react';
import { useEditor } from '../context.js';
import type { EditorMode } from '../types.js';

/**
 * Return type of `useEditorTool`.
 */
export interface EditorToolActions {
  /** The current editor mode. */
  readonly activeTool: EditorMode;
  /** Switch to a different editor tool. Clears selection. */
  setTool(tool: EditorMode): void;
}

/**
 * Provides the current editor tool and a setter.
 *
 * Switching tools automatically clears the annotation selection
 * (handled by the editor reducer).
 *
 * Must be called within an `EditorProvider`.
 */
export function useEditorTool(): EditorToolActions {
  const { activeTool, setActiveTool } = useEditor();

  const setTool = useCallback(
    (tool: EditorMode) => {
      setActiveTool(tool);
    },
    [setActiveTool],
  );

  return { activeTool, setTool };
}
