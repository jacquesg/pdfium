import { describe, expect, it, vi } from 'vitest';
import type { WorkerPDFium, WorkerPDFiumDocument } from '../../../../src/context/worker-client.js';
import {
  disposeProviderResources,
  loadInitialDocumentOnInstanceReady,
} from '../../../../src/react/internal/provider-lifecycle.js';
import { createPDFiumStores } from '../../../../src/react/internal/stores-context.js';
import { createMockDocument } from '../../../react-setup.js';

function createWorkerDocumentMock(overrides?: Record<string, unknown>): WorkerPDFiumDocument {
  return createMockDocument(overrides) as unknown as WorkerPDFiumDocument;
}

describe('loadInitialDocumentOnInstanceReady', () => {
  it('loads the initial document when instance is ready', () => {
    const instance = { openDocument: vi.fn(), dispose: vi.fn() } as unknown as WorkerPDFium;
    const loadDocumentInternal = vi.fn(async () => undefined);
    const initialDocument = { data: new ArrayBuffer(8), name: 'initial.pdf' };

    loadInitialDocumentOnInstanceReady({
      instance,
      initialDocument,
      loadDocumentInternal,
    });

    expect(loadDocumentInternal).toHaveBeenCalledWith(instance, initialDocument.data, 'initial.pdf');
  });

  it('no-ops when instance is missing', () => {
    const loadDocumentInternal = vi.fn(async () => undefined);

    loadInitialDocumentOnInstanceReady({
      instance: null,
      initialDocument: { data: new ArrayBuffer(8), name: 'initial.pdf' },
      loadDocumentInternal,
    });

    expect(loadDocumentInternal).not.toHaveBeenCalled();
  });

  it('no-ops when initial document is missing', () => {
    const instance = { openDocument: vi.fn(), dispose: vi.fn() } as unknown as WorkerPDFium;
    const loadDocumentInternal = vi.fn(async () => undefined);

    loadInitialDocumentOnInstanceReady({
      instance,
      initialDocument: null,
      loadDocumentInternal,
    });

    expect(loadDocumentInternal).not.toHaveBeenCalled();
  });
});

describe('disposeProviderResources', () => {
  it('disposes document, purges caches, and disposes worker instance', async () => {
    const stores = createPDFiumStores();
    const queryPurgeSpy = vi.spyOn(stores.queryStore, 'purgeByPrefix');
    const renderPurgeSpy = vi.spyOn(stores.renderStore, 'purgeByPrefix');
    const documentDispose = vi.fn().mockResolvedValue(undefined);
    const document = createWorkerDocumentMock({ id: 'doc-1', dispose: documentDispose });
    const instance = {
      openDocument: vi.fn(),
      dispose: vi.fn().mockResolvedValue(undefined),
    } as unknown as WorkerPDFium;

    disposeProviderResources({
      document,
      instance,
      scopedStores: stores,
    });

    await Promise.resolve();

    expect(documentDispose).toHaveBeenCalledTimes(1);
    expect(queryPurgeSpy).toHaveBeenCalledWith('doc-1\0');
    expect(renderPurgeSpy).toHaveBeenCalledWith('doc-1\0');
    expect(instance.dispose).toHaveBeenCalledTimes(1);
  });

  it('reports async instance dispose failures', async () => {
    const stores = createPDFiumStores();
    const instanceDisposeError = new Error('instance dispose failed');
    const instance = {
      openDocument: vi.fn(),
      dispose: vi.fn().mockRejectedValue(instanceDisposeError),
    } as unknown as WorkerPDFium;
    const onInstanceDisposeError = vi.fn();

    disposeProviderResources({
      document: null,
      instance,
      scopedStores: stores,
      onInstanceDisposeError,
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(onInstanceDisposeError).toHaveBeenCalledWith(instanceDisposeError);
  });

  it('reports synchronous instance dispose failures', () => {
    const stores = createPDFiumStores();
    const syncError = new Error('sync dispose failed');
    const instance = {
      openDocument: vi.fn(),
      dispose: vi.fn(() => {
        throw syncError;
      }),
    } as unknown as WorkerPDFium;
    const onInstanceDisposeError = vi.fn();

    expect(() =>
      disposeProviderResources({
        document: null,
        instance,
        scopedStores: stores,
        onInstanceDisposeError,
      }),
    ).not.toThrow();

    expect(onInstanceDisposeError).toHaveBeenCalledWith(syncError);
  });
});
