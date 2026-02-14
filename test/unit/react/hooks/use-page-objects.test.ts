import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildCacheKey } from '../../../../src/react/internal/cache-key.js';
import { queryStore } from '../../../../src/react/internal/query-store.js';
import { createMockDocument, createMockPage, renderHookWithStores } from '../../../react-setup.js';

vi.mock('../../../../src/react/context.js', () => ({
  usePDFiumDocument: vi.fn().mockReturnValue({ documentRevision: 0 }),
}));

const { usePageObjects } = await import('../../../../src/react/hooks/use-page-objects.js');

describe('usePageObjects', () => {
  beforeEach(() => {
    queryStore.clear();
  });

  it('returns undefined data when document is null', () => {
    const { result } = renderHookWithStores(() => usePageObjects(null, 0));

    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('builds the correct cache key', () => {
    const key = buildCacheKey('mock-doc-id', 'pageObjects', 0, 0);
    expect(key).toBe('mock-doc-id\0pageObjects\x000\x000');
  });

  it('returns cached data on cache hit', () => {
    const objects = [{ type: 'image', bounds: { left: 0, top: 100, right: 200, bottom: 0 } }];
    const key = buildCacheKey('mock-doc-id', 'pageObjects', 0, 0);
    queryStore.set(key, { status: 'success', data: objects });

    const mockDoc = createMockDocument();
    const { result } = renderHookWithStores(() => usePageObjects(mockDoc as never, 0));

    expect(result.current.data).toEqual(objects);
    expect(result.current.isLoading).toBe(false);
  });

  it('shows loading state on cache miss', () => {
    const mockDoc = createMockDocument();
    const { result } = renderHookWithStores(() => usePageObjects(mockDoc as never, 0));

    expect(result.current.isLoading).toBe(true);
  });

  it('fetches page objects and acquires/disposes page on cache miss', async () => {
    const objects = [{ type: 'text', bounds: { left: 10, top: 20, right: 30, bottom: 40 } }];
    const mockPage = createMockPage({ getPageObjects: vi.fn().mockResolvedValue(objects) });
    const mockDoc = createMockDocument({ getPage: vi.fn().mockResolvedValue(mockPage) });

    const { result } = renderHookWithStores(() => usePageObjects(mockDoc as never, 0));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockDoc.getPage).toHaveBeenCalledWith(0);
    expect(mockPage.getPageObjects).toHaveBeenCalledOnce();
    expect(mockPage.dispose).toHaveBeenCalledOnce();
    expect(result.current.data).toEqual(objects);
  });

  it('returns error state when fetcher fails', async () => {
    const mockPage = createMockPage({
      getPageObjects: vi.fn().mockRejectedValue(new Error('Page objects failed')),
    });
    const mockDoc = createMockDocument({ getPage: vi.fn().mockResolvedValue(mockPage) });

    const { result } = renderHookWithStores(() => usePageObjects(mockDoc as never, 0));

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    expect(result.current.error?.message).toBe('Page objects failed');
    expect(mockPage.dispose).toHaveBeenCalledOnce();
  });
});
