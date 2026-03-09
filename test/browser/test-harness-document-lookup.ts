import type { HarnessDocumentStoreState } from './test-harness-document-store.types.js';
import type { BrowserDocument, BrowserPage } from './test-harness-types.js';

export function getHarnessPageKey(documentId: number, pageIndex: number): string {
  return `${documentId}-${pageIndex}`;
}

export function getHarnessDocument(state: HarnessDocumentStoreState, documentId: number): BrowserDocument {
  const document = state.documents.get(documentId);
  if (!document) {
    throw new Error(`Document ${documentId} not found`);
  }
  return document;
}

export async function getHarnessPage(
  state: HarnessDocumentStoreState,
  documentId: number,
  pageIndex: number,
): Promise<BrowserPage> {
  const document = getHarnessDocument(state, documentId);
  const pageKey = getHarnessPageKey(documentId, pageIndex);
  let page = state.pages.get(pageKey);
  if (!page) {
    page = await document.getPage(pageIndex);
    state.pages.set(pageKey, page);
  }
  return page;
}
