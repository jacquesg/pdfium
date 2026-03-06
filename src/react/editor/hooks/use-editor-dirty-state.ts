/**
 * Editor dirty state hook.
 *
 * Derives dirty state from the command stack.
 *
 * @module react/editor/hooks/use-editor-dirty-state
 */

import { useEditor } from '../context.js';

/**
 * Return type of `useEditorDirtyState`.
 */
export interface EditorDirtyStateActions {
  /** Whether the document has unsaved changes. */
  readonly isDirty: boolean;
  /** Mark the current state as saved (clean). */
  markClean(): void;
}

/**
 * Exposes the editor's dirty state.
 *
 * `isDirty` is `true` when the undo cursor differs from the last
 * clean point (set via `markClean`).
 *
 * Must be called within an `EditorProvider`.
 */
export function useEditorDirtyState(): EditorDirtyStateActions {
  const { isDirty, markClean } = useEditor();
  return { isDirty, markClean };
}
