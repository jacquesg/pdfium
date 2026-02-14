import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildCacheKey } from '../../../../src/react/internal/cache-key.js';
import { queryStore } from '../../../../src/react/internal/query-store.js';
import { createMockDocument, renderHookWithStores } from '../../../react-setup.js';

vi.mock('../../../../src/react/context.js', () => ({
  usePDFiumDocument: vi.fn().mockReturnValue({ documentRevision: 0 }),
}));

const { useNamedDestinations } = await import('../../../../src/react/hooks/use-named-destinations.js');

describe('useNamedDestinations', () => {
  beforeEach(() => {
    queryStore.clear();
  });

  it('returns undefined data when document is null', () => {
    const { result } = renderHookWithStores(() => useNamedDestinations(null));

    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('builds the correct cache key without pageIndex', () => {
    const key = buildCacheKey('mock-doc-id', 'namedDestinations', 0);
    expect(key).toBe('mock-doc-id\0namedDestinations\x000');
  });

  it('returns cached data on cache hit', () => {
    const destinations = [
      { name: 'section1', pageIndex: 0 },
      { name: 'section2', pageIndex: 3 },
    ];
    const key = buildCacheKey('mock-doc-id', 'namedDestinations', 0);
    queryStore.set(key, { status: 'success', data: destinations });

    const mockDoc = createMockDocument();
    const { result } = renderHookWithStores(() => useNamedDestinations(mockDoc as never));

    expect(result.current.data).toEqual(destinations);
    expect(result.current.isLoading).toBe(false);
  });

  it('shows loading state on cache miss', () => {
    const mockDoc = createMockDocument();
    const { result } = renderHookWithStores(() => useNamedDestinations(mockDoc as never));

    expect(result.current.isLoading).toBe(true);
  });

  it('fetches named destinations directly from document (no page acquire/dispose)', async () => {
    const destinations = [{ name: 'toc', pageIndex: 1 }];
    const mockDoc = createMockDocument({ getNamedDestinations: vi.fn().mockResolvedValue(destinations) });

    const { result } = renderHookWithStores(() => useNamedDestinations(mockDoc as never));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockDoc.getNamedDestinations).toHaveBeenCalledOnce();
    expect(mockDoc.getPage).not.toHaveBeenCalled();
    expect(result.current.data).toEqual(destinations);
  });

  it('returns error state when fetcher fails', async () => {
    const mockDoc = createMockDocument({
      getNamedDestinations: vi.fn().mockRejectedValue(new Error('Named destinations failed')),
    });

    const { result } = renderHookWithStores(() => useNamedDestinations(mockDoc as never));

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    expect(result.current.error?.message).toBe('Named destinations failed');
  });
});
