import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createMockDocument, createMockPage } from '../../../react-setup.js';

const { useDocumentSearch } = await import('../../../../src/react/hooks/use-document-search.js');

type MockSearchResult = {
  pageIndex: number;
  index: number;
  rects: Array<{ left: number; top: number; right: number; bottom: number }>;
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('useDocumentSearch', () => {
  it('returns empty state with null document', () => {
    const { result } = renderHook(() => useDocumentSearch(null, 'test'));

    expect(result.current.matches).toEqual([]);
    expect(result.current.totalMatches).toBe(0);
    expect(result.current.isSearching).toBe(false);
    expect(result.current.currentIndex).toBe(0);
    expect(result.current.currentMatchPageIndex).toBeUndefined();
  });

  it('returns empty state with empty query', () => {
    const mockDoc = createMockDocument();
    const { result } = renderHook(() => useDocumentSearch(mockDoc as never, ''));

    expect(result.current.matches).toEqual([]);
    expect(result.current.isSearching).toBe(false);
  });

  it('returns empty state with whitespace-only query', () => {
    const mockDoc = createMockDocument();
    const { result } = renderHook(() => useDocumentSearch(mockDoc as never, '   '));

    expect(result.current.matches).toEqual([]);
    expect(result.current.isSearching).toBe(false);
  });

  it('sets isSearching to true when query is provided', () => {
    const mockDoc = createMockDocument();
    const { result } = renderHook(() => useDocumentSearch(mockDoc as never, 'hello', { debounce: 0 }));

    expect(result.current.isSearching).toBe(true);
  });

  it('finds matches across pages', async () => {
    const searchResults = [{ pageIndex: 0, index: 0, rects: [{ left: 10, top: 20, right: 50, bottom: 30 }] }];
    const mockPage = createMockPage({ findText: vi.fn().mockResolvedValue(searchResults) });
    const mockDoc = createMockDocument({
      pageCount: 2,
      getPage: vi.fn().mockResolvedValue(mockPage),
    });

    const { result } = renderHook(() => useDocumentSearch(mockDoc as never, 'test', { debounce: 0 }));

    await waitFor(() => {
      expect(result.current.isSearching).toBe(false);
    });

    // 2 pages, each with 1 result = 2 total matches
    expect(result.current.totalMatches).toBe(2);
    expect(result.current.matches).toHaveLength(2);
  });

  it('builds resultsByPage map correctly', async () => {
    const searchResults = [{ pageIndex: 0, index: 0, rects: [{ left: 0, top: 0, right: 10, bottom: 10 }] }];
    const mockPage = createMockPage({ findText: vi.fn().mockResolvedValue(searchResults) });
    const mockDoc = createMockDocument({
      pageCount: 1,
      getPage: vi.fn().mockResolvedValue(mockPage),
    });

    const { result } = renderHook(() => useDocumentSearch(mockDoc as never, 'hello', { debounce: 0 }));

    await waitFor(() => {
      expect(result.current.isSearching).toBe(false);
    });

    expect(result.current.resultsByPage.size).toBe(1);
    expect(result.current.resultsByPage.get(0)).toEqual(searchResults);
  });

  it('builds matchIndexMap correctly', async () => {
    const searchResults = [
      { pageIndex: 0, index: 0, rects: [{ left: 0, top: 0, right: 10, bottom: 10 }] },
      { pageIndex: 0, index: 1, rects: [{ left: 20, top: 0, right: 30, bottom: 10 }] },
    ];
    const mockPage = createMockPage({ findText: vi.fn().mockResolvedValue(searchResults) });
    const mockDoc = createMockDocument({
      pageCount: 1,
      getPage: vi.fn().mockResolvedValue(mockPage),
    });

    const { result } = renderHook(() => useDocumentSearch(mockDoc as never, 'test', { debounce: 0 }));

    await waitFor(() => {
      expect(result.current.isSearching).toBe(false);
    });

    expect(result.current.matchIndexMap).toEqual([
      { pageIndex: 0, localIndex: 0 },
      { pageIndex: 0, localIndex: 1 },
    ]);
  });

  it('navigates matches with next/prev', async () => {
    const searchResults = [
      { pageIndex: 0, index: 0, rects: [] },
      { pageIndex: 0, index: 1, rects: [] },
    ];
    const mockPage = createMockPage({ findText: vi.fn().mockResolvedValue(searchResults) });
    const mockDoc = createMockDocument({
      pageCount: 1,
      getPage: vi.fn().mockResolvedValue(mockPage),
    });

    const { result } = renderHook(() => useDocumentSearch(mockDoc as never, 'test', { debounce: 0 }));

    await waitFor(() => {
      expect(result.current.isSearching).toBe(false);
    });

    expect(result.current.currentIndex).toBe(0);

    act(() => result.current.next());
    expect(result.current.currentIndex).toBe(1);

    act(() => result.current.next());
    // Wraps around
    expect(result.current.currentIndex).toBe(0);

    act(() => result.current.prev());
    // Wraps backward
    expect(result.current.currentIndex).toBe(1);
  });

  it('goToMatch jumps to specific match index', async () => {
    const searchResults = [
      { pageIndex: 0, index: 0, rects: [] },
      { pageIndex: 0, index: 1, rects: [] },
      { pageIndex: 0, index: 2, rects: [] },
    ];
    const mockPage = createMockPage({ findText: vi.fn().mockResolvedValue(searchResults) });
    const mockDoc = createMockDocument({
      pageCount: 1,
      getPage: vi.fn().mockResolvedValue(mockPage),
    });

    const { result } = renderHook(() => useDocumentSearch(mockDoc as never, 'test', { debounce: 0 }));

    await waitFor(() => {
      expect(result.current.isSearching).toBe(false);
    });

    act(() => result.current.goToMatch(2));
    expect(result.current.currentIndex).toBe(2);
  });

  it('goToMatch clamps to valid range', async () => {
    const searchResults = [{ pageIndex: 0, index: 0, rects: [] }];
    const mockPage = createMockPage({ findText: vi.fn().mockResolvedValue(searchResults) });
    const mockDoc = createMockDocument({
      pageCount: 1,
      getPage: vi.fn().mockResolvedValue(mockPage),
    });

    const { result } = renderHook(() => useDocumentSearch(mockDoc as never, 'test', { debounce: 0 }));

    await waitFor(() => {
      expect(result.current.isSearching).toBe(false);
    });

    act(() => result.current.goToMatch(99));
    expect(result.current.currentIndex).toBe(0); // Clamped to max

    act(() => result.current.goToMatch(-5));
    expect(result.current.currentIndex).toBe(0); // Clamped to min
  });

  it('currentMatchPageIndex reflects the page of the current match', async () => {
    const page0Results = [{ pageIndex: 0, index: 0, rects: [] }];
    const page1Results = [{ pageIndex: 1, index: 0, rects: [] }];
    const getPage = vi.fn().mockImplementation((idx: number) =>
      Promise.resolve(
        createMockPage({
          findText: vi.fn().mockResolvedValue(idx === 0 ? page0Results : page1Results),
        }),
      ),
    );
    const mockDoc = createMockDocument({ pageCount: 2, getPage });

    const { result } = renderHook(() => useDocumentSearch(mockDoc as never, 'test', { debounce: 0 }));

    await waitFor(() => {
      expect(result.current.isSearching).toBe(false);
    });

    expect(result.current.currentMatchPageIndex).toBe(0);

    act(() => result.current.next());
    expect(result.current.currentMatchPageIndex).toBe(1);
  });

  it('handles pages with no results', async () => {
    const getPage = vi.fn().mockImplementation((idx: number) =>
      Promise.resolve(
        createMockPage({
          findText: vi.fn().mockResolvedValue(idx === 1 ? [{ pageIndex: 1, index: 0, rects: [] }] : []),
        }),
      ),
    );
    const mockDoc = createMockDocument({ pageCount: 3, getPage });

    const { result } = renderHook(() => useDocumentSearch(mockDoc as never, 'test', { debounce: 0 }));

    await waitFor(() => {
      expect(result.current.isSearching).toBe(false);
    });

    expect(result.current.totalMatches).toBe(1);
    expect(result.current.matches[0]?.pageIndex).toBe(1);
  });

  it('clears results when query changes to empty', async () => {
    const mockPage = createMockPage({
      findText: vi.fn().mockResolvedValue([{ pageIndex: 0, index: 0, rects: [] }]),
    });
    const mockDoc = createMockDocument({
      pageCount: 1,
      getPage: vi.fn().mockResolvedValue(mockPage),
    });

    const { result, rerender } = renderHook(
      ({ query }) => useDocumentSearch(mockDoc as never, query, { debounce: 0 }),
      { initialProps: { query: 'test' } },
    );

    await waitFor(() => {
      expect(result.current.isSearching).toBe(false);
    });

    expect(result.current.totalMatches).toBe(1);

    rerender({ query: '' });

    expect(result.current.matches).toEqual([]);
    expect(result.current.totalMatches).toBe(0);
    expect(result.current.isSearching).toBe(false);
  });

  it('next/prev are no-ops with no matches', () => {
    const mockDoc = createMockDocument();
    const { result } = renderHook(() => useDocumentSearch(mockDoc as never, ''));

    act(() => result.current.next());
    expect(result.current.currentIndex).toBe(0);

    act(() => result.current.prev());
    expect(result.current.currentIndex).toBe(0);
  });

  it('skips pages that throw errors during search', async () => {
    const getPage = vi.fn().mockImplementation((idx: number) => {
      if (idx === 0) return Promise.reject(new Error('Page disposed'));
      return Promise.resolve(
        createMockPage({
          findText: vi.fn().mockResolvedValue([{ pageIndex: 1, index: 0, rects: [] }]),
        }),
      );
    });
    const mockDoc = createMockDocument({ pageCount: 2, getPage });

    const { result } = renderHook(() => useDocumentSearch(mockDoc as never, 'test', { debounce: 0 }));

    await waitFor(() => {
      expect(result.current.isSearching).toBe(false);
    });

    // Page 0 threw, page 1 succeeded
    expect(result.current.totalMatches).toBe(1);
    expect(result.current.matches[0]?.pageIndex).toBe(1);
  });

  it('fails closed when pageCount access throws synchronously', async () => {
    const badDocument = {
      get pageCount() {
        throw new Error('pageCount unavailable');
      },
      getPage: vi.fn(),
    };

    const { result } = renderHook(() => useDocumentSearch(badDocument as never, 'test', { debounce: 0 }));

    await waitFor(() => {
      expect(result.current.isSearching).toBe(false);
    });

    expect(result.current.totalMatches).toBe(0);
    expect(result.current.matches).toEqual([]);
  });

  it('ignores stale query results when query changes mid-search', async () => {
    const stale = deferred<MockSearchResult[]>();
    const findText = vi.fn().mockImplementation((text: string) => {
      if (text === 'first') return stale.promise;
      return Promise.resolve([{ pageIndex: 0, index: 0, rects: [{ left: 2, top: 2, right: 3, bottom: 3 }] }]);
    });

    const mockPage = createMockPage({ findText });
    const mockDoc = createMockDocument({
      pageCount: 1,
      getPage: vi.fn().mockResolvedValue(mockPage),
    });

    const { result, rerender } = renderHook(
      ({ query }) => useDocumentSearch(mockDoc as never, query, { debounce: 0 }),
      { initialProps: { query: 'first' } },
    );

    await act(async () => {
      await new Promise<void>((r) => setTimeout(r, 0));
    });

    rerender({ query: 'second' });

    await waitFor(() => {
      expect(result.current.isSearching).toBe(false);
    });
    expect(result.current.totalMatches).toBe(1);
    expect(result.current.matches[0]?.rects[0]?.left).toBe(2);

    stale.resolve([{ pageIndex: 0, index: 0, rects: [{ left: 9, top: 9, right: 10, bottom: 10 }] }]);

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.totalMatches).toBe(1);
    expect(result.current.matches[0]?.rects[0]?.left).toBe(2);
    expect(findText).toHaveBeenCalledTimes(2);
    expect(findText).toHaveBeenNthCalledWith(1, 'first', 0);
    expect(findText).toHaveBeenNthCalledWith(2, 'second', 0);
  });

  it('ignores stale document results when the document instance changes mid-search', async () => {
    const stale = deferred<MockSearchResult[]>();
    const docA = createMockDocument({
      pageCount: 1,
      getPage: vi.fn().mockResolvedValue(
        createMockPage({
          findText: vi.fn().mockReturnValue(stale.promise),
        }),
      ),
    });
    const docB = createMockDocument({
      pageCount: 1,
      getPage: vi.fn().mockResolvedValue(
        createMockPage({
          findText: vi
            .fn()
            .mockResolvedValue([{ pageIndex: 0, index: 0, rects: [{ left: 5, top: 5, right: 6, bottom: 6 }] }]),
        }),
      ),
    });

    const { result, rerender } = renderHook(({ doc }) => useDocumentSearch(doc as never, 'test', { debounce: 0 }), {
      initialProps: { doc: docA },
    });

    rerender({ doc: docB });

    await waitFor(() => {
      expect(result.current.isSearching).toBe(false);
    });
    expect(result.current.totalMatches).toBe(1);
    expect(result.current.matches[0]?.rects[0]?.left).toBe(5);

    stale.resolve([{ pageIndex: 0, index: 0, rects: [{ left: 99, top: 99, right: 100, bottom: 100 }] }]);

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.totalMatches).toBe(1);
    expect(result.current.matches[0]?.rects[0]?.left).toBe(5);
  });
});
