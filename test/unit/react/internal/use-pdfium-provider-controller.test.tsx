import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorkerPDFium } from '../../../../src/context/worker-client.js';
import type { UsePDFiumProviderControllerOptions } from '../../../../src/react/internal/provider-config-types.js';
import type {
  ProviderPasswordValue,
  ProviderStableDocCallbacks,
} from '../../../../src/react/internal/provider-types.js';
import type { PDFiumStores } from '../../../../src/react/internal/stores-context.js';
import type {
  StartWasmBinaryFetchOptions,
  SyncResolvedBinaryFromPropOptions,
} from '../../../../src/react/internal/wasm-binary-lifecycle.js';
import type { StartWorkerInitialisationOptions } from '../../../../src/react/internal/worker-lifecycle.js';

function createMockStores(): PDFiumStores {
  return {
    queryStore: {
      clear: vi.fn(),
      purgeByPrefix: vi.fn(),
    } as unknown as PDFiumStores['queryStore'],
    renderStore: {
      clear: vi.fn(),
      purgeByPrefix: vi.fn(),
      maxEntries: 32,
    } as unknown as PDFiumStores['renderStore'],
  };
}

function createStableDocCallbacks(): ProviderStableDocCallbacks {
  return {
    bumpDocumentRevision: vi.fn(),
    invalidateCache: vi.fn(),
    loadDocument: vi.fn(async () => undefined),
    loadDocumentFromUrl: vi.fn(async () => undefined),
  };
}

function createPasswordValue(): ProviderPasswordValue {
  return {
    required: false,
    attempted: false,
    error: null,
    submit: vi.fn(async () => undefined),
    cancel: vi.fn(),
  };
}

const mockCreatePDFiumStores = vi.fn((_options?: { maxCachedPages?: number }) => createMockStores());
const mockSyncResolvedBinaryFromProp = vi.fn((_options: SyncResolvedBinaryFromPropOptions) => undefined);
const mockStartWasmBinaryFetch = vi.fn((_options: StartWasmBinaryFetchOptions) => vi.fn());
const mockStartWorkerInitialisation = vi.fn((_options: StartWorkerInitialisationOptions<WorkerPDFium>) => vi.fn());
const mockLoadInitialDocumentOnInstanceReady = vi.fn((_options?: unknown) => undefined);
const mockDisposeProviderResources = vi.fn((_options?: unknown) => undefined);
const mockUseProviderDocumentApi = vi.fn((_options?: unknown) => ({
  stableDocCallbacks: createStableDocCallbacks(),
  passwordValue: createPasswordValue(),
}));

vi.mock('../../../../src/react/internal/stores-context.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../src/react/internal/stores-context.js')>();
  return {
    ...actual,
    createPDFiumStores: (options?: { maxCachedPages?: number }) => mockCreatePDFiumStores(options),
  };
});

vi.mock('../../../../src/react/internal/wasm-binary-lifecycle.js', () => ({
  syncResolvedBinaryFromProp: (options: SyncResolvedBinaryFromPropOptions) => mockSyncResolvedBinaryFromProp(options),
  startWasmBinaryFetch: (options: StartWasmBinaryFetchOptions) => mockStartWasmBinaryFetch(options),
}));

vi.mock('../../../../src/react/internal/worker-lifecycle.js', () => ({
  startWorkerInitialisation: (options: StartWorkerInitialisationOptions<WorkerPDFium>) =>
    mockStartWorkerInitialisation(options),
}));

vi.mock('../../../../src/react/internal/provider-document-api.js', () => ({
  useProviderDocumentApi: (options?: unknown) => mockUseProviderDocumentApi(options),
}));

vi.mock('../../../../src/react/internal/provider-lifecycle.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../src/react/internal/provider-lifecycle.js')>();
  return {
    ...actual,
    loadInitialDocumentOnInstanceReady: (options?: unknown) => mockLoadInitialDocumentOnInstanceReady(options),
    disposeProviderResources: (options?: unknown) => mockDisposeProviderResources(options),
  };
});

