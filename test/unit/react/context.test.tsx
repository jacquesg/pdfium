import { act, render, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PDFiumError, PDFiumErrorCode } from '../../../src/core/errors.js';
import { createPDFiumStores, type PDFiumStores } from '../../../src/react/internal/stores-context.js';
import { createMockDocument } from '../../react-setup.js';

// Mock WorkerPDFium.create so the provider can initialise without a real worker
const mockCreate = vi.fn();

vi.mock('../../../src/context/worker-client.js', () => ({
  WorkerPDFium: {
    create: (...args: unknown[]) => mockCreate(...args),
  },
}));

// Import after mock is established
const { PDFiumProvider, usePDFiumDocument, usePDFiumInstance } = await import('../../../src/react/context.js');

function createWrapper(props?: { wasmBinary?: ArrayBuffer; workerUrl?: string; stores?: PDFiumStores }) {
  const storesProp = props?.stores ? { stores: props.stores } : {};
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <PDFiumProvider
        wasmBinary={props?.wasmBinary ?? new ArrayBuffer(0)}
        workerUrl={props?.workerUrl ?? 'worker.js'}
        {...storesProp}
      >
        {children}
      </PDFiumProvider>
    );
  };
}

describe('PDFiumProvider and context hooks', () => {
  let mockInstance: {
    openDocument: ReturnType<typeof vi.fn>;
    dispose: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockInstance = {
      openDocument: vi.fn(),
      dispose: vi.fn(),
    };
    mockCreate.mockResolvedValue(mockInstance);
  });

  it('initialises the worker instance via the provider', async () => {
    const { result } = renderHook(() => usePDFiumInstance(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.instance).toBe(mockInstance);
    });
  });

  it('throws when usePDFiumDocument is used outside the provider', () => {
    expect(() => {
      renderHook(() => usePDFiumDocument());
    }).toThrow('usePDFiumDocument must be used within <PDFiumProvider>');
  });

  it('throws when usePDFiumInstance is used outside the provider', () => {
    expect(() => {
      renderHook(() => usePDFiumInstance());
    }).toThrow('usePDFiumInstance must be used within <PDFiumProvider>');
  });

  it('loads a document and sets document state', async () => {
    const mockDoc = createMockDocument();
    mockInstance.openDocument.mockResolvedValue(mockDoc);

    const { result } = renderHook(() => usePDFiumDocument(), {
      wrapper: createWrapper(),
    });

    // Wait for the instance to be ready
    await waitFor(() => {
      expect(result.current.isInitialising).toBe(false);
    });

    // Load a document
    await act(async () => {
      await result.current.loadDocument(new ArrayBuffer(10), 'test.pdf');
    });

    expect(result.current.document).toBe(mockDoc);
    expect(result.current.documentName).toBe('test.pdf');
    expect(result.current.error).toBeNull();
  });

  it('handles password-required flow: submit correct password', async () => {
    const mockDoc = createMockDocument();
    mockInstance.openDocument
      .mockRejectedValueOnce(new PDFiumError(PDFiumErrorCode.DOC_PASSWORD_REQUIRED, 'Password required'))
      .mockResolvedValueOnce(mockDoc);

    const { result } = renderHook(() => usePDFiumDocument(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isInitialising).toBe(false);
    });

    // Attempt to load — triggers password required
    await act(async () => {
      await result.current.loadDocument(new ArrayBuffer(10), 'secure.pdf');
    });

    expect(result.current.password.required).toBe(true);
    expect(result.current.password.attempted).toBe(false);

    // Submit the correct password
    await act(async () => {
      await result.current.password.submit('correct-password');
    });

    expect(result.current.document).toBe(mockDoc);
    expect(result.current.password.required).toBe(false);
  });

  it('handles password-required flow: cancel', async () => {
    mockInstance.openDocument.mockRejectedValueOnce(
      new PDFiumError(PDFiumErrorCode.DOC_PASSWORD_REQUIRED, 'Password required'),
    );

    const { result } = renderHook(() => usePDFiumDocument(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isInitialising).toBe(false);
    });

    await act(async () => {
      await result.current.loadDocument(new ArrayBuffer(10), 'secure.pdf');
    });

    expect(result.current.password.required).toBe(true);

    // Cancel the password flow
    act(() => {
      result.current.password.cancel();
    });

    expect(result.current.password.required).toBe(false);
    expect(result.current.password.attempted).toBe(false);
    expect(result.current.password.error).toBeNull();
  });

  it('clears stale provider error when a new load requires a password', async () => {
    mockInstance.openDocument
      .mockRejectedValueOnce(new Error('Corrupt PDF'))
      .mockRejectedValueOnce(new PDFiumError(PDFiumErrorCode.DOC_PASSWORD_REQUIRED, 'Password required'));

    const { result } = renderHook(() => usePDFiumDocument(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isInitialising).toBe(false);
    });

    await act(async () => {
      await result.current.loadDocument(new ArrayBuffer(10), 'broken.pdf');
    });

    expect(result.current.error?.message).toBe('Corrupt PDF');

    await act(async () => {
      await result.current.loadDocument(new ArrayBuffer(10), 'secure.pdf');
    });

    expect(result.current.password.required).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('propagates errors from document loading', async () => {
    mockInstance.openDocument.mockRejectedValueOnce(new Error('Corrupt PDF'));

    const { result } = renderHook(() => usePDFiumDocument(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isInitialising).toBe(false);
    });

    await act(async () => {
      await result.current.loadDocument(new ArrayBuffer(10), 'bad.pdf');
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('Corrupt PDF');
    expect(result.current.document).toBeNull();
  });

  it('disposes the instance on unmount', async () => {
    const { result, unmount } = renderHook(() => usePDFiumInstance(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.instance).toBe(mockInstance);
    });

    unmount();

    expect(mockInstance.dispose).toHaveBeenCalled();
  });

  it('disposes the previous worker instance when workerUrl changes', async () => {
    const firstInstance = { openDocument: vi.fn(), dispose: vi.fn() };
    const secondInstance = { openDocument: vi.fn(), dispose: vi.fn() };
    mockCreate.mockResolvedValueOnce(firstInstance).mockResolvedValueOnce(secondInstance);
    const wasmBinary = new ArrayBuffer(0);

    let latest: ReturnType<typeof usePDFiumInstance> | null = null;
    function Probe() {
      latest = usePDFiumInstance();
      return null;
    }

    const { rerender, unmount } = render(
      <PDFiumProvider wasmBinary={wasmBinary} workerUrl="worker-a.js">
        <Probe />
      </PDFiumProvider>,
    );

    await waitFor(() => {
      expect(latest?.instance).toBe(firstInstance);
    });

    rerender(
      <PDFiumProvider wasmBinary={wasmBinary} workerUrl="worker-b.js">
        <Probe />
      </PDFiumProvider>,
    );

    await waitFor(() => {
      expect(latest?.instance).toBe(secondInstance);
    });

    expect(firstInstance.dispose).toHaveBeenCalledTimes(1);

    unmount();
    expect(secondInstance.dispose).toHaveBeenCalledTimes(1);
  });

  it('clears exposed instance while worker re-initialises after workerUrl change', async () => {
    const firstInstance = { openDocument: vi.fn(), dispose: vi.fn() };
    const secondInstance = { openDocument: vi.fn(), dispose: vi.fn() };

    let resolveSecondInstance!: (instance: typeof secondInstance) => void;
    const pendingSecondInstance = new Promise<typeof secondInstance>((resolve) => {
      resolveSecondInstance = resolve;
    });

    mockCreate.mockResolvedValueOnce(firstInstance).mockReturnValueOnce(pendingSecondInstance);
    const wasmBinary = new ArrayBuffer(0);

    let latestInstance: ReturnType<typeof usePDFiumInstance>['instance'] | undefined;
    let latestIsInitialising: ReturnType<typeof usePDFiumDocument>['isInitialising'] | undefined;
    function Probe() {
      latestInstance = usePDFiumInstance().instance;
      latestIsInitialising = usePDFiumDocument().isInitialising;
      return null;
    }

    const { rerender, unmount } = render(
      <PDFiumProvider wasmBinary={wasmBinary} workerUrl="worker-a.js">
        <Probe />
      </PDFiumProvider>,
    );

    await waitFor(() => {
      expect(latestInstance).toBe(firstInstance);
      expect(latestIsInitialising).toBe(false);
    });

    rerender(
      <PDFiumProvider wasmBinary={wasmBinary} workerUrl="worker-b.js">
        <Probe />
      </PDFiumProvider>,
    );

    await waitFor(() => {
      expect(firstInstance.dispose).toHaveBeenCalledTimes(1);
      expect(latestInstance).toBeNull();
      expect(latestIsInitialising).toBe(true);
    });

    await act(async () => {
      resolveSecondInstance(secondInstance);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(latestInstance).toBe(secondInstance);
      expect(latestIsInitialising).toBe(false);
    });

    unmount();
    expect(secondInstance.dispose).toHaveBeenCalledTimes(1);
  });

  it('re-initialises worker when wasmBinary prop changes', async () => {
    const firstInstance = { openDocument: vi.fn(), dispose: vi.fn() };
    const secondInstance = { openDocument: vi.fn(), dispose: vi.fn() };
    mockCreate.mockResolvedValueOnce(firstInstance).mockResolvedValueOnce(secondInstance);

    const firstBinary = Uint8Array.from([1, 2, 3]).buffer;
    const secondBinary = Uint8Array.from([4, 5, 6]).buffer;

    let latest: ReturnType<typeof usePDFiumInstance> | null = null;
    function Probe() {
      latest = usePDFiumInstance();
      return null;
    }

    const { rerender, unmount } = render(
      <PDFiumProvider wasmBinary={firstBinary} workerUrl="worker.js">
        <Probe />
      </PDFiumProvider>,
    );

    await waitFor(() => {
      expect(latest?.instance).toBe(firstInstance);
    });

    rerender(
      <PDFiumProvider wasmBinary={secondBinary} workerUrl="worker.js">
        <Probe />
      </PDFiumProvider>,
    );

    await waitFor(() => {
      expect(latest?.instance).toBe(secondInstance);
    });

    expect(firstInstance.dispose).toHaveBeenCalledTimes(1);

    unmount();
    expect(secondInstance.dispose).toHaveBeenCalledTimes(1);
  });

  it('purges caches when loading a new document over an existing one', async () => {
    const firstDoc = createMockDocument({ id: 'doc-1' });
    const secondDoc = createMockDocument({ id: 'doc-2' });
    mockInstance.openDocument.mockResolvedValueOnce(firstDoc).mockResolvedValueOnce(secondDoc);
    const stores = createPDFiumStores();

    const querySpy = vi.spyOn(stores.queryStore, 'purgeByPrefix');
    const renderSpy = vi.spyOn(stores.renderStore, 'purgeByPrefix');

    const { result } = renderHook(() => usePDFiumDocument(), {
      wrapper: createWrapper({ stores }),
    });

    await waitFor(() => {
      expect(result.current.isInitialising).toBe(false);
    });

    // Load first document
    await act(async () => {
      await result.current.loadDocument(new ArrayBuffer(10), 'first.pdf');
    });

    expect(result.current.document).toBe(firstDoc);

    // Load second document — should purge first document's caches
    await act(async () => {
      await result.current.loadDocument(new ArrayBuffer(10), 'second.pdf');
    });

    expect(querySpy).toHaveBeenCalledWith('doc-1\0');
    expect(renderSpy).toHaveBeenCalledWith('doc-1\0');
    expect(result.current.document).toBe(secondDoc);
  });

  it('clears documentName when a subsequent document load fails', async () => {
    const firstDoc = createMockDocument({ id: 'doc-ok' });
    mockInstance.openDocument.mockResolvedValueOnce(firstDoc).mockRejectedValueOnce(new Error('Corrupt PDF'));

    const { result } = renderHook(() => usePDFiumDocument(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isInitialising).toBe(false);
    });

    await act(async () => {
      await result.current.loadDocument(new ArrayBuffer(10), 'first.pdf');
    });

    expect(result.current.documentName).toBe('first.pdf');

    await act(async () => {
      await result.current.loadDocument(new ArrayBuffer(10), 'broken.pdf');
    });

    expect(result.current.document).toBeNull();
    expect(result.current.documentName).toBeNull();
    expect(result.current.error?.message).toBe('Corrupt PDF');
  });

  it('uses provider-scoped stores (isolated between providers)', async () => {
    const storesA = createPDFiumStores();
    const storesB = createPDFiumStores();

    storesA.queryStore.set('a-key', { status: 'success', data: 'a-value' });

    const { result } = renderHook(() => usePDFiumDocument(), {
      wrapper: createWrapper({ stores: storesB }),
    });

    await waitFor(() => {
      expect(result.current.isInitialising).toBe(false);
    });

    act(() => {
      result.current.invalidateCache();
    });

    // Provider B's invalidation must not affect store A
    expect(storesA.queryStore.getSnapshot('a-key')).toEqual({
      status: 'success',
      data: 'a-value',
    });
  });

  it('handles password-required flow: submit incorrect password then error', async () => {
    mockInstance.openDocument
      .mockRejectedValueOnce(new PDFiumError(PDFiumErrorCode.DOC_PASSWORD_REQUIRED, 'Password required'))
      .mockRejectedValueOnce(new PDFiumError(PDFiumErrorCode.DOC_PASSWORD_INCORRECT, 'Incorrect password'));

    const { result } = renderHook(() => usePDFiumDocument(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isInitialising).toBe(false);
    });

    // Attempt to load — triggers password required
    await act(async () => {
      await result.current.loadDocument(new ArrayBuffer(10), 'secure.pdf');
    });

    expect(result.current.password.required).toBe(true);
    expect(result.current.password.attempted).toBe(false);
    expect(result.current.password.error).toBeNull();

    // Submit an incorrect password
    await act(async () => {
      await result.current.password.submit('wrong-password');
    });

    expect(result.current.password.attempted).toBe(true);
    expect(result.current.password.error).toBe('Incorrect password');
    expect(result.current.document).toBeNull();
  });

  it('disposes document on unmount (not just worker)', async () => {
    const mockDoc = createMockDocument();
    mockInstance.openDocument.mockResolvedValue(mockDoc);

    const { result, unmount } = renderHook(() => usePDFiumDocument(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isInitialising).toBe(false);
    });

    await act(async () => {
      await result.current.loadDocument(new ArrayBuffer(10), 'test.pdf');
    });

    expect(result.current.document).toBe(mockDoc);

    unmount();

    expect(mockDoc.dispose).toHaveBeenCalled();
  });

  it('generation counter prevents race on rapid document switching', async () => {
    const staleDoc = createMockDocument({ id: 'doc-slow' });
    const fastDoc = createMockDocument({ id: 'doc-fast' });

    let resolveStale!: (value: ReturnType<typeof createMockDocument>) => void;
    const stalePromise = new Promise<ReturnType<typeof createMockDocument>>((resolve) => {
      resolveStale = resolve;
    });

    let callCount = 0;
    mockInstance.openDocument.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return stalePromise;
      return Promise.resolve(fastDoc);
    });

    const { result } = renderHook(() => usePDFiumDocument(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isInitialising).toBe(false);
    });

    // Fire both loads within a single act — the second supersedes the first
    // because loadDocumentInternal increments the generation counter.
    await act(async () => {
      // Don't await A — it stays pending (stalePromise unresolved)
      const loadA = result.current.loadDocument(new ArrayBuffer(10), 'slow.pdf');
      // B resolves immediately — sets document to fastDoc
      await result.current.loadDocument(new ArrayBuffer(10), 'fast.pdf');
      // Now resolve the stale promise — generation check should discard it
      resolveStale(staleDoc);
      await loadA;
    });

    // Document should be B (fast), not A (stale)
    expect(result.current.document).toBe(fastDoc);
    expect(result.current.documentName).toBe('fast.pdf');
    // Stale document should have been disposed
    expect(staleDoc.dispose).toHaveBeenCalled();
  });

  it('warns in __DEV__ when stores prop changes after mount', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const storesA = createPDFiumStores();
    const storesB = createPDFiumStores();
    const wasmBinary = new ArrayBuffer(0);

    // Use render() so the wrapper receives the stores prop via closure
    let currentStores = storesA;

    function TestChild() {
      usePDFiumDocument();
      return null;
    }

    const { rerender, unmount } = render(
      <PDFiumProvider wasmBinary={wasmBinary} workerUrl="worker.js" stores={currentStores}>
        <TestChild />
      </PDFiumProvider>,
    );

    expect(warnSpy).not.toHaveBeenCalledWith(expect.stringContaining('stores'));

    // Re-render the same provider with a different stores prop
    currentStores = storesB;
    rerender(
      <PDFiumProvider wasmBinary={wasmBinary} workerUrl="worker.js" stores={currentStores}>
        <TestChild />
      </PDFiumProvider>,
    );

    await waitFor(() => {
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('prop changed after initial mount'));
    });

    unmount();
  });

  it('rejects unsupported URL protocols in loadDocumentFromUrl', async () => {
    const { result } = renderHook(() => usePDFiumDocument(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isInitialising).toBe(false);
    });

    await act(async () => {
      await result.current.loadDocumentFromUrl('javascript:alert(1)', 'xss.pdf');
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toContain('Unsupported URL protocol');
    expect(result.current.document).toBeNull();
  });

  it('increments document revision via bumpDocumentRevision', async () => {
    const { result } = renderHook(() => usePDFiumDocument(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isInitialising).toBe(false);
    });

    const initialRevision = result.current.documentRevision;

    act(() => {
      result.current.bumpDocumentRevision();
    });

    expect(result.current.documentRevision).toBe(initialRevision + 1);

    act(() => {
      result.current.bumpDocumentRevision();
    });

    expect(result.current.documentRevision).toBe(initialRevision + 2);
  });
});
