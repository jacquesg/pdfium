import { useCallback } from 'react';
import type {
  EditorOverlayDrawingCreationActionsResult,
  UseEditorOverlayCreationActionsOptions,
} from './editor-overlay-creation-actions.types.js';
import { resolveShapeCreationRequest } from './editor-overlay-creation-support.js';

type UseEditorOverlayShapeCreateActionOptions = Pick<
  UseEditorOverlayCreationActionsOptions,
  'activeTool' | 'crud' | 'runCreateAndSelectMutation' | 'scale' | 'setActiveTool' | 'toolConfigs'
>;

export function useEditorOverlayShapeCreateAction({
  activeTool,
  crud,
  runCreateAndSelectMutation,
  scale,
  setActiveTool,
  toolConfigs,
}: UseEditorOverlayShapeCreateActionOptions): EditorOverlayDrawingCreationActionsResult['handleShapeCreate'] {
  return useCallback<EditorOverlayDrawingCreationActionsResult['handleShapeCreate']>(
    (rect, detail) => {
      setActiveTool('idle');
      const request = resolveShapeCreationRequest({
        activeTool,
        detail,
        rect,
        scale,
        toolConfigs,
      });
      if (request === null) {
        return;
      }
      runCreateAndSelectMutation(crud.createAnnotation(request.subtype, request.rect, request.options));
    },
    [activeTool, crud, runCreateAndSelectMutation, scale, setActiveTool, toolConfigs],
  );
}
