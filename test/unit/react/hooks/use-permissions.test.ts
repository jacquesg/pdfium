import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildCacheKey } from '../../../../src/react/internal/cache-key.js';
import { queryStore } from '../../../../src/react/internal/query-store.js';
import { createMockDocument, renderHookWithStores } from '../../../react-setup.js';

vi.mock('../../../../src/react/context.js', () => ({
  usePDFiumDocument: vi.fn().mockReturnValue({ documentRevision: 0 }),
}));

const { usePermissions } = await import('../../../../src/react/hooks/use-permissions.js');

describe('usePermissions', () => {
  beforeEach(() => {
    queryStore.clear();
  });

  it('returns undefined data when document is null', () => {
    const { result } = renderHookWithStores(() => usePermissions(null));

    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('builds the correct cache key', () => {
    const key = buildCacheKey('mock-doc-id', 'permissions', 0);
    expect(key).toBe('mock-doc-id\0permissions\x000');
  });

  it('returns cached data on cache hit', () => {
    const perms = { raw: -1, canPrint: true, canModify: true, canCopy: true };
    const key = buildCacheKey('mock-doc-id', 'permissions', 0);
    queryStore.set(key, { status: 'success', data: perms });

    const mockDoc = createMockDocument();
    const { result } = renderHookWithStores(() => usePermissions(mockDoc as never));

    expect(result.current.data).toEqual(perms);
    expect(result.current.isLoading).toBe(false);
  });

  it('shows loading state on cache miss', () => {
    const mockDoc = createMockDocument();
    const { result } = renderHookWithStores(() => usePermissions(mockDoc as never));

    expect(result.current.isLoading).toBe(true);
  });

  it('fetches permissions from document', async () => {
    const perms = {
      raw: -1,
      canPrint: true,
      canModify: false,
      canCopy: true,
      canAnnotate: true,
      canFillForms: true,
      canExtract: true,
      canAssemble: true,
      canPrintHighQuality: true,
    };
    const mockDoc = createMockDocument({ getPermissions: vi.fn().mockResolvedValue(perms) });

    const { result } = renderHookWithStores(() => usePermissions(mockDoc as never));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockDoc.getPermissions).toHaveBeenCalledOnce();
    expect(mockDoc.getPage).not.toHaveBeenCalled();
    expect(result.current.data).toEqual(perms);
  });

  it('returns error state when fetcher fails', async () => {
    const mockDoc = createMockDocument({
      getPermissions: vi.fn().mockRejectedValue(new Error('Permissions fetch failed')),
    });

    const { result } = renderHookWithStores(() => usePermissions(mockDoc as never));

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    expect(result.current.error?.message).toBe('Permissions fetch failed');
  });
});
