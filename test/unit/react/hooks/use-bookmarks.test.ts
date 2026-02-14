import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildCacheKey } from '../../../../src/react/internal/cache-key.js';
import { queryStore } from '../../../../src/react/internal/query-store.js';
import { createMockDocument, renderHookWithStores } from '../../../react-setup.js';

vi.mock('../../../../src/react/context.js', () => ({
  usePDFiumDocument: vi.fn().mockReturnValue({ documentRevision: 0 }),
}));

const { useBookmarks } = await import('../../../../src/react/hooks/use-bookmarks.js');

describe('useBookmarks', () => {
  beforeEach(() => {
    queryStore.clear();
  });

  it('returns undefined data when document is null', () => {
    const { result } = renderHookWithStores(() => useBookmarks(null));

    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('builds the correct cache key without pageIndex', () => {
    const key = buildCacheKey('mock-doc-id', 'bookmarks', 0);
    expect(key).toBe('mock-doc-id\0bookmarks\x000');
  });

  it('returns cached data on cache hit', () => {
    const bookmarks = [{ title: 'Chapter 1', pageIndex: 0, children: [] }];
    const key = buildCacheKey('mock-doc-id', 'bookmarks', 0);
    queryStore.set(key, { status: 'success', data: bookmarks });

    const mockDoc = createMockDocument();
    const { result } = renderHookWithStores(() => useBookmarks(mockDoc as never));

    expect(result.current.data).toEqual(bookmarks);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isPlaceholderData).toBe(false);
  });

  it('shows loading state on cache miss', () => {
    const mockDoc = createMockDocument();
    const { result } = renderHookWithStores(() => useBookmarks(mockDoc as never));

    expect(result.current.isLoading).toBe(true);
  });

  it('fetches bookmarks directly from document (no page acquire/dispose)', async () => {
    const bookmarks = [{ title: 'Introduction', pageIndex: 0, children: [] }];
    const mockDoc = createMockDocument({ getBookmarks: vi.fn().mockResolvedValue(bookmarks) });

    const { result } = renderHookWithStores(() => useBookmarks(mockDoc as never));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockDoc.getBookmarks).toHaveBeenCalledOnce();
    // Document-level hook should NOT call getPage
    expect(mockDoc.getPage).not.toHaveBeenCalled();
    expect(result.current.data).toEqual(bookmarks);
  });

  it('returns error state when fetcher fails', async () => {
    const mockDoc = createMockDocument({
      getBookmarks: vi.fn().mockRejectedValue(new Error('Bookmarks failed')),
    });

    const { result } = renderHookWithStores(() => useBookmarks(mockDoc as never));

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    expect(result.current.error?.message).toBe('Bookmarks failed');
  });
});
