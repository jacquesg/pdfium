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

const { useAnnotations } = await import('../../../../src/react/hooks/use-annotations.js');

describe('useAnnotations', () => {
  beforeEach(() => {
    queryStore.clear();
  });

  it('returns undefined data when document is null', () => {
    const { result } = renderHookWithStores(() => useAnnotations(null, 0));

    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('builds the correct cache key', () => {
    const key = buildCacheKey('mock-doc-id', 'annotations', 0, 0, 0);
    expect(key).toBe('mock-doc-id\0annotations\x000\x000\x000');
  });

  it('returns cached data on cache hit', () => {
    const annotations = [{ type: 'highlight', rect: { left: 0, top: 10, right: 50, bottom: 0 } }];
    const key = buildCacheKey('mock-doc-id', 'annotations', 0, 1, 0);
    queryStore.set(key, { status: 'success', data: annotations });

    const mockDoc = createMockDocument();
    const { result } = renderHookWithStores(() => useAnnotations(mockDoc as never, 1));

    expect(result.current.data).toEqual(annotations);
    expect(result.current.isLoading).toBe(false);
  });

  it('shows loading state on cache miss', () => {
    const mockDoc = createMockDocument();
    const { result } = renderHookWithStores(() => useAnnotations(mockDoc as never, 0));

    expect(result.current.isLoading).toBe(true);
  });

  it('fetches annotations and acquires/disposes page on cache miss', async () => {
    const annotations = [{ type: 'text', rect: { left: 10, top: 20, right: 30, bottom: 40 } }];
    const mockPage = createMockPage({ getAnnotations: vi.fn().mockResolvedValue(annotations) });
    const mockDoc = createMockDocument({ getPage: vi.fn().mockResolvedValue(mockPage) });

    const { result } = renderHookWithStores(() => useAnnotations(mockDoc as never, 0));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockDoc.getPage).toHaveBeenCalledWith(0);
    expect(mockPage.getAnnotations).toHaveBeenCalledOnce();
    expect(mockPage.dispose).toHaveBeenCalledOnce();
    expect(result.current.data).toEqual(annotations);
  });

  it('handles empty annotations array', async () => {
    const mockPage = createMockPage({ getAnnotations: vi.fn().mockResolvedValue([]) });
    const mockDoc = createMockDocument({ getPage: vi.fn().mockResolvedValue(mockPage) });

    const { result } = renderHookWithStores(() => useAnnotations(mockDoc as never, 0));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual([]);
  });

  it('returns error state when fetcher fails', async () => {
    const mockPage = createMockPage({
      getAnnotations: vi.fn().mockRejectedValue(new Error('Annotations failed')),
    });
    const mockDoc = createMockDocument({ getPage: vi.fn().mockResolvedValue(mockPage) });

    const { result } = renderHookWithStores(() => useAnnotations(mockDoc as never, 0));

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    expect(result.current.error?.message).toBe('Annotations failed');
    expect(mockPage.dispose).toHaveBeenCalledOnce();
  });
});
