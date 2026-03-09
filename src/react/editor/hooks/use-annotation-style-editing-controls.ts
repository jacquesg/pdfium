import type { SerialisedAnnotation } from '../../../context/protocol.js';
import type { AnnotationType } from '../../../core/types.js';
import type { AnnotationStyleEditingState } from './annotation-style-editing-state.types.js';
import { useAnnotationStyleBorderControls } from './use-annotation-style-border-controls.js';
import { useAnnotationStyleColourControls } from './use-annotation-style-colour-controls.js';

interface UseAnnotationStyleEditingControlsOptions {
  readonly annotation: SerialisedAnnotation;
  readonly effectiveType: AnnotationType;
  readonly state: AnnotationStyleEditingState;
}

export function useAnnotationStyleEditingControls({
  annotation,
  effectiveType,
  state,
}: UseAnnotationStyleEditingControlsOptions) {
  const colourControls = useAnnotationStyleColourControls({
    annotationInteriorColour: annotation.colour.interior,
    effectiveType,
    canEditFill: state.canEditFill,
    canEditStroke: state.canEditStroke,
    canToggleFill: state.canToggleFill,
    fillColourType: state.fillColourType,
    fillEnabled: state.fillEnabled,
    liveInteriorColourRef: state.liveInteriorColourRef,
    liveStrokeColourRef: state.liveStrokeColourRef,
    panelRootRef: state.panelRootRef,
    primaryColourType: state.primaryColourType,
    queueColourCommit: state.queueColourCommit,
    setFillEnabled: state.setFillEnabled,
    setLocalInteriorColour: state.setLocalInteriorColour,
    setLocalStrokeColour: state.setLocalStrokeColour,
    flushPreviewIfStyleIdle: state.flushPreviewIfStyleIdle,
    flushStyleCommits: state.flushStyleCommits,
    applyFillPreset: state.applyFillPreset,
    applyOpacityPreset: state.applyOpacityPreset,
    applyPreviewPatch: state.applyPreviewPatch,
    applyStrokePreset: state.applyStrokePreset,
  });

  const borderControls = useAnnotationStyleBorderControls({
    annotationBorder: annotation.border,
    canEditBorder: state.canEditBorder,
    localBorderWidth: state.localBorderWidth,
    pendingBorderCommitRef: state.pendingBorderCommitRef,
    persistedBorderForCommitRef: state.persistedBorderForCommitRef,
    skipBorderCommitOnBlurRef: state.skipBorderCommitOnBlurRef,
    borderEditStartRef: state.borderEditStartRef,
    clearPendingBorderCommit: state.clearPendingBorderCommit,
    clearStyleCommitTimer: state.clearStyleCommitTimer,
    flushPreviewIfStyleIdle: state.flushPreviewIfStyleIdle,
    flushStyleCommits: state.flushStyleCommits,
    queueBorderCommit: state.queueBorderCommit,
    setLocalBorderWidth: state.setLocalBorderWidth,
    applyBorderPreset: state.applyBorderPreset,
    applyPreviewPatch: state.applyPreviewPatch,
    getEditableBorderForWidth: state.getEditableBorderForWidth,
  });

  return {
    ...colourControls,
    ...borderControls,
  };
}
