import { readFile } from 'node:fs/promises';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PageError } from '../../../src/core/errors.js';
import { PageRotation } from '../../../src/core/types.js';
import { PDFium } from '../../../src/pdfium.js';

describe('Page Geometry Edge Cases', () => {
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

  it('should throw for non-finite coordinates in deviceToPage', async () => {
    using doc = await pdfium.openDocument(pdfBytes);
    using page = doc.getPage(0);

    const context = {
      startX: 0,
      startY: 0,
      sizeX: 100,
      sizeY: 100,
      rotate: PageRotation.None,
    };

    expect(() => page.deviceToPage(context, Infinity, 10)).toThrow(PageError);
    expect(() => page.deviceToPage(context, 10, NaN)).toThrow(PageError);

    try {
      page.deviceToPage(context, Infinity, 10);
    } catch (err) {
      expect((err as PageError).message).toMatch(/coordinates must be finite/);
    }
  });

  it('should throw for non-finite coordinates in pageToDevice', async () => {
    using doc = await pdfium.openDocument(pdfBytes);
    using page = doc.getPage(0);

    const context = {
      startX: 0,
      startY: 0,
      sizeX: 100,
      sizeY: 100,
      rotate: PageRotation.None,
    };

    expect(() => page.pageToDevice(context, Infinity, 10)).toThrow(PageError);
    expect(() => page.pageToDevice(context, 10, NaN)).toThrow(PageError);
  });
});
