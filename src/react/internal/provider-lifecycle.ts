import type { WorkerPDFium, WorkerPDFiumDocument } from '../../context/worker-client.js';
import { disposeSafely } from './dispose-safely.js';
import { disposeDocumentSafely, purgeDocumentCaches } from './document-cleanup.js';
import type { InitialDocument } from './provider-config-types.js';
import type { PDFiumStores } from './stores-context.js';

type LoadDocumentInternal = (instance: WorkerPDFium, data: ArrayBuffer | Uint8Array, name: string) => Promise<void>;

interface LoadInitialDocumentOnInstanceReadyOptions {
  instance: WorkerPDFium | null;
  initialDocument: InitialDocument | null | undefined;
  loadDocumentInternal: LoadDocumentInternal;
}

interface DisposeProviderResourcesOptions {
  document: WorkerPDFiumDocument | null | undefined;
  instance: WorkerPDFium | null | undefined;
  scopedStores: PDFiumStores;
  onDocumentDisposeError?: (error: unknown) => void;
  onInstanceDisposeError?: (error: unknown) => void;
}

function loadInitialDocumentOnInstanceReady({
  instance,
  initialDocument,
  loadDocumentInternal,
}: LoadInitialDocumentOnInstanceReadyOptions): void {
  if (!instance || !initialDocument) return;
  void loadDocumentInternal(instance, initialDocument.data, initialDocument.name);
}

function disposeProviderResources({
  document,
  instance,
  scopedStores,
  onDocumentDisposeError,
  onInstanceDisposeError,
}: DisposeProviderResourcesOptions): void {
  if (onDocumentDisposeError) {
    void disposeDocumentSafely({
      document,
      onError: onDocumentDisposeError,
    });
  } else {
    void disposeDocumentSafely({
      document,
    });
  }
  purgeDocumentCaches(scopedStores, document?.id);

  if (onInstanceDisposeError) {
    disposeSafely(instance, {
      onError: onInstanceDisposeError,
    });
  } else {
    disposeSafely(instance);
  }
}

export { disposeProviderResources, loadInitialDocumentOnInstanceReady };
export type {
  DisposeProviderResourcesOptions,
  InitialDocument,
  LoadDocumentInternal,
  LoadInitialDocumentOnInstanceReadyOptions,
};
