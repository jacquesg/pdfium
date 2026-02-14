/**
 * Integration tests for bookmarks and named destinations using external PDFs
 * from the chromium/pdfium test corpus.
 */

import { describe, expect, test } from '../utils/fixtures.js';

describe('Bookmarks (bookmarks.pdf)', () => {
  test('should return top-level bookmarks', async ({ openDocument }) => {
    const doc = await openDocument('pdfium/bookmarks.pdf');
    const bookmarks = doc.getBookmarks();

    expect(bookmarks.length).toBeGreaterThanOrEqual(3);
  });

  test('should have correct top-level bookmark titles', async ({ openDocument }) => {
    const doc = await openDocument('pdfium/bookmarks.pdf');
    const bookmarks = doc.getBookmarks();
    const titles = bookmarks.map((b) => b.title);

    expect(titles).toContain('A Good Beginning');
    expect(titles).toContain('Open Middle');
    expect(titles).toContain('A Good Closed Ending');
  });

  test('should have nested children on "Open Middle"', async ({ openDocument }) => {
    const doc = await openDocument('pdfium/bookmarks.pdf');
    const bookmarks = doc.getBookmarks();
    const openMiddle = bookmarks.find((b) => b.title === 'Open Middle');

    expect(openMiddle).toBeDefined();
    expect(openMiddle!.children.length).toBeGreaterThanOrEqual(1);
    expect(openMiddle!.children[0]!.title).toBe('Open Middle Descendant');
  });

  test('should have nested children on "A Good Closed Ending"', async ({ openDocument }) => {
    const doc = await openDocument('pdfium/bookmarks.pdf');
    const bookmarks = doc.getBookmarks();
    const ending = bookmarks.find((b) => b.title === 'A Good Closed Ending');

    expect(ending).toBeDefined();
    expect(ending!.children.length).toBeGreaterThanOrEqual(2);
    const childTitles = ending!.children.map((c) => c.title);
    expect(childTitles).toContain('A Good Closed Ending Descendant');
    expect(childTitles).toContain('A Good Closed Ending Descendant 2');
  });

  test('bookmarks() generator yields same results lazily', async ({ openDocument }) => {
    const doc = await openDocument('pdfium/bookmarks.pdf');
    const generated: string[] = [];
    for (const bookmark of doc.bookmarks()) {
      generated.push(bookmark.title);
    }
    const array = doc.getBookmarks().map((b) => b.title);
    expect(generated).toEqual(array);
  });

  test('first bookmark pageIndex is number or undefined', async ({ openDocument }) => {
    const doc = await openDocument('pdfium/bookmarks.pdf');
    const bookmarks = doc.getBookmarks();
    const first = bookmarks.find((b) => b.title === 'A Good Beginning');

    expect(first).toBeDefined();
    // pageIndex may be undefined if bookmark uses a named dest rather than direct page ref
    expect(first!.pageIndex === undefined || typeof first!.pageIndex === 'number').toBe(true);
  });
});

describe('Named Destinations (named_dests.pdf)', () => {
  test('should have named destinations', async ({ openDocument }) => {
    const doc = await openDocument('pdfium/named_dests.pdf');
    expect(doc.namedDestinationCount).toBeGreaterThanOrEqual(2);
  });

  test('getNamedDestinationByName("First") returns destination with pageIndex', async ({ openDocument }) => {
    const doc = await openDocument('pdfium/named_dests.pdf');
    const dest = doc.getNamedDestinationByName('First');

    expect(dest).toBeDefined();
    expect(dest!.name).toBe('First');
    expect(dest!.pageIndex).toBeTypeOf('number');
  });

  test('getNamedDestinationByName("Next") returns destination', async ({ openDocument }) => {
    const doc = await openDocument('pdfium/named_dests.pdf');
    const dest = doc.getNamedDestinationByName('Next');

    expect(dest).toBeDefined();
    expect(dest!.name).toBe('Next');
    expect(dest!.pageIndex).toBeTypeOf('number');
  });

  test('getNamedDestinationByName("NonExistent") returns undefined', async ({ openDocument }) => {
    const doc = await openDocument('pdfium/named_dests.pdf');
    const dest = doc.getNamedDestinationByName('NonExistent');
    expect(dest).toBeUndefined();
  });

  test('getNamedDestinations() returns array with First and Next', async ({ openDocument }) => {
    const doc = await openDocument('pdfium/named_dests.pdf');
    const dests = doc.getNamedDestinations();

    expect(dests.length).toBeGreaterThanOrEqual(2);
    const names = dests.map((d) => d.name);
    expect(names).toContain('First');
    expect(names).toContain('Next');
  });
});

describe('Tagged PDF (tagged_table.pdf)', () => {
  test('isTagged returns true', async ({ openDocument }) => {
    const doc = await openDocument('pdfium/tagged_table.pdf');
    expect(doc.isTagged()).toBe(true);
  });
});

describe('Linearised PDF (linearized.pdf)', () => {
  test('opens successfully and has pages', async ({ openDocument }) => {
    const doc = await openDocument('pdfium/linearized.pdf');
    expect(doc.pageCount).toBeGreaterThan(0);
  });

  test('basic page access works', async ({ openDocument }) => {
    const doc = await openDocument('pdfium/linearized.pdf');
    using page = doc.getPage(0);
    expect(page.width).toBeGreaterThan(0);
    expect(page.height).toBeGreaterThan(0);
  });
});
