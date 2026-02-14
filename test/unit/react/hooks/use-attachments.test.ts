import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildCacheKey } from '../../../../src/react/internal/cache-key.js';
import { queryStore } from '../../../../src/react/internal/query-store.js';
import { createMockDocument, renderHookWithStores } from '../../../react-setup.js';

vi.mock('../../../../src/react/context.js', () => ({
  usePDFiumDocument: vi.fn().mockReturnValue({ documentRevision: 0 }),
}));

const { useAttachments } = await import('../../../../src/react/hooks/use-attachments.js');

describe('useAttachments', () => {
  beforeEach(() => {
    queryStore.clear();
  });

  it('returns undefined data when document is null', () => {
    const { result } = renderHookWithStores(() => useAttachments(null));

    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('builds the correct cache key without pageIndex', () => {
    const key = buildCacheKey('mock-doc-id', 'attachments', 0);
    expect(key).toBe('mock-doc-id\0attachments\x000');
  });

  it('returns cached data on cache hit', () => {
    const attachments = [{ name: 'invoice.pdf', size: 1024 }];
    const key = buildCacheKey('mock-doc-id', 'attachments', 0);
    queryStore.set(key, { status: 'success', data: attachments });

    const mockDoc = createMockDocument();
    const { result } = renderHookWithStores(() => useAttachments(mockDoc as never));

    expect(result.current.data).toEqual(attachments);
    expect(result.current.isLoading).toBe(false);
  });

  it('shows loading state on cache miss', () => {
    const mockDoc = createMockDocument();
    const { result } = renderHookWithStores(() => useAttachments(mockDoc as never));

    expect(result.current.isLoading).toBe(true);
  });

  it('fetches attachments directly from document (no page acquire/dispose)', async () => {
    const attachments = [{ name: 'data.csv', size: 2048 }];
    const mockDoc = createMockDocument({ getAttachments: vi.fn().mockResolvedValue(attachments) });

    const { result } = renderHookWithStores(() => useAttachments(mockDoc as never));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockDoc.getAttachments).toHaveBeenCalledOnce();
    expect(mockDoc.getPage).not.toHaveBeenCalled();
    expect(result.current.data).toEqual(attachments);
  });

  it('returns error state when fetcher fails', async () => {
    const mockDoc = createMockDocument({
      getAttachments: vi.fn().mockRejectedValue(new Error('Attachments failed')),
    });

    const { result } = renderHookWithStores(() => useAttachments(mockDoc as never));

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    expect(result.current.error?.message).toBe('Attachments failed');
  });
});
