import { type KeyboardEvent as ReactKeyboardEvent, useCallback } from 'react';
import type {
  AnnotationStyleBorderCommitControlsResult,
  UseAnnotationStyleBorderControlsOptions,
} from './annotation-style-border-controls.types.js';

type UseAnnotationStyleBorderKeydownHandlerOptions = Pick<
  UseAnnotationStyleBorderControlsOptions,
  | 'annotationBorder'
  | 'borderEditStartRef'
  | 'canEditBorder'
  | 'clearPendingBorderCommit'
  | 'flushPreviewIfStyleIdle'
  | 'setLocalBorderWidth'
  | 'skipBorderCommitOnBlurRef'
>;

type BorderKeydownHandlerResult = Pick<AnnotationStyleBorderCommitControlsResult, 'handleBorderWidthKeyDown'>;

export function useAnnotationStyleBorderKeydownHandler({
  annotationBorder,
  borderEditStartRef,
  canEditBorder,
  clearPendingBorderCommit,
  flushPreviewIfStyleIdle,
  setLocalBorderWidth,
  skipBorderCommitOnBlurRef,
}: UseAnnotationStyleBorderKeydownHandlerOptions): BorderKeydownHandlerResult {
  const handleBorderWidthKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        event.currentTarget.blur();
        return;
      }
      if (event.key === 'Escape') {
        skipBorderCommitOnBlurRef.current = true;
        borderEditStartRef.current = null;
        clearPendingBorderCommit();
        flushPreviewIfStyleIdle();
        setLocalBorderWidth(annotationBorder?.borderWidth ?? (canEditBorder ? 1 : 0));
        event.currentTarget.blur();
      }
    },
    [
      annotationBorder,
      borderEditStartRef,
      canEditBorder,
      clearPendingBorderCommit,
      flushPreviewIfStyleIdle,
      setLocalBorderWidth,
      skipBorderCommitOnBlurRef,
    ],
  );

  return { handleBorderWidthKeyDown };
}
