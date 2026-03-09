import type { PointerEvent as ReactPointerEvent } from 'react';
import type { Rect } from '../../../core/types.js';
import type { EditorContextValue } from '../context.js';
import type { RunCreateAndSelectMutation } from './editor-overlay-action-support.js';
import type { FreeTextInputActions } from './use-freetext-input.js';
import type { TextMarkupActions } from './use-text-markup.js';

export interface EditorOverlayTextActionsResult {
  readonly freetextIsActive: boolean;
  readonly handleFreeTextClick: (event: ReactPointerEvent) => void;
  readonly handleMarkupProcessResult: (_processed: boolean) => void;
  readonly handleTextMarkupCreate: (rects: readonly Rect[], boundingRect: Rect) => void;
}

export interface UseEditorOverlayTextActionsOptions {
  readonly clearPendingMarkupAction: EditorContextValue['clearPendingMarkupAction'];
  readonly freetextInput: FreeTextInputActions;
  readonly pendingMarkupAction: EditorContextValue['pendingMarkupAction'];
  readonly runCreateAndSelectMutation: RunCreateAndSelectMutation;
  readonly setActiveTool: EditorContextValue['setActiveTool'];
  readonly textMarkup: TextMarkupActions;
  readonly toolConfigs: EditorContextValue['toolConfigs'];
}
