import { disposeHarnessRuntime } from './test-harness-dispose.js';
import {
  closeHarnessDocumentFromStore,
  getHarnessDocumentPageText,
  loadHarnessDocumentFromStore,
  renderHarnessDocumentPage,
} from './test-harness-document-api.js';
import { createHarnessDocumentStore } from './test-harness-document-store.js';
import { initHarnessPdfium, resetHarnessState } from './test-harness-runtime.js';
import type { TestHarness } from './test-harness-types.js';

const documentStore = createHarnessDocumentStore();

const testHarness: TestHarness = {
  runtimeKind: 'worker',
  isReady: false,
  isSettled: false,
  error: null,
  errorStack: null,
  statusMessage: 'Loading PDFium...',
  pdfium: null,

  async initPdfium(): Promise<boolean> {
    return initHarnessPdfium(this);
  },

  async loadDocument(data: ArrayBuffer): Promise<{ pageCount: number; documentId: number }> {
    return loadHarnessDocumentFromStore(this, documentStore, data);
  },

  async renderPage(documentId: number, pageIndex: number): Promise<{ width: number; height: number; dataUrl: string }> {
    return renderHarnessDocumentPage(documentStore, documentId, pageIndex);
  },

  async getPageText(documentId: number, pageIndex: number): Promise<string> {
    return getHarnessDocumentPageText(documentStore, documentId, pageIndex);
  },

  async closeDocument(documentId: number): Promise<void> {
    await closeHarnessDocumentFromStore(documentStore, documentId);
  },

  async dispose(): Promise<void> {
    await disposeHarnessRuntime(this, documentStore);
  },
};

window.testHarness = testHarness;

resetHarnessState(testHarness);
testHarness.initPdfium().catch(console.error);
