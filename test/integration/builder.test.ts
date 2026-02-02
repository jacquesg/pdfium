/**
 * Integration tests for PDFiumDocumentBuilder.
 *
 * These tests verify PDF creation from scratch.
 */

import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { PDFium } from '../../src/pdfium.js';
import { initPdfium } from '../helpers.js';

describe('PDFiumDocumentBuilder', () => {
  let pdfium: PDFium;

  beforeAll(async () => {
    pdfium = await initPdfium();
  });

  afterAll(() => {
    pdfium?.dispose();
  });

  test('should create an empty document', () => {
    using builder = pdfium.createDocument();
    expect(builder.pageCount).toBe(0);
  });

  test('should add a page with default dimensions', () => {
    using builder = pdfium.createDocument();
    builder.addPage();
    expect(builder.pageCount).toBe(1);
  });

  test('should add a page with custom dimensions', () => {
    using builder = pdfium.createDocument();
    builder.addPage({ width: 595, height: 842 }); // A4
    expect(builder.pageCount).toBe(1);
  });

  test('should add multiple pages', () => {
    using builder = pdfium.createDocument();
    builder.addPage();
    builder.addPage();
    builder.addPage();
    expect(builder.pageCount).toBe(3);
  });

  test('should delete a page', () => {
    using builder = pdfium.createDocument();
    builder.addPage();
    builder.addPage();
    expect(builder.pageCount).toBe(2);
    builder.deletePage(0);
    expect(builder.pageCount).toBe(1);
  });

  test('should throw for out-of-range delete', () => {
    using builder = pdfium.createDocument();
    builder.addPage();
    expect(() => builder.deletePage(5)).toThrow();
    expect(() => builder.deletePage(-1)).toThrow();
  });

  test('should save empty document to valid PDF bytes', () => {
    using builder = pdfium.createDocument();
    builder.addPage();
    const bytes = builder.save();
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(0);
    const header = new TextDecoder().decode(bytes.subarray(0, 5));
    expect(header).toBe('%PDF-');
  });

  test('should save and re-open document', async () => {
    using builder = pdfium.createDocument();
    builder.addPage();
    builder.addPage({ width: 595, height: 842 });
    const bytes = builder.save();

    using reopened = await pdfium.openDocument(bytes);
    expect(reopened.pageCount).toBe(2);
  });

  test('should add rectangle to page', () => {
    using builder = pdfium.createDocument();
    const page = builder.addPage();
    page.addRectangle(100, 100, 200, 50, {
      fill: { r: 255, g: 0, b: 0, a: 255 },
    });
    page.generateContent();
    const bytes = builder.save();
    expect(bytes.length).toBeGreaterThan(0);
  });

  test('should add rectangle with stroke', () => {
    using builder = pdfium.createDocument();
    const page = builder.addPage();
    page.addRectangle(50, 50, 100, 100, {
      stroke: { r: 0, g: 0, b: 255, a: 255 },
      strokeWidth: 2,
    });
    page.generateContent();
    const bytes = builder.save();
    expect(bytes.length).toBeGreaterThan(0);
  });

  test('should add text with standard font', async () => {
    using builder = pdfium.createDocument();
    const font = builder.loadStandardFont('Helvetica');
    expect(font).toBeGreaterThan(0);

    const page = builder.addPage();
    page.addText('Hello, World!', 72, 700, font, 24);
    page.generateContent();

    const bytes = builder.save();
    using reopened = await pdfium.openDocument(bytes);
    using firstPage = reopened.getPage(0);
    const text = firstPage.getText();
    expect(text).toContain('Hello, World!');
  });

  test('should save with version option', async () => {
    using builder = pdfium.createDocument();
    builder.addPage();
    const bytes = builder.save({ version: 17 });
    using reopened = await pdfium.openDocument(bytes);
    expect(reopened.pageCount).toBe(1);
  });

  test('should throw for invalid standard font', () => {
    using builder = pdfium.createDocument();
    expect(() => builder.loadStandardFont('NonExistentFont')).toThrow();
  });

  test('should clean up on dispose', () => {
    const builder = pdfium.createDocument();
    builder.addPage();
    expect(builder.disposed).toBe(false);
    builder.dispose();
    expect(builder.disposed).toBe(true);
  });
});