const { usePDFiumProviderController } = await import(
  '../../../../src/react/internal/use-pdfium-provider-controller.js'
);

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('usePDFiumProviderController', () => {
  it('uses provided stores, applies maxCachedPages, and reuses one error handler across collaborators', () => {
    const stores = createMockStores();
    const wasmBinary = new ArrayBuffer(8);

    const { result } = renderHook(() =>
      usePDFiumProviderController({
        wasmBinary,
        wasmUrl: undefined,
        workerUrl: '/worker.js',
        initialDocument: undefined,
        maxCachedPages: 99,
        stores,
      }),
    );

    expect(result.current.scopedStores).toBe(stores);
    expect(stores.renderStore.maxEntries).toBe(99);
    expect(mockCreatePDFiumStores).not.toHaveBeenCalled();

    expect(mockStartWasmBinaryFetch).toHaveBeenCalledTimes(1);
    expect(mockStartWorkerInitialisation).toHaveBeenCalledTimes(1);
    expect(mockUseProviderDocumentApi).toHaveBeenCalledTimes(1);

    const wasmFetchOptions = mockStartWasmBinaryFetch.mock.calls[0]?.[0] as StartWasmBinaryFetchOptions;
    const workerOptions = mockStartWorkerInitialisation.mock
      .calls[0]?.[0] as StartWorkerInitialisationOptions<WorkerPDFium>;
    const providerApiOptions = mockUseProviderDocumentApi.mock.calls[0]?.[0] as { setError: (error: Error) => void };

    expect(wasmFetchOptions.setError).toBe(workerOptions.setError);
    expect(workerOptions.setError).toBe(providerApiOptions.setError);

    const fetchError = new Error('fetch failed');
    act(() => {
      wasmFetchOptions.setError(fetchError);
    });
    expect(result.current.error).toBe(fetchError);

    const workerError = new Error('worker failed');
    act(() => {
      workerOptions.setError(workerError);
    });
    expect(result.current.error).toBe(workerError);

    const providerError = new Error('provider failed');
    act(() => {
      providerApiOptions.setError(providerError);
    });
    expect(result.current.error).toBe(providerError);
  });

  it('captures stores on first render and ignores later stores prop changes', () => {
    const createdStores = createMockStores();
    mockCreatePDFiumStores.mockReturnValueOnce(createdStores);
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const wasmBinary = new ArrayBuffer(4);
    const nextStores = createMockStores();
    const options: UsePDFiumProviderControllerOptions = {
      wasmBinary,
      wasmUrl: undefined,
      workerUrl: '/worker.js',
      initialDocument: undefined,
      maxCachedPages: undefined,
      stores: undefined,
    };

    const { result, rerender } = renderHook(
      (props: UsePDFiumProviderControllerOptions) => usePDFiumProviderController(props),
      {
        initialProps: options,
      },
    );

    expect(result.current.scopedStores).toBe(createdStores);
    expect(mockCreatePDFiumStores).toHaveBeenCalledTimes(1);

    rerender({
      ...options,
      stores: nextStores,
    });

    expect(result.current.scopedStores).toBe(createdStores);
    expect(mockCreatePDFiumStores).toHaveBeenCalledTimes(1);
    consoleWarnSpy.mockRestore();
  });

  it('warns only once when stores prop changes after mount', () => {
    const createdStores = createMockStores();
    mockCreatePDFiumStores.mockReturnValueOnce(createdStores);
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const wasmBinary = new ArrayBuffer(4);
    const firstStores = createMockStores();
    const secondStores = createMockStores();
    const options: UsePDFiumProviderControllerOptions = {
      wasmBinary,
      wasmUrl: undefined,
      workerUrl: '/worker.js',
      initialDocument: undefined,
      maxCachedPages: undefined,
      stores: firstStores,
    };

    const { rerender } = renderHook((props: UsePDFiumProviderControllerOptions) => usePDFiumProviderController(props), {
      initialProps: options,
    });

    rerender({ ...options, stores: secondStores });
    rerender({ ...options, stores: firstStores });
    rerender({ ...options, stores: secondStores });

    expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[PDFium] The `stores` prop changed after initial mount. PDFiumProvider captures stores on first render only.',
    );
    consoleWarnSpy.mockRestore();
  });

  it('disposes provider resources on unmount with the latest worker instance ref', () => {
    const stores = createMockStores();
    const wasmBinary = new ArrayBuffer(8);
    const worker = {
      dispose: vi.fn(),
      openDocument: vi.fn(),
    } as unknown as WorkerPDFium;

    mockStartWorkerInitialisation.mockImplementationOnce((options: StartWorkerInitialisationOptions<WorkerPDFium>) => {
      options.instanceRef.current = worker;
      options.setInstance(worker);
      return vi.fn();
    });

    const { unmount } = renderHook(() =>
      usePDFiumProviderController({
        wasmBinary,
        wasmUrl: undefined,
        workerUrl: '/worker.js',
        initialDocument: undefined,
        maxCachedPages: undefined,
        stores,
      }),
    );

    unmount();

    expect(mockDisposeProviderResources).toHaveBeenCalledTimes(1);
    expect(mockDisposeProviderResources).toHaveBeenCalledWith(
      expect.objectContaining({
        document: null,
        instance: worker,
        scopedStores: stores,
      }),
    );
  });

  it('guards collaborator callbacks after unmount to avoid late state updates', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const { unmount } = renderHook(() =>
      usePDFiumProviderController({
        wasmBinary: new ArrayBuffer(8),
        wasmUrl: undefined,
        workerUrl: '/worker.js',
        initialDocument: undefined,
        maxCachedPages: undefined,
        stores: createMockStores(),
      }),
    );

    const wasmFetchOptions = mockStartWasmBinaryFetch.mock.calls[0]?.[0] as StartWasmBinaryFetchOptions;
    const workerOptions = mockStartWorkerInitialisation.mock
      .calls[0]?.[0] as StartWorkerInitialisationOptions<WorkerPDFium>;
    const providerApiOptions = mockUseProviderDocumentApi.mock.calls[0]?.[0] as { setError: (error: Error) => void };

    unmount();

    act(() => {
      wasmFetchOptions.setResolvedBinary(new ArrayBuffer(2));
      wasmFetchOptions.setIsInitialising(false);
      wasmFetchOptions.setError(new Error('late wasm error'));
      workerOptions.setInstance(null);
      workerOptions.setIsInitialising(false);
      workerOptions.setError(new Error('late worker error'));
      providerApiOptions.setError(new Error('late provider error'));
    });

    expect(consoleErrorSpy).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('isolates stale async callbacks across unmount/remount cycles', () => {
    const sharedStores = createMockStores();

    const first = renderHook(() =>
      usePDFiumProviderController({
        wasmBinary: new ArrayBuffer(8),
        wasmUrl: undefined,
        workerUrl: '/worker.js',
        initialDocument: undefined,
        maxCachedPages: undefined,
        stores: sharedStores,
      }),
    );
    const firstWasmOptions = mockStartWasmBinaryFetch.mock.calls[0]?.[0] as StartWasmBinaryFetchOptions;
    first.unmount();

    const second = renderHook(() =>
      usePDFiumProviderController({
        wasmBinary: new ArrayBuffer(8),
        wasmUrl: undefined,
        workerUrl: '/worker.js',
        initialDocument: undefined,
        maxCachedPages: undefined,
        stores: sharedStores,
      }),
    );
    const secondWasmOptions = mockStartWasmBinaryFetch.mock.calls[1]?.[0] as StartWasmBinaryFetchOptions;

    act(() => {
      firstWasmOptions.setError(new Error('stale mount error'));
    });
    expect(second.result.current.error).toBeNull();

    const activeError = new Error('active mount error');
    act(() => {
      secondWasmOptions.setError(activeError);
    });
    expect(second.result.current.error).toBe(activeError);
  });

  it('uses timer-driven scheduling to ignore stale callbacks from a previous mount', () => {
    vi.useFakeTimers();

    const sharedStores = createMockStores();
    const first = renderHook(() =>
      usePDFiumProviderController({
        wasmBinary: new ArrayBuffer(8),
        wasmUrl: undefined,
        workerUrl: '/worker.js',
        initialDocument: undefined,
        maxCachedPages: undefined,
        stores: sharedStores,
      }),
    );
    const firstWasmOptions = mockStartWasmBinaryFetch.mock.calls[0]?.[0] as StartWasmBinaryFetchOptions;
    first.unmount();

    const second = renderHook(() =>
      usePDFiumProviderController({
        wasmBinary: new ArrayBuffer(8),
        wasmUrl: undefined,
        workerUrl: '/worker.js',
        initialDocument: undefined,
        maxCachedPages: undefined,
        stores: sharedStores,
      }),
    );
    const secondWasmOptions = mockStartWasmBinaryFetch.mock.calls[1]?.[0] as StartWasmBinaryFetchOptions;

    setTimeout(() => {
      firstWasmOptions.setError(new Error('stale timer error'));
    }, 25);
    act(() => {
      vi.advanceTimersByTime(25);
    });

    expect(second.result.current.error).toBeNull();

    const activeError = new Error('active timer error');
    setTimeout(() => {
      secondWasmOptions.setError(activeError);
    }, 10);
    act(() => {
      vi.advanceTimersByTime(10);
    });

    expect(second.result.current.error).toBe(activeError);
    vi.useRealTimers();
  });

  it('cleans provider resources across repeated mount/unmount cycles', () => {
    const runCycle = () => {
      const cycle = renderHook(() =>
        usePDFiumProviderController({
          wasmBinary: new ArrayBuffer(8),
          wasmUrl: undefined,
          workerUrl: '/worker.js',
          initialDocument: undefined,
          maxCachedPages: undefined,
          stores: createMockStores(),
        }),
      );
      cycle.unmount();
    };

    runCycle();
    runCycle();
    runCycle();

    expect(mockDisposeProviderResources).toHaveBeenCalledTimes(3);
  });

  it('disposes a newly opened stale document when load resolves after unmount', async () => {
    const stores = createMockStores();
    const staleDocument = {
      id: 'stale-doc',
      dispose: vi.fn().mockResolvedValue(undefined),
    };
    const pendingOpen = deferred<typeof staleDocument>();
    const worker = {
      openDocument: vi.fn().mockReturnValue(pendingOpen.promise),
      dispose: vi.fn(),
    } as unknown as WorkerPDFium;

    const hook = renderHook(() =>
      usePDFiumProviderController({
        wasmBinary: new ArrayBuffer(8),
        wasmUrl: undefined,
        workerUrl: '/worker.js',
        initialDocument: undefined,
        maxCachedPages: undefined,
        stores,
      }),
    );

    const providerApiOptions = mockUseProviderDocumentApi.mock.calls[0]?.[0] as {
      loadDocumentInternal: (
        instance: WorkerPDFium,
        data: ArrayBuffer | Uint8Array,
        name: string,
        password?: string,
      ) => Promise<void>;
    };

    const inFlightLoad = providerApiOptions.loadDocumentInternal(worker, new Uint8Array([1, 2, 3]), 'stale.pdf');

    hook.unmount();

    pendingOpen.resolve(staleDocument);
    await inFlightLoad;

    expect(staleDocument.dispose).toHaveBeenCalledTimes(1);
  });

  it('disposes stale load results when worker instance changes mid-load', async () => {
    const stores = createMockStores();
    const staleDocument = {
      id: 'stale-doc',
      dispose: vi.fn().mockResolvedValue(undefined),
    };
    const pendingOpen = deferred<typeof staleDocument>();
    const oldWorker = {
      openDocument: vi.fn().mockReturnValue(pendingOpen.promise),
      dispose: vi.fn(),
    } as unknown as WorkerPDFium;
    const nextWorker = {
      openDocument: vi.fn(),
      dispose: vi.fn(),
    } as unknown as WorkerPDFium;

    renderHook(() =>
      usePDFiumProviderController({
        wasmBinary: new ArrayBuffer(8),
        wasmUrl: undefined,
        workerUrl: '/worker.js',
        initialDocument: undefined,
        maxCachedPages: undefined,
        stores,
      }),
    );

    const providerApiOptions = mockUseProviderDocumentApi.mock.calls[0]?.[0] as {
      loadDocumentInternal: (
        instance: WorkerPDFium,
        data: ArrayBuffer | Uint8Array,
        name: string,
        password?: string,
      ) => Promise<void>;
    };
    const workerOptions = mockStartWorkerInitialisation.mock
      .calls[0]?.[0] as StartWorkerInitialisationOptions<WorkerPDFium>;

    const inFlightLoad = providerApiOptions.loadDocumentInternal(oldWorker, new Uint8Array([9, 9, 9]), 'old.pdf');

    act(() => {
      workerOptions.setInstance(nextWorker);
    });

    pendingOpen.resolve(staleDocument);
    await inFlightLoad;

    expect(staleDocument.dispose).toHaveBeenCalledTimes(1);
  });

  it('does not self-invalidate initial document load when worker instance becomes ready', async () => {
    const stores = createMockStores();
    const openedDocument = {
      id: 'initial-doc',
      dispose: vi.fn().mockResolvedValue(undefined),
    };
    const worker = {
      openDocument: vi.fn().mockResolvedValue(openedDocument),
      dispose: vi.fn(),
    } as unknown as WorkerPDFium;

    mockStartWorkerInitialisation.mockImplementation((options: StartWorkerInitialisationOptions<WorkerPDFium>) => {
      options.instanceRef.current = worker;
      options.setInstance(worker);
      return vi.fn();
    });

    mockLoadInitialDocumentOnInstanceReady.mockImplementation((options?: unknown) => {
      const typedOptions = options as {
        instance: WorkerPDFium | null;
        initialDocument: { data: ArrayBuffer; name: string } | null | undefined;
        loadDocumentInternal: (
          instance: WorkerPDFium,
          data: ArrayBuffer | Uint8Array,
          name: string,
          password?: string,
        ) => Promise<void>;
      };
      if (!typedOptions.instance || !typedOptions.initialDocument) return;
      void typedOptions.loadDocumentInternal(
        typedOptions.instance,
        typedOptions.initialDocument.data,
        typedOptions.initialDocument.name,
      );
    });

    const initialDocument = {
      data: new Uint8Array([1, 2, 3]),
      name: 'initial.pdf',
    };

    const { result } = renderHook(() =>
      usePDFiumProviderController({
        wasmBinary: new ArrayBuffer(8),
        wasmUrl: undefined,
        workerUrl: '/worker.js',
        initialDocument,
        maxCachedPages: undefined,
        stores,
      }),
    );

    await waitFor(() => {
      expect(worker.openDocument).toHaveBeenCalledWith(initialDocument.data, {});
      expect(result.current.document).toBe(openedDocument);
    });

    expect(openedDocument.dispose).not.toHaveBeenCalled();
  });

  it('does not start worker initialisation until a binary is resolved', () => {
    renderHook(() =>
      usePDFiumProviderController({
        wasmBinary: undefined,
        wasmUrl: undefined,
        workerUrl: '/worker.js',
        initialDocument: undefined,
        maxCachedPages: undefined,
        stores: createMockStores(),
      }),
    );

    expect(mockStartWasmBinaryFetch).toHaveBeenCalledTimes(1);
    expect(mockStartWorkerInitialisation).not.toHaveBeenCalled();
  });

  it('exposes a wasm URL binary fetch callback that delegates to fetch', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(new Uint8Array([1, 2, 3]), { status: 200 }));

    renderHook(() =>
      usePDFiumProviderController({
        wasmBinary: undefined,
        wasmUrl: 'https://example.com/pdfium.wasm',
        workerUrl: '/worker.js',
        initialDocument: undefined,
        maxCachedPages: undefined,
        stores: createMockStores(),
      }),
    );

    const wasmFetchOptions = mockStartWasmBinaryFetch.mock.calls[0]?.[0] as StartWasmBinaryFetchOptions;
    await wasmFetchOptions.fetchBinaryFromUrl?.('https://example.com/pdfium.wasm', new AbortController().signal);

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://example.com/pdfium.wasm',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    fetchSpy.mockRestore();
  });

  it('warns when disposing previous document fails during a subsequent load', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const stores = createMockStores();
    const firstDoc = { id: 'doc-1', dispose: vi.fn().mockRejectedValue(new Error('dispose old failed')) };
    const secondDoc = { id: 'doc-2', dispose: vi.fn().mockResolvedValue(undefined) };
    const worker = {
      openDocument: vi
        .fn()
        .mockResolvedValueOnce(firstDoc as never)
        .mockResolvedValueOnce(secondDoc as never),
      dispose: vi.fn(),
    } as unknown as WorkerPDFium;

    renderHook(() =>
      usePDFiumProviderController({
        wasmBinary: new ArrayBuffer(8),
        wasmUrl: undefined,
        workerUrl: '/worker.js',
        initialDocument: undefined,
        maxCachedPages: undefined,
        stores,
      }),
    );

    const providerApiOptions = mockUseProviderDocumentApi.mock.calls[0]?.[0] as {
      loadDocumentInternal: (
        instance: WorkerPDFium,
        data: ArrayBuffer | Uint8Array,
        name: string,
        password?: string,
      ) => Promise<void>;
    };

    await providerApiOptions.loadDocumentInternal(worker, new Uint8Array([1]), 'one.pdf');
    await providerApiOptions.loadDocumentInternal(worker, new Uint8Array([2]), 'two.pdf');

    expect(warnSpy).toHaveBeenCalledWith('[PDFium] Failed to dispose previous document:', expect.any(Error));
    warnSpy.mockRestore();
  });

  it('logs unmount disposal warnings when dispose callbacks report errors', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    mockDisposeProviderResources.mockImplementationOnce((options?: unknown) => {
      const typed = options as {
        onDocumentDisposeError: (error: Error) => void;
        onInstanceDisposeError: (error: Error) => void;
      };
      typed.onDocumentDisposeError(new Error('doc dispose failed'));
      typed.onInstanceDisposeError(new Error('instance dispose failed'));
    });

    const { unmount } = renderHook(() =>
      usePDFiumProviderController({
        wasmBinary: new ArrayBuffer(8),
        wasmUrl: undefined,
        workerUrl: '/worker.js',
        initialDocument: undefined,
        maxCachedPages: undefined,
        stores: createMockStores(),
      }),
    );

    unmount();

    expect(warnSpy).toHaveBeenCalledWith('[PDFium] Failed to dispose document on unmount:', expect.any(Error));
    expect(warnSpy).toHaveBeenCalledWith('[PDFium] Failed to dispose worker instance on unmount:', expect.any(Error));
    warnSpy.mockRestore();
  });

  it('guards lifecycle callbacks when loadDocumentInternal is invoked after unmount', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const stores = createMockStores();
    const openedDocument = { id: 'late-doc', dispose: vi.fn().mockResolvedValue(undefined) };
    const worker = {
      openDocument: vi.fn().mockResolvedValue(openedDocument),
      dispose: vi.fn(),
    } as unknown as WorkerPDFium;

    const hook = renderHook(() =>
      usePDFiumProviderController({
        wasmBinary: new ArrayBuffer(8),
        wasmUrl: undefined,
        workerUrl: '/worker.js',
        initialDocument: undefined,
        maxCachedPages: undefined,
        stores,
      }),
    );

    const providerApiOptions = mockUseProviderDocumentApi.mock.calls[0]?.[0] as {
      loadDocumentInternal: (
        instance: WorkerPDFium,
        data: ArrayBuffer | Uint8Array,
        name: string,
        password?: string,
      ) => Promise<void>;
    };

    hook.unmount();
    await providerApiOptions.loadDocumentInternal(worker, new Uint8Array([9, 8, 7]), 'late.pdf');

    expect(worker.openDocument).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});
