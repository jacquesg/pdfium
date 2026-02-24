import { waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createMockDocument, renderHookWithStores } from '../../../react-setup.js';

vi.mock('../../../../src/react/context.js', () => ({
  usePDFiumDocument: vi.fn().mockReturnValue({ documentRevision: 0 }),
}));

const { usePrintPageRanges } = await import('../../../../src/react/hooks/use-print-page-ranges.js');

describe('usePrintPageRanges', () => {
  it('returns undefined data when document is null', () => {
    const { result } = renderHookWithStores(() => usePrintPageRanges(null));

    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('returns an empty list when getPrintPageRanges resolves to undefined', async () => {
    const mockDoc = createMockDocument({
      getPrintPageRanges: vi.fn().mockResolvedValue(undefined),
    });

    const { result } = renderHookWithStores(() => usePrintPageRanges(mockDoc as never));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual([]);
    expect(mockDoc.getPrintPageRanges).toHaveBeenCalledOnce();
  });

  it('returns print page ranges from the document', async () => {
    const mockDoc = createMockDocument({
      getPrintPageRanges: vi.fn().mockResolvedValue([1, 3, 5]),
    });

    const { result } = renderHookWithStores(() => usePrintPageRanges(mockDoc as never));

    await waitFor(() => {
      expect(result.current.data).toEqual([1, 3, 5]);
    });
  });
});
