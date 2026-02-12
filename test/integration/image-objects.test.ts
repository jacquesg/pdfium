/**
 * Integration tests for image object API.
 *
 * Tests the FPDFImageObj_* functions.
 */

import { PageObjectType } from '../../src/core/types.js';
import { PDFiumImageObject } from '../../src/document/page-object.js';
import { describe, expect, test } from '../utils/fixtures.js';

describe('Image Objects with PDF containing images', () => {
  test('should get metadata for real image objects', async ({ openDocument }) => {
    const doc = await openDocument('test_3_with_images.pdf');
    using page = doc.getPage(0);

    // Get page objects and find image objects
    const objects = page.getObjects();
    const imageObjects = objects.filter((o): o is PDFiumImageObject => o instanceof PDFiumImageObject);

    expect(imageObjects.length).toBeGreaterThan(0);

    for (const imgObj of imageObjects) {
      const metadata = imgObj.getMetadata();
      expect(metadata).not.toBeNull();
      if (metadata) {
        expect(metadata.width).toBeTypeOf('number');
        expect(metadata.height).toBeTypeOf('number');
        expect(metadata.horizontalDpi).toBeTypeOf('number');
        expect(metadata.verticalDpi).toBeTypeOf('number');
        expect(metadata.bitsPerPixel).toBeTypeOf('number');
        expect(metadata.colourSpace).toBeTypeOf('string');
        expect(metadata.markedContent).toBeTypeOf('string');
      }

      // Also try to get decoded data (might be null if not decodable or empty, but shouldn't throw)
      const data = imgObj.getDecodedData();
      if (data !== null) {
        expect(data).toBeInstanceOf(Uint8Array);
      }

      // Try get raw data
      const rawData = imgObj.getRawData();
      if (rawData !== null) {
        expect(rawData).toBeInstanceOf(Uint8Array);
      }
    }
  });

  test('should iterate page objects with generator', async ({ openDocument }) => {
    const doc = await openDocument('test_3_with_images.pdf');
    using page = doc.getPage(0);

    const objects = [...page.objects()];
    expect(objects).toBeInstanceOf(Array);
  });

  test('should get object count', async ({ openDocument }) => {
    const doc = await openDocument('test_3_with_images.pdf');
    using page = doc.getPage(0);

    const count = page.objectCount;
    expect(count).toBeTypeOf('number');
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should handle PDF with many images', async ({ openDocument }) => {
    const doc = await openDocument('test_4_with_images.pdf');
    using page = doc.getPage(0);

    const objects = page.getObjects();
    expect(objects).toBeInstanceOf(Array);
    for (const obj of objects) {
      expect(obj.type).toBeTypeOf('string');
      expect(obj.bounds).toBeDefined();
    }
  });

  test('page object has valid structure', async ({ openDocument }) => {
    const doc = await openDocument('test_3_with_images.pdf');
    using page = doc.getPage(0);

    const objects = page.getObjects();
    for (const obj of objects) {
      expect(obj.type).toBeTypeOf('string');
      expect(Object.values(PageObjectType)).toContain(obj.type);
      if (obj.bounds !== undefined) {
        expect(obj.bounds.left).toBeTypeOf('number');
        expect(obj.bounds.right).toBeTypeOf('number');
        expect(obj.bounds.top).toBeTypeOf('number');
        expect(obj.bounds.bottom).toBeTypeOf('number');
      }
    }
  });
});

describe('Image Objects post-dispose guards', () => {
  test('should throw on getMetadata after page dispose', async ({ openDocument }) => {
    const doc = await openDocument('test_3_with_images.pdf');
    using page = doc.getPage(0);
    const objects = page.getObjects();
    const imageObj = objects.find((o): o is PDFiumImageObject => o instanceof PDFiumImageObject);
    expect(imageObj).toBeDefined();
    page.dispose();
    expect(() => imageObj!.getMetadata()).toThrow();
  });

  test('should throw on getDecodedData after page dispose', async ({ openDocument }) => {
    const doc = await openDocument('test_3_with_images.pdf');
    using page = doc.getPage(0);
    const objects = page.getObjects();
    const imageObj = objects.find((o): o is PDFiumImageObject => o instanceof PDFiumImageObject);
    expect(imageObj).toBeDefined();
    page.dispose();
    expect(() => imageObj!.getDecodedData()).toThrow();
  });

  test('should throw on getRawData after page dispose', async ({ openDocument }) => {
    const doc = await openDocument('test_3_with_images.pdf');
    using page = doc.getPage(0);
    const objects = page.getObjects();
    const imageObj = objects.find((o): o is PDFiumImageObject => o instanceof PDFiumImageObject);
    expect(imageObj).toBeDefined();
    page.dispose();
    expect(() => imageObj!.getRawData()).toThrow();
  });
});
