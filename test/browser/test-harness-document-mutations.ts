import type { PDFium, WorkerPDFium } from './test-harness-browser-types.js';
import type { HarnessDocumentStoreState } from './test-harness-document-store.types.js';

export async function loadHarnessDocumentIntoStore(
  state: HarnessDocumentStoreState,
  pdfium: PDFium | WorkerPDFium,
  data: ArrayBuffer,
): Promise<{ pageCount: number; documentId: number }> {
  const document = await pdfium.openDocument(data);
  const documentId = state.nextDocId++;
  state.documents.set(documentId, document);
  return {
    pageCount: document.pageCount,
    documentId,
  };
}
