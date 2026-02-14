import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildCacheKey } from '../../../../src/react/internal/cache-key.js';
import { queryStore } from '../../../../src/react/internal/query-store.js';
import { createMockDocument, renderHookWithStores } from '../../../react-setup.js';

vi.mock('../../../../src/react/context.js', () => ({
  usePDFiumDocument: vi.fn().mockReturnValue({ documentRevision: 0 }),
}));

const { useViewerPreferences } = await import('../../../../src/react/hooks/use-viewer-preferences.js');

describe('useViewerPreferences', () => {
  beforeEach(() => {
    queryStore.clear();
  });

  it('returns undefined data when document is null', () => {
    const { result } = renderHookWithStores(() => useViewerPreferences(null));

    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('builds the correct cache key', () => {
    const key = buildCacheKey('mock-doc-id', 'viewerPreferences', 0);
    expect(key).toBe('mock-doc-id\0viewerPreferences\x000');
  });

  it('returns cached data on cache hit', () => {
    const prefs = { printScaling: true, numCopies: 2, duplexMode: 'Undefined' };
    const key = buildCacheKey('mock-doc-id', 'viewerPreferences', 0);
    queryStore.set(key, { status: 'success', data: prefs });

    const mockDoc = createMockDocument();
    const { result } = renderHookWithStores(() => useViewerPreferences(mockDoc as never));

    expect(result.current.data).toEqual(prefs);
    expect(result.current.isLoading).toBe(false);
  });

  it('shows loading state on cache miss', () => {
    const mockDoc = createMockDocument();
    const { result } = renderHookWithStores(() => useViewerPreferences(mockDoc as never));

    expect(result.current.isLoading).toBe(true);
  });

  it('fetches viewer preferences from document', async () => {
    const prefs = { printScaling: false, numCopies: 1, duplexMode: 'Simplex' };
    const mockDoc = createMockDocument({ getViewerPreferences: vi.fn().mockResolvedValue(prefs) });

    const { result } = renderHookWithStores(() => useViewerPreferences(mockDoc as never));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockDoc.getViewerPreferences).toHaveBeenCalledOnce();
    expect(mockDoc.getPage).not.toHaveBeenCalled();
    expect(result.current.data).toEqual(prefs);
  });

  it('returns error state when fetcher fails', async () => {
    const mockDoc = createMockDocument({
      getViewerPreferences: vi.fn().mockRejectedValue(new Error('Viewer preferences fetch failed')),
    });

    const { result } = renderHookWithStores(() => useViewerPreferences(mockDoc as never));

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    expect(result.current.error?.message).toBe('Viewer preferences fetch failed');
  });
});
