import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildCacheKey } from '../../../../src/react/internal/cache-key.js';
import { queryStore } from '../../../../src/react/internal/query-store.js';
import { createMockDocument, createMockPage, renderHookWithStores } from '../../../react-setup.js';

vi.mock('../../../../src/react/context.js', () => ({
  usePDFiumDocument: vi.fn().mockReturnValue({ documentRevision: 0 }),
}));

const { useTextSearch } = await import('../../../../src/react/hooks/use-text-search.js');

describe('useTextSearch', () => {
  beforeEach(() => {
    queryStore.clear();
  });

  it('returns undefined data when document is null', () => {
    const { result } = renderHookWithStores(() => useTextSearch(null, 0, 'hello'));

    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('builds the correct cache key including query and flags', () => {
    const key = buildCacheKey('mock-doc-id', 'textSearch', 0, 0, 'hello', 3);
    expect(key).toBe('mock-doc-id\0textSearch\x000\x000\0hello\x003');
  });

  it('builds cache key without flags when undefined', () => {
    const key = buildCacheKey('mock-doc-id', 'textSearch', 0, 0, 'hello', undefined);
    // undefined params are filtered out
    expect(key).toBe('mock-doc-id\0textSearch\x000\x000\0hello');
  });

  it('returns cached data on cache hit', () => {
    const results = [{ pageIndex: 0, index: 0, rects: [{ left: 0, top: 10, right: 50, bottom: 0 }] }];
    const key = buildCacheKey('mock-doc-id', 'textSearch', 0, 0, 'test');
    queryStore.set(key, { status: 'success', data: results });

    const mockDoc = createMockDocument();
    const { result } = renderHookWithStores(() => useTextSearch(mockDoc as never, 0, 'test'));

    expect(result.current.data).toEqual(results);
    expect(result.current.isLoading).toBe(false);
  });

  it('shows loading state on cache miss', () => {
    const mockDoc = createMockDocument();
    const { result } = renderHookWithStores(() => useTextSearch(mockDoc as never, 0, 'search'));

    expect(result.current.isLoading).toBe(true);
  });

  it('fetches search results and acquires/disposes page', async () => {
    const searchResults = [{ pageIndex: 0, index: 0, rects: [] }];
    const mockPage = createMockPage({ findText: vi.fn().mockResolvedValue(searchResults) });
    const mockDoc = createMockDocument({ getPage: vi.fn().mockResolvedValue(mockPage) });

    const { result } = renderHookWithStores(() => useTextSearch(mockDoc as never, 0, 'hello', 1));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockDoc.getPage).toHaveBeenCalledWith(0);
    expect(mockPage.findText).toHaveBeenCalledWith('hello', 1);
    expect(mockPage.dispose).toHaveBeenCalledOnce();
    expect(result.current.data).toEqual(searchResults);
  });

  it('produces different cache keys for different queries', () => {
    const keyA = buildCacheKey('mock-doc-id', 'textSearch', 0, 0, 'foo');
    const keyB = buildCacheKey('mock-doc-id', 'textSearch', 0, 0, 'bar');
    expect(keyA).not.toBe(keyB);
  });

  it('produces different cache keys for different flags', () => {
    const keyA = buildCacheKey('mock-doc-id', 'textSearch', 0, 0, 'hello', 0);
    const keyB = buildCacheKey('mock-doc-id', 'textSearch', 0, 0, 'hello', 1);
    expect(keyA).not.toBe(keyB);
  });

  it('returns error state when fetcher fails', async () => {
    const mockPage = createMockPage({
      findText: vi.fn().mockRejectedValue(new Error('Search failed')),
    });
    const mockDoc = createMockDocument({ getPage: vi.fn().mockResolvedValue(mockPage) });

    const { result } = renderHookWithStores(() => useTextSearch(mockDoc as never, 0, 'query'));

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    expect(result.current.error?.message).toBe('Search failed');
    expect(mockPage.dispose).toHaveBeenCalledOnce();
  });

  it('preserves fetched results when page disposal rejects after findText resolves', async () => {
    const searchResults = [{ pageIndex: 0, index: 0, rects: [] }];
    const mockPage = createMockPage({
      findText: vi.fn().mockResolvedValue(searchResults),
      dispose: vi.fn().mockRejectedValue(new Error('dispose failed')),
    });
    const mockDoc = createMockDocument({ getPage: vi.fn().mockResolvedValue(mockPage) });

    const { result } = renderHookWithStores(() => useTextSearch(mockDoc as never, 0, 'query'));

    await waitFor(() => {
      expect(result.current.data).toEqual(searchResults);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(mockPage.dispose).toHaveBeenCalledOnce();
  });
});
