import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildCacheKey } from '../../../../src/react/internal/cache-key.js';
import { queryStore } from '../../../../src/react/internal/query-store.js';
import { createMockDocument, renderHookWithStores } from '../../../react-setup.js';

vi.mock('../../../../src/react/context.js', () => ({
  usePDFiumDocument: vi.fn().mockReturnValue({ documentRevision: 0 }),
}));

const { useDocumentInfo } = await import('../../../../src/react/hooks/use-document-info.js');

describe('useDocumentInfo', () => {
  beforeEach(() => {
    queryStore.clear();
  });

  it('returns undefined data when document is null', () => {
    const { result } = renderHookWithStores(() => useDocumentInfo(null));

    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('builds the correct cache key without pageIndex', () => {
    const key = buildCacheKey('mock-doc-id', 'documentInfo', 0);
    expect(key).toBe('mock-doc-id\0documentInfo\x000');
  });

  it('returns cached data on cache hit', () => {
    const docInfo = { pageCount: 10, title: 'Test Document', author: 'Tester' };
    const key = buildCacheKey('mock-doc-id', 'documentInfo', 0);
    queryStore.set(key, { status: 'success', data: docInfo });

    const mockDoc = createMockDocument();
    const { result } = renderHookWithStores(() => useDocumentInfo(mockDoc as never));

    expect(result.current.data).toEqual(docInfo);
    expect(result.current.isLoading).toBe(false);
  });

  it('shows loading state on cache miss', () => {
    const mockDoc = createMockDocument();
    const { result } = renderHookWithStores(() => useDocumentInfo(mockDoc as never));

    expect(result.current.isLoading).toBe(true);
  });

  it('fetches document info directly from document (no page acquire/dispose)', async () => {
    const docInfo = { pageCount: 5 };
    const mockDoc = createMockDocument({ getDocumentInfo: vi.fn().mockResolvedValue(docInfo) });

    const { result } = renderHookWithStores(() => useDocumentInfo(mockDoc as never));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockDoc.getDocumentInfo).toHaveBeenCalledOnce();
    expect(mockDoc.getPage).not.toHaveBeenCalled();
    expect(result.current.data).toEqual(docInfo);
  });

  it('includes pageCount in the returned data', async () => {
    const docInfo = { pageCount: 42, title: 'Big PDF' };
    const mockDoc = createMockDocument({ getDocumentInfo: vi.fn().mockResolvedValue(docInfo) });

    const { result } = renderHookWithStores(() => useDocumentInfo(mockDoc as never));

    await waitFor(() => {
      expect(result.current.data).not.toBeUndefined();
    });

    expect(result.current.data).toHaveProperty('pageCount', 42);
  });

  it('returns error state when fetcher fails', async () => {
    const mockDoc = createMockDocument({
      getDocumentInfo: vi.fn().mockRejectedValue(new Error('Document info failed')),
    });

    const { result } = renderHookWithStores(() => useDocumentInfo(mockDoc as never));

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    expect(result.current.error?.message).toBe('Document info failed');
  });
});
