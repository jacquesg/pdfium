import type { EditorContextValue } from '../context.js';
import type { RunCreateAndSelectMutation, RunMutation } from './editor-overlay-action-support.js';
import type { AnnotationCrudActions } from './use-annotation-crud.js';
import type { EditorOverlayCreationActionsResult } from './use-editor-overlay-creation-actions.js';
import type { EditorOverlayTextActionsResult } from './use-editor-overlay-text-actions.js';
import type { FreeTextInputActions } from './use-freetext-input.js';
import type { RedactionActions } from './use-redaction.js';
import type { TextMarkupActions } from './use-text-markup.js';

export interface EditorOverlayToolActionsResult
  extends EditorOverlayCreationActionsResult,
    EditorOverlayTextActionsResult {}

export interface UseEditorOverlayToolActionsOptions {
  readonly activeTool: EditorContextValue['activeTool'];
  readonly clearPendingMarkupAction: EditorContextValue['clearPendingMarkupAction'];
  readonly crud: AnnotationCrudActions;
  readonly freetextInput: FreeTextInputActions;
  readonly originalHeight: number;
  readonly pendingMarkupAction: EditorContextValue['pendingMarkupAction'];
  readonly redaction: RedactionActions;
  readonly runCreateAndSelectMutation: RunCreateAndSelectMutation;
  readonly runMutation: RunMutation;
  readonly scale: number;
  readonly setActiveTool: EditorContextValue['setActiveTool'];
  readonly textMarkup: TextMarkupActions;
  readonly toolConfigs: EditorContextValue['toolConfigs'];
}
