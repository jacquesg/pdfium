import type { SerialisedAnnotation } from '../../../context/protocol.js';
import type { Point, Rect } from '../../../core/types.js';
import type { EditorContextValue } from '../context.js';
import type { AnnotationMutationStore } from '../internal/annotation-mutation-store.js';
import type { RunCreateAndSelectMutation, RunMutation } from './editor-overlay-action-support.js';
import type { AnnotationCrudActions } from './use-annotation-crud.js';
import type { AnnotationSelectionActions } from './use-annotation-selection.js';

export interface EditorOverlaySelectionActionsResult {
  readonly clearSelectionPreview: () => void;
  readonly handleAnnotationClick: (annotationIndex: number) => void;
  readonly handleMove: (newRect: Rect) => void;
  readonly handleMoveLine: (nextLine: { start: Point; end: Point }) => void;
  readonly handleResize: (newRect: Rect) => void;
  readonly handleResizeLine: (nextLine: { start: Point; end: Point }) => void;
  readonly previewSelectionLine: (previewLine: { start: Point; end: Point }) => void;
  readonly previewSelectionRect: (previewRect: Rect) => void;
}

export interface UseEditorOverlaySelectionActionsOptions {
  readonly crud: AnnotationCrudActions;
  readonly mutationStore: AnnotationMutationStore;
  readonly pageIndex: number;
  readonly runCreateAndSelectMutation: RunCreateAndSelectMutation;
  readonly runMutation: RunMutation;
  readonly scale: number;
  readonly select: AnnotationSelectionActions['select'];
  readonly selectedAnnotation: SerialisedAnnotation | null;
  readonly selectedCommittedAnnotation: SerialisedAnnotation | null;
  readonly selection: AnnotationSelectionActions['selection'];
  readonly toolConfigs: EditorContextValue['toolConfigs'];
}
