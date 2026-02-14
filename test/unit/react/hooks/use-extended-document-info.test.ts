import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildCacheKey } from '../../../../src/react/internal/cache-key.js';
import { queryStore } from '../../../../src/react/internal/query-store.js';
import { createMockDocument, renderHookWithStores } from '../../../react-setup.js';

vi.mock('../../../../src/react/context.js', () => ({
  usePDFiumDocument: vi.fn().mockReturnValue({ documentRevision: 0 }),
}));

const { useExtendedDocumentInfo } = await import('../../../../src/react/hooks/use-extended-document-info.js');

describe('useExtendedDocumentInfo', () => {
  beforeEach(() => {
    queryStore.clear();
  });

  it('returns undefined data when document is null', () => {
    const { result } = renderHookWithStores(() => useExtendedDocumentInfo(null));

    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('builds the correct cache key', () => {
    const key = buildCacheKey('mock-doc-id', 'extendedDocInfo', 0);
    expect(key).toBe('mock-doc-id\0extendedDocInfo\x000');
  });

  it('returns cached data on cache hit', () => {
    const info = {
      fileVersion: 17,
      rawPermissions: -1,
      securityHandlerRevision: 0,
      signatureCount: 0,
      hasValidCrossReferenceTable: true,
    };
    const key = buildCacheKey('mock-doc-id', 'extendedDocInfo', 0);
    queryStore.set(key, { status: 'success', data: info });

    const mockDoc = createMockDocument();
    const { result } = renderHookWithStores(() => useExtendedDocumentInfo(mockDoc as never));

    expect(result.current.data).toEqual(info);
    expect(result.current.isLoading).toBe(false);
  });

  it('shows loading state on cache miss', () => {
    const mockDoc = createMockDocument();
    const { result } = renderHookWithStores(() => useExtendedDocumentInfo(mockDoc as never));

    expect(result.current.isLoading).toBe(true);
  });

  it('fetches extended document info from document', async () => {
    const info = {
      fileVersion: 20,
      rawPermissions: -3904,
      securityHandlerRevision: 3,
      signatureCount: 2,
      hasValidCrossReferenceTable: true,
    };
    const mockDoc = createMockDocument({ getExtendedDocumentInfo: vi.fn().mockResolvedValue(info) });

    const { result } = renderHookWithStores(() => useExtendedDocumentInfo(mockDoc as never));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockDoc.getExtendedDocumentInfo).toHaveBeenCalledOnce();
    expect(mockDoc.getPage).not.toHaveBeenCalled();
    expect(result.current.data).toEqual(info);
  });

  it('returns error state when fetcher fails', async () => {
    const mockDoc = createMockDocument({
      getExtendedDocumentInfo: vi.fn().mockRejectedValue(new Error('Extended info fetch failed')),
    });

    const { result } = renderHookWithStores(() => useExtendedDocumentInfo(mockDoc as never));

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    expect(result.current.error?.message).toBe('Extended info fetch failed');
  });
});
