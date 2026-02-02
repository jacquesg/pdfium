/**
 * Text extraction performance benchmarks.
 *
 * Measures the performance of text extraction operations.
 */

import { afterAll, beforeAll, bench, describe } from 'vitest';
import type { PDFiumDocument } from '../../src/document/document.js';
import type { PDFiumPage } from '../../src/document/page.js';
import type { PDFium } from '../../src/pdfium.js';
import { initPdfium, loadTestDocument } from '../utils/helpers.js';

describe('Text Extraction Performance', () => {
  let pdfium: PDFium;
  let document: PDFiumDocument;
  let page: PDFiumPage;

  beforeAll(async () => {
    pdfium = await initPdfium();
    document = await loadTestDocument(pdfium, 'test_1.pdf');
    page = document.getPage(0);
  });

  afterAll(() => {
    page?.dispose();
    document?.dispose();
    pdfium?.dispose();
  });

  bench('extract full page text', () => {
    page.getText();
  });

  bench('get character count', () => {
    // charCount is a getter
    const _count = page.charCount;
  });

  bench('get text in rectangle', () => {
    page.getTextInRect(0, 0, 300, 400);
  });

  bench('find text occurrences', () => {
    // Consume all results from the generator
    for (const _result of page.findText('test')) {
      // Iterate through all matches
    }
  });

  bench('get char box for first 10 characters', () => {
    for (let i = 0; i < 10; i++) {
      page.getCharBox(i);
    }
  });
});

describe('Multi-page Text Extraction', () => {
  let pdfium: PDFium;
  let document: PDFiumDocument;

  beforeAll(async () => {
    pdfium = await initPdfium();
    document = await loadTestDocument(pdfium, 'test_1.pdf');
  });

  afterAll(() => {
    document?.dispose();
    pdfium?.dispose();
  });

  bench('extract text from all pages', () => {
    for (let i = 0; i < document.pageCount; i++) {
      const page = document.getPage(i);
      page.getText();
      page.dispose();
    }
  });

  bench('find text across all pages', () => {
    for (let i = 0; i < document.pageCount; i++) {
      const page = document.getPage(i);
      for (const _result of page.findText('test')) {
        // Iterate through all matches
      }
      page.dispose();
    }
  });
});

describe('Character-level Operations', () => {
  let pdfium: PDFium;
  let document: PDFiumDocument;
  let page: PDFiumPage;

  beforeAll(async () => {
    pdfium = await initPdfium();
    document = await loadTestDocument(pdfium, 'test_1.pdf');
    page = document.getPage(0);
  });

  afterAll(() => {
    page?.dispose();
    document?.dispose();
    pdfium?.dispose();
  });

  bench('get character bounding box (first 100 chars)', () => {
    const count = Math.min(page.charCount, 100);
    for (let i = 0; i < count; i++) {
      page.getCharBox(i);
    }
  });

  bench('get character unicode (first 100 chars)', () => {
    const count = Math.min(page.charCount, 100);
    for (let i = 0; i < count; i++) {
      page.getCharUnicode(i);
    }
  });
});
