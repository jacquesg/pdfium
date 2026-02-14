import { describe, expect, it } from 'vitest';
import {
  buildVisiblePageKey,
  groupVisiblePagesByRow,
} from '../../../../src/react/internal/pdf-document-view-controller.js';

describe('pdf-document-view-controller', () => {
  it('builds a stable visible-page key from page indices', () => {
    const key = buildVisiblePageKey([
      { pageIndex: 0, offsetY: 0 },
      { pageIndex: 2, offsetY: 800 },
      { pageIndex: 3, offsetY: 1600 },
    ]);
    expect(key).toBe('0,2,3');
  });

  it('groups visible pages by rowIndex and falls back to pageIndex', () => {
    const grouped = groupVisiblePagesByRow([
      { pageIndex: 0, offsetY: 0, rowIndex: 0 },
      { pageIndex: 1, offsetY: 0, rowIndex: 0 },
      { pageIndex: 2, offsetY: 900, rowIndex: 1 },
      { pageIndex: 5, offsetY: 2200 },
    ]);

    expect(grouped.get(0)?.map((p) => p.pageIndex)).toEqual([0, 1]);
    expect(grouped.get(1)?.map((p) => p.pageIndex)).toEqual([2]);
    expect(grouped.get(5)?.map((p) => p.pageIndex)).toEqual([5]);
  });
});
