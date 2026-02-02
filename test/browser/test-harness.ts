/**
 * Browser test harness for PDFium WASM.
 *
 * This module loads PDFium in the browser and exposes test functions
 * that can be called from Playwright tests.
 */

import { PDFium, type PDFiumDocument, type PDFiumPage } from '../../src/browser.js';

declare global {
  interface Window {
    testHarness: TestHarness;
  }
}

interface TestHarness {
  isReady: boolean;
  error: string | null;
  pdfium: PDFium | null;
  initPdfium(): Promise<boolean>;
  loadDocument(data: ArrayBuffer): Promise<{ pageCount: number; documentId: number }>;
  renderPage(documentId: number, pageIndex: number): Promise<{ width: number; height: number; dataUrl: string }>;
  getPageText(documentId: number, pageIndex: number): Promise<string>;
  closeDocument(documentId: number): void;
  dispose(): void;
}

const documents = new Map<number, PDFiumDocument>();
const pages = new Map<string, PDFiumPage>();
let nextDocId = 1;

const testHarness: TestHarness = {
  isReady: false,
  error: null,
  pdfium: null,

  async initPdfium(): Promise<boolean> {
    try {
      const wasmResponse = await fetch('/pdfium.wasm');
      if (!wasmResponse.ok) {
        throw new Error(`Failed to fetch WASM: ${wasmResponse.status}`);
      }
      const wasmBinary = await wasmResponse.arrayBuffer();

      this.pdfium = await PDFium.init({ wasmBinary });
      this.isReady = true;
      updateStatus('PDFium initialised successfully', false);
      return true;
    } catch (err) {
      this.error = String(err);
      updateStatus(`Failed to initialise PDFium: ${this.error}`, true);
      return false;
    }
  },

  async loadDocument(data: ArrayBuffer): Promise<{ pageCount: number; documentId: number }> {
    if (!this.pdfium) {
      throw new Error('PDFium not initialised');
    }

    const document = await this.pdfium.openDocument(data);
    const documentId = nextDocId++;
    documents.set(documentId, document);

    return {
      pageCount: document.pageCount,
      documentId,
    };
  },

  async renderPage(documentId: number, pageIndex: number): Promise<{ width: number; height: number; dataUrl: string }> {
    const document = documents.get(documentId);
    if (!document) {
      throw new Error(`Document ${documentId} not found`);
    }

    const pageKey = `${documentId}-${pageIndex}`;
    let page = pages.get(pageKey);

    if (!page) {
      page = document.getPage(pageIndex);
      pages.set(pageKey, page);
    }

    const result = page.render({ scale: 1 });

    // Convert to ImageData and draw to canvas
    const canvas = globalThis.document.getElementById('pdf-canvas') as HTMLCanvasElement;
    canvas.width = result.width;
    canvas.height = result.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    const imageData = new ImageData(new Uint8ClampedArray(result.data), result.width, result.height);
    ctx.putImageData(imageData, 0, 0);

    return {
      width: result.width,
      height: result.height,
      dataUrl: canvas.toDataURL('image/png'),
    };
  },

  async getPageText(documentId: number, pageIndex: number): Promise<string> {
    const document = documents.get(documentId);
    if (!document) {
      throw new Error(`Document ${documentId} not found`);
    }

    const pageKey = `${documentId}-${pageIndex}`;
    let page = pages.get(pageKey);

    if (!page) {
      page = document.getPage(pageIndex);
      pages.set(pageKey, page);
    }

    return page.getText();
  },

  closeDocument(documentId: number): void {
    // Close all pages for this document
    for (const [key, page] of pages.entries()) {
      if (key.startsWith(`${documentId}-`)) {
        page.dispose();
        pages.delete(key);
      }
    }

    // Close the document
    const document = documents.get(documentId);
    if (document) {
      document.dispose();
      documents.delete(documentId);
    }
  },

  dispose(): void {
    // Close all pages and documents
    for (const page of pages.values()) {
      page.dispose();
    }
    pages.clear();

    for (const document of documents.values()) {
      document.dispose();
    }
    documents.clear();

    // Dispose PDFium
    if (this.pdfium) {
      this.pdfium.dispose();
      this.pdfium = null;
    }

    this.isReady = false;
  },
};

function updateStatus(message: string, isError: boolean): void {
  const statusEl = globalThis.document.getElementById('status');
  if (statusEl) {
    statusEl.textContent = message;
    statusEl.className = isError ? 'error' : 'success';
  }
}

// Expose test harness globally
window.testHarness = testHarness;

// Auto-initialise
testHarness.initPdfium().catch(console.error);
