import type { SerialisedAnnotation } from '../../../context/protocol.js';
import type { EditorContextValue } from '../context.js';
import type { AnnotationMutationStore } from '../internal/annotation-mutation-store.js';
import type { AnnotationCrudActions } from './use-annotation-crud.js';
import type { AnnotationSelectionActions } from './use-annotation-selection.js';
import type { EditorOverlaySelectionActionsResult } from './use-editor-overlay-selection-actions.js';
import type { EditorOverlayToolActionsResult } from './use-editor-overlay-tool-actions.js';
import type { FreeTextInputActions } from './use-freetext-input.js';
import type { RedactionActions } from './use-redaction.js';
import type { TextMarkupActions } from './use-text-markup.js';

export interface EditorOverlayActionsResult
  extends EditorOverlaySelectionActionsResult,
    EditorOverlayToolActionsResult {}

export interface UseEditorOverlayActionsOptions {
  readonly activeTool: EditorContextValue['activeTool'];
  readonly clearPendingMarkupAction: EditorContextValue['clearPendingMarkupAction'];
  readonly crud: AnnotationCrudActions;
  readonly freetextInput: FreeTextInputActions;
  readonly mutationStore: AnnotationMutationStore;
  readonly originalHeight: number;
  readonly pageIndex: number;
  readonly pendingMarkupAction: EditorContextValue['pendingMarkupAction'];
  readonly redaction: RedactionActions;
  readonly scale: number;
  readonly select: AnnotationSelectionActions['select'];
  readonly selectedAnnotation: SerialisedAnnotation | null;
  readonly selectedCommittedAnnotation: SerialisedAnnotation | null;
  readonly selection: AnnotationSelectionActions['selection'];
  readonly setActiveTool: EditorContextValue['setActiveTool'];
  readonly textMarkup: TextMarkupActions;
  readonly toolConfigs: EditorContextValue['toolConfigs'];
}
