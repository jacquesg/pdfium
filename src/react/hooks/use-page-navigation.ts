import { useCallback, useEffect, useState } from 'react';

function clampPageIndex(index: number, pageCount: number): number {
  const upperBound = Math.max(0, pageCount - 1);
  return Math.max(0, Math.min(index, upperBound));
}

function usePageNavigation(pageCount: number) {
  const [pageIndex, setPageIndexInternal] = useState(0);

  useEffect(() => {
    setPageIndexInternal((p) => clampPageIndex(p, pageCount));
  }, [pageCount]);

  const setPageIndex = useCallback(
    (index: number) => {
      setPageIndexInternal(clampPageIndex(index, pageCount));
    },
    [pageCount],
  );

  const next = useCallback(() => {
    setPageIndexInternal((p) => clampPageIndex(p + 1, pageCount));
  }, [pageCount]);
  const prev = useCallback(() => setPageIndexInternal((p) => Math.max(p - 1, 0)), []);

  return { pageIndex, setPageIndex, next, prev, canNext: pageIndex < pageCount - 1, canPrev: pageIndex > 0 };
}

export { usePageNavigation };
