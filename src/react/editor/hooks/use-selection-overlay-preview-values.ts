import type {
  UseSelectionOverlayPreviewStoreOptions,
  UseSelectionOverlayPreviewStoreResult,
} from './selection-overlay-preview-store.types.js';
import { useSelectionOverlayPreviewStore } from './use-selection-overlay-preview-store.js';
import { useSelectionOverlayPreviewSyncActions } from './use-selection-overlay-preview-sync-actions.js';

interface UseSelectionOverlayPreviewValuesResult extends UseSelectionOverlayPreviewStoreResult {
  readonly syncPreviewFromInputs: () => void;
}

export function useSelectionOverlayPreviewValues({
  appearance,
  maxHeight,
  maxWidth,
  originalHeight,
  rect,
  scale,
}: UseSelectionOverlayPreviewStoreOptions): UseSelectionOverlayPreviewValuesResult {
  const previewStore = useSelectionOverlayPreviewStore({
    appearance,
    maxHeight,
    maxWidth,
    originalHeight,
    rect,
    scale,
  });
  const { syncPreviewFromInputs } = useSelectionOverlayPreviewSyncActions({
    appearance,
    getPreviewLineSnapshot: previewStore.getPreviewLineSnapshot,
    getPreviewRectSnapshot: previewStore.getPreviewRectSnapshot,
    maxHeight,
    maxWidth,
    originalHeight,
    rect,
    scale,
    setPreviewLineValue: previewStore.setPreviewLineValue,
    setPreviewRectValue: previewStore.setPreviewRectValue,
  });

  return {
    ...previewStore,
    syncPreviewFromInputs,
  };
}
