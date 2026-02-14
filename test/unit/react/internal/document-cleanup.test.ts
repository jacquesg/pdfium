import { describe, expect, it, vi } from 'vitest';
import type { WorkerPDFiumDocument } from '../../../../src/context/worker-client.js';
import { disposeDocumentSafely, purgeDocumentCaches } from '../../../../src/react/internal/document-cleanup.js';
import { createPDFiumStores } from '../../../../src/react/internal/stores-context.js';
import { createMockDocument } from '../../../react-setup.js';

function createWorkerDocumentMock(overrides?: Record<string, unknown>): WorkerPDFiumDocument {
  return createMockDocument(overrides) as unknown as WorkerPDFiumDocument;
}

describe('purgeDocumentCaches', () => {
  it('purges both query and render caches using document-prefixed keys', () => {
    const stores = createPDFiumStores();
    const queryPurgeSpy = vi.spyOn(stores.queryStore, 'purgeByPrefix');
    const renderPurgeSpy = vi.spyOn(stores.renderStore, 'purgeByPrefix');

    purgeDocumentCaches(stores, 'doc-1');

    expect(queryPurgeSpy).toHaveBeenCalledWith('doc-1\0');
    expect(renderPurgeSpy).toHaveBeenCalledWith('doc-1\0');
  });

  it('does nothing when document id is missing', () => {
    const stores = createPDFiumStores();
    const queryPurgeSpy = vi.spyOn(stores.queryStore, 'purgeByPrefix');
    const renderPurgeSpy = vi.spyOn(stores.renderStore, 'purgeByPrefix');

    purgeDocumentCaches(stores, null);
    purgeDocumentCaches(stores, undefined);

    expect(queryPurgeSpy).not.toHaveBeenCalled();
    expect(renderPurgeSpy).not.toHaveBeenCalled();
  });
});

describe('disposeDocumentSafely', () => {
  it('disposes the document when provided', async () => {
    const dispose = vi.fn().mockResolvedValue(undefined);
    const document = createWorkerDocumentMock({ dispose });

    await disposeDocumentSafely({ document });

    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it('forwards disposal errors via onError and does not rethrow', async () => {
    const disposeError = new Error('dispose failed');
    const document = createWorkerDocumentMock({
      dispose: vi.fn().mockRejectedValue(disposeError),
    });
    const onError = vi.fn();

    await expect(disposeDocumentSafely({ document, onError })).resolves.toBeUndefined();
    expect(onError).toHaveBeenCalledWith(disposeError);
  });

  it('no-ops when document is null or undefined', async () => {
    const onError = vi.fn();

    await expect(disposeDocumentSafely({ document: null, onError })).resolves.toBeUndefined();
    await expect(disposeDocumentSafely({ document: undefined, onError })).resolves.toBeUndefined();

    expect(onError).not.toHaveBeenCalled();
  });
});
