import { useCallback } from 'react';
import { finishLineDragSession } from './selection-overlay-line-drag.js';
import type { UseSelectionOverlayLinePreviewActionsOptions } from './selection-overlay-line-preview-actions.types.js';

type PreviewFinishOptions = Pick<
  UseSelectionOverlayLinePreviewActionsOptions,
  'getPreviewLineSnapshot' | 'onMove' | 'onMoveLine' | 'onResize' | 'onResizeLine' | 'originalHeight' | 'scale'
>;

export function useSelectionOverlayLinePreviewFinish({
  getPreviewLineSnapshot,
  onMove,
  onMoveLine,
  onResize,
  onResizeLine,
  originalHeight,
  scale,
}: PreviewFinishOptions) {
  return useCallback(
    (session: Parameters<typeof finishLineDragSession>[0]) => {
      finishLineDragSession(session, {
        onMove,
        onMoveLine,
        onResize,
        onResizeLine,
        originalHeight,
        previewLine: getPreviewLineSnapshot(),
        scale,
      });
    },
    [getPreviewLineSnapshot, onMove, onMoveLine, onResize, onResizeLine, originalHeight, scale],
  );
}
