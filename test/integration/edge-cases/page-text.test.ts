import { readFile } from 'node:fs/promises';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PDFium } from '../../../src/pdfium.js';

describe('Page Text Edge Cases', () => {
  let pdfium: PDFium;
  let pdfBytes: Uint8Array;

  beforeAll(async () => {
    pdfium = await PDFium.init();
    const buffer = await readFile('test/fixtures/test_1.pdf');
    pdfBytes = new Uint8Array(buffer);
  });

  afterAll(() => {
    pdfium.dispose();
  });

  it('should return empty string for blank page', async () => {
    // Create a new blank document with one page
    const builder = pdfium.createDocument();
    builder.addPage({ width: 100, height: 100 });
    const bytes = builder.save();
    builder.dispose();

    using doc = await pdfium.openDocument(bytes);
    using page = doc.getPage(0);
    expect(page.getText()).toBe('');
  });

  it('should handle getCharBox with invalid index', async () => {
    using doc = await pdfium.openDocument(pdfBytes);
    using page = doc.getPage(0);

    expect(page.getCharBox(-1)).toBeUndefined();
    expect(page.getCharBox(99999)).toBeUndefined();
  });

  it('should handle getCharIndexAtPos with out of bounds coordinates', async () => {
    using doc = await pdfium.openDocument(pdfBytes);
    using page = doc.getPage(0);

    // Should return -1 (which typescript wrapper might map or return as is)
    // The type definition says returns number.
    const index = page.getCharIndexAtPos(99999, 99999, 10, 10);
    expect(index).toBe(-1);
  });

  it('should handle getCharacterInfo with invalid index', async () => {
    using doc = await pdfium.openDocument(pdfBytes);
    using page = doc.getPage(0);

    expect(page.getCharacterInfo(-1)).toBeUndefined();
    expect(page.getCharacterInfo(99999)).toBeUndefined();
  });

  it('should get char loose box', async () => {
    using doc = await pdfium.openDocument(pdfBytes);
    using page = doc.getPage(0);

    // Page 0 of test_1.pdf has text.
    const box = page.getCharLooseBox(0);
    expect(box).toBeDefined();
    expect(box?.left).toBeGreaterThan(0);
    expect(box?.top).toBeGreaterThan(0);
  });

  it('should get text layout', async () => {
    using doc = await pdfium.openDocument(pdfBytes);
    using page = doc.getPage(0);

    const layout = page.getTextLayout();
    expect(layout.text.length).toBeGreaterThan(0);
    expect(layout.rects.length).toBe(layout.text.length * 4);

    // Check first rect
    expect(layout.rects[0]).toBeGreaterThan(0); // left
  });
});
