import { useEffect } from 'react';

export function useSelectionOverlayPreviewSync(dragging: boolean, syncPreviewFromInputs: () => void): void {
  useEffect(() => {
    if (dragging) return;
    syncPreviewFromInputs();
  }, [dragging, syncPreviewFromInputs]);
}
