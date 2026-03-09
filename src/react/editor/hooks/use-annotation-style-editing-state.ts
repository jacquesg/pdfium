import type {
  AnnotationStyleEditingState,
  UseAnnotationStyleEditingStateOptions,
} from './annotation-style-editing-state.types.js';
import {
  getAnnotationStylePrimaryAlpha,
  useAnnotationStyleEditingCapabilityState,
} from './use-annotation-style-editing-capability-state.js';
import { useAnnotationStyleEditingMutationState } from './use-annotation-style-editing-mutation-state.js';

export function useAnnotationStyleEditingState({
  annotation,
  effectiveType,
  crud,
  onToolConfigChange,
  onPreviewPatch,
  onClearPreviewPatch,
}: UseAnnotationStyleEditingStateOptions): AnnotationStyleEditingState {
  const capabilityState = useAnnotationStyleEditingCapabilityState({
    annotation,
    effectiveType,
    onClearPreviewPatch,
    onPreviewPatch,
  });
  const mutationState = useAnnotationStyleEditingMutationState({
    annotation,
    canEditBorder: capabilityState.canEditBorder,
    clearPreviewPatch: capabilityState.clearPreviewPatch,
    crud,
    effectiveType,
    fillColourType: capabilityState.fillColourType,
    getPersistedEditableBorderForAnnotation: capabilityState.getPersistedEditableBorderForAnnotation,
    getPreservedBorderForCommit: capabilityState.getPreservedBorderForCommit,
    localBorderWidthRef: capabilityState.localBorderWidthRef,
    onToolConfigChange,
  });
  const primaryAlpha = getAnnotationStylePrimaryAlpha(
    capabilityState.primaryColourType,
    mutationState.localInteriorColour,
    mutationState.localStrokeColour,
  );

  return {
    ...mutationState,
    applyPreviewPatch: capabilityState.applyPreviewPatch,
    canEditBorder: capabilityState.canEditBorder,
    canEditFill: capabilityState.canEditFill,
    canEditStroke: capabilityState.canEditStroke,
    canToggleFill: capabilityState.canToggleFill,
    displayedBorder: capabilityState.getEditableBorderForWidth(mutationState.localBorderWidth),
    fillColourType: capabilityState.fillColourType,
    getEditableBorderForWidth: capabilityState.getEditableBorderForWidth,
    primaryAlpha,
    primaryColourType: capabilityState.primaryColourType,
  };
}
