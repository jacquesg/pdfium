import { useCallback } from 'react';
import type { Point, Rect } from '../../../core/types.js';
import { buildSelectionLinePreviewPatch } from './editor-overlay-selection-action-support.js';
import type { UseEditorOverlaySelectionActionsOptions } from './editor-overlay-selection-actions.types.js';

interface EditorOverlaySelectionPreviewActionsResult {
  readonly clearSelectionPreview: () => void;
  readonly previewSelectionLine: (previewLine: { start: Point; end: Point }) => void;
  readonly previewSelectionRect: (previewRect: Rect) => void;
}

export function useEditorOverlaySelectionPreviewActions({
  mutationStore,
  pageIndex,
  scale,
  selectedAnnotation,
  selectedCommittedAnnotation,
  selection,
  toolConfigs,
}: Pick<
  UseEditorOverlaySelectionActionsOptions,
  | 'mutationStore'
  | 'pageIndex'
  | 'scale'
  | 'selectedAnnotation'
  | 'selectedCommittedAnnotation'
  | 'selection'
  | 'toolConfigs'
>): EditorOverlaySelectionPreviewActionsResult {
  const previewSelectionRect = useCallback(
    (previewRect: Rect) => {
      if (!selection || selection.pageIndex !== pageIndex) return;
      mutationStore.preview(pageIndex, selection.annotationIndex, { bounds: previewRect });
    },
    [mutationStore, pageIndex, selection],
  );

  const previewSelectionLine = useCallback(
    (previewLine: { start: Point; end: Point }) => {
      const previewSource = selectedCommittedAnnotation ?? selectedAnnotation;
      if (!selection || selection.pageIndex !== pageIndex || previewSource === null) return;
      mutationStore.preview(
        pageIndex,
        selection.annotationIndex,
        buildSelectionLinePreviewPatch({
          lineToolConfig: toolConfigs.line,
          previewLine,
          previewSource,
          scale,
        }),
      );
    },
    [mutationStore, pageIndex, scale, selectedAnnotation, selectedCommittedAnnotation, selection, toolConfigs.line],
  );

  const clearSelectionPreview = useCallback(() => {
    if (!selection || selection.pageIndex !== pageIndex) return;
    mutationStore.clearPreview(pageIndex, selection.annotationIndex);
  }, [mutationStore, pageIndex, selection]);

  return {
    clearSelectionPreview,
    previewSelectionLine,
    previewSelectionRect,
  };
}
