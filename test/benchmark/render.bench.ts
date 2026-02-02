/**
 * Rendering performance benchmarks.
 *
 * Measures the performance of PDF page rendering at various scales.
 */

import { afterAll, beforeAll, bench, describe } from 'vitest';
import type { PDFiumDocument } from '../../src/document/document.js';
import type { PDFiumPage } from '../../src/document/page.js';
import type { PDFium } from '../../src/pdfium.js';
import { initPdfium, loadTestDocument } from '../utils/helpers.js';

describe('Rendering Performance', () => {
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

  bench('render page at 1x scale', () => {
    page.render({ scale: 1 });
  });

  bench('render page at 2x scale', () => {
    page.render({ scale: 2 });
  });

  bench('render page at 0.5x scale', () => {
    page.render({ scale: 0.5 });
  });

  bench('render page with form fields', () => {
    page.render({ scale: 1, renderFormFields: true });
  });

  bench('render page without form fields', () => {
    page.render({ scale: 1, renderFormFields: false });
  });
});

describe('Multi-page Rendering', () => {
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

  bench('open and render single page', () => {
    const page = document.getPage(0);
    page.render({ scale: 1 });
    page.dispose();
  });

  bench('batch render all pages', () => {
    const pages: PDFiumPage[] = [];
    for (let i = 0; i < document.pageCount; i++) {
      pages.push(document.getPage(i));
    }
    for (const page of pages) {
      page.render({ scale: 1 });
    }
    for (const page of pages) {
      page.dispose();
    }
  });
});
