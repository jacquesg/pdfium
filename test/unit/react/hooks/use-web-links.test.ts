import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildCacheKey } from '../../../../src/react/internal/cache-key.js';
import { queryStore } from '../../../../src/react/internal/query-store.js';
import { createMockDocument, createMockPage, renderHookWithStores } from '../../../react-setup.js';

vi.mock('../../../../src/react/context.js', () => ({
  usePDFiumDocument: vi.fn().mockReturnValue({ documentRevision: 0 }),
}));

const { useWebLinks } = await import('../../../../src/react/hooks/use-web-links.js');

describe('useWebLinks', () => {
  beforeEach(() => {
    queryStore.clear();
  });

  it('returns undefined data when document is null', () => {
    const { result } = renderHookWithStores(() => useWebLinks(null, 0));

    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('builds the correct cache key', () => {
    const key = buildCacheKey('mock-doc-id', 'webLinks', 0, 0);
    expect(key).toBe('mock-doc-id\0webLinks\x000\x000');
  });

  it('returns cached data on cache hit', () => {
    const webLinks = [{ url: 'https://example.com', rects: [{ left: 0, top: 10, right: 50, bottom: 0 }] }];
    const key = buildCacheKey('mock-doc-id', 'webLinks', 0, 0);
    queryStore.set(key, { status: 'success', data: webLinks });

    const mockDoc = createMockDocument();
    const { result } = renderHookWithStores(() => useWebLinks(mockDoc as never, 0));

    expect(result.current.data).toEqual(webLinks);
    expect(result.current.isLoading).toBe(false);
  });

  it('shows loading state on cache miss', () => {
    const mockDoc = createMockDocument();
    const { result } = renderHookWithStores(() => useWebLinks(mockDoc as never, 0));

    expect(result.current.isLoading).toBe(true);
  });

  it('fetches web links and acquires/disposes page on cache miss', async () => {
    const webLinks = [{ url: 'https://example.com', rects: [] }];
    const mockPage = createMockPage({ getWebLinks: vi.fn().mockResolvedValue(webLinks) });
    const mockDoc = createMockDocument({ getPage: vi.fn().mockResolvedValue(mockPage) });

    const { result } = renderHookWithStores(() => useWebLinks(mockDoc as never, 0));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockDoc.getPage).toHaveBeenCalledWith(0);
    expect(mockPage.getWebLinks).toHaveBeenCalledOnce();
    expect(mockPage.dispose).toHaveBeenCalledOnce();
    expect(result.current.data).toEqual(webLinks);
  });

  it('returns error state when fetcher fails', async () => {
    const mockPage = createMockPage({
      getWebLinks: vi.fn().mockRejectedValue(new Error('Web links failed')),
    });
    const mockDoc = createMockDocument({ getPage: vi.fn().mockResolvedValue(mockPage) });

    const { result } = renderHookWithStores(() => useWebLinks(mockDoc as never, 0));

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    expect(result.current.error?.message).toBe('Web links failed');
    expect(mockPage.dispose).toHaveBeenCalledOnce();
  });
});
