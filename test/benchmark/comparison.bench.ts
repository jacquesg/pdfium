/**
 * Backend comparison benchmarks — Native vs WASM.
 *
 * Compares performance of the native addon and WASM backends across
 * document loading, page rendering, and text extraction operations.
 */

import { afterAll, beforeAll, bench, describe } from 'vitest';
import type { PDFiumDocument } from '../../src/document/document.js';
import type { NativePDFiumDocument } from '../../src/document/native-document.js';
import type { NativePDFiumInstance } from '../../src/document/native-instance.js';
import type { NativePDFiumPage } from '../../src/document/native-page.js';
import type { PDFiumPage } from '../../src/document/page.js';
import type { PDFium } from '../../src/pdfium.js';
import { hasNativeBackend, initNativeBackend, initWasmBackend, loadTestPdfData } from '../utils/helpers.js';

const hasNative = hasNativeBackend();

// ─────────────────────────────────────────────────────────────────────────────
// WASM Backend Benchmarks
// ─────────────────────────────────────────────────────────────────────────────

describe('Backend Comparison: WASM', () => {
  let pdfium: PDFium;
  let smallPdf: Uint8Array;
  let largePdf: Uint8Array;
  let document: PDFiumDocument;
  let page: PDFiumPage;

  beforeAll(async () => {
    pdfium = await initWasmBackend();
    smallPdf = await loadTestPdfData('test_1.pdf');
    largePdf = await loadTestPdfData('test_3_with_images.pdf');
    document = await pdfium.openDocument(smallPdf);
    page = document.getPage(0);
  });

  afterAll(() => {
    page?.dispose();
    document?.dispose();
    pdfium?.dispose();
  });

  describe('Document Loading', () => {
    bench('load small PDF (339 KB)', async () => {
      using _doc = await pdfium.openDocument(smallPdf);
    });

    bench('load large PDF (1.6 MB)', async () => {
      using _doc = await pdfium.openDocument(largePdf);
    });
  });

  describe('Page Rendering', () => {
    bench('render page at 1x scale', () => {
      page.render({ scale: 1 });
    });

    bench('render page at 2x scale', () => {
      page.render({ scale: 2 });
    });

    bench('render page at 0.5x scale', () => {
      page.render({ scale: 0.5 });
    });
  });

  describe('Text Extraction', () => {
    bench('extract full page text', () => {
      page.getText();
    });

    bench('count text characters', () => {
      void page.charCount;
    });

    bench('get bounded text', () => {
      page.getTextInRect(0, 0, page.width, page.height);
    });

    bench('find text occurrences', () => {
      for (const _result of page.findText('test')) {
        // Consume all results
      }
    });
  });

  describe('Character Operations (batch 100)', () => {
    bench('get character boxes', () => {
      const count = Math.min(page.charCount, 100);
      for (let i = 0; i < count; i++) {
        page.getCharBox(i);
      }
    });

    bench('get character unicode', () => {
      const count = Math.min(page.charCount, 100);
      for (let i = 0; i < count; i++) {
        page.getCharUnicode(i);
      }
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Native Backend Benchmarks
// ─────────────────────────────────────────────────────────────────────────────

describe.skipIf(!hasNative)('Backend Comparison: Native', () => {
  let pdfium: NativePDFiumInstance;
  let smallPdf: Uint8Array;
  let largePdf: Uint8Array;
  let document: NativePDFiumDocument;
  let page: NativePDFiumPage;

  beforeAll(async () => {
    const native = await initNativeBackend();
    if (!native) throw new Error('Native backend unavailable');
    pdfium = native;
    smallPdf = await loadTestPdfData('test_1.pdf');
    largePdf = await loadTestPdfData('test_3_with_images.pdf');
    document = pdfium.openDocument(smallPdf);
    page = document.getPage(0);
  });

  afterAll(() => {
    page?.dispose();
    document?.dispose();
    pdfium?.dispose();
  });

  describe('Document Loading', () => {
    bench('load small PDF (339 KB)', () => {
      using _doc = pdfium.openDocument(smallPdf);
    });

    bench('load large PDF (1.6 MB)', () => {
      using _doc = pdfium.openDocument(largePdf);
    });
  });

  describe('Page Rendering', () => {
    bench('render page at 1x scale', () => {
      page.render({ scale: 1 });
    });

    bench('render page at 2x scale', () => {
      page.render({ scale: 2 });
    });

    bench('render page at 0.5x scale', () => {
      page.render({ scale: 0.5 });
    });
  });

  describe('Text Extraction', () => {
    bench('extract full page text', () => {
      page.getText();
    });

    bench('count text characters', () => {
      void page.charCount;
    });

    bench('get bounded text', () => {
      page.getBoundedText(0, page.height, page.width, 0);
    });

    bench('find text occurrences', () => {
      for (const _result of page.findText('test')) {
        // Consume all results
      }
    });
  });

  describe('Character Operations (batch 100)', () => {
    bench('get character boxes', () => {
      const count = Math.min(page.charCount, 100);
      for (let i = 0; i < count; i++) {
        page.getCharBox(i);
      }
    });

    bench('get character unicode', () => {
      const count = Math.min(page.charCount, 100);
      for (let i = 0; i < count; i++) {
        page.getCharUnicode(i);
      }
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Memory Usage Comparison
// ─────────────────────────────────────────────────────────────────────────────

describe('Memory Usage Comparison', () => {
  describe('WASM backend memory footprint', () => {
    let pdfium: PDFium;

    beforeAll(async () => {
      pdfium = await initWasmBackend();
    });

    afterAll(() => {
      pdfium?.dispose();
    });

    bench('load, render, dispose cycle (small PDF)', async () => {
      const data = await loadTestPdfData('test_1.pdf');
      using doc = await pdfium.openDocument(data);
      using page = doc.getPage(0);
      page.render({ scale: 1 });
    });
  });

  describe.skipIf(!hasNative)('Native backend memory footprint', () => {
    let pdfium: NativePDFiumInstance;

    beforeAll(async () => {
      const native = await initNativeBackend();
      if (!native) throw new Error('Native backend unavailable');
      pdfium = native;
    });

    afterAll(() => {
      pdfium?.dispose();
    });

    bench('load, render, dispose cycle (small PDF)', async () => {
      const data = await loadTestPdfData('test_1.pdf');
      using doc = pdfium.openDocument(data);
      using page = doc.getPage(0);
      page.render({ scale: 1 });
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Multi-page Processing
// ─────────────────────────────────────────────────────────────────────────────

describe('Multi-page Processing', () => {
  describe('WASM backend', () => {
    let pdfium: PDFium;
    let document: PDFiumDocument;

    beforeAll(async () => {
      pdfium = await initWasmBackend();
      const data = await loadTestPdfData('test_3_with_images.pdf');
      document = await pdfium.openDocument(data);
    });

    afterAll(() => {
      document?.dispose();
      pdfium?.dispose();
    });

    bench('iterate and extract text from all pages', () => {
      for (let i = 0; i < document.pageCount; i++) {
        using page = document.getPage(i);
        page.getText();
      }
    });

    bench('iterate and render all pages at 0.5x', () => {
      for (let i = 0; i < document.pageCount; i++) {
        using page = document.getPage(i);
        page.render({ scale: 0.5 });
      }
    });
  });

  describe.skipIf(!hasNative)('Native backend', () => {
    let pdfium: NativePDFiumInstance;
    let document: NativePDFiumDocument;

    beforeAll(async () => {
      const native = await initNativeBackend();
      if (!native) throw new Error('Native backend unavailable');
      pdfium = native;
      const data = await loadTestPdfData('test_3_with_images.pdf');
      document = pdfium.openDocument(data);
    });

    afterAll(() => {
      document?.dispose();
      pdfium?.dispose();
    });

    bench('iterate and extract text from all pages', () => {
      for (let i = 0; i < document.pageCount; i++) {
        using page = document.getPage(i);
        page.getText();
      }
    });

    bench('iterate and render all pages at 0.5x', () => {
      for (let i = 0; i < document.pageCount; i++) {
        using page = document.getPage(i);
        page.render({ scale: 0.5 });
      }
    });
  });
});
