import { type PointerEvent as ReactPointerEvent, useCallback, useMemo } from 'react';
import { AnnotationType } from '../../../core/types.js';
import { getPointerOffsetWithinCurrentTarget, isSecondaryMouseButton } from './editor-overlay-action-support.js';
import type {
  EditorOverlayStampCreationActionResult,
  UseEditorOverlayCreationActionsOptions,
} from './editor-overlay-creation-actions.types.js';
import { buildStampAnnotationRect } from './editor-overlay-creation-support.js';

export function useEditorOverlayStampCreationAction({
  crud,
  originalHeight,
  runCreateAndSelectMutation,
  scale,
  setActiveTool,
  toolConfigs,
}: UseEditorOverlayCreationActionsOptions): EditorOverlayStampCreationActionResult {
  const handleStampClick = useCallback<EditorOverlayStampCreationActionResult['handleStampClick']>(
    (event: ReactPointerEvent) => {
      if (isSecondaryMouseButton(event)) return;
      event.preventDefault();
      setActiveTool('idle');
      const point = getPointerOffsetWithinCurrentTarget(event);
      runCreateAndSelectMutation(
        crud.createAnnotation(AnnotationType.Stamp, buildStampAnnotationRect({ originalHeight, point, scale }), {
          stampType: toolConfigs.stamp.stampType,
        }),
      );
    },
    [crud, originalHeight, runCreateAndSelectMutation, scale, setActiveTool, toolConfigs.stamp.stampType],
  );

  return useMemo(
    () => ({
      handleStampClick,
    }),
    [handleStampClick],
  );
}
