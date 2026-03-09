import { type ChangeEvent, useCallback } from 'react';
import type {
  AnnotationStyleBorderPreviewControlsResult,
  UseAnnotationStyleBorderControlsOptions,
} from './annotation-style-border-controls.types.js';
import { clampBorderWidth } from './annotation-style-editing-support.js';

type UseAnnotationStyleBorderPreviewControlsOptions = Pick<
  UseAnnotationStyleBorderControlsOptions,
  | 'applyBorderPreset'
  | 'applyPreviewPatch'
  | 'borderEditStartRef'
  | 'getEditableBorderForWidth'
  | 'localBorderWidth'
  | 'persistedBorderForCommitRef'
  | 'queueBorderCommit'
  | 'setLocalBorderWidth'
>;

export function useAnnotationStyleBorderPreviewControls({
  applyBorderPreset,
  applyPreviewPatch,
  borderEditStartRef,
  getEditableBorderForWidth,
  localBorderWidth,
  persistedBorderForCommitRef,
  queueBorderCommit,
  setLocalBorderWidth,
}: UseAnnotationStyleBorderPreviewControlsOptions): AnnotationStyleBorderPreviewControlsResult {
  const handleBorderWidthChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const parsed = Number(event.currentTarget.value);
      if (!Number.isFinite(parsed)) return;
      const nextBorderWidth = clampBorderWidth(parsed);
      if (Math.abs(nextBorderWidth - localBorderWidth) < 0.001) {
        return;
      }
      setLocalBorderWidth(nextBorderWidth);
      const previewBorder = getEditableBorderForWidth(nextBorderWidth);
      if (previewBorder !== null) {
        applyPreviewPatch({
          border: previewBorder,
        });
      }
      applyBorderPreset(nextBorderWidth);
      queueBorderCommit(nextBorderWidth);
    },
    [
      applyBorderPreset,
      applyPreviewPatch,
      getEditableBorderForWidth,
      localBorderWidth,
      queueBorderCommit,
      setLocalBorderWidth,
    ],
  );

  const handleBorderWidthFocus = useCallback(() => {
    borderEditStartRef.current = persistedBorderForCommitRef.current;
  }, [borderEditStartRef, persistedBorderForCommitRef]);

  return {
    handleBorderWidthChange,
    handleBorderWidthFocus,
  };
}
