import type {
  AnnotationStyleBorderCommitControlsResult,
  AnnotationStyleBorderPreviewControlsResult,
  UseAnnotationStyleBorderControlsOptions,
} from './annotation-style-border-controls.types.js';
import { useAnnotationStyleBorderCommitControls } from './use-annotation-style-border-commit-controls.js';
import { useAnnotationStyleBorderPreviewControls } from './use-annotation-style-border-preview-controls.js';

export function useAnnotationStyleBorderControls({
  annotationBorder,
  canEditBorder,
  localBorderWidth,
  pendingBorderCommitRef,
  persistedBorderForCommitRef,
  skipBorderCommitOnBlurRef,
  borderEditStartRef,
  clearPendingBorderCommit,
  clearStyleCommitTimer,
  flushPreviewIfStyleIdle,
  flushStyleCommits,
  queueBorderCommit,
  setLocalBorderWidth,
  applyBorderPreset,
  applyPreviewPatch,
  getEditableBorderForWidth,
}: UseAnnotationStyleBorderControlsOptions) {
  const previewControls: AnnotationStyleBorderPreviewControlsResult = useAnnotationStyleBorderPreviewControls({
    applyBorderPreset,
    applyPreviewPatch,
    borderEditStartRef,
    getEditableBorderForWidth,
    localBorderWidth,
    persistedBorderForCommitRef,
    queueBorderCommit,
    setLocalBorderWidth,
  });

  const commitControls: AnnotationStyleBorderCommitControlsResult = useAnnotationStyleBorderCommitControls({
    annotationBorder,
    borderEditStartRef,
    canEditBorder,
    clearPendingBorderCommit,
    clearStyleCommitTimer,
    flushPreviewIfStyleIdle,
    flushStyleCommits,
    localBorderWidth,
    pendingBorderCommitRef,
    persistedBorderForCommitRef,
    queueBorderCommit,
    setLocalBorderWidth,
    skipBorderCommitOnBlurRef,
  });

  return {
    ...previewControls,
    ...commitControls,
  };
}
