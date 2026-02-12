import { describe, expect, test } from '../../utils/fixtures.js';

describe('Page Text Edge Cases', () => {
  test('should return empty string for blank page', async ({ pdfium }) => {
    // Create a new blank document with one page
    const builder = pdfium.createDocument();
    builder.addPage({ width: 100, height: 100 });
    const bytes = builder.save();
    builder.dispose();

    using doc = await pdfium.openDocument(bytes);
    using page = doc.getPage(0);
    expect(page.getText()).toBe('');
  });

  test('should handle getCharBox with invalid index', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    using page = doc.getPage(0);

    expect(page.getCharBox(-1)).toBeUndefined();
    expect(page.getCharBox(99999)).toBeUndefined();
  });

  test('should handle getCharIndexAtPos with out of bounds coordinates', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    using page = doc.getPage(0);

    const index = page.getCharIndexAtPos(99999, 99999, 10, 10);
    expect(index).toBe(-1);
  });

  test('should handle getCharacterInfo with invalid index', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    using page = doc.getPage(0);

    expect(page.getCharacterInfo(-1)).toBeUndefined();
    expect(page.getCharacterInfo(99999)).toBeUndefined();
  });

  test('should get char loose box', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    using page = doc.getPage(0);

    const box = page.getCharLooseBox(0);
    expect(box).toBeDefined();
    expect(box?.left).toBeGreaterThan(0);
    expect(box?.top).toBeGreaterThan(0);
  });

  test('should get text layout', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    using page = doc.getPage(0);

    const layout = page.getTextLayout();
    expect(layout.text.length).toBeGreaterThan(0);
    expect(layout.rects.length).toBe(layout.text.length * 4);

    // Check first rect
    expect(layout.rects[0]).toBeGreaterThan(0); // left
  });
});
