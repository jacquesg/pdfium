import type {
  AnnotationStyleBorderCommitControlsResult,
  UseAnnotationStyleBorderControlsOptions,
} from './annotation-style-border-controls.types.js';
import { useAnnotationStyleBorderCommitAction } from './use-annotation-style-border-commit-action.js';
import { useAnnotationStyleBorderKeydownHandler } from './use-annotation-style-border-keydown-handler.js';

type UseAnnotationStyleBorderCommitControlsOptions = Pick<
  UseAnnotationStyleBorderControlsOptions,
  | 'annotationBorder'
  | 'borderEditStartRef'
  | 'canEditBorder'
  | 'clearPendingBorderCommit'
  | 'clearStyleCommitTimer'
  | 'flushPreviewIfStyleIdle'
  | 'flushStyleCommits'
  | 'localBorderWidth'
  | 'pendingBorderCommitRef'
  | 'persistedBorderForCommitRef'
  | 'queueBorderCommit'
  | 'setLocalBorderWidth'
  | 'skipBorderCommitOnBlurRef'
>;

export function useAnnotationStyleBorderCommitControls({
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
}: UseAnnotationStyleBorderCommitControlsOptions): AnnotationStyleBorderCommitControlsResult {
  const { handleBorderWidthCommit } = useAnnotationStyleBorderCommitAction({
    clearStyleCommitTimer,
    flushStyleCommits,
    localBorderWidth,
    pendingBorderCommitRef,
    persistedBorderForCommitRef,
    queueBorderCommit,
    skipBorderCommitOnBlurRef,
  });
  const { handleBorderWidthKeyDown } = useAnnotationStyleBorderKeydownHandler({
    annotationBorder,
    borderEditStartRef,
    canEditBorder,
    clearPendingBorderCommit,
    flushPreviewIfStyleIdle,
    setLocalBorderWidth,
    skipBorderCommitOnBlurRef,
  });

  return {
    handleBorderWidthCommit,
    handleBorderWidthKeyDown,
  };
}
