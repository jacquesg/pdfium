import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildCacheKey } from '../../../../src/react/internal/cache-key.js';
import { queryStore } from '../../../../src/react/internal/query-store.js';
import { createMockDocument, createMockPage, renderHookWithStores } from '../../../react-setup.js';

vi.mock('../../../../src/react/context.js', () => ({
  usePDFiumDocument: vi.fn().mockReturnValue({ documentRevision: 0 }),
}));

const { useFormWidgets } = await import('../../../../src/react/hooks/use-form-widgets.js');

describe('useFormWidgets', () => {
  beforeEach(() => {
    queryStore.clear();
  });

  it('returns undefined data when document is null', () => {
    const { result } = renderHookWithStores(() => useFormWidgets(null, 0));

    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('builds the correct cache key', () => {
    const key = buildCacheKey('mock-doc-id', 'formWidgets', 0, 0);
    expect(key).toBe('mock-doc-id\0formWidgets\x000\x000');
  });

  it('returns cached data on cache hit', () => {
    const widgets = [{ name: 'field1', type: 'textField', rect: { left: 0, top: 10, right: 50, bottom: 0 } }];
    const key = buildCacheKey('mock-doc-id', 'formWidgets', 0, 0);
    queryStore.set(key, { status: 'success', data: widgets });

    const mockDoc = createMockDocument();
    const { result } = renderHookWithStores(() => useFormWidgets(mockDoc as never, 0));

    expect(result.current.data).toEqual(widgets);
    expect(result.current.isLoading).toBe(false);
  });

  it('shows loading state on cache miss', () => {
    const mockDoc = createMockDocument();
    const { result } = renderHookWithStores(() => useFormWidgets(mockDoc as never, 0));

    expect(result.current.isLoading).toBe(true);
  });

  it('fetches form widgets and acquires/disposes page on cache miss', async () => {
    const widgets = [{ name: 'checkbox1', type: 'checkBox' }];
    const mockPage = createMockPage({ getFormWidgets: vi.fn().mockResolvedValue(widgets) });
    const mockDoc = createMockDocument({ getPage: vi.fn().mockResolvedValue(mockPage) });

    const { result } = renderHookWithStores(() => useFormWidgets(mockDoc as never, 0));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockDoc.getPage).toHaveBeenCalledWith(0);
    expect(mockPage.getFormWidgets).toHaveBeenCalledOnce();
    expect(mockPage.dispose).toHaveBeenCalledOnce();
    expect(result.current.data).toEqual(widgets);
  });

  it('returns error state when fetcher fails', async () => {
    const mockPage = createMockPage({
      getFormWidgets: vi.fn().mockRejectedValue(new Error('Form widgets failed')),
    });
    const mockDoc = createMockDocument({ getPage: vi.fn().mockResolvedValue(mockPage) });

    const { result } = renderHookWithStores(() => useFormWidgets(mockDoc as never, 0));

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    expect(result.current.error?.message).toBe('Form widgets failed');
    expect(mockPage.dispose).toHaveBeenCalledOnce();
  });
});
