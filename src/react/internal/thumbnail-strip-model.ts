type ThumbnailNavigationKey = 'ArrowDown' | 'ArrowUp' | 'Home' | 'End';

interface ResolveThumbnailTargetPageInput {
  key: string;
  currentPageIndex: number;
  pageCount: number;
}

function resolveThumbnailPageCount(dimensionCount: number | undefined): number {
  if (!Number.isFinite(dimensionCount) || !dimensionCount || dimensionCount < 0) return 0;
  return dimensionCount;
}

function resolveThumbnailTargetPage(input: ResolveThumbnailTargetPageInput): number | null {
  const { key, currentPageIndex, pageCount } = input;
  if (pageCount <= 0) return null;
  switch (key as ThumbnailNavigationKey) {
    case 'ArrowDown': {
      const next = currentPageIndex + 1;
      return next < pageCount ? next : null;
    }
    case 'ArrowUp': {
      const previous = currentPageIndex - 1;
      return previous >= 0 ? previous : null;
    }
    case 'Home':
      return 0;
    case 'End':
      return pageCount - 1;
    default:
      return null;
  }
}

export { resolveThumbnailPageCount, resolveThumbnailTargetPage };
export type { ResolveThumbnailTargetPageInput, ThumbnailNavigationKey };
