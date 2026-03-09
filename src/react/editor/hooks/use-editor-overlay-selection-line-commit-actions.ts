import { useCallback } from 'react';
import { AnnotationType, type Point } from '../../../core/types.js';
import { buildFallbackLineRect } from '../components/editor-overlay-fallback-line-rect.js';
import {
  resolveSelectionLineStrokeColour,
  resolveSelectionLineStrokeWidth,
} from './editor-overlay-selection-action-support.js';
import type { UseEditorOverlaySelectionCommitActionsOptions } from './use-editor-overlay-selection-commit-actions.types.js';

type LineOptions = Pick<
  UseEditorOverlaySelectionCommitActionsOptions,
  'crud' | 'runCreateAndSelectMutation' | 'scale' | 'selectedCommittedAnnotation' | 'toolConfigs'
>;

export function useEditorOverlaySelectionLineCommitActions({
  crud,
  runCreateAndSelectMutation,
  scale,
  selectedCommittedAnnotation,
  toolConfigs,
}: LineOptions) {
  const commitFallbackLine = useCallback(
    (nextLine: { start: Point; end: Point }) => {
      const annotation = selectedCommittedAnnotation;
      if (!annotation || annotation.type !== AnnotationType.Ink || annotation.lineFallback !== true) return;
      const strokeWidth = resolveSelectionLineStrokeWidth(annotation, toolConfigs.line);
      const strokeColour = resolveSelectionLineStrokeColour(annotation, toolConfigs.line);
      runCreateAndSelectMutation(
        crud.replaceLineFallback(
          annotation,
          buildFallbackLineRect(nextLine.start, nextLine.end, strokeWidth, scale),
          nextLine.start,
          nextLine.end,
          strokeColour,
          strokeWidth,
        ),
      );
    },
    [crud, runCreateAndSelectMutation, scale, selectedCommittedAnnotation, toolConfigs.line],
  );

  const handleMoveLine = useCallback(
    (nextLine: { start: Point; end: Point }) => {
      commitFallbackLine(nextLine);
    },
    [commitFallbackLine],
  );

  const handleResizeLine = useCallback(
    (nextLine: { start: Point; end: Point }) => {
      commitFallbackLine(nextLine);
    },
    [commitFallbackLine],
  );

  return {
    handleMoveLine,
    handleResizeLine,
  };
}
