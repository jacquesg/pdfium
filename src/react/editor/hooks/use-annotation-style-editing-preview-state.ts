import type { UseAnnotationStyleEditingStateOptions } from './annotation-style-editing-state.types.js';
import { useAnnotationStylePreviewBridge } from './use-annotation-style-preview-bridge.js';

export function useAnnotationStyleEditingPreviewState({
  annotation,
  onClearPreviewPatch,
  onPreviewPatch,
}: Pick<UseAnnotationStyleEditingStateOptions, 'annotation' | 'onClearPreviewPatch' | 'onPreviewPatch'>) {
  return useAnnotationStylePreviewBridge({
    annotationIndex: annotation.index,
    onClearPreviewPatch,
    onPreviewPatch,
  });
}
