import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildCacheKey } from '../../../../src/react/internal/cache-key.js';
import { queryStore } from '../../../../src/react/internal/query-store.js';
import { createMockDocument, renderHookWithStores } from '../../../react-setup.js';

vi.mock('../../../../src/react/context.js', () => ({
  usePDFiumDocument: vi.fn().mockReturnValue({ documentRevision: 0 }),
}));

const { useMetadata } = await import('../../../../src/react/hooks/use-metadata.js');

describe('useMetadata', () => {
  beforeEach(() => {
    queryStore.clear();
  });

  it('returns undefined data when document is null', () => {
    const { result } = renderHookWithStores(() => useMetadata(null));

    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('builds the correct cache key', () => {
    const key = buildCacheKey('mock-doc-id', 'metadata', 0);
    expect(key).toBe('mock-doc-id\0metadata\x000');
  });

  it('returns cached data on cache hit', () => {
    const metadata = { title: 'Cached Title', author: 'Author' };
    const key = buildCacheKey('mock-doc-id', 'metadata', 0);
    queryStore.set(key, { status: 'success', data: metadata });

    const mockDoc = createMockDocument();
    const { result } = renderHookWithStores(() => useMetadata(mockDoc as never));

    expect(result.current.data).toEqual(metadata);
    expect(result.current.isLoading).toBe(false);
  });

  it('shows loading state on cache miss', () => {
    const mockDoc = createMockDocument();
    const { result } = renderHookWithStores(() => useMetadata(mockDoc as never));

    expect(result.current.isLoading).toBe(true);
  });

  it('fetches metadata from document', async () => {
    const metadata = { title: 'Test PDF', author: 'Author', subject: '', keywords: '', creator: '', producer: '' };
    const mockDoc = createMockDocument({ getMetadata: vi.fn().mockResolvedValue(metadata) });

    const { result } = renderHookWithStores(() => useMetadata(mockDoc as never));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockDoc.getMetadata).toHaveBeenCalledOnce();
    expect(mockDoc.getPage).not.toHaveBeenCalled();
    expect(result.current.data).toEqual(metadata);
  });

  it('returns error state when fetcher fails', async () => {
    const mockDoc = createMockDocument({
      getMetadata: vi.fn().mockRejectedValue(new Error('Metadata fetch failed')),
    });

    const { result } = renderHookWithStores(() => useMetadata(mockDoc as never));

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    expect(result.current.error?.message).toBe('Metadata fetch failed');
  });
});
