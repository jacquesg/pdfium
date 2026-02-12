import { PageError } from '../../../src/core/errors.js';
import { PageRotation } from '../../../src/core/types.js';
import { describe, expect, test } from '../../utils/fixtures.js';

describe('Page Geometry Edge Cases', () => {
  test('should throw for non-finite coordinates in deviceToPage', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
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

  test('should throw for non-finite coordinates in pageToDevice', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
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
