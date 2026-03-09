/**
 * Annotation selection hook for the editor.
 *
 * Provides click-to-select, Escape to deselect, and Delete to remove.
 *
 * @module react/editor/hooks/use-annotation-selection
 */

import { useCallback } from 'react';
import type { SerialisedAnnotation } from '../../../context/protocol.js';
import { useEditor } from '../context.js';
import type { AnnotationSelection } from '../types.js';
import { clearNativeSelection } from './annotation-selection-support.js';
import type { AnnotationCrudActions } from './use-annotation-crud.js';
import { useAnnotationSelectionKeyboard } from './use-annotation-selection-keyboard.js';

/**
 * Return type of `useAnnotationSelection`.
 */
export interface AnnotationSelectionActions {
  /** The currently selected annotation, or `null`. */
  readonly selection: AnnotationSelection | null;
  /** Select an annotation on a page. */
  select(pageIndex: number, annotationIndex: number): void;
  /** Clear the current selection. */
  clearSelection(): void;
}

/**
 * Manages annotation selection state with keyboard shortcuts.
 *
 * - `Escape` clears the selection.
 * - `Delete` / `Backspace` removes the selected annotation (requires `crud` and `annotations`).
 *
 * Must be called within an `EditorProvider`.
 */
export function useAnnotationSelection(
  crud?: AnnotationCrudActions,
  annotations?: readonly SerialisedAnnotation[],
  currentPageIndex?: number,
): AnnotationSelectionActions {
  const { selection, setSelection } = useEditor();

  const select = useCallback(
    (pageIndex: number, annotationIndex: number) => {
      clearNativeSelection();
      setSelection({ pageIndex, annotationIndex });
    },
    [setSelection],
  );

  const clearSelection = useCallback(() => {
    setSelection(null);
  }, [setSelection]);

  useAnnotationSelectionKeyboard({
    annotations,
    clearSelection,
    crud,
    currentPageIndex,
    selection,
  });

  return { selection, select, clearSelection };
}
