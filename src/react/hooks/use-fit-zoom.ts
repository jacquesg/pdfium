import type { RefObject } from 'react';
import { useCallback, useEffect, useLayoutEffect, useState } from 'react';

type FitMode = 'page-width' | 'page-height' | 'page-fit';

/**
 * Calculates the scale needed to fit a page within a container.
 *
 * Uses ResizeObserver to track container dimensions. The `fitScale` function
 * returns the current computed scale for a given fit mode — call it when the
 * user selects a fit mode, and pass the result to `useZoom().setScale()`.
 *
 * Handles late-mounting containers: if the ref target is null on first render
 * (e.g. conditionally rendered), the ResizeObserver attaches once it mounts.
 *
 * @param containerRef - The scroll container element
 * @param pageWidth - Original page width in PDF points
 * @param pageHeight - Original page height in PDF points
 */
export function useFitZoom(
  containerRef: RefObject<HTMLElement | null>,
  pageWidth: number,
  pageHeight: number,
): {
  fitScale: (mode: FitMode) => number;
} {
  const [containerWidth, setContainerWidth] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const [trackedContainer, setTrackedContainer] = useState<HTMLElement | null>(null);

  // Sync containerRef.current → state so the ResizeObserver effect re-runs
  // when the container element mounts or unmounts after initial render.
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (el !== trackedContainer) setTrackedContainer(el);
  });

  useEffect(() => {
    if (!trackedContainer) {
      setContainerWidth(0);
      setContainerHeight(0);
      return;
    }

    let active = true;

    // Initial measurement
    setContainerWidth(trackedContainer.clientWidth);
    setContainerHeight(trackedContainer.clientHeight);

    const observer = new ResizeObserver((entries) => {
      if (!active) return;
      const entry = entries[0];
      if (!entry || entry.target !== trackedContainer) return;
      setContainerWidth(entry.contentRect.width);
      setContainerHeight(entry.contentRect.height);
    });
    observer.observe(trackedContainer);

    return () => {
      active = false;
      observer.disconnect();
    };
  }, [trackedContainer]);

  const fitScale = useCallback(
    (mode: FitMode): number => {
      if (pageWidth <= 0 || pageHeight <= 0 || containerWidth <= 0 || containerHeight <= 0) return 1;

      // 16px padding on each side, clamped to prevent negative dimensions
      const availableWidth = Math.max(0, containerWidth - 32);
      const availableHeight = Math.max(0, containerHeight - 32);
      if (availableWidth <= 0 || availableHeight <= 0) return 1;

      switch (mode) {
        case 'page-width':
          return availableWidth / pageWidth;
        case 'page-height':
          return availableHeight / pageHeight;
        case 'page-fit':
          return Math.min(availableWidth / pageWidth, availableHeight / pageHeight);
      }
    },
    [pageWidth, pageHeight, containerWidth, containerHeight],
  );

  return { fitScale };
}

export type { FitMode };
