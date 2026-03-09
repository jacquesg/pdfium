import type { UseAnnotationStyleEditingStateOptions } from './annotation-style-editing-state.types.js';
import { useAnnotationStyleEditingBorderState } from './use-annotation-style-editing-border-state.js';
import { useAnnotationStyleEditingPreviewState } from './use-annotation-style-editing-preview-state.js';

interface UseAnnotationStyleEditingCapabilityRuntimeOptions
  extends Pick<UseAnnotationStyleEditingStateOptions, 'annotation' | 'onClearPreviewPatch' | 'onPreviewPatch'> {
  readonly canEditBorder: boolean;
}

export function useAnnotationStyleEditingCapabilityRuntime({
  annotation,
  canEditBorder,
  onClearPreviewPatch,
  onPreviewPatch,
}: UseAnnotationStyleEditingCapabilityRuntimeOptions) {
  const previewState = useAnnotationStyleEditingPreviewState({
    annotation,
    onClearPreviewPatch,
    onPreviewPatch,
  });
  const borderState = useAnnotationStyleEditingBorderState(annotation.border, canEditBorder);

  return {
    ...previewState,
    ...borderState,
  };
}
