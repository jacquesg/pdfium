import { useCallback } from 'react';
import type { LineDragSession } from '../components/selection-overlay.types.js';
import { applyLineDragAtClientPosition } from './selection-overlay-line-drag.js';
import type { UseSelectionOverlayLinePreviewActionsOptions } from './selection-overlay-line-preview-actions.types.js';
import { publishLinePreview } from './selection-overlay-preview-support.js';

type PreviewApplyOptions = Pick<
  UseSelectionOverlayLinePreviewActionsOptions,
  'maxHeight' | 'maxWidth' | 'onPreviewLine' | 'originalHeight' | 'scale' | 'setPreviewLineValue'
>;

export function useSelectionOverlayLinePreviewApply({
  maxHeight,
  maxWidth,
  onPreviewLine,
  originalHeight,
  scale,
  setPreviewLineValue,
}: PreviewApplyOptions) {
  return useCallback(
    (session: LineDragSession, clientX: number, clientY: number, modifiers?: { shiftKey?: boolean }) => {
      const nextLine = applyLineDragAtClientPosition(
        session,
        clientX,
        clientY,
        maxWidth,
        maxHeight,
        modifiers?.shiftKey === true,
      );
      setPreviewLineValue(nextLine);
      publishLinePreview(nextLine, scale, originalHeight, onPreviewLine);
    },
    [maxHeight, maxWidth, onPreviewLine, originalHeight, scale, setPreviewLineValue],
  );
}
