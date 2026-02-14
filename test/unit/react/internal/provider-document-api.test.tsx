import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { WorkerPDFium } from '../../../../src/context/worker-client.js';
import {
  type DocumentLifecycleAction,
  INITIAL_DOCUMENT_LIFECYCLE_STATE,
} from '../../../../src/react/internal/document-lifecycle.js';
import { useProviderDocumentApi } from '../../../../src/react/internal/provider-document-api.js';
import { createPDFiumStores } from '../../../../src/react/internal/stores-context.js';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function createOptions(overrides?: Partial<Parameters<typeof useProviderDocumentApi>[0]>) {
  const stores = createPDFiumStores();
  return {
    instance: null,
    documentLifecycle: INITIAL_DOCUMENT_LIFECYCLE_STATE,
    dispatchDocumentLifecycle: vi.fn((_action: DocumentLifecycleAction) => undefined),
    scopedStores: stores,
    loadDocumentInternal: vi.fn(async () => undefined),
    loadDocumentBufferFromUrl: vi.fn(async (_url: string, _signal?: AbortSignal) => new ArrayBuffer(8)),
    setDocumentRevision: vi.fn((_updater: (prev: number) => number) => undefined),
    setError: vi.fn((_error: Error) => undefined),
    ...overrides,
  };
}

