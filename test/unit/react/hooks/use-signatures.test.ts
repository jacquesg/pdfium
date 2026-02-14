import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildCacheKey } from '../../../../src/react/internal/cache-key.js';
import { queryStore } from '../../../../src/react/internal/query-store.js';
import { createMockDocument, renderHookWithStores } from '../../../react-setup.js';

vi.mock('../../../../src/react/context.js', () => ({
  usePDFiumDocument: vi.fn().mockReturnValue({ documentRevision: 0 }),
}));

const { useSignatures } = await import('../../../../src/react/hooks/use-signatures.js');

describe('useSignatures', () => {
  beforeEach(() => {
    queryStore.clear();
  });

  it('returns undefined data when document is null', () => {
    const { result } = renderHookWithStores(() => useSignatures(null));

    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('builds the correct cache key', () => {
    const key = buildCacheKey('mock-doc-id', 'signatures', 0);
    expect(key).toBe('mock-doc-id\0signatures\x000');
  });

  it('returns cached data on cache hit', () => {
    const sigs = [
      {
        index: 0,
        contents: undefined,
        byteRange: undefined,
        subFilter: 'adbe.pkcs7.detached',
        reason: 'Test',
        time: undefined,
        docMDPPermission: 0,
      },
    ];
    const key = buildCacheKey('mock-doc-id', 'signatures', 0);
    queryStore.set(key, { status: 'success', data: sigs });

    const mockDoc = createMockDocument();
    const { result } = renderHookWithStores(() => useSignatures(mockDoc as never));

    expect(result.current.data).toEqual(sigs);
    expect(result.current.isLoading).toBe(false);
  });

  it('shows loading state on cache miss', () => {
    const mockDoc = createMockDocument();
    const { result } = renderHookWithStores(() => useSignatures(mockDoc as never));

    expect(result.current.isLoading).toBe(true);
  });

  it('fetches signatures from document', async () => {
    const sigs = [
      {
        index: 0,
        contents: new ArrayBuffer(10),
        byteRange: [0, 100, 200, 300],
        subFilter: 'adbe.pkcs7.detached',
        reason: 'Approval',
        time: 'D:20250101000000Z',
        docMDPPermission: 0,
      },
    ];
    const mockDoc = createMockDocument({ getSignatures: vi.fn().mockResolvedValue(sigs) });

    const { result } = renderHookWithStores(() => useSignatures(mockDoc as never));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockDoc.getSignatures).toHaveBeenCalledOnce();
    expect(mockDoc.getPage).not.toHaveBeenCalled();
    expect(result.current.data).toEqual(sigs);
  });

  it('returns error state when fetcher fails', async () => {
    const mockDoc = createMockDocument({
      getSignatures: vi.fn().mockRejectedValue(new Error('Signatures fetch failed')),
    });

    const { result } = renderHookWithStores(() => useSignatures(mockDoc as never));

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    expect(result.current.error?.message).toBe('Signatures fetch failed');
  });
});
