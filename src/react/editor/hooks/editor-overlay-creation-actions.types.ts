import type { PointerEvent as ReactPointerEvent } from 'react';
import type { Rect } from '../../../core/types.js';
import type { ShapeCreateDetail } from '../components/shape-creation-overlay.types.js';
import type { EditorContextValue } from '../context.js';
import type { RunCreateAndSelectMutation, RunMutation } from './editor-overlay-action-support.js';
import type { AnnotationCrudActions } from './use-annotation-crud.js';
import type { RedactionActions } from './use-redaction.js';

export interface EditorOverlayCreationActionsResult {
  readonly handleInkComplete: (points: ReadonlyArray<{ x: number; y: number }>) => void;
  readonly handleRedactCreate: (rect: Rect) => void;
  readonly handleShapeCreate: (rect: Rect, detail?: ShapeCreateDetail) => void;
  readonly handleStampClick: (event: ReactPointerEvent) => void;
}

export interface UseEditorOverlayCreationActionsOptions {
  readonly activeTool: EditorContextValue['activeTool'];
  readonly crud: AnnotationCrudActions;
  readonly originalHeight: number;
  readonly redaction: RedactionActions;
  readonly runCreateAndSelectMutation: RunCreateAndSelectMutation;
  readonly runMutation: RunMutation;
  readonly scale: number;
  readonly setActiveTool: EditorContextValue['setActiveTool'];
  readonly toolConfigs: EditorContextValue['toolConfigs'];
}

export interface EditorOverlayDrawingCreationActionsResult
  extends Pick<EditorOverlayCreationActionsResult, 'handleInkComplete' | 'handleRedactCreate' | 'handleShapeCreate'> {}

export interface EditorOverlayStampCreationActionResult
  extends Pick<EditorOverlayCreationActionsResult, 'handleStampClick'> {}
