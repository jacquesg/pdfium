/**
 * Integration tests for PDFiumDocumentBuilder.
 *
 * These tests verify PDF creation from scratch.
 */

import { describe, expect, test } from 'vitest';

import { INTERNAL } from '../../src/internal/symbols.js';
import { initPdfium } from '../utils/helpers.js';

describe('PDFiumDocumentBuilder', () => {
  test('should create an empty document', async () => {
    using pdfium = await initPdfium();
    using builder = pdfium.createDocument();
    expect(builder.pageCount).toBe(0);
  });

  test('should add a page with default dimensions', async () => {
    using pdfium = await initPdfium();
    using builder = pdfium.createDocument();
    builder.addPage();
    expect(builder.pageCount).toBe(1);
  });

  test('should add a page with custom dimensions', async () => {
    using pdfium = await initPdfium();
    using builder = pdfium.createDocument();
    builder.addPage({ width: 595, height: 842 }); // A4
    expect(builder.pageCount).toBe(1);
  });

  test('should add multiple pages', async () => {
    using pdfium = await initPdfium();
    using builder = pdfium.createDocument();
    builder.addPage();
    builder.addPage();
    builder.addPage();
    expect(builder.pageCount).toBe(3);
  });

  test('should delete a page', async () => {
    using pdfium = await initPdfium();
    using builder = pdfium.createDocument();
    builder.addPage();
    builder.addPage();
    expect(builder.pageCount).toBe(2);
    builder.deletePage(0);
    expect(builder.pageCount).toBe(1);
  });

  test('should throw for out-of-range delete', async () => {
    using pdfium = await initPdfium();
    using builder = pdfium.createDocument();
    builder.addPage();
    expect(() => builder.deletePage(5)).toThrow();
    expect(() => builder.deletePage(-1)).toThrow();
  });

  test('should save empty document to valid PDF bytes', async () => {
    using pdfium = await initPdfium();
    using builder = pdfium.createDocument();
    builder.addPage();
    const bytes = builder.save();
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(0);
    const header = new TextDecoder().decode(bytes.subarray(0, 5));
    expect(header).toBe('%PDF-');
  });

  test('should save and re-open document', async () => {
    using pdfium = await initPdfium();
    using builder = pdfium.createDocument();
    builder.addPage();
    builder.addPage({ width: 595, height: 842 });
    const bytes = builder.save();

    using reopened = await pdfium.openDocument(bytes);
    expect(reopened.pageCount).toBe(2);
  });

  test('should add rectangle to page', async () => {
    using pdfium = await initPdfium();
    using builder = pdfium.createDocument();
    const page = builder.addPage();
    page.addRectangle(100, 100, 200, 50, {
      fill: { r: 255, g: 0, b: 0, a: 255 },
    });
    const bytes = builder.save();
    expect(bytes.length).toBeGreaterThan(0);
  });

  test('should add rectangle with stroke', async () => {
    using pdfium = await initPdfium();
    using builder = pdfium.createDocument();
    const page = builder.addPage();
    page.addRectangle(50, 50, 100, 100, {
      stroke: { r: 0, g: 0, b: 255, a: 255 },
      strokeWidth: 2,
    });
    const bytes = builder.save();
    expect(bytes.length).toBeGreaterThan(0);
  });

  test('addRectangle returns this for chaining', async () => {
    using pdfium = await initPdfium();
    using builder = pdfium.createDocument();
    const page = builder.addPage();
    const result = page.addRectangle(10, 10, 50, 50);
    expect(result).toBe(page);
  });

  test('addText returns this for chaining', async () => {
    using pdfium = await initPdfium();
    using builder = pdfium.createDocument();
    const font = builder.loadStandardFont('Helvetica');
    const page = builder.addPage();
    const result = page.addText('test', 0, 0, font, 12);
    expect(result).toBe(page);
  });

  test('methods can be chained together', async () => {
    using pdfium = await initPdfium();
    using builder = pdfium.createDocument();
    const font = builder.loadStandardFont('Helvetica');
    const page = builder.addPage();

    // This should compile and run without error
    page.addText('Hello', 100, 700, font, 24).addRectangle(50, 50, 512, 692);

    const bytes = builder.save();
    using reopened = await pdfium.openDocument(bytes);
    expect(reopened.pageCount).toBe(1);
  });

  test('should add text with standard font', async () => {
    using pdfium = await initPdfium();
    using builder = pdfium.createDocument();
    const font = builder.loadStandardFont('Helvetica');
    expect(font).toBeDefined();
    expect(font.name).toBe('Helvetica');

    const page = builder.addPage();
    page.addText('Hello, World!', 72, 700, font, 24);

    const bytes = builder.save();
    using reopened = await pdfium.openDocument(bytes);
    using firstPage = reopened.getPage(0);
    const text = firstPage.getText();
    expect(text).toContain('Hello, World!');
  });

  test('should save with version option', async () => {
    using pdfium = await initPdfium();
    using builder = pdfium.createDocument();
    builder.addPage();
    const bytes = builder.save({ version: 17 });
    using reopened = await pdfium.openDocument(bytes);
    expect(reopened.pageCount).toBe(1);
  });

  test('should throw for invalid standard font', async () => {
    using pdfium = await initPdfium();
    using builder = pdfium.createDocument();
    expect(() => builder.loadStandardFont('NonExistentFont')).toThrow();
  });

  test('should clean up on dispose', async () => {
    using pdfium = await initPdfium();
    const builder = pdfium.createDocument();
    builder.addPage();
    expect(builder.disposed).toBe(false);
    builder.dispose();
    expect(builder.disposed).toBe(true);
  });

  test('should throw on save after dispose', async () => {
    using pdfium = await initPdfium();
    const builder = pdfium.createDocument();
    builder.addPage();
    builder.dispose();
    expect(() => builder.save()).toThrow();
  });

  test('should throw on addPage after dispose', async () => {
    using pdfium = await initPdfium();
    const builder = pdfium.createDocument();
    builder.dispose();
    expect(() => builder.addPage()).toThrow();
  });

  test('should throw on loadStandardFont after dispose', async () => {
    using pdfium = await initPdfium();
    const builder = pdfium.createDocument();
    builder.dispose();
    expect(() => builder.loadStandardFont('Helvetica')).toThrow();
  });

  test('should throw on pageCount after dispose', async () => {
    using pdfium = await initPdfium();
    const builder = pdfium.createDocument();
    builder.dispose();
    expect(() => builder.pageCount).toThrow();
  });

  test('page builder should throw on addRectangle after dispose', async () => {
    using pdfium = await initPdfium();
    using builder = pdfium.createDocument();
    const page = builder.addPage({ width: 100, height: 100 });
    page.dispose();
    expect(page.disposed).toBe(true);
    expect(() => page.addRectangle(10, 10, 50, 50)).toThrow();
  });

  test('page builder should throw on addText after dispose', async () => {
    using pdfium = await initPdfium();
    using builder = pdfium.createDocument();
    const font = builder.loadStandardFont('Helvetica');
    const page = builder.addPage({ width: 100, height: 100 });
    page.dispose();
    expect(() => page.addText('test', 10, 10, font, 12)).toThrow();
  });

  test('disposing document builder should dispose its page builders', async () => {
    using pdfium = await initPdfium();
    const builder = pdfium.createDocument();
    const page = builder.addPage({ width: 100, height: 100 });
    expect(page.disposed).toBe(false);
    builder.dispose();
    expect(page.disposed).toBe(true);
  });

  test('rectangle should produce a valid PDF that can be rendered', async () => {
    using pdfium = await initPdfium();
    using builder = pdfium.createDocument();
    const page = builder.addPage({ width: 100, height: 100 });
    page.addRectangle(10, 10, 80, 80, {
      fill: { r: 255, g: 0, b: 0, a: 255 },
    });
    const bytes = builder.save();

    // The saved PDF should re-open and render without errors
    using doc = await pdfium.openDocument(bytes);
    expect(doc.pageCount).toBe(1);
    using p = doc.getPage(0);
    const rendered = p.render({ width: 10, height: 10 });
    expect(rendered.data).toBeInstanceOf(Uint8Array);
    expect(rendered.data.length).toBe(10 * 10 * 4);
  });

  test('INTERNAL access on builder provides handle', async () => {
    using pdfium = await initPdfium();
    using builder = pdfium.createDocument();
    const internal = builder[INTERNAL];
    expect(internal.handle).toBeDefined();
    expect(typeof internal.handle).toBe('number');
    expect(internal.handle).toBeGreaterThan(0);
  });

  test('INTERNAL access throws on disposed builder', async () => {
    using pdfium = await initPdfium();
    const builder = pdfium.createDocument();
    builder.dispose();
    expect(() => builder[INTERNAL]).toThrow();
  });

  test('addRectangle throws for invalid dimensions', async () => {
    using pdfium = await initPdfium();
    using builder = pdfium.createDocument();
    const page = builder.addPage();
    expect(() => page.addRectangle(0, 0, 0, 10)).toThrow();
    expect(() => page.addRectangle(0, 0, 10, 0)).toThrow();
    expect(() => page.addRectangle(0, 0, -10, 10)).toThrow();
    expect(() => page.addRectangle(0, 0, 10, -10)).toThrow();
    expect(() => page.addRectangle(0, 0, NaN, 10)).toThrow();
    expect(() => page.addRectangle(0, 0, 10, Infinity)).toThrow();
  });

  test('addText throws for invalid font size', async () => {
    using pdfium = await initPdfium();
    using builder = pdfium.createDocument();
    const font = builder.loadStandardFont('Helvetica');
    const page = builder.addPage();
    expect(() => page.addText('test', 0, 0, font, 0)).toThrow();
    expect(() => page.addText('test', 0, 0, font, -12)).toThrow();
    expect(() => page.addText('test', 0, 0, font, NaN)).toThrow();
    expect(() => page.addText('test', 0, 0, font, Infinity)).toThrow();
  });

  test('complex chaining preserves page reference', async () => {
    using pdfium = await initPdfium();
    using builder = pdfium.createDocument();
    const font = builder.loadStandardFont('Helvetica');
    const page = builder.addPage();

    // Chain multiple operations and verify we still have the same page
    const result = page
      .addRectangle(0, 0, 100, 100)
      .addText('A', 10, 10, font, 12)
      .addRectangle(50, 50, 100, 100, { fill: { r: 0, g: 255, b: 0, a: 128 } })
      .addText('B', 60, 60, font, 14);

    expect(result).toBe(page);
  });

  test('multiple pages can be built independently', async () => {
    using pdfium = await initPdfium();
    using builder = pdfium.createDocument();
    const font = builder.loadStandardFont('Helvetica');

    const page1 = builder.addPage();
    page1.addText('Page 1', 100, 700, font, 24);

    const page2 = builder.addPage();
    page2.addText('Page 2', 100, 700, font, 24);

    const page3 = builder.addPage();
    page3.addRectangle(50, 50, 500, 700);

    const bytes = builder.save();
    using doc = await pdfium.openDocument(bytes);
    expect(doc.pageCount).toBe(3);

    using p1 = doc.getPage(0);
    expect(p1.getText()).toContain('Page 1');

    using p2 = doc.getPage(1);
    expect(p2.getText()).toContain('Page 2');
  });

  test('deletePage throws for non-integer index', async () => {
    using pdfium = await initPdfium();
    using builder = pdfium.createDocument();
    builder.addPage();

    expect(() => builder.deletePage(NaN)).toThrow();
    expect(() => builder.deletePage(Infinity)).toThrow();
    expect(() => builder.deletePage(-Infinity)).toThrow();
    expect(() => builder.deletePage(1.5)).toThrow();
  });

  test('deletePage works correctly', async () => {
    using pdfium = await initPdfium();
    using builder = pdfium.createDocument();
    builder.addPage();
    builder.addPage();
    builder.addPage();
    expect(builder.pageCount).toBe(3);

    builder.deletePage(1);
    expect(builder.pageCount).toBe(2);

    builder.deletePage(0);
    expect(builder.pageCount).toBe(1);
  });

  test('addPage with all standard fonts', async () => {
    using pdfium = await initPdfium();
    using builder = pdfium.createDocument();
    const page = builder.addPage();

    // Test all standard PDF fonts
    const fonts = [
      'Helvetica',
      'Helvetica-Bold',
      'Helvetica-Oblique',
      'Helvetica-BoldOblique',
      'Times-Roman',
      'Times-Bold',
      'Times-Italic',
      'Times-BoldItalic',
      'Courier',
      'Courier-Bold',
      'Courier-Oblique',
      'Courier-BoldOblique',
      'Symbol',
      'ZapfDingbats',
    ];

    let y = 700;
    for (const fontName of fonts) {
      const font = builder.loadStandardFont(fontName);
      expect(font).toBeDefined();
      expect(font.name).toBe(fontName);
      page.addText(fontName, 50, y, font, 12);
      y -= 20;
    }

    const bytes = builder.save();
    expect(bytes.length).toBeGreaterThan(0);
  });

  test('addRectangle with both fill and stroke', async () => {
    using pdfium = await initPdfium();
    using builder = pdfium.createDocument();
    const page = builder.addPage();

    page.addRectangle(50, 50, 100, 100, {
      fill: { r: 255, g: 0, b: 0, a: 255 },
      stroke: { r: 0, g: 0, b: 255, a: 255 },
      strokeWidth: 3,
    });

    const bytes = builder.save();
    expect(bytes.length).toBeGreaterThan(0);
  });

  test('addRectangle with only stroke (no fill)', async () => {
    using pdfium = await initPdfium();
    using builder = pdfium.createDocument();
    const page = builder.addPage();

    page.addRectangle(50, 50, 100, 100, {
      stroke: { r: 0, g: 255, b: 0, a: 255 },
      strokeWidth: 2,
    });

    const bytes = builder.save();
    expect(bytes.length).toBeGreaterThan(0);
  });

  test('addText with single character', async () => {
    using pdfium = await initPdfium();
    using builder = pdfium.createDocument();
    const font = builder.loadStandardFont('Helvetica');
    const page = builder.addPage();

    page.addText('X', 100, 700, font, 12);
    const bytes = builder.save();
    expect(bytes.length).toBeGreaterThan(0);
  });

  test('addText with unicode characters', async () => {
    using pdfium = await initPdfium();
    using builder = pdfium.createDocument();
    const font = builder.loadStandardFont('Helvetica');
    const page = builder.addPage();

    page.addText('Hello 世界', 100, 700, font, 24);
    const bytes = builder.save();

    using doc = await pdfium.openDocument(bytes);
    using p = doc.getPage(0);
    const text = p.getText();
    expect(text).toContain('Hello');
  });

  test('save with different PDF versions', async () => {
    using pdfium = await initPdfium();
    using builder = pdfium.createDocument();
    builder.addPage();

    // PDF versions 14-17 (PDF 1.4 to 1.7)
    for (const version of [14, 15, 16, 17]) {
      const bytes = builder.save({ version });
      expect(bytes.length).toBeGreaterThan(0);
      // Verify we can reopen
      using doc = await pdfium.openDocument(bytes);
      expect(doc.pageCount).toBe(1);
    }
  });
});
