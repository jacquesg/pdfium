import type { HarnessRuntimeKind } from './harness-runtime.types.js';
import type {
  PDFium,
  PDFiumDocument,
  PDFiumPage,
  WorkerPDFium,
  WorkerPDFiumDocument,
  WorkerPDFiumPage,
} from './test-harness-browser-types.js';

declare global {
  interface Window {
    testHarness: TestHarness;
  }
}

export interface TestHarness {
  runtimeKind: HarnessRuntimeKind;
  isReady: boolean;
  isSettled: boolean;
  error: string | null;
  errorStack: string | null;
  statusMessage: string;
  pdfium: PDFium | WorkerPDFium | null;
  initPdfium(): Promise<boolean>;
  loadDocument(data: ArrayBuffer): Promise<{ pageCount: number; documentId: number }>;
  renderPage(documentId: number, pageIndex: number): Promise<{ width: number; height: number; dataUrl: string }>;
  getPageText(documentId: number, pageIndex: number): Promise<string>;
  closeDocument(documentId: number): Promise<void>;
  dispose(): Promise<void>;
}

export type BrowserDocument = PDFiumDocument | WorkerPDFiumDocument;
export type BrowserPage = PDFiumPage | WorkerPDFiumPage;
