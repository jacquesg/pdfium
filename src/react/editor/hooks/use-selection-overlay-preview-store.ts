import type {
  UseSelectionOverlayPreviewStoreOptions,
  UseSelectionOverlayPreviewStoreResult,
} from './selection-overlay-preview-store.types.js';
import { useSelectionOverlayPreviewInitialValues } from './use-selection-overlay-preview-initial-values.js';
import { useSelectionOverlayPreviewSnapshots } from './use-selection-overlay-preview-snapshots.js';

export function useSelectionOverlayPreviewStore({
  appearance,
  maxHeight,
  maxWidth,
  originalHeight,
  rect,
  scale,
}: UseSelectionOverlayPreviewStoreOptions): UseSelectionOverlayPreviewStoreResult {
  const { boxAppearance, initialLine, initialScreenRect } = useSelectionOverlayPreviewInitialValues({
    appearance,
    maxHeight,
    maxWidth,
    originalHeight,
    rect,
    scale,
  });
  const snapshotStore = useSelectionOverlayPreviewSnapshots(initialScreenRect, initialLine);

  return {
    boxAppearance,
    ...snapshotStore,
  };
}

export type {
  UseSelectionOverlayPreviewStoreOptions,
  UseSelectionOverlayPreviewStoreResult,
} from './selection-overlay-preview-store.types.js';
