/**
 * Annotation selection hook for the editor.
 *
 * Provides click-to-select, Escape to deselect, and Delete to remove.
 *
 * @module react/editor/hooks/use-annotation-selection
 */

import { useCallback, useEffect } from 'react';
import type { SerialisedAnnotation } from '../../../context/protocol.js';
import { useEditor } from '../context.js';
import type { AnnotationSelection } from '../types.js';
import type { AnnotationCrudActions } from './use-annotation-crud.js';

function clearNativeSelection(): void {
  const selection = globalThis.getSelection?.();
  if (!selection || selection.rangeCount === 0) {
    return;
  }

  selection.removeAllRanges();

  const clearAgain = () => {
    globalThis.getSelection?.()?.removeAllRanges();
  };

  if (typeof globalThis.requestAnimationFrame === 'function') {
    globalThis.requestAnimationFrame(() => {
      clearAgain();
    });
    return;
  }

  globalThis.setTimeout(clearAgain, 0);
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }
  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  ) {
    return true;
  }
  if (target instanceof HTMLElement && target.isContentEditable) {
    return true;
  }
  return target.closest('[contenteditable]:not([contenteditable="false"])') !== null;
}

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

  // Keyboard handler
  useEffect(() => {
    const handlesCurrentSelection =
      selection !== null && (currentPageIndex === undefined || selection.pageIndex === currentPageIndex);
    if (!handlesCurrentSelection) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) {
        return;
      }
      if (isEditableTarget(event.target)) {
        return;
      }
      if (event.repeat && (event.key === 'Delete' || event.key === 'Backspace')) {
        return;
      }

      if (event.key === 'Escape') {
        clearSelection();
        return;
      }

      if ((event.key === 'Delete' || event.key === 'Backspace') && selection && crud && annotations) {
        const snapshot = annotations.find((annotation) => annotation.index === selection.annotationIndex);
        if (snapshot) {
          event.preventDefault();
          void crud.removeAnnotation(selection.annotationIndex, snapshot);
          clearSelection();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selection, crud, annotations, clearSelection, currentPageIndex]);

  return { selection, select, clearSelection };
}
