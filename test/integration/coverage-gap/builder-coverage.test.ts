import { describe, expect, test } from '../../utils/fixtures.js';

describe('Builder Coverage Gap', () => {
  test('should delete page by index', async ({ pdfium }) => {
    using doc = pdfium.createDocument();
    doc.addPage();
    doc.addPage();
    expect(doc.pageCount).toBe(2);

    doc.deletePage(0);
    expect(doc.pageCount).toBe(1);
  });

  test('should throw when deleting invalid page index', async ({ pdfium }) => {
    using doc = pdfium.createDocument();
    expect(() => doc.deletePage(0)).toThrow(); // Empty doc

    doc.addPage();
    expect(() => doc.deletePage(1)).toThrow();
    expect(() => doc.deletePage(-1)).toThrow();
  });
});
