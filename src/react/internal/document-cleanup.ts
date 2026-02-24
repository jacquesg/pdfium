import type { WorkerPDFiumDocument } from '../../context/worker-client.js';
import type { PDFiumStores } from './stores-context.js';

interface DisposeDocumentSafelyOptions {
  document: WorkerPDFiumDocument | null | undefined;
  onError?: (error: unknown) => void;
}

function purgeDocumentCaches(stores: PDFiumStores, documentId: string | null | undefined): void {
  if (!documentId) return;
  const prefix = `${documentId}\0`;
  stores.queryStore.purgeByPrefix(prefix);
  stores.renderStore.purgeByPrefix(prefix);
}

async function disposeDocumentSafely({ document, onError }: DisposeDocumentSafelyOptions): Promise<void> {
  if (!document) return;

  try {
    await document.dispose();
  } catch (error) {
    onError?.(error);
  }
}

export { disposeDocumentSafely, purgeDocumentCaches };
export type { DisposeDocumentSafelyOptions };
