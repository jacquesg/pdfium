import { useCallback } from 'react';
import type { ScreenLine, SelectionOverlayAppearance } from '../components/selection-overlay.types.js';
import { isSameScreenLine, isSameScreenRect } from '../components/selection-overlay-geometry.js';
import type { ScreenRect } from '../shape-constraints.js';
import { buildResolvedPreviewLine, buildResolvedPreviewRect } from './selection-overlay-preview-support.js';

interface UseSelectionOverlayPreviewSyncActionsOptions {
  readonly appearance: SelectionOverlayAppearance;
  readonly getPreviewLineSnapshot: () => ScreenLine | null;
  readonly getPreviewRectSnapshot: () => ScreenRect;
  readonly maxHeight: number;
  readonly maxWidth: number;
  readonly originalHeight: number;
  readonly rect: { left: number; top: number; right: number; bottom: number };
  readonly scale: number;
  readonly setPreviewLineValue: (screenLine: ScreenLine | null) => void;
  readonly setPreviewRectValue: (screenRect: ScreenRect) => void;
}

export function useSelectionOverlayPreviewSyncActions({
  appearance,
  getPreviewLineSnapshot,
  getPreviewRectSnapshot,
  maxHeight,
  maxWidth,
  originalHeight,
  rect,
  scale,
  setPreviewLineValue,
  setPreviewRectValue,
}: UseSelectionOverlayPreviewSyncActionsOptions) {
  const buildCurrentResolvedRect = useCallback((): ScreenRect => {
    return buildResolvedPreviewRect({ maxHeight, maxWidth, originalHeight, rect, scale });
  }, [maxHeight, maxWidth, originalHeight, rect, scale]);

  const buildCurrentResolvedLine = useCallback((): ScreenLine | null => {
    return buildResolvedPreviewLine({ appearance, maxHeight, maxWidth, originalHeight, scale });
  }, [appearance, maxHeight, maxWidth, originalHeight, scale]);

  const syncPreviewFromInputs = useCallback(() => {
    const nextScreenRect = buildCurrentResolvedRect();
    if (!isSameScreenRect(getPreviewRectSnapshot(), nextScreenRect)) {
      setPreviewRectValue(nextScreenRect);
    }

    const nextLine = buildCurrentResolvedLine();
    if (!isSameScreenLine(getPreviewLineSnapshot(), nextLine)) {
      setPreviewLineValue(nextLine);
    }
  }, [
    buildCurrentResolvedLine,
    buildCurrentResolvedRect,
    getPreviewLineSnapshot,
    getPreviewRectSnapshot,
    setPreviewLineValue,
    setPreviewRectValue,
  ]);

  return { syncPreviewFromInputs };
}
