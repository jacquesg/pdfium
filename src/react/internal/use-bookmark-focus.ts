'use client';

import { type MutableRefObject, useCallback, useState } from 'react';

interface UseBookmarkFocusOptions {
  treeRef: MutableRefObject<HTMLDivElement | null>;
}

interface UseBookmarkFocusResult {
  focusedPath: string | null;
  handleFocus: (path: string) => void;
  focusElement: (path: string) => void;
  clearFocus: () => void;
}

function useBookmarkFocus({ treeRef }: UseBookmarkFocusOptions): UseBookmarkFocusResult {
  const [focusedPath, setFocusedPath] = useState<string | null>(null);

  const handleFocus = useCallback((path: string) => {
    setFocusedPath(path);
  }, []);

  const focusElement = useCallback(
    (path: string) => {
      setFocusedPath(path);
      const element = treeRef.current?.querySelector(`[data-path="${path}"]`) as HTMLElement | null;
      element?.focus();
    },
    [treeRef],
  );

  const clearFocus = useCallback(() => {
    setFocusedPath(null);
  }, []);

  return {
    focusedPath,
    handleFocus,
    focusElement,
    clearFocus,
  };
}

export { useBookmarkFocus };
export type { UseBookmarkFocusOptions, UseBookmarkFocusResult };
