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

const { createDocumentDataHook, createPageDataHook } = await import(
  '../../../../src/react/internal/create-data-hook.js'
);

describe('createDocumentDataHook', () => {
  beforeEach(() => {
    queryStore.clear();
  });

  it('creates a hook that returns undefined when document is null', () => {
    const useHook = createDocumentDataHook('testDoc', vi.fn());
    const { result } = renderHookWithStores(() => useHook(null));

    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
  });

  it('creates a hook that builds correct cache key', () => {
    const key = buildCacheKey('mock-doc-id', 'testDoc', 0);
    expect(key).toBe('mock-doc-id\0testDoc\x000');
  });

  it('creates a hook that returns cached data on hit', () => {
    const hookName = 'cachedDoc';
    const key = buildCacheKey('mock-doc-id', hookName, 0);
    queryStore.set(key, { status: 'success', data: { title: 'Cached' } });

    const useHook = createDocumentDataHook(hookName, vi.fn());
    const mockDoc = createMockDocument();
    const { result } = renderHookWithStores(() => useHook(mockDoc as never));

    expect(result.current.data).toEqual({ title: 'Cached' });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('creates a hook that fetches from document on miss', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ title: 'Fetched' });
    const useHook = createDocumentDataHook('fetchDoc', fetchFn);
    const mockDoc = createMockDocument();

    const { result } = renderHookWithStores(() => useHook(mockDoc as never));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(fetchFn).toHaveBeenCalledWith(mockDoc);
    expect(result.current.data).toEqual({ title: 'Fetched' });
  });

  it('creates a hook that handles fetch errors', async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error('Document fetch failed'));
    const useHook = createDocumentDataHook('errorDoc', fetchFn);
    const mockDoc = createMockDocument();

    const { result } = renderHookWithStores(() => useHook(mockDoc as never));

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    expect(result.current.error?.message).toBe('Document fetch failed');
    expect(result.current.isLoading).toBe(false);
  });
});

describe('createPageDataHook', () => {
  beforeEach(() => {
    queryStore.clear();
  });

  it('creates a hook that returns undefined when document is null', () => {
    const useHook = createPageDataHook('testPage', vi.fn());
    const { result } = renderHookWithStores(() => useHook(null, 0));

    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
  });

  it('creates a hook that builds correct cache key with pageIndex', () => {
    const key0 = buildCacheKey('mock-doc-id', 'testPage', 0, 0, 0);
    const key3 = buildCacheKey('mock-doc-id', 'testPage', 0, 3, 0);
    expect(key0).toBe('mock-doc-id\0testPage\x000\x000\x000');
    expect(key3).toBe('mock-doc-id\0testPage\x000\x003\x000');
    expect(key0).not.toBe(key3);
  });

  it('creates a hook that acquires and disposes page', async () => {
    const mockPage = createMockPage();
    const mockDoc = createMockDocument({ getPage: vi.fn().mockResolvedValue(mockPage) });
    const fetchFn = vi.fn().mockResolvedValue('page-result');
    const useHook = createPageDataHook('disposePage', fetchFn);

    const { result } = renderHookWithStores(() => useHook(mockDoc as never, 2));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockDoc.getPage).toHaveBeenCalledWith(2);
    expect(mockPage.dispose).toHaveBeenCalledOnce();
  });

  it('creates a hook that calls fetchFn with the page', async () => {
    const mockPage = createMockPage();
    const mockDoc = createMockDocument({ getPage: vi.fn().mockResolvedValue(mockPage) });
    const fetchFn = vi.fn().mockResolvedValue('fetched-data');
    const useHook = createPageDataHook('fetchPage', fetchFn);

    const { result } = renderHookWithStores(() => useHook(mockDoc as never, 1));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(fetchFn).toHaveBeenCalledWith(mockPage);
    expect(result.current.data).toBe('fetched-data');
  });

  it('creates a hook that disposes page even on error', async () => {
    const mockPage = createMockPage();
    const mockDoc = createMockDocument({ getPage: vi.fn().mockResolvedValue(mockPage) });
    const fetchFn = vi.fn().mockRejectedValue(new Error('Page fetch failed'));
    const useHook = createPageDataHook('errorPage', fetchFn);

    const { result } = renderHookWithStores(() => useHook(mockDoc as never, 0));

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    expect(result.current.error?.message).toBe('Page fetch failed');
    expect(result.current.isLoading).toBe(false);
    expect(mockPage.dispose).toHaveBeenCalledOnce();
  });
});
