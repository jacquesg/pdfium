import {
  getAnnotationStyleEditingCapabilities,
  getAnnotationStylePrimaryAlpha,
} from './annotation-style-editing-capabilities.js';
import type { AnnotationStyleEditingCapabilityState } from './annotation-style-editing-capability-state.types.js';
import type { UseAnnotationStyleEditingStateOptions } from './annotation-style-editing-state.types.js';
import { useAnnotationStyleEditingCapabilityRuntime } from './use-annotation-style-editing-capability-runtime.js';

export function useAnnotationStyleEditingCapabilityState({
  annotation,
  effectiveType,
  onClearPreviewPatch,
  onPreviewPatch,
}: Pick<
  UseAnnotationStyleEditingStateOptions,
  'annotation' | 'effectiveType' | 'onClearPreviewPatch' | 'onPreviewPatch'
>): AnnotationStyleEditingCapabilityState {
  const { canEditBorder, canEditFill, canEditStroke, canToggleFill, fillColourType, primaryColourType } =
    getAnnotationStyleEditingCapabilities(effectiveType);
  const {
    applyPreviewPatch,
    clearPreviewPatch,
    getEditableBorderForWidth,
    getPersistedEditableBorderForAnnotation,
    getPreservedBorderForCommit,
    localBorderWidthRef,
  } = useAnnotationStyleEditingCapabilityRuntime({
    annotation,
    canEditBorder,
    onClearPreviewPatch,
    onPreviewPatch,
  });

  return {
    applyPreviewPatch,
    canEditBorder,
    canEditFill,
    canEditStroke,
    canToggleFill,
    clearPreviewPatch,
    fillColourType,
    getEditableBorderForWidth,
    getPersistedEditableBorderForAnnotation,
    getPreservedBorderForCommit,
    localBorderWidthRef,
    primaryColourType,
  };
}

export { getAnnotationStylePrimaryAlpha };
