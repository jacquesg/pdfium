import { useCallback } from 'react';
import { AnnotationType } from '../../../core/types.js';
import type {
  EditorOverlayDrawingCreationActionsResult,
  UseEditorOverlayCreationActionsOptions,
} from './editor-overlay-creation-actions.types.js';
import { buildInkCreationRequest } from './editor-overlay-creation-support.js';

type UseEditorOverlayInkCompleteActionOptions = Pick<
  UseEditorOverlayCreationActionsOptions,
  'crud' | 'originalHeight' | 'runMutation' | 'scale' | 'toolConfigs'
>;

export function useEditorOverlayInkCompleteAction({
  crud,
  originalHeight,
  runMutation,
  scale,
  toolConfigs,
}: UseEditorOverlayInkCompleteActionOptions): EditorOverlayDrawingCreationActionsResult['handleInkComplete'] {
  return useCallback<EditorOverlayDrawingCreationActionsResult['handleInkComplete']>(
    (points) => {
      if (points.length < 2) return;
      const request = buildInkCreationRequest({
        originalHeight,
        points,
        scale,
        toolConfig: toolConfigs.ink,
      });
      runMutation(crud.createAnnotation(AnnotationType.Ink, request.rect, request.options));
    },
    [crud, originalHeight, runMutation, scale, toolConfigs.ink],
  );
}
