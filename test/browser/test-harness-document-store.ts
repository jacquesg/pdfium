import type { PDFium, WorkerPDFium } from './test-harness-browser-types.js';
import { closeHarnessDocumentInStore, disposeHarnessDocumentStore } from './test-harness-document-dispose.js';
import { getHarnessPage } from './test-harness-document-lookup.js';
import { loadHarnessDocumentIntoStore } from './test-harness-document-mutations.js';
import type { HarnessDocumentStoreState } from './test-harness-document-store.types.js';
import type { BrowserPage } from './test-harness-types.js';

export interface HarnessDocumentStore {
  loadDocument(pdfium: PDFium | WorkerPDFium, data: ArrayBuffer): Promise<{ pageCount: number; documentId: number }>;
  getPage(documentId: number, pageIndex: number): Promise<BrowserPage>;
  closeDocument(documentId: number): Promise<void>;
  dispose(): Promise<void>;
}

export function createHarnessDocumentStore(): HarnessDocumentStore {
  const state: HarnessDocumentStoreState = {
    documents: new Map(),
    pages: new Map(),
    nextDocId: 1,
  };

  return {
    async loadDocument(pdfium: PDFium | WorkerPDFium, data: ArrayBuffer) {
      return loadHarnessDocumentIntoStore(state, pdfium, data);
    },

    async getPage(documentId: number, pageIndex: number): Promise<BrowserPage> {
      return getHarnessPage(state, documentId, pageIndex);
    },

    async closeDocument(documentId: number) {
      await closeHarnessDocumentInStore(state, documentId);
    },

    async dispose() {
      await disposeHarnessDocumentStore(state);
    },
  };
}
