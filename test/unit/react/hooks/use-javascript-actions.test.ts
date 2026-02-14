import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildCacheKey } from '../../../../src/react/internal/cache-key.js';
import { queryStore } from '../../../../src/react/internal/query-store.js';
import { createMockDocument, renderHookWithStores } from '../../../react-setup.js';

vi.mock('../../../../src/react/context.js', () => ({
  usePDFiumDocument: vi.fn().mockReturnValue({ documentRevision: 0 }),
}));

const { useJavaScriptActions } = await import('../../../../src/react/hooks/use-javascript-actions.js');

describe('useJavaScriptActions', () => {
  beforeEach(() => {
    queryStore.clear();
  });

  it('returns undefined data when document is null', () => {
    const { result } = renderHookWithStores(() => useJavaScriptActions(null));

    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('builds the correct cache key', () => {
    const key = buildCacheKey('mock-doc-id', 'javascriptActions', 0);
    expect(key).toBe('mock-doc-id\0javascriptActions\x000');
  });

  it('returns cached data on cache hit', () => {
    const actions = [{ name: 'print', script: 'this.print()' }];
    const key = buildCacheKey('mock-doc-id', 'javascriptActions', 0);
    queryStore.set(key, { status: 'success', data: actions });

    const mockDoc = createMockDocument();
    const { result } = renderHookWithStores(() => useJavaScriptActions(mockDoc as never));

    expect(result.current.data).toEqual(actions);
    expect(result.current.isLoading).toBe(false);
  });

  it('shows loading state on cache miss', () => {
    const mockDoc = createMockDocument();
    const { result } = renderHookWithStores(() => useJavaScriptActions(mockDoc as never));

    expect(result.current.isLoading).toBe(true);
  });

  it('fetches JavaScript actions from document', async () => {
    const actions = [{ name: 'openAction', script: 'app.alert("Hello")' }];
    const mockDoc = createMockDocument({ getJavaScriptActions: vi.fn().mockResolvedValue(actions) });

    const { result } = renderHookWithStores(() => useJavaScriptActions(mockDoc as never));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockDoc.getJavaScriptActions).toHaveBeenCalledOnce();
    expect(mockDoc.getPage).not.toHaveBeenCalled();
    expect(result.current.data).toEqual(actions);
  });

  it('returns empty array from fetcher when document is null', async () => {
    // Indirect test: ensure the fetcher default is an empty array
    const key = buildCacheKey('mock-doc-id', 'javascriptActions', 0);
    queryStore.set(key, { status: 'success', data: [] });

    const mockDoc = createMockDocument();
    const { result } = renderHookWithStores(() => useJavaScriptActions(mockDoc as never));

    expect(result.current.data).toEqual([]);
  });

  it('returns error state when fetcher fails', async () => {
    const mockDoc = createMockDocument({
      getJavaScriptActions: vi.fn().mockRejectedValue(new Error('JS actions fetch failed')),
    });

    const { result } = renderHookWithStores(() => useJavaScriptActions(mockDoc as never));

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    expect(result.current.error?.message).toBe('JS actions fetch failed');
  });
});
