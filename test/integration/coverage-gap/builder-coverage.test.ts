import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PDFium } from '../../../src/pdfium.js';

describe('Builder Coverage Gap', () => {
  let pdfium: PDFium;

  beforeAll(async () => {
    pdfium = await PDFium.init();
  });

  afterAll(() => {
    pdfium.dispose();
  });

  it('should delete page by index', () => {
    using doc = pdfium.createDocument();
    doc.addPage();
    doc.addPage();
    expect(doc.pageCount).toBe(2);

    doc.deletePage(0);
    expect(doc.pageCount).toBe(1);
  });

  it('should throw when deleting invalid page index', () => {
    using doc = pdfium.createDocument();
    expect(() => doc.deletePage(0)).toThrow(); // Empty doc

    doc.addPage();
    expect(() => doc.deletePage(1)).toThrow();
    expect(() => doc.deletePage(-1)).toThrow();
  });
});
