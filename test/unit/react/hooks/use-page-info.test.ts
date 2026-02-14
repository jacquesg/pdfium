import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildCacheKey } from '../../../../src/react/internal/cache-key.js';
import { queryStore } from '../../../../src/react/internal/query-store.js';
import { createMockDocument, createMockPage, renderHookWithStores } from '../../../react-setup.js';

vi.mock('../../../../src/react/context.js', () => ({
  usePDFiumDocument: vi.fn().mockReturnValue({ documentRevision: 0 }),
}));

// Must import after mock is set up
const { usePageInfo } = await import('../../../../src/react/hooks/use-page-info.js');

describe('usePageInfo', () => {
  beforeEach(() => {
    queryStore.clear();
  });

  it('returns undefined data when document is null', () => {
    const { result } = renderHookWithStores(() => usePageInfo(null, 0));

    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('builds the correct cache key', () => {
    const key = buildCacheKey('mock-doc-id', 'pageInfo', 0, 0);
    expect(key).toBe('mock-doc-id\0pageInfo\x000\x000');
  });

  it('returns cached data on cache hit', () => {
    const pageInfo = {
      rotation: 0,
      hasTransparency: false,
      boundingBox: { left: 0, top: 792, right: 612, bottom: 0 },
      charCount: 100,
      pageBoxes: {},
    };
    const key = buildCacheKey('mock-doc-id', 'pageInfo', 0, 0);
    queryStore.set(key, { status: 'success', data: pageInfo });

    const mockDoc = createMockDocument();
    const { result } = renderHookWithStores(() => usePageInfo(mockDoc as never, 0));

    expect(result.current.data).toEqual(pageInfo);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.isPlaceholderData).toBe(false);
  });

  it('shows loading state on cache miss', () => {
    const mockDoc = createMockDocument();
    const { result } = renderHookWithStores(() => usePageInfo(mockDoc as never, 0));

    // Initially loading because the entry is not yet in the store
    expect(result.current.isLoading).toBe(true);
  });

  it('fetches data and acquires/disposes page on cache miss', async () => {
    const mockPage = createMockPage();
    const mockDoc = createMockDocument({ getPage: vi.fn().mockResolvedValue(mockPage) });

    const { result } = renderHookWithStores(() => usePageInfo(mockDoc as never, 0));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockDoc.getPage).toHaveBeenCalledWith(0);
    expect(mockPage.getPageInfo).toHaveBeenCalledOnce();
    expect(mockPage.dispose).toHaveBeenCalledOnce();
    expect(result.current.data).toEqual({
      rotation: 0,
      hasTransparency: false,
      boundingBox: { left: 0, top: 792, right: 612, bottom: 0 },
      charCount: 100,
      pageBoxes: {},
    });
  });

  it('uses the correct page index in the cache key', () => {
    const key0 = buildCacheKey('mock-doc-id', 'pageInfo', 0, 0);
    const key3 = buildCacheKey('mock-doc-id', 'pageInfo', 0, 3);
    expect(key0).not.toBe(key3);
  });

  it('returns error state when fetcher fails', async () => {
    const mockPage = createMockPage({
      getPageInfo: vi.fn().mockRejectedValue(new Error('Page info failed')),
    });
    const mockDoc = createMockDocument({ getPage: vi.fn().mockResolvedValue(mockPage) });

    const { result } = renderHookWithStores(() => usePageInfo(mockDoc as never, 0));

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    expect(result.current.error?.message).toBe('Page info failed');
    expect(result.current.isLoading).toBe(false);
    // Page should still be disposed even on error (finally block)
    expect(mockPage.dispose).toHaveBeenCalledOnce();
  });

  it('preserves fetched data when page disposal rejects after getPageInfo resolves', async () => {
    const pageInfo = {
      rotation: 0,
      hasTransparency: false,
      boundingBox: { left: 0, top: 792, right: 612, bottom: 0 },
      charCount: 200,
      pageBoxes: {},
    };
    const mockPage = createMockPage({
      getPageInfo: vi.fn().mockResolvedValue(pageInfo),
      dispose: vi.fn().mockRejectedValue(new Error('dispose failed')),
    });
    const mockDoc = createMockDocument({ getPage: vi.fn().mockResolvedValue(mockPage) });

    const { result } = renderHookWithStores(() => usePageInfo(mockDoc as never, 0));

    await waitFor(() => {
      expect(result.current.data).toEqual(pageInfo);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(mockPage.dispose).toHaveBeenCalledOnce();
  });
});
