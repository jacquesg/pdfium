import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildCacheKey } from '../../../../src/react/internal/cache-key.js';
import { queryStore } from '../../../../src/react/internal/query-store.js';
import { createMockDocument, renderHookWithStores } from '../../../react-setup.js';

vi.mock('../../../../src/react/context.js', () => ({
  usePDFiumDocument: vi.fn().mockReturnValue({ documentRevision: 0 }),
}));

const { usePageDimensions } = await import('../../../../src/react/hooks/use-page-dimensions.js');

describe('usePageDimensions', () => {
  beforeEach(() => {
    queryStore.clear();
  });

  it('returns undefined data when document is null', () => {
    const { result } = renderHookWithStores(() => usePageDimensions(null));

    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('returns cached data on cache hit', () => {
    const dims = [{ width: 612, height: 792 }];
    const key = buildCacheKey('mock-doc-id', 'pageDimensions', 0);
    queryStore.set(key, { status: 'success', data: dims });

    const mockDoc = createMockDocument();
    const { result } = renderHookWithStores(() => usePageDimensions(mockDoc as never));

    expect(result.current.data).toEqual(dims);
    expect(result.current.isLoading).toBe(false);
  });

  it('shows loading state on cache miss', () => {
    const mockDoc = createMockDocument();
    const { result } = renderHookWithStores(() => usePageDimensions(mockDoc as never));

    expect(result.current.isLoading).toBe(true);
  });

  it('fetches dimensions and stores result', async () => {
    const expectedDims = Array.from({ length: 5 }, () => ({ width: 612, height: 792 }));
    const mockDoc = createMockDocument({
      getAllPageDimensions: vi.fn().mockResolvedValue(expectedDims),
    });

    const { result } = renderHookWithStores(() => usePageDimensions(mockDoc as never));

    await waitFor(() => {
      expect(result.current.data).toEqual(expectedDims);
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(mockDoc.getAllPageDimensions).toHaveBeenCalledOnce();
  });

  it('stores error state on fetch failure', async () => {
    const mockDoc = createMockDocument({
      getAllPageDimensions: vi.fn().mockRejectedValue(new Error('Network error')),
    });

    const { result } = renderHookWithStores(() => usePageDimensions(mockDoc as never));

    await waitFor(() => {
      expect(result.current.error).toBeInstanceOf(Error);
    });

    expect(result.current.data).toBeUndefined();
  });
});
