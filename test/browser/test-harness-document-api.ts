import type { HarnessDocumentStore } from './test-harness-document-store.js';
import { renderHarnessPageToCanvas } from './test-harness-rendering.js';
import type { TestHarness } from './test-harness-types.js';

export async function loadHarnessDocumentFromStore(
  harness: TestHarness,
  documentStore: HarnessDocumentStore,
  data: ArrayBuffer,
): Promise<{ pageCount: number; documentId: number }> {
  if (!harness.pdfium) {
    throw new Error('PDFium not initialised');
  }

  return documentStore.loadDocument(harness.pdfium, data);
}

export async function renderHarnessDocumentPage(
  documentStore: HarnessDocumentStore,
  documentId: number,
  pageIndex: number,
): Promise<{ width: number; height: number; dataUrl: string }> {
  const page = await documentStore.getPage(documentId, pageIndex);
  return renderHarnessPageToCanvas(page);
}

export async function getHarnessDocumentPageText(
  documentStore: HarnessDocumentStore,
  documentId: number,
  pageIndex: number,
): Promise<string> {
  const page = await documentStore.getPage(documentId, pageIndex);
  return page.getText();
}

export async function closeHarnessDocumentFromStore(
  documentStore: HarnessDocumentStore,
  documentId: number,
): Promise<void> {
  await documentStore.closeDocument(documentId);
}
