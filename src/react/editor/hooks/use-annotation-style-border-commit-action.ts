import { useCallback } from 'react';
import type {
  AnnotationStyleBorderCommitControlsResult,
  UseAnnotationStyleBorderControlsOptions,
} from './annotation-style-border-controls.types.js';
import { clampBorderWidth } from './annotation-style-editing-support.js';

type UseAnnotationStyleBorderCommitActionOptions = Pick<
  UseAnnotationStyleBorderControlsOptions,
  | 'clearStyleCommitTimer'
  | 'flushStyleCommits'
  | 'localBorderWidth'
  | 'pendingBorderCommitRef'
  | 'persistedBorderForCommitRef'
  | 'queueBorderCommit'
  | 'skipBorderCommitOnBlurRef'
>;

type BorderCommitActionResult = Pick<AnnotationStyleBorderCommitControlsResult, 'handleBorderWidthCommit'>;

export function useAnnotationStyleBorderCommitAction({
  clearStyleCommitTimer,
  flushStyleCommits,
  localBorderWidth,
  pendingBorderCommitRef,
  persistedBorderForCommitRef,
  queueBorderCommit,
  skipBorderCommitOnBlurRef,
}: UseAnnotationStyleBorderCommitActionOptions): BorderCommitActionResult {
  const handleBorderWidthCommit = useCallback(
    (event?: { currentTarget: { value: string } }) => {
      if (skipBorderCommitOnBlurRef.current) {
        skipBorderCommitOnBlurRef.current = false;
        return;
      }
      if (pendingBorderCommitRef.current === null) {
        const fromEvent = event !== undefined ? Number(event.currentTarget.value) : localBorderWidth;
        const clamped = clampBorderWidth(fromEvent);
        const persisted = persistedBorderForCommitRef.current;
        const persistedWidth = persisted?.borderWidth ?? 0;
        if (Math.abs(clamped - persistedWidth) >= 0.001) {
          queueBorderCommit(clamped);
        }
      }
      clearStyleCommitTimer();
      flushStyleCommits();
    },
    [
      clearStyleCommitTimer,
      flushStyleCommits,
      localBorderWidth,
      pendingBorderCommitRef,
      persistedBorderForCommitRef,
      queueBorderCommit,
      skipBorderCommitOnBlurRef,
    ],
  );

  return { handleBorderWidthCommit };
}
