import { readFile } from 'node:fs/promises';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AnnotationType } from '../../../src/core/types.js';
import { PDFium } from '../../../src/pdfium.js';

describe('Annotation Edge Cases', () => {
  let pdfium: PDFium;
  let pdfBytes: Uint8Array;

  beforeAll(async () => {
    pdfium = await PDFium.init();
    const buffer = await readFile('test/fixtures/test_1.pdf'); // using simple pdf, will add annotation to test
    pdfBytes = new Uint8Array(buffer);
  });

  afterAll(() => {
    pdfium.dispose();
  });

  it('should return null link from non-link annotation', async () => {
    using doc = await pdfium.openDocument(pdfBytes);
    using page = doc.getPage(0);

    using annot = page.createAnnotation(AnnotationType.Text);
    expect(annot).not.toBeNull();
    if (annot) {
      expect(annot.getLink()).toBeNull();
    }
  });
});
