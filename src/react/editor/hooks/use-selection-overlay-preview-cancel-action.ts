import { useCallback } from 'react';
import type { DragSession } from '../components/selection-overlay.types.js';

interface UseSelectionOverlayPreviewCancelActionOptions {
  readonly onPreviewClear?: (() => void) | undefined;
  readonly syncPreviewFromInputs: () => void;
}

export function useSelectionOverlayPreviewCancelAction({
  onPreviewClear,
  syncPreviewFromInputs,
}: UseSelectionOverlayPreviewCancelActionOptions) {
  return useCallback(
    (_session: DragSession | null) => {
      syncPreviewFromInputs();
      onPreviewClear?.();
    },
    [onPreviewClear, syncPreviewFromInputs],
  );
}
