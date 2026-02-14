import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildCacheKey } from '../../../../src/react/internal/cache-key.js';
import { queryStore } from '../../../../src/react/internal/query-store.js';
import { createMockDocument, createMockPage, renderHookWithStores } from '../../../react-setup.js';

vi.mock('../../../../src/react/context.js', () => ({
  usePDFiumDocument: vi.fn().mockReturnValue({ documentRevision: 0 }),
}));

const { useStructureTree } = await import('../../../../src/react/hooks/use-structure-tree.js');

describe('useStructureTree', () => {
  beforeEach(() => {
    queryStore.clear();
  });

  it('returns undefined data when document is null', () => {
    const { result } = renderHookWithStores(() => useStructureTree(null, 0));

    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('builds the correct cache key', () => {
    const key = buildCacheKey('mock-doc-id', 'structureTree', 0, 0);
    expect(key).toBe('mock-doc-id\0structureTree\x000\x000');
  });

  it('returns cached data on cache hit', () => {
    const tree = [{ type: 'Document', children: [{ type: 'P', children: [] }] }];
    const key = buildCacheKey('mock-doc-id', 'structureTree', 0, 0);
    queryStore.set(key, { status: 'success', data: tree });

    const mockDoc = createMockDocument();
    const { result } = renderHookWithStores(() => useStructureTree(mockDoc as never, 0));

    expect(result.current.data).toEqual(tree);
    expect(result.current.isLoading).toBe(false);
  });

  it('shows loading state on cache miss', () => {
    const mockDoc = createMockDocument();
    const { result } = renderHookWithStores(() => useStructureTree(mockDoc as never, 0));

    expect(result.current.isLoading).toBe(true);
  });

  it('fetches structure tree and acquires/disposes page on cache miss', async () => {
    const tree = [{ type: 'Document', children: [] }];
    const mockPage = createMockPage({ getStructureTree: vi.fn().mockResolvedValue(tree) });
    const mockDoc = createMockDocument({ getPage: vi.fn().mockResolvedValue(mockPage) });

    const { result } = renderHookWithStores(() => useStructureTree(mockDoc as never, 0));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockDoc.getPage).toHaveBeenCalledWith(0);
    expect(mockPage.getStructureTree).toHaveBeenCalledOnce();
    expect(mockPage.dispose).toHaveBeenCalledOnce();
    expect(result.current.data).toEqual(tree);
  });

  it('returns undefined for untagged PDFs (null from fetcher coalesces to undefined)', async () => {
    // The default mock page returns null for getStructureTree.
    // useStoreQuery stores { status: 'success', data: null }, but the nullish
    // coalescing operator in its return converts null to undefined.
    const mockPage = createMockPage();
    const mockDoc = createMockDocument({ getPage: vi.fn().mockResolvedValue(mockPage) });

    const { result } = renderHookWithStores(() => useStructureTree(mockDoc as never, 0));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeUndefined();
  });

  it('returns error state when fetcher fails', async () => {
    const mockPage = createMockPage({
      getStructureTree: vi.fn().mockRejectedValue(new Error('Structure tree failed')),
    });
    const mockDoc = createMockDocument({ getPage: vi.fn().mockResolvedValue(mockPage) });

    const { result } = renderHookWithStores(() => useStructureTree(mockDoc as never, 0));

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    expect(result.current.error?.message).toBe('Structure tree failed');
    expect(mockPage.dispose).toHaveBeenCalledOnce();
  });
});
