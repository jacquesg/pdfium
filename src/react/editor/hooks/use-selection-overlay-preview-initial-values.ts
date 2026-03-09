import { useMemo } from 'react';
import type { UseSelectionOverlayPreviewStoreOptions } from './selection-overlay-preview-store.types.js';
import {
  buildResolvedPreviewLine,
  buildResolvedPreviewRect,
  resolveBoxAppearance,
} from './selection-overlay-preview-support.js';

export function useSelectionOverlayPreviewInitialValues({
  appearance,
  maxHeight,
  maxWidth,
  originalHeight,
  rect,
  scale,
}: UseSelectionOverlayPreviewStoreOptions) {
  const initialScreenRect = useMemo(
    () => buildResolvedPreviewRect({ maxHeight, maxWidth, originalHeight, rect, scale }),
    [maxHeight, maxWidth, originalHeight, rect, scale],
  );
  const initialLine = useMemo(
    () => buildResolvedPreviewLine({ appearance, maxHeight, maxWidth, originalHeight, scale }),
    [appearance, maxHeight, maxWidth, originalHeight, scale],
  );
  const boxAppearance = useMemo(() => resolveBoxAppearance(appearance), [appearance]);

  return {
    boxAppearance,
    initialLine,
    initialScreenRect,
  };
}
