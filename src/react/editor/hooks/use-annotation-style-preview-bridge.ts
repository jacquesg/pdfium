import { useCallback } from 'react';
import type { OptimisticAnnotationPatch } from '../internal/annotation-mutation-store.js';

interface UseAnnotationStylePreviewBridgeOptions {
  readonly annotationIndex: number;
  readonly onPreviewPatch?: ((annotationIndex: number, patch: OptimisticAnnotationPatch) => void) | undefined;
  readonly onClearPreviewPatch?: ((annotationIndex: number) => void) | undefined;
}

export function useAnnotationStylePreviewBridge({
  annotationIndex,
  onPreviewPatch,
  onClearPreviewPatch,
}: UseAnnotationStylePreviewBridgeOptions) {
  const applyPreviewPatch = useCallback(
    (patch: OptimisticAnnotationPatch) => {
      onPreviewPatch?.(annotationIndex, patch);
    },
    [annotationIndex, onPreviewPatch],
  );

  const clearPreviewPatch = useCallback(() => {
    onClearPreviewPatch?.(annotationIndex);
  }, [annotationIndex, onClearPreviewPatch]);

  return {
    applyPreviewPatch,
    clearPreviewPatch,
  };
}
