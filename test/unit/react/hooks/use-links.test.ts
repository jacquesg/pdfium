import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildCacheKey } from '../../../../src/react/internal/cache-key.js';
import { queryStore } from '../../../../src/react/internal/query-store.js';
import { createMockDocument, createMockPage, renderHookWithStores } from '../../../react-setup.js';

vi.mock('../../../../src/react/context.js', () => ({
  usePDFiumDocument: vi
    .fn()
    .mockReturnValue({ documentRevision: 0, pageRevisionVersion: 0, getPageRevision: vi.fn(() => 0) }),
}));

const { useLinks } = await import('../../../../src/react/hooks/use-links.js');

describe('useLinks', () => {
  beforeEach(() => {
    queryStore.clear();
  });

  it('returns undefined data when document is null', () => {
    const { result } = renderHookWithStores(() => useLinks(null, 0));

    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('builds the correct cache key', () => {
    const key = buildCacheKey('mock-doc-id', 'links', 0, 0, 0);
    expect(key).toBe('mock-doc-id\0links\x000\x000\x000');
  });

  it('returns cached data on cache hit', () => {
    const links = [{ uri: 'https://example.com', rect: { left: 0, top: 10, right: 50, bottom: 0 } }];
    const key = buildCacheKey('mock-doc-id', 'links', 0, 0, 0);
    queryStore.set(key, { status: 'success', data: links });

    const mockDoc = createMockDocument();
    const { result } = renderHookWithStores(() => useLinks(mockDoc as never, 0));

    expect(result.current.data).toEqual(links);
    expect(result.current.isLoading).toBe(false);
  });

  it('shows loading state on cache miss', () => {
    const mockDoc = createMockDocument();
    const { result } = renderHookWithStores(() => useLinks(mockDoc as never, 0));

    expect(result.current.isLoading).toBe(true);
  });

  it('fetches links and acquires/disposes page on cache miss', async () => {
    const links = [{ uri: 'https://example.com', rect: { left: 10, top: 20, right: 30, bottom: 40 } }];
    const mockPage = createMockPage({ getLinks: vi.fn().mockResolvedValue(links) });
    const mockDoc = createMockDocument({ getPage: vi.fn().mockResolvedValue(mockPage) });

    const { result } = renderHookWithStores(() => useLinks(mockDoc as never, 0));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockDoc.getPage).toHaveBeenCalledWith(0);
    expect(mockPage.getLinks).toHaveBeenCalledOnce();
    expect(mockPage.dispose).toHaveBeenCalledOnce();
    expect(result.current.data).toEqual(links);
  });

  it('returns error state when fetcher fails', async () => {
    const mockPage = createMockPage({
      getLinks: vi.fn().mockRejectedValue(new Error('Links failed')),
    });
    const mockDoc = createMockDocument({ getPage: vi.fn().mockResolvedValue(mockPage) });

    const { result } = renderHookWithStores(() => useLinks(mockDoc as never, 0));

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    expect(result.current.error?.message).toBe('Links failed');
    expect(mockPage.dispose).toHaveBeenCalledOnce();
  });
});
