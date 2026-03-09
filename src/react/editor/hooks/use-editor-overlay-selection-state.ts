import type { SerialisedAnnotation } from '../../../context/protocol.js';
import type { AnnotationMutationStore } from '../internal/annotation-mutation-store.js';
import type { AnnotationCrudActions } from './annotation-crud.types.js';
import { useAnnotationSelection } from './use-annotation-selection.js';
import { useEditorOverlaySelectedAnnotations } from './use-editor-overlay-selected-annotations.js';

interface UseEditorOverlaySelectionStateOptions {
  readonly committedAnnotations: readonly SerialisedAnnotation[];
  readonly crud: AnnotationCrudActions;
  readonly mutationStore: AnnotationMutationStore;
  readonly pageIndex: number;
  readonly resolvedAnnotations: readonly SerialisedAnnotation[];
}

export function useEditorOverlaySelectionState({
  committedAnnotations,
  crud,
  mutationStore,
  pageIndex,
  resolvedAnnotations,
}: UseEditorOverlaySelectionStateOptions) {
  const { selection, select, clearSelection } = useAnnotationSelection(crud, resolvedAnnotations, pageIndex);
  const { selectedAnnotation, selectedCommittedAnnotation, selectedPreviewPatch } = useEditorOverlaySelectedAnnotations(
    {
      committedAnnotations,
      mutationStore,
      pageIndex,
      resolvedAnnotations,
      selection,
    },
  );

  return {
    clearSelection,
    select,
    selectedAnnotation,
    selectedCommittedAnnotation,
    selectedPreviewPatch,
    selection,
  };
}
