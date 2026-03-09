import { useCallback } from 'react';
import type { Rect } from '../../../core/types.js';
import { applyMarkupOpacity } from '../components/editor-overlay-helpers.js';
import { TEXT_MARKUP_TYPE_MAP } from './editor-overlay-action-support.js';
import type { UseEditorOverlayTextActionsOptions } from './editor-overlay-text-actions.types.js';

type UseEditorOverlayMarkupActionsOptions = Pick<
  UseEditorOverlayTextActionsOptions,
  | 'clearPendingMarkupAction'
  | 'pendingMarkupAction'
  | 'runCreateAndSelectMutation'
  | 'setActiveTool'
  | 'textMarkup'
  | 'toolConfigs'
>;

export function useEditorOverlayMarkupActions({
  clearPendingMarkupAction,
  pendingMarkupAction,
  runCreateAndSelectMutation,
  setActiveTool,
  textMarkup,
  toolConfigs,
}: UseEditorOverlayMarkupActionsOptions) {
  const handleTextMarkupCreate = useCallback(
    (rects: readonly Rect[], boundingRect: Rect) => {
      if (pendingMarkupAction === null) return;
      const tool = pendingMarkupAction.tool;
      const config = toolConfigs[tool];
      runCreateAndSelectMutation(
        textMarkup.createMarkup(
          TEXT_MARKUP_TYPE_MAP[tool],
          rects,
          boundingRect,
          applyMarkupOpacity(config.colour, config.opacity),
        ),
      );
    },
    [pendingMarkupAction, runCreateAndSelectMutation, textMarkup, toolConfigs],
  );

  const handleMarkupProcessResult = useCallback(
    (_processed: boolean) => {
      clearPendingMarkupAction(pendingMarkupAction?.requestId);
      setActiveTool('idle');
    },
    [clearPendingMarkupAction, pendingMarkupAction?.requestId, setActiveTool],
  );

  return {
    handleMarkupProcessResult,
    handleTextMarkupCreate,
  };
}
