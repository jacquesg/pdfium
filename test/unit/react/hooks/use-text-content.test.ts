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

const { useTextContent } = await import('../../../../src/react/hooks/use-text-content.js');

describe('useTextContent', () => {
  beforeEach(() => {
    queryStore.clear();
  });

  it('returns undefined data when document is null', () => {
    const { result } = renderHookWithStores(() => useTextContent(null, 0));

    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('builds the correct cache key', () => {
    const key = buildCacheKey('mock-doc-id', 'textContent', 0, 0, 0);
    expect(key).toBe('mock-doc-id\0textContent\x000\x000\x000');
  });

  it('returns cached data on cache hit', () => {
    const textData = { text: 'Hello world', rects: new Float32Array(44) };
    const key = buildCacheKey('mock-doc-id', 'textContent', 0, 2, 0);
    queryStore.set(key, { status: 'success', data: textData });

    const mockDoc = createMockDocument();
    const { result } = renderHookWithStores(() => useTextContent(mockDoc as never, 2));

    expect(result.current.data).toEqual(textData);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isPlaceholderData).toBe(false);
  });

  it('shows loading state on cache miss', () => {
    const mockDoc = createMockDocument();
    const { result } = renderHookWithStores(() => useTextContent(mockDoc as never, 0));

    expect(result.current.isLoading).toBe(true);
  });

  it('fetches text layout and acquires/disposes page on cache miss', async () => {
    const textData = { text: 'Hello world', rects: new Float32Array(44) };
    const mockPage = createMockPage({ getTextLayout: vi.fn().mockResolvedValue(textData) });
    const mockDoc = createMockDocument({ getPage: vi.fn().mockResolvedValue(mockPage) });

    const { result } = renderHookWithStores(() => useTextContent(mockDoc as never, 1));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockDoc.getPage).toHaveBeenCalledWith(1);
    expect(mockPage.getTextLayout).toHaveBeenCalledOnce();
    expect(mockPage.dispose).toHaveBeenCalledOnce();
    expect(result.current.data).toEqual(textData);
  });

  it('returns data containing text and Float32Array rects', async () => {
    const rects = new Float32Array([0, 0, 100, 200]);
    const textData = { text: 'Sample text', rects };
    const mockPage = createMockPage({ getTextLayout: vi.fn().mockResolvedValue(textData) });
    const mockDoc = createMockDocument({ getPage: vi.fn().mockResolvedValue(mockPage) });

    const { result } = renderHookWithStores(() => useTextContent(mockDoc as never, 0));

    await waitFor(() => {
      expect(result.current.data).not.toBeUndefined();
    });

    expect(result.current.data?.text).toBe('Sample text');
    expect(result.current.data?.rects).toBeInstanceOf(Float32Array);
    expect(result.current.data?.rects.length).toBe(4);
  });

  it('returns error state when fetcher fails', async () => {
    const mockPage = createMockPage({
      getTextLayout: vi.fn().mockRejectedValue(new Error('Text extraction failed')),
    });
    const mockDoc = createMockDocument({ getPage: vi.fn().mockResolvedValue(mockPage) });

    const { result } = renderHookWithStores(() => useTextContent(mockDoc as never, 0));

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    expect(result.current.error?.message).toBe('Text extraction failed');
    expect(mockPage.dispose).toHaveBeenCalledOnce();
  });
});
