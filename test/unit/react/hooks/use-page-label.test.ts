import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildCacheKey } from '../../../../src/react/internal/cache-key.js';
import { queryStore } from '../../../../src/react/internal/query-store.js';
import { createMockDocument, renderHookWithStores } from '../../../react-setup.js';

vi.mock('../../../../src/react/context.js', () => ({
  usePDFiumDocument: vi.fn().mockReturnValue({ documentRevision: 0 }),
}));

const { usePageLabel } = await import('../../../../src/react/hooks/use-page-label.js');

describe('usePageLabel', () => {
  beforeEach(() => {
    queryStore.clear();
  });

  it('returns undefined data when document is null', () => {
    const { result } = renderHookWithStores(() => usePageLabel(null, 0));

    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('builds the correct cache key with pageIndex', () => {
    const key = buildCacheKey('mock-doc-id', 'pageLabel', 0, 0);
    expect(key).toBe('mock-doc-id\0pageLabel\x000\x000');
  });

  it('returns cached data on cache hit', () => {
    const key = buildCacheKey('mock-doc-id', 'pageLabel', 0, 2);
    queryStore.set(key, { status: 'success', data: 'iii' });

    const mockDoc = createMockDocument();
    const { result } = renderHookWithStores(() => usePageLabel(mockDoc as never, 2));

    expect(result.current.data).toBe('iii');
    expect(result.current.isLoading).toBe(false);
  });

  it('shows loading state on cache miss', () => {
    const mockDoc = createMockDocument();
    const { result } = renderHookWithStores(() => usePageLabel(mockDoc as never, 0));

    expect(result.current.isLoading).toBe(true);
  });

  it('calls document.getPageLabel directly (no page acquire/dispose)', async () => {
    const mockDoc = createMockDocument({ getPageLabel: vi.fn().mockResolvedValue('iv') });

    const { result } = renderHookWithStores(() => usePageLabel(mockDoc as never, 3));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should call document-level getPageLabel with the page index
    expect(mockDoc.getPageLabel).toHaveBeenCalledWith(3);
    // Should NOT acquire a page — this is a document-level API
    expect(mockDoc.getPage).not.toHaveBeenCalled();
    expect(result.current.data).toBe('iv');
  });

  it('returns undefined when page has no label (null from fetcher coalesces to undefined)', async () => {
    // Default mock returns null for getPageLabel.
    // useStoreQuery stores { status: 'success', data: null }, but the nullish
    // coalescing operator in its return converts null to undefined.
    const mockDoc = createMockDocument();

    const { result } = renderHookWithStores(() => usePageLabel(mockDoc as never, 0));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeUndefined();
  });

  it('uses different cache keys for different page indices', () => {
    const key0 = buildCacheKey('mock-doc-id', 'pageLabel', 0, 0);
    const key5 = buildCacheKey('mock-doc-id', 'pageLabel', 0, 5);
    expect(key0).not.toBe(key5);
  });

  it('returns error state when fetcher fails', async () => {
    const mockDoc = createMockDocument({
      getPageLabel: vi.fn().mockRejectedValue(new Error('Page label failed')),
    });

    const { result } = renderHookWithStores(() => usePageLabel(mockDoc as never, 0));

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    expect(result.current.error?.message).toBe('Page label failed');
  });
});
