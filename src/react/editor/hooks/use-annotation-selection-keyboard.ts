import { useEffect } from 'react';
import type { SerialisedAnnotation } from '../../../context/protocol.js';
import type { AnnotationSelection } from '../types.js';
import { findSelectionSnapshot, isEditableTarget } from './annotation-selection-support.js';
import type { AnnotationCrudActions } from './use-annotation-crud.js';

interface UseAnnotationSelectionKeyboardOptions {
  readonly annotations?: readonly SerialisedAnnotation[] | undefined;
  readonly clearSelection: () => void;
  readonly crud?: AnnotationCrudActions | undefined;
  readonly currentPageIndex?: number | undefined;
  readonly selection: AnnotationSelection | null;
}

export function useAnnotationSelectionKeyboard({
  annotations,
  clearSelection,
  crud,
  currentPageIndex,
  selection,
}: UseAnnotationSelectionKeyboardOptions): void {
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
        const snapshot = findSelectionSnapshot(annotations, selection.annotationIndex);
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
}
