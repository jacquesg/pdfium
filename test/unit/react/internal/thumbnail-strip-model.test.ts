import { describe, expect, it } from 'vitest';
import {
  resolveThumbnailPageCount,
  resolveThumbnailTargetPage,
} from '../../../../src/react/internal/thumbnail-strip-model.js';

describe('thumbnail-strip-model', () => {
  it('normalizes invalid page counts to zero', () => {
    expect(resolveThumbnailPageCount(undefined)).toBe(0);
    expect(resolveThumbnailPageCount(-1)).toBe(0);
  });

  it('returns dimension count when valid', () => {
    expect(resolveThumbnailPageCount(7)).toBe(7);
  });

  it('resolves keyboard navigation targets', () => {
    expect(resolveThumbnailTargetPage({ key: 'ArrowDown', currentPageIndex: 1, pageCount: 4 })).toBe(2);
    expect(resolveThumbnailTargetPage({ key: 'ArrowUp', currentPageIndex: 1, pageCount: 4 })).toBe(0);
    expect(resolveThumbnailTargetPage({ key: 'Home', currentPageIndex: 1, pageCount: 4 })).toBe(0);
    expect(resolveThumbnailTargetPage({ key: 'End', currentPageIndex: 1, pageCount: 4 })).toBe(3);
  });

  it('returns null for out-of-range moves and unsupported keys', () => {
    expect(resolveThumbnailTargetPage({ key: 'ArrowDown', currentPageIndex: 2, pageCount: 3 })).toBeNull();
    expect(resolveThumbnailTargetPage({ key: 'ArrowUp', currentPageIndex: 0, pageCount: 3 })).toBeNull();
    expect(resolveThumbnailTargetPage({ key: 'Enter', currentPageIndex: 1, pageCount: 3 })).toBeNull();
    expect(resolveThumbnailTargetPage({ key: 'End', currentPageIndex: 1, pageCount: 0 })).toBeNull();
  });
});
