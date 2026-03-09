import { useCallback } from 'react';
import type {
  EditorOverlayDrawingCreationActionsResult,
  UseEditorOverlayCreationActionsOptions,
} from './editor-overlay-creation-actions.types.js';

type UseEditorOverlayRedactCreateActionOptions = Pick<
  UseEditorOverlayCreationActionsOptions,
  'redaction' | 'runCreateAndSelectMutation' | 'setActiveTool' | 'toolConfigs'
>;

export function useEditorOverlayRedactCreateAction({
  redaction,
  runCreateAndSelectMutation,
  setActiveTool,
  toolConfigs,
}: UseEditorOverlayRedactCreateActionOptions): EditorOverlayDrawingCreationActionsResult['handleRedactCreate'] {
  return useCallback<EditorOverlayDrawingCreationActionsResult['handleRedactCreate']>(
    (rect) => {
      setActiveTool('idle');
      runCreateAndSelectMutation(redaction.markRedaction(rect, { colour: toolConfigs.redact.fillColour }));
    },
    [redaction, runCreateAndSelectMutation, setActiveTool, toolConfigs.redact.fillColour],
  );
}
