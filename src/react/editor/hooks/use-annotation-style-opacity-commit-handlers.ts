import { type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, useCallback } from 'react';

export function useAnnotationStyleOpacityCommitHandlers(flushStyleCommits: () => void) {
  const handleOpacityPointerEnd = useCallback(
    (_event: ReactPointerEvent<HTMLInputElement>) => {
      flushStyleCommits();
    },
    [flushStyleCommits],
  );

  const handleOpacityMouseEnd = useCallback(
    (_event: ReactMouseEvent<HTMLInputElement>) => {
      flushStyleCommits();
    },
    [flushStyleCommits],
  );

  return {
    handleOpacityMouseEnd,
    handleOpacityPointerEnd,
  };
}
