import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { WorkerPDFiumDocument } from '../../../src/context/worker-client.js';
import { PDFiumError, PDFiumErrorCode } from '../../../src/core/errors.js';
import { PageRotation } from '../../../src/core/types.js';
import { getPageDimensionsCacheKey } from '../../../src/react/hooks/use-page-dimensions.js';
import { createPDFiumStores } from '../../../src/react/internal/stores-context.js';
import { useRenderPage } from '../../../src/react/use-render.js';

// Mock the worker-client module so PDFiumProvider can initialise without a real worker
vi.mock('../../../src/context/worker-client.js', () => ({
  WorkerPDFium: {
    create: vi.fn().mockResolvedValue({
      openDocument: vi.fn(),
      dispose: vi.fn(),
    }),
  },
}));

// Lazy import after the mock is set up
const { PDFiumProvider } = await import('../../../src/react/context.js');

function createWrapper() {
  const stores = createPDFiumStores();
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <PDFiumProvider wasmBinary={new ArrayBuffer(0)} workerUrl="worker.js" stores={stores}>
        {children}
      </PDFiumProvider>
    );
  };
}

describe('useRenderPage', () => {
  it('returns loading state with null dimensions when document is null', () => {
    const { result } = renderHook(() => useRenderPage(null, 0), {
      wrapper: createWrapper(),
    });

    expect(result.current.width).toBeNull();
    expect(result.current.height).toBeNull();
    expect(result.current.originalWidth).toBeNull();
    expect(result.current.originalHeight).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isPlaceholderData).toBe(false);
    expect(result.current.renderKey).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('returns cached result synchronously when renderStore has a cache hit', () => {
    const mockDoc = {
      id: 'cached-doc',
      renderPage: vi.fn(),
    } as unknown as WorkerPDFiumDocument;

    // Pre-populate the render store with the expected cache key
    // Key format: documentId\0hookName\0revision\0pageIndex\0scale\0rotation\0renderFormFields
    const cacheKey = 'cached-doc\0renderPage\x000\x000\x001\0none\0false';
    const cachedResult = {
      data: new Uint8Array(16),
      width: 200,
      height: 300,
      originalWidth: 612,
      originalHeight: 792,
    };
    const stores = createPDFiumStores();
    stores.renderStore.set(cacheKey, cachedResult);

    const { result } = renderHook(() => useRenderPage(mockDoc, 0), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <PDFiumProvider wasmBinary={new ArrayBuffer(0)} workerUrl="worker.js" stores={stores}>
          {children}
        </PDFiumProvider>
      ),
    });

    expect(result.current.width).toBe(200);
    expect(result.current.height).toBe(300);
    expect(result.current.originalWidth).toBe(612);
    expect(result.current.originalHeight).toBe(792);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.renderKey).toBe(cacheKey);
    // Should not have triggered a new render since cache was hit
    expect(mockDoc.renderPage).not.toHaveBeenCalled();
  });

  it('triggers async render on cache miss', async () => {
    const renderResult = {
      data: new Uint8Array(8),
      width: 150,
      height: 250,
      originalWidth: 400,
      originalHeight: 600,
    };

    const mockDoc = {
      id: 'render-doc',
      renderPage: vi.fn().mockResolvedValue(renderResult),
    } as unknown as WorkerPDFiumDocument;

    const { result } = renderHook(() => useRenderPage(mockDoc, 2), {
      wrapper: createWrapper(),
    });

    // Initially loading
    expect(result.current.isLoading).toBe(true);
    expect(result.current.width).toBeNull();

    // Wait for the render to complete and store to notify
    await vi.waitFor(() => {
      expect(result.current.width).toBe(150);
    });

    expect(result.current.height).toBe(250);
    expect(result.current.isLoading).toBe(false);
  });

  it('returns isPlaceholderData when key changes but old data exists', async () => {
    const firstResult = {
      data: new Uint8Array(4),
      width: 100,
      height: 100,
      originalWidth: 612,
      originalHeight: 792,
    };

    // Second render never resolves — keeps the hook in loading state
    const secondRenderPromise = new Promise<never>(() => {});

    const mockDoc = {
      id: 'placeholder-doc',
      renderPage: vi.fn().mockResolvedValueOnce(firstResult).mockReturnValueOnce(secondRenderPromise),
    } as unknown as WorkerPDFiumDocument;

    const { result, rerender } = renderHook(
      ({ pageIndex }: { pageIndex: number }) => useRenderPage(mockDoc, pageIndex),
      {
        wrapper: createWrapper(),
        initialProps: { pageIndex: 0 },
      },
    );

    // Wait for the first render to complete
    await vi.waitFor(() => {
      expect(result.current.width).toBe(100);
    });

    expect(result.current.isPlaceholderData).toBe(false);

    // Change page index to trigger a new cache key — the old result becomes placeholder data
    rerender({ pageIndex: 1 });

    // The hook should still show old dimensions as placeholder
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isPlaceholderData).toBe(true);
    expect(result.current.width).toBe(100);
  });

  it('does not reuse placeholder render data across document identity changes', async () => {
    const firstResult = {
      data: new Uint8Array(4),
      width: 120,
      height: 160,
      originalWidth: 612,
      originalHeight: 792,
    };
    const pendingRender = new Promise<never>(() => {});

    const mockDocA = {
      id: 'doc-a-placeholder',
      renderPage: vi.fn().mockResolvedValue(firstResult),
    } as unknown as WorkerPDFiumDocument;
    const mockDocB = {
      id: 'doc-b-placeholder',
      renderPage: vi.fn().mockReturnValue(pendingRender),
    } as unknown as WorkerPDFiumDocument;

    const { result, rerender } = renderHook(
      ({ doc, scale }: { doc: WorkerPDFiumDocument; scale: number }) => useRenderPage(doc, 0, { scale }),
      {
        wrapper: createWrapper(),
        initialProps: { doc: mockDocA, scale: 1 },
      },
    );

    await vi.waitFor(() => {
      expect(result.current.width).toBe(120);
    });

    rerender({ doc: mockDocB, scale: 2 });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.isPlaceholderData).toBe(false);
    expect(result.current.width).toBeNull();
    expect(result.current.height).toBeNull();
    expect(result.current.renderKey).toBeNull();
  });

  it('does not reuse placeholder render data when a new document instance has the same id', async () => {
    const firstResult = {
      data: new Uint8Array(4),
      width: 90,
      height: 110,
      originalWidth: 612,
      originalHeight: 792,
    };
    const pendingRender = new Promise<never>(() => {});

    const mockDocA = {
      id: 'shared-doc-id',
      renderPage: vi.fn().mockResolvedValue(firstResult),
    } as unknown as WorkerPDFiumDocument;
    const mockDocB = {
      id: 'shared-doc-id',
      renderPage: vi.fn().mockReturnValue(pendingRender),
    } as unknown as WorkerPDFiumDocument;

    const { result, rerender } = renderHook(
      ({ doc, scale }: { doc: WorkerPDFiumDocument; scale: number }) => useRenderPage(doc, 0, { scale }),
      {
        wrapper: createWrapper(),
        initialProps: { doc: mockDocA, scale: 1 },
      },
    );

    await vi.waitFor(() => {
      expect(result.current.width).toBe(90);
    });

    rerender({ doc: mockDocB, scale: 2 });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.isPlaceholderData).toBe(false);
    expect(result.current.width).toBeNull();
    expect(result.current.height).toBeNull();
    expect(result.current.renderKey).toBeNull();
  });

  it('stops loading and surfaces an error when render fails for the current key', async () => {
    const mockDoc = {
      id: 'error-doc',
      renderPage: vi.fn().mockRejectedValue(new Error('Render failed')),
    } as unknown as WorkerPDFiumDocument;

    const { result } = renderHook(() => useRenderPage(mockDoc, 0), {
      wrapper: createWrapper(),
    });

    await vi.waitFor(() => {
      expect(result.current.error?.message).toBe('Render failed');
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('retry() clears error and triggers re-render', async () => {
    const renderResult = {
      data: new Uint8Array(4),
      width: 100,
      height: 100,
      originalWidth: 612,
      originalHeight: 792,
    };

    const mockDoc = {
      id: 'retry-doc',
      renderPage: vi.fn().mockRejectedValueOnce(new Error('Render failed')).mockResolvedValueOnce(renderResult),
    } as unknown as WorkerPDFiumDocument;

    const { result } = renderHook(() => useRenderPage(mockDoc, 0), {
      wrapper: createWrapper(),
    });

    // Wait for the error
    await vi.waitFor(() => {
      expect(result.current.error?.message).toBe('Render failed');
    });

    // Call retry — should clear error and trigger new render
    result.current.retry();

    await vi.waitFor(() => {
      expect(result.current.error).toBeNull();
      expect(result.current.width).toBe(100);
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('clears error map when document identity changes', async () => {
    const mockDocA = {
      id: 'doc-a',
      renderPage: vi.fn().mockRejectedValue(new Error('Doc A failed')),
    } as unknown as WorkerPDFiumDocument;

    const renderResult = {
      data: new Uint8Array(4),
      width: 200,
      height: 300,
      originalWidth: 612,
      originalHeight: 792,
    };

    const mockDocB = {
      id: 'doc-b',
      renderPage: vi.fn().mockResolvedValue(renderResult),
    } as unknown as WorkerPDFiumDocument;

    const { result, rerender } = renderHook(({ doc }: { doc: WorkerPDFiumDocument }) => useRenderPage(doc, 0), {
      wrapper: createWrapper(),
      initialProps: { doc: mockDocA },
    });

    // Wait for error on doc A
    await vi.waitFor(() => {
      expect(result.current.error?.message).toBe('Doc A failed');
    });

    // Switch to doc B — error map should be cleared
    rerender({ doc: mockDocB });

    await vi.waitFor(() => {
      expect(result.current.error).toBeNull();
      expect(result.current.width).toBe(200);
    });
  });

  it('surfaces DOC_ALREADY_CLOSED as error instead of stuck loading', async () => {
    const mockDoc = {
      id: 'closed-doc',
      renderPage: vi.fn().mockRejectedValue(new PDFiumError(PDFiumErrorCode.DOC_ALREADY_CLOSED)),
    } as unknown as WorkerPDFiumDocument;

    const { result } = renderHook(() => useRenderPage(mockDoc, 0), {
      wrapper: createWrapper(),
    });

    await vi.waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('passes all supported render options to document.renderPage', async () => {
    const renderResult = {
      data: new Uint8Array(8),
      width: 240,
      height: 320,
      originalWidth: 600,
      originalHeight: 800,
    };
    const mockDoc = {
      id: 'options-doc',
      renderPage: vi.fn().mockResolvedValue(renderResult),
    } as unknown as WorkerPDFiumDocument;

    const options = {
      scale: 2,
      width: 240,
      height: 320,
      rotation: PageRotation.Rotate180,
      renderFormFields: true,
      backgroundColour: 0xff00ff00,
      clipRect: { left: 10, top: 20, right: 200, bottom: 220 },
    };

    const { result } = renderHook(() => useRenderPage(mockDoc, 4, options), {
      wrapper: createWrapper(),
    });

    await vi.waitFor(() => {
      expect(mockDoc.renderPage).toHaveBeenCalledWith(4, options);
      expect(result.current.width).toBe(240);
    });
  });

  it('captures synchronous renderPage throws as hook errors', async () => {
    const mockDoc = {
      id: 'sync-throw-doc',
      renderPage: vi.fn().mockImplementation(() => {
        throw new Error('sync render failed');
      }),
    } as unknown as WorkerPDFiumDocument;

    const { result } = renderHook(() => useRenderPage(mockDoc, 0, { scale: 1.5 }), {
      wrapper: createWrapper(),
    });

    await vi.waitFor(() => {
      expect(result.current.error?.message).toBe('sync render failed');
    });
    expect(result.current.isLoading).toBe(false);
  });

  it('uses cached page dimensions when render result is not yet available', () => {
    const stores = createPDFiumStores();
    const dimKey = getPageDimensionsCacheKey('dims-doc', 0);
    stores.queryStore.set(dimKey, {
      status: 'success',
      data: [
        { width: 612, height: 792 },
        { width: 300, height: 400 },
      ],
    });

    const mockDoc = {
      id: 'dims-doc',
      renderPage: vi.fn().mockReturnValue(new Promise<never>(() => {})),
    } as unknown as WorkerPDFiumDocument;

    const { result } = renderHook(() => useRenderPage(mockDoc, 1, { scale: 2 }), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <PDFiumProvider wasmBinary={new ArrayBuffer(0)} workerUrl="worker.js" stores={stores}>
          {children}
        </PDFiumProvider>
      ),
    });

    expect(result.current.hasDimensions).toBe(true);
    expect(result.current.originalWidth).toBe(300);
    expect(result.current.originalHeight).toBe(400);
    expect(result.current.width).toBe(600);
    expect(result.current.height).toBe(800);
    expect(result.current.isLoading).toBe(true);
  });
});