describe('useProviderDocumentApi', () => {
  it('throws when loading a document without an initialised worker', async () => {
    const options = createOptions();
    const { result } = renderHook(() => useProviderDocumentApi(options));

    await expect(result.current.stableDocCallbacks.loadDocument(new ArrayBuffer(8), 'test.pdf')).rejects.toThrow(
      'PDFium not initialised',
    );
  });

  it('loads a document via loadDocumentInternal when worker is available', async () => {
    const instance = { kind: 'worker' } as unknown as WorkerPDFium;
    const loadDocumentInternal = vi.fn(async () => undefined);
    const options = createOptions({ instance, loadDocumentInternal });
    const { result } = renderHook(() => useProviderDocumentApi(options));

    await result.current.stableDocCallbacks.loadDocument(new ArrayBuffer(8), 'a.pdf');

    expect(loadDocumentInternal).toHaveBeenCalledWith(instance, expect.any(ArrayBuffer), 'a.pdf');
  });

  it('ignores stale loadDocument callback after unmount', async () => {
    const instance = { kind: 'worker' } as unknown as WorkerPDFium;
    const loadDocumentInternal = vi.fn(async () => undefined);
    const options = createOptions({ instance, loadDocumentInternal });
    const { result, unmount } = renderHook(() => useProviderDocumentApi(options));

    const staleLoadDocument = result.current.stableDocCallbacks.loadDocument;
    unmount();

    await staleLoadDocument(new ArrayBuffer(4), 'stale.pdf');

    expect(loadDocumentInternal).not.toHaveBeenCalled();
  });

  it('ignores a stale loadDocument callback after worker instance swap', async () => {
    const firstInstance = { kind: 'worker-a' } as unknown as WorkerPDFium;
    const secondInstance = { kind: 'worker-b' } as unknown as WorkerPDFium;
    const loadDocumentInternal = vi.fn(async () => undefined);

    const { result, rerender } = renderHook(
      (instance: WorkerPDFium | null) =>
        useProviderDocumentApi(
          createOptions({
            instance,
            loadDocumentInternal,
          }),
        ),
      { initialProps: firstInstance as WorkerPDFium | null },
    );

    const staleLoadDocument = result.current.stableDocCallbacks.loadDocument;
    rerender(secondInstance);

    await staleLoadDocument(new ArrayBuffer(4), 'old.pdf');

    expect(loadDocumentInternal).not.toHaveBeenCalledWith(firstInstance, expect.any(ArrayBuffer), 'old.pdf');
    expect(loadDocumentInternal).not.toHaveBeenCalledWith(secondInstance, expect.any(ArrayBuffer), 'old.pdf');
  });

  it('loads document from URL via buffer loader then loadDocumentInternal', async () => {
    const instance = { kind: 'worker' } as unknown as WorkerPDFium;
    const loadDocumentBufferFromUrl = vi.fn(async () => new ArrayBuffer(16));
    const loadDocumentInternal = vi.fn(async () => undefined);
    const options = createOptions({ instance, loadDocumentBufferFromUrl, loadDocumentInternal });
    const { result } = renderHook(() => useProviderDocumentApi(options));

    await result.current.stableDocCallbacks.loadDocumentFromUrl('https://example.com/a.pdf', 'a.pdf');

    expect(loadDocumentBufferFromUrl).toHaveBeenCalledWith('https://example.com/a.pdf', expect.any(AbortSignal));
    expect(loadDocumentInternal).toHaveBeenCalledWith(instance, expect.any(ArrayBuffer), 'a.pdf');
  });

  it('ignores stale loadDocumentFromUrl callback after unmount', async () => {
    const instance = { kind: 'worker' } as unknown as WorkerPDFium;
    const loadDocumentBufferFromUrl = vi.fn(async () => new ArrayBuffer(16));
    const loadDocumentInternal = vi.fn(async () => undefined);
    const options = createOptions({ instance, loadDocumentBufferFromUrl, loadDocumentInternal });
    const { result, unmount } = renderHook(() => useProviderDocumentApi(options));

    const staleLoadDocumentFromUrl = result.current.stableDocCallbacks.loadDocumentFromUrl;
    unmount();

    await staleLoadDocumentFromUrl('https://example.com/stale.pdf', 'stale.pdf');

    expect(loadDocumentBufferFromUrl).not.toHaveBeenCalled();
    expect(loadDocumentInternal).not.toHaveBeenCalled();
  });

  it('reports URL loading errors via setError', async () => {
    const instance = { kind: 'worker' } as unknown as WorkerPDFium;
    const loadDocumentBufferFromUrl = vi.fn(async () => {
      throw 'boom';
    });
    const setError = vi.fn();
    const options = createOptions({ instance, loadDocumentBufferFromUrl, setError });
    const { result } = renderHook(() => useProviderDocumentApi(options));

    await result.current.stableDocCallbacks.loadDocumentFromUrl('https://example.com/a.pdf', 'a.pdf');

    expect(setError).toHaveBeenCalledTimes(1);
    expect(setError.mock.calls[0]?.[0]).toBeInstanceOf(Error);
    expect((setError.mock.calls[0]?.[0] as Error).message).toContain('boom');
  });

  it('clears caches and bumps revision on invalidateCache', () => {
    const stores = createPDFiumStores();
    const queryClearSpy = vi.spyOn(stores.queryStore, 'clear');
    const renderClearSpy = vi.spyOn(stores.renderStore, 'clear');
    const setDocumentRevision = vi.fn((_updater: (prev: number) => number) => undefined);
    const options = createOptions({ scopedStores: stores, setDocumentRevision });
    const { result } = renderHook(() => useProviderDocumentApi(options));

    result.current.stableDocCallbacks.invalidateCache();

    expect(queryClearSpy).toHaveBeenCalledTimes(1);
    expect(renderClearSpy).toHaveBeenCalledTimes(1);
    expect(setDocumentRevision).toHaveBeenCalledTimes(1);
  });

  it('submits password using pending document request', async () => {
    const instance = { kind: 'worker' } as unknown as WorkerPDFium;
    const dispatchDocumentLifecycle = vi.fn((_action: DocumentLifecycleAction) => undefined);
    const loadDocumentInternal = vi.fn(async () => undefined);
    const options = createOptions({
      instance,
      dispatchDocumentLifecycle,
      loadDocumentInternal,
      documentLifecycle: {
        ...INITIAL_DOCUMENT_LIFECYCLE_STATE,
        pendingDocument: { data: new ArrayBuffer(12), name: 'secure.pdf' },
        password: { required: true, attempted: false, error: null },
      },
    });
    const { result } = renderHook(() => useProviderDocumentApi(options));

    await result.current.passwordValue.submit('secret');

    expect(dispatchDocumentLifecycle).toHaveBeenCalledWith({ type: 'passwordSubmit' });
    expect(loadDocumentInternal).toHaveBeenCalledWith(
      instance,
      options.documentLifecycle.pendingDocument?.data,
      'secure.pdf',
      'secret',
    );
  });

  it('ignores a stale password submit callback after worker instance swap', async () => {
    const firstInstance = { kind: 'worker-a' } as unknown as WorkerPDFium;
    const secondInstance = { kind: 'worker-b' } as unknown as WorkerPDFium;
    const dispatchDocumentLifecycle = vi.fn((_action: DocumentLifecycleAction) => undefined);
    const loadDocumentInternal = vi.fn(async () => undefined);
    const pendingDocument = { data: new ArrayBuffer(12), name: 'secure.pdf' };

    const { result, rerender } = renderHook(
      ({ instance, hasPending }: { instance: WorkerPDFium | null; hasPending: boolean }) =>
        useProviderDocumentApi(
          createOptions({
            instance,
            dispatchDocumentLifecycle,
            loadDocumentInternal,
            documentLifecycle: {
              ...INITIAL_DOCUMENT_LIFECYCLE_STATE,
              pendingDocument: hasPending ? pendingDocument : null,
              password: { required: hasPending, attempted: false, error: null },
            },
          }),
        ),
      { initialProps: { instance: firstInstance as WorkerPDFium | null, hasPending: true } },
    );

    const staleSubmit = result.current.passwordValue.submit;
    rerender({ instance: secondInstance as WorkerPDFium | null, hasPending: false });

    await staleSubmit('secret');

    expect(dispatchDocumentLifecycle).not.toHaveBeenCalledWith({ type: 'passwordSubmit' });
    expect(loadDocumentInternal).not.toHaveBeenCalled();
  });

  it('no-ops password submit when pending document is missing', async () => {
    const instance = { kind: 'worker' } as unknown as WorkerPDFium;
    const dispatchDocumentLifecycle = vi.fn((_action: DocumentLifecycleAction) => undefined);
    const loadDocumentInternal = vi.fn(async () => undefined);
    const options = createOptions({
      instance,
      dispatchDocumentLifecycle,
      loadDocumentInternal,
    });
    const { result } = renderHook(() => useProviderDocumentApi(options));

    await result.current.passwordValue.submit('secret');

    expect(dispatchDocumentLifecycle).not.toHaveBeenCalled();
    expect(loadDocumentInternal).not.toHaveBeenCalled();
  });

  it('dispatches password cancel action', () => {
    const dispatchDocumentLifecycle = vi.fn((_action: DocumentLifecycleAction) => undefined);
    const options = createOptions({
      dispatchDocumentLifecycle,
      documentLifecycle: {
        ...INITIAL_DOCUMENT_LIFECYCLE_STATE,
        pendingDocument: { data: new ArrayBuffer(8), name: 'secure.pdf' },
        password: { required: true, attempted: false, error: null },
      },
    });
    const { result } = renderHook(() => useProviderDocumentApi(options));

    result.current.passwordValue.cancel();

    expect(dispatchDocumentLifecycle).toHaveBeenCalledWith({ type: 'passwordCancel' });
  });

  it('ignores stale password cancel callback after pending request changes', () => {
    const dispatchDocumentLifecycle = vi.fn((_action: DocumentLifecycleAction) => undefined);
    const { result, rerender } = renderHook(
      ({ pendingName }: { pendingName: string }) =>
        useProviderDocumentApi(
          createOptions({
            dispatchDocumentLifecycle,
            documentLifecycle: {
              ...INITIAL_DOCUMENT_LIFECYCLE_STATE,
              pendingDocument: { data: new ArrayBuffer(12), name: pendingName },
              password: { required: true, attempted: false, error: null },
            },
          }),
        ),
      { initialProps: { pendingName: 'a.pdf' } },
    );

    const staleCancel = result.current.passwordValue.cancel;
    rerender({ pendingName: 'b.pdf' });

    staleCancel();
    expect(dispatchDocumentLifecycle).not.toHaveBeenCalledWith({ type: 'passwordCancel' });

    result.current.passwordValue.cancel();
    expect(dispatchDocumentLifecycle).toHaveBeenCalledWith({ type: 'passwordCancel' });
  });

  it('ignores stale URL-load failures after a newer request succeeds', async () => {
    const instance = { kind: 'worker' } as unknown as WorkerPDFium;
    const first = deferred<ArrayBuffer>();
    const loadDocumentBufferFromUrl = vi
      .fn()
      .mockReturnValueOnce(first.promise)
      .mockResolvedValueOnce(new ArrayBuffer(32));
    const loadDocumentInternal = vi.fn(async () => undefined);
    const setError = vi.fn();
    const options = createOptions({
      instance,
      loadDocumentBufferFromUrl,
      loadDocumentInternal,
      setError,
    });
    const { result } = renderHook(() => useProviderDocumentApi(options));

    const staleCall = result.current.stableDocCallbacks.loadDocumentFromUrl('https://example.com/old.pdf', 'old.pdf');
    await result.current.stableDocCallbacks.loadDocumentFromUrl('https://example.com/new.pdf', 'new.pdf');

    first.reject(new Error('stale url failure'));
    await staleCall;

    expect(loadDocumentInternal).toHaveBeenCalledTimes(1);
    expect(loadDocumentInternal).toHaveBeenCalledWith(instance, expect.any(ArrayBuffer), 'new.pdf');
    expect(setError).not.toHaveBeenCalled();
  });

  it('aborts stale URL fetch when a newer URL load starts', async () => {
    const instance = { kind: 'worker' } as unknown as WorkerPDFium;
    const first = deferred<ArrayBuffer>();
    let firstSignal: AbortSignal | undefined;

    const loadDocumentBufferFromUrl = vi.fn((url: string, signal?: AbortSignal) => {
      if (url.endsWith('old.pdf')) {
        firstSignal = signal;
        signal?.addEventListener(
          'abort',
          () => {
            first.reject(new DOMException('aborted', 'AbortError'));
          },
          { once: true },
        );
        return first.promise;
      }
      return Promise.resolve(new ArrayBuffer(24));
    });

    const loadDocumentInternal = vi.fn(async () => undefined);
    const setError = vi.fn();
    const options = createOptions({
      instance,
      loadDocumentBufferFromUrl,
      loadDocumentInternal,
      setError,
    });
    const { result } = renderHook(() => useProviderDocumentApi(options));

    const staleCall = result.current.stableDocCallbacks.loadDocumentFromUrl('https://example.com/old.pdf', 'old.pdf');
    await result.current.stableDocCallbacks.loadDocumentFromUrl('https://example.com/new.pdf', 'new.pdf');
    await staleCall;

    expect(firstSignal).toBeDefined();
    expect(firstSignal?.aborted).toBe(true);
    expect(loadDocumentInternal).toHaveBeenCalledTimes(1);
    expect(loadDocumentInternal).toHaveBeenCalledWith(instance, expect.any(ArrayBuffer), 'new.pdf');
    expect(setError).not.toHaveBeenCalled();
  });

  it('aborts stale URL fetch when direct load starts', async () => {
    const instance = { kind: 'worker' } as unknown as WorkerPDFium;
    const pendingBuffer = deferred<ArrayBuffer>();
    let staleSignal: AbortSignal | undefined;
    const loadDocumentBufferFromUrl = vi.fn((_url: string, signal?: AbortSignal) => {
      staleSignal = signal;
      signal?.addEventListener(
        'abort',
        () => {
          pendingBuffer.reject(new DOMException('aborted', 'AbortError'));
        },
        { once: true },
      );
      return pendingBuffer.promise;
    });
    const loadDocumentInternal = vi.fn(async () => undefined);
    const setError = vi.fn();
    const options = createOptions({
      instance,
      loadDocumentBufferFromUrl,
      loadDocumentInternal,
      setError,
    });
    const { result } = renderHook(() => useProviderDocumentApi(options));

    const staleUrlCall = result.current.stableDocCallbacks.loadDocumentFromUrl(
      'https://example.com/old.pdf',
      'old.pdf',
    );
    await result.current.stableDocCallbacks.loadDocument(new ArrayBuffer(16), 'new-direct.pdf');
    await staleUrlCall;

    expect(staleSignal).toBeDefined();
    expect(staleSignal?.aborted).toBe(true);
    expect(loadDocumentInternal).toHaveBeenCalledTimes(1);
    expect(loadDocumentInternal).toHaveBeenCalledWith(instance, expect.any(ArrayBuffer), 'new-direct.pdf');
    expect(setError).not.toHaveBeenCalled();
  });

  it('ignores a URL-load completion from a stale worker instance after instance swap', async () => {
    const firstInstance = { kind: 'worker-a' } as unknown as WorkerPDFium;
    const secondInstance = { kind: 'worker-b' } as unknown as WorkerPDFium;
    const pendingBuffer = deferred<ArrayBuffer>();
    const loadDocumentBufferFromUrl = vi.fn().mockReturnValue(pendingBuffer.promise);
    const loadDocumentInternal = vi.fn(async () => undefined);
    const setError = vi.fn();

    const { result, rerender } = renderHook(
      (instance: WorkerPDFium | null) =>
        useProviderDocumentApi(
          createOptions({
            instance,
            loadDocumentBufferFromUrl,
            loadDocumentInternal,
            setError,
          }),
        ),
      { initialProps: firstInstance as WorkerPDFium | null },
    );

    const staleCall = result.current.stableDocCallbacks.loadDocumentFromUrl('https://example.com/old.pdf', 'old.pdf');

    rerender(secondInstance);

    pendingBuffer.resolve(new ArrayBuffer(64));
    await staleCall;

    expect(loadDocumentInternal).not.toHaveBeenCalledWith(firstInstance, expect.any(ArrayBuffer), 'old.pdf');
    expect(loadDocumentInternal).not.toHaveBeenCalledWith(secondInstance, expect.any(ArrayBuffer), 'old.pdf');
    expect(setError).not.toHaveBeenCalled();
  });

  it('ignores stale URL-load completion after a newer direct load starts', async () => {
    const instance = { kind: 'worker' } as unknown as WorkerPDFium;
    const pendingBuffer = deferred<ArrayBuffer>();
    const loadDocumentBufferFromUrl = vi.fn().mockReturnValue(pendingBuffer.promise);
    const loadDocumentInternal = vi.fn(async () => undefined);
    const options = createOptions({
      instance,
      loadDocumentBufferFromUrl,
      loadDocumentInternal,
    });
    const { result } = renderHook(() => useProviderDocumentApi(options));

    const staleUrlCall = result.current.stableDocCallbacks.loadDocumentFromUrl(
      'https://example.com/old.pdf',
      'old.pdf',
    );
    await result.current.stableDocCallbacks.loadDocument(new ArrayBuffer(16), 'new-direct.pdf');

    pendingBuffer.resolve(new ArrayBuffer(64));
    await staleUrlCall;

    expect(loadDocumentInternal).toHaveBeenCalledTimes(1);
    expect(loadDocumentInternal).toHaveBeenCalledWith(instance, expect.any(ArrayBuffer), 'new-direct.pdf');
  });

  it('ignores stale URL-load failure after a newer direct load starts', async () => {
    const instance = { kind: 'worker' } as unknown as WorkerPDFium;
    const pendingBuffer = deferred<ArrayBuffer>();
    const loadDocumentBufferFromUrl = vi.fn().mockReturnValue(pendingBuffer.promise);
    const loadDocumentInternal = vi.fn(async () => undefined);
    const setError = vi.fn();
    const options = createOptions({
      instance,
      loadDocumentBufferFromUrl,
      loadDocumentInternal,
      setError,
    });
    const { result } = renderHook(() => useProviderDocumentApi(options));

    const staleUrlCall = result.current.stableDocCallbacks.loadDocumentFromUrl(
      'https://example.com/old.pdf',
      'old.pdf',
    );
    await result.current.stableDocCallbacks.loadDocument(new ArrayBuffer(16), 'new-direct.pdf');

    pendingBuffer.reject(new Error('stale url failure'));
    await staleUrlCall;

    expect(loadDocumentInternal).toHaveBeenCalledTimes(1);
    expect(loadDocumentInternal).toHaveBeenCalledWith(instance, expect.any(ArrayBuffer), 'new-direct.pdf');
    expect(setError).not.toHaveBeenCalled();
  });

  it('ignores stale URL-load completion after password submit starts a newer load', async () => {
    const instance = { kind: 'worker' } as unknown as WorkerPDFium;
    const pendingBuffer = deferred<ArrayBuffer>();
    const loadDocumentBufferFromUrl = vi.fn().mockReturnValue(pendingBuffer.promise);
    const loadDocumentInternal = vi.fn(async () => undefined);
    const options = createOptions({
      instance,
      loadDocumentBufferFromUrl,
      loadDocumentInternal,
      documentLifecycle: {
        ...INITIAL_DOCUMENT_LIFECYCLE_STATE,
        pendingDocument: { data: new ArrayBuffer(12), name: 'secure.pdf' },
        password: { required: true, attempted: false, error: null },
      },
    });
    const { result } = renderHook(() => useProviderDocumentApi(options));

    const staleUrlCall = result.current.stableDocCallbacks.loadDocumentFromUrl(
      'https://example.com/old.pdf',
      'old.pdf',
    );
    await result.current.passwordValue.submit('secret');

    pendingBuffer.resolve(new ArrayBuffer(64));
    await staleUrlCall;

    expect(loadDocumentInternal).toHaveBeenCalledTimes(1);
    expect(loadDocumentInternal).toHaveBeenCalledWith(
      instance,
      options.documentLifecycle.pendingDocument?.data,
      'secure.pdf',
      'secret',
    );
  });

  it('ignores stale URL-load failure after password submit starts a newer load', async () => {
    const instance = { kind: 'worker' } as unknown as WorkerPDFium;
    const pendingBuffer = deferred<ArrayBuffer>();
    const loadDocumentBufferFromUrl = vi.fn().mockReturnValue(pendingBuffer.promise);
    const loadDocumentInternal = vi.fn(async () => undefined);
    const setError = vi.fn();
    const options = createOptions({
      instance,
      loadDocumentBufferFromUrl,
      loadDocumentInternal,
      setError,
      documentLifecycle: {
        ...INITIAL_DOCUMENT_LIFECYCLE_STATE,
        pendingDocument: { data: new ArrayBuffer(12), name: 'secure.pdf' },
        password: { required: true, attempted: false, error: null },
      },
    });
    const { result } = renderHook(() => useProviderDocumentApi(options));

    const staleUrlCall = result.current.stableDocCallbacks.loadDocumentFromUrl(
      'https://example.com/old.pdf',
      'old.pdf',
    );
    await result.current.passwordValue.submit('secret');

    pendingBuffer.reject(new Error('stale url failure'));
    await staleUrlCall;

    expect(loadDocumentInternal).toHaveBeenCalledTimes(1);
    expect(loadDocumentInternal).toHaveBeenCalledWith(
      instance,
      options.documentLifecycle.pendingDocument?.data,
      'secure.pdf',
      'secret',
    );
    expect(setError).not.toHaveBeenCalled();
  });

  it('ignores stale URL-load completion after password cancel invalidates pending load intent', async () => {
    const instance = { kind: 'worker' } as unknown as WorkerPDFium;
    const pendingBuffer = deferred<ArrayBuffer>();
    const loadDocumentBufferFromUrl = vi.fn().mockReturnValue(pendingBuffer.promise);
    const loadDocumentInternal = vi.fn(async () => undefined);
    const options = createOptions({
      instance,
      loadDocumentBufferFromUrl,
      loadDocumentInternal,
      documentLifecycle: {
        ...INITIAL_DOCUMENT_LIFECYCLE_STATE,
        pendingDocument: { data: new ArrayBuffer(8), name: 'secure.pdf' },
        password: { required: true, attempted: false, error: null },
      },
    });
    const { result } = renderHook(() => useProviderDocumentApi(options));

    const staleUrlCall = result.current.stableDocCallbacks.loadDocumentFromUrl(
      'https://example.com/old.pdf',
      'old.pdf',
    );
    result.current.passwordValue.cancel();

    pendingBuffer.resolve(new ArrayBuffer(64));
    await staleUrlCall;

    expect(loadDocumentInternal).not.toHaveBeenCalled();
  });

  it('ignores stale URL-load failure after password cancel invalidates pending load intent', async () => {
    const instance = { kind: 'worker' } as unknown as WorkerPDFium;
    const pendingBuffer = deferred<ArrayBuffer>();
    const loadDocumentBufferFromUrl = vi.fn().mockReturnValue(pendingBuffer.promise);
    const loadDocumentInternal = vi.fn(async () => undefined);
    const setError = vi.fn();
    const options = createOptions({
      instance,
      loadDocumentBufferFromUrl,
      loadDocumentInternal,
      setError,
      documentLifecycle: {
        ...INITIAL_DOCUMENT_LIFECYCLE_STATE,
        pendingDocument: { data: new ArrayBuffer(8), name: 'secure.pdf' },
        password: { required: true, attempted: false, error: null },
      },
    });
    const { result } = renderHook(() => useProviderDocumentApi(options));

    const staleUrlCall = result.current.stableDocCallbacks.loadDocumentFromUrl(
      'https://example.com/old.pdf',
      'old.pdf',
    );
    result.current.passwordValue.cancel();

    pendingBuffer.reject(new Error('stale url failure'));
    await staleUrlCall;

    expect(loadDocumentInternal).not.toHaveBeenCalled();
    expect(setError).not.toHaveBeenCalled();
  });
});
