import { useCallback } from 'react';
import type { BoxAppearance, BoxDragSession } from '../components/selection-overlay.types.js';
import type { ScreenRect } from '../shape-constraints.js';
import { applyBoxDragAtClientPosition, finishBoxDragSession } from './selection-overlay-box-drag.js';
import { publishRectPreview } from './selection-overlay-preview-support.js';

interface UseSelectionOverlayBoxPreviewActionsOptions {
  readonly boxAppearance: BoxAppearance;
  readonly getPreviewRectSnapshot: () => ScreenRect;
  readonly maxHeight: number;
  readonly maxWidth: number;
  readonly onMove?: ((newRect: { left: number; top: number; right: number; bottom: number }) => void) | undefined;
  readonly onPreviewRect?:
    | ((previewRect: { left: number; top: number; right: number; bottom: number }) => void)
    | undefined;
  readonly onResize?: ((newRect: { left: number; top: number; right: number; bottom: number }) => void) | undefined;
  readonly originalHeight: number;
  readonly scale: number;
  readonly setPreviewRectValue: (screenRect: ScreenRect) => void;
}

export function useSelectionOverlayBoxPreviewActions({
  boxAppearance,
  getPreviewRectSnapshot,
  maxHeight,
  maxWidth,
  onMove,
  onPreviewRect,
  onResize,
  originalHeight,
  scale,
  setPreviewRectValue,
}: UseSelectionOverlayBoxPreviewActionsOptions) {
  const applyBoxDragPreview = useCallback(
    (session: BoxDragSession, clientX: number, clientY: number, modifiers?: { shiftKey?: boolean }) => {
      const nextRect = applyBoxDragAtClientPosition(
        session,
        clientX,
        clientY,
        boxAppearance,
        maxWidth,
        maxHeight,
        modifiers?.shiftKey === true,
      );
      setPreviewRectValue(nextRect);
      publishRectPreview(nextRect, scale, originalHeight, onPreviewRect);
    },
    [boxAppearance, maxHeight, maxWidth, onPreviewRect, originalHeight, scale, setPreviewRectValue],
  );

  const finishBoxPreviewSession = useCallback(
    (session: BoxDragSession) => {
      finishBoxDragSession(session, {
        onMove,
        onResize,
        originalHeight,
        previewRect: getPreviewRectSnapshot(),
        scale,
      });
    },
    [getPreviewRectSnapshot, onMove, onResize, originalHeight, scale],
  );

  return {
    applyBoxDragPreview,
    finishBoxPreviewSession,
  };
}
