/**
 * Integration tests for extended page object API.
 *
 * Tests the page object wrapper properties and methods (fillColour, strokeColour, etc.).
 */

import { BlendMode, LineCapStyle, LineJoinStyle } from '../../src/core/types.js';
import { describe, expect, test } from '../utils/fixtures.js';

describe('Extended Page Objects with Real Objects', () => {
  test('should handle object properties on test_1.pdf (Text objects)', async ({ testPage }) => {
    const objects = testPage.getObjects();
    expect(objects.length).toBeGreaterThan(0);

    for (const obj of objects) {
      // Test getters that should work on any object (or return default/null)
      const fill = obj.fillColour;
      if (fill) {
        expect(fill.r).toBeTypeOf('number');
        expect(fill.g).toBeTypeOf('number');
        expect(fill.b).toBeTypeOf('number');
        expect(fill.a).toBeTypeOf('number');
      }

      const stroke = obj.strokeColour;
      if (stroke) {
        expect(stroke.r).toBeTypeOf('number');
      }

      const strokeWidth = obj.strokeWidth;
      if (strokeWidth !== null) {
        expect(strokeWidth).toBeTypeOf('number');
      }

      const matrix = obj.matrix;
      if (matrix) {
        expect(matrix.a).toBeTypeOf('number');
      }

      // Line cap/join might return defaults
      const lineCap = obj.lineCap;
      expect(lineCap).toBeTypeOf('string');

      const lineJoin = obj.lineJoin;
      expect(lineJoin).toBeTypeOf('string');

      // Set and read back dash pattern to cover buffer logic
      const newDash = { dashArray: [3, 3], phase: 0 };
      const setSuccess = obj.setDashPattern(newDash);
      expect(setSuccess).toBe(true);

      const checkDash = obj.dashPattern;
      expect(checkDash).not.toBeNull();
      if (checkDash) {
        expect(checkDash.dashArray.length).toBe(2);
        expect(checkDash.dashArray[0]).toBeCloseTo(3);
        expect(checkDash.dashArray[1]).toBeCloseTo(3);
      }

      // Rotated bounds
      const bounds = obj.rotatedBounds;
      if (bounds) {
        expect(bounds.x1).toBeTypeOf('number');
      }
    }
  });
});

describe('Extended Page Objects API - Colour Operations', () => {
  describe('fillColour', () => {
    test('should return null or a valid colour', async ({ testPage }) => {
      const objects = testPage.getObjects();
      expect(objects.length).toBeGreaterThan(0);
      const obj = objects[0]!;
      const result = obj.fillColour;
      if (result !== null) {
        expect(result.r).toBeTypeOf('number');
        expect(result.g).toBeTypeOf('number');
        expect(result.b).toBeTypeOf('number');
        expect(result.a).toBeTypeOf('number');
      }
    });
  });

  describe('strokeColour', () => {
    test('should return null or a valid colour', async ({ testPage }) => {
      const objects = testPage.getObjects();
      expect(objects.length).toBeGreaterThan(0);
      const obj = objects[0]!;
      const result = obj.strokeColour;
      if (result !== null) {
        expect(result.r).toBeTypeOf('number');
        expect(result.g).toBeTypeOf('number');
        expect(result.b).toBeTypeOf('number');
        expect(result.a).toBeTypeOf('number');
      }
    });
  });

  describe('strokeWidth', () => {
    test('should return null or a number', async ({ testPage }) => {
      const objects = testPage.getObjects();
      expect(objects.length).toBeGreaterThan(0);
      const obj = objects[0]!;
      const result = obj.strokeWidth;
      if (result !== null) {
        expect(result).toBeTypeOf('number');
      }
    });
  });
});

describe('Extended Page Objects API - Matrix Operations', () => {
  describe('matrix', () => {
    test('should return null or a valid matrix', async ({ testPage }) => {
      const objects = testPage.getObjects();
      expect(objects.length).toBeGreaterThan(0);
      const obj = objects[0]!;
      const result = obj.matrix;
      if (result !== null) {
        expect(result.a).toBeTypeOf('number');
      }
    });
  });

  describe('setMatrix', () => {
    test('should return boolean', async ({ testPage }) => {
      const objects = testPage.getObjects();
      expect(objects.length).toBeGreaterThan(0);
      const obj = objects[0]!;
      const result = obj.setMatrix({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
      expect(result).toBeTypeOf('boolean');
    });

    test('should handle identity matrix', async ({ testPage }) => {
      const objects = testPage.getObjects();
      const obj = objects[0]!;
      expect(() => obj.setMatrix({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })).not.toThrow();
    });

    test('should handle scale matrix', async ({ testPage }) => {
      const objects = testPage.getObjects();
      const obj = objects[0]!;
      expect(() => obj.setMatrix({ a: 2, b: 0, c: 0, d: 2, e: 0, f: 0 })).not.toThrow();
    });

    test('should handle translation matrix', async ({ testPage }) => {
      const objects = testPage.getObjects();
      const obj = objects[0]!;
      expect(() => obj.setMatrix({ a: 1, b: 0, c: 0, d: 1, e: 100, f: 100 })).not.toThrow();
    });
  });
});

describe('Extended Page Objects API - Line Styles', () => {
  describe('lineCap', () => {
    test('should return a LineCapStyle value', async ({ testPage }) => {
      const objects = testPage.getObjects();
      expect(objects.length).toBeGreaterThan(0);
      const obj = objects[0]!;
      const result = obj.lineCap;
      expect([LineCapStyle.Butt, LineCapStyle.Round, LineCapStyle.Square]).toContain(result);
    });
  });

  describe('setLineCap', () => {
    test('should return boolean', async ({ testPage }) => {
      const objects = testPage.getObjects();
      const obj = objects[0]!;
      const result = obj.setLineCap(LineCapStyle.Butt);
      expect(result).toBeTypeOf('boolean');
    });

    test('should handle all cap styles', async ({ testPage }) => {
      const objects = testPage.getObjects();
      const obj = objects[0]!;
      expect(() => obj.setLineCap(LineCapStyle.Butt)).not.toThrow();
      expect(() => obj.setLineCap(LineCapStyle.Round)).not.toThrow();
      expect(() => obj.setLineCap(LineCapStyle.Square)).not.toThrow();
    });
  });

  describe('lineJoin', () => {
    test('should return a LineJoinStyle value', async ({ testPage }) => {
      const objects = testPage.getObjects();
      expect(objects.length).toBeGreaterThan(0);
      const obj = objects[0]!;
      const result = obj.lineJoin;
      expect([LineJoinStyle.Miter, LineJoinStyle.Round, LineJoinStyle.Bevel]).toContain(result);
    });
  });

  describe('setLineJoin', () => {
    test('should return boolean', async ({ testPage }) => {
      const objects = testPage.getObjects();
      const obj = objects[0]!;
      const result = obj.setLineJoin(LineJoinStyle.Miter);
      expect(result).toBeTypeOf('boolean');
    });

    test('should handle all join styles', async ({ testPage }) => {
      const objects = testPage.getObjects();
      const obj = objects[0]!;
      expect(() => obj.setLineJoin(LineJoinStyle.Miter)).not.toThrow();
      expect(() => obj.setLineJoin(LineJoinStyle.Round)).not.toThrow();
      expect(() => obj.setLineJoin(LineJoinStyle.Bevel)).not.toThrow();
    });
  });
});

describe('Extended Page Objects API - Dash Pattern', () => {
  describe('dashPattern', () => {
    test('should return null or a valid dash pattern', async ({ testPage }) => {
      const objects = testPage.getObjects();
      expect(objects.length).toBeGreaterThan(0);
      const obj = objects[0]!;
      const result = obj.dashPattern;
      if (result !== null) {
        expect(result.dashArray).toBeInstanceOf(Array);
        expect(result.phase).toBeTypeOf('number');
      }
    });
  });

  describe('setDashPattern', () => {
    test('should return boolean', async ({ testPage }) => {
      const objects = testPage.getObjects();
      const obj = objects[0]!;
      const result = obj.setDashPattern({ dashArray: [5, 3], phase: 0 });
      expect(result).toBeTypeOf('boolean');
    });

    test('should handle empty dash array', async ({ testPage }) => {
      const objects = testPage.getObjects();
      const obj = objects[0]!;
      expect(() => obj.setDashPattern({ dashArray: [], phase: 0 })).not.toThrow();
    });

    test('should handle various dash patterns', async ({ testPage }) => {
      const objects = testPage.getObjects();
      const obj = objects[0]!;
      expect(() => obj.setDashPattern({ dashArray: [5], phase: 0 })).not.toThrow();
      expect(() => obj.setDashPattern({ dashArray: [5, 3], phase: 2 })).not.toThrow();
      expect(() => obj.setDashPattern({ dashArray: [1, 2, 3, 4], phase: 1 })).not.toThrow();
    });
  });

  describe('setDashPhase', () => {
    test('should return boolean', async ({ testPage }) => {
      const objects = testPage.getObjects();
      const obj = objects[0]!;
      const result = obj.setDashPhase(0);
      expect(result).toBeTypeOf('boolean');
    });

    test('should handle different phase values', async ({ testPage }) => {
      const objects = testPage.getObjects();
      const obj = objects[0]!;
      expect(() => obj.setDashPhase(0)).not.toThrow();
      expect(() => obj.setDashPhase(5)).not.toThrow();
      expect(() => obj.setDashPhase(10.5)).not.toThrow();
    });
  });
});

describe('Extended Page Objects API - Object Management', () => {
  describe('hasTransparency', () => {
    test('should return a boolean', async ({ testPage }) => {
      const objects = testPage.getObjects();
      expect(objects.length).toBeGreaterThan(0);
      const obj = objects[0]!;
      const result = obj.hasTransparency;
      expect(result).toBeTypeOf('boolean');
    });
  });

  describe('setBlendMode', () => {
    test('should not throw', async ({ testPage }) => {
      const objects = testPage.getObjects();
      const obj = objects[0]!;
      expect(() => obj.setBlendMode(BlendMode.Normal)).not.toThrow();
    });

    test('should handle different blend modes', async ({ testPage }) => {
      const objects = testPage.getObjects();
      const obj = objects[0]!;
      expect(() => obj.setBlendMode(BlendMode.Normal)).not.toThrow();
      expect(() => obj.setBlendMode(BlendMode.Multiply)).not.toThrow();
      expect(() => obj.setBlendMode(BlendMode.Screen)).not.toThrow();
      expect(() => obj.setBlendMode(BlendMode.Overlay)).not.toThrow();
    });
  });
});

describe('Extended Page Objects API - Clip Path', () => {
  describe('hasClipPath', () => {
    test('should return a boolean', async ({ testPage }) => {
      const objects = testPage.getObjects();
      expect(objects.length).toBeGreaterThan(0);
      const obj = objects[0]!;
      const result = obj.hasClipPath;
      expect(result).toBeTypeOf('boolean');
    });
  });

  describe('transformClipPath', () => {
    test('should not throw', async ({ testPage }) => {
      const objects = testPage.getObjects();
      const obj = objects[0]!;
      expect(() => obj.transformClipPath({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })).not.toThrow();
    });

    test('should handle identity transform', async ({ testPage }) => {
      const objects = testPage.getObjects();
      const obj = objects[0]!;
      expect(() => obj.transformClipPath({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })).not.toThrow();
    });

    test('should handle scale transform', async ({ testPage }) => {
      const objects = testPage.getObjects();
      const obj = objects[0]!;
      expect(() => obj.transformClipPath({ a: 2, b: 0, c: 0, d: 2, e: 0, f: 0 })).not.toThrow();
    });
  });
});

describe('Extended Page Objects API - Rotated Bounds', () => {
  describe('rotatedBounds', () => {
    test('should return null or valid quad points', async ({ testPage }) => {
      const objects = testPage.getObjects();
      expect(objects.length).toBeGreaterThan(0);
      const obj = objects[0]!;
      const result = obj.rotatedBounds;
      if (result !== null) {
        expect(result.x1).toBeTypeOf('number');
      }
    });
  });
});

describe('Extended Page Objects with different PDFs', () => {
  test('should handle test_3_with_images.pdf', async ({ openDocument }) => {
    const doc = await openDocument('test_3_with_images.pdf');
    using page = doc.getPage(0);

    const objects = page.getObjects();
    expect(objects.length).toBeGreaterThan(0);

    const obj = objects[0]!;
    expect(() => obj.fillColour).not.toThrow();
    expect(() => obj.lineCap).not.toThrow();
    expect(() => obj.dashPattern).not.toThrow();
  });
});

describe('Extended Page Objects post-dispose guards', () => {
  test('should throw on fillColour after dispose', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    using page = doc.getPage(0);
    const objects = page.getObjects();
    const obj = objects[0]!;
    page.dispose();
    expect(() => obj.fillColour).toThrow();
  });

  test('should throw on strokeColour after dispose', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    using page = doc.getPage(0);
    const objects = page.getObjects();
    const obj = objects[0]!;
    page.dispose();
    expect(() => obj.strokeColour).toThrow();
  });

  test('should throw on strokeWidth after dispose', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    using page = doc.getPage(0);
    const objects = page.getObjects();
    const obj = objects[0]!;
    page.dispose();
    expect(() => obj.strokeWidth).toThrow();
  });

  test('should throw on matrix after dispose', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    using page = doc.getPage(0);
    const objects = page.getObjects();
    const obj = objects[0]!;
    page.dispose();
    expect(() => obj.matrix).toThrow();
  });

  test('should throw on setMatrix after dispose', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    using page = doc.getPage(0);
    const objects = page.getObjects();
    const obj = objects[0]!;
    page.dispose();
    expect(() => obj.setMatrix({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })).toThrow();
  });

  test('should throw on lineCap after dispose', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    using page = doc.getPage(0);
    const objects = page.getObjects();
    const obj = objects[0]!;
    page.dispose();
    expect(() => obj.lineCap).toThrow();
  });

  test('should throw on setLineCap after dispose', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    using page = doc.getPage(0);
    const objects = page.getObjects();
    const obj = objects[0]!;
    page.dispose();
    expect(() => obj.setLineCap(LineCapStyle.Butt)).toThrow();
  });

  test('should throw on lineJoin after dispose', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    using page = doc.getPage(0);
    const objects = page.getObjects();
    const obj = objects[0]!;
    page.dispose();
    expect(() => obj.lineJoin).toThrow();
  });

  test('should throw on setLineJoin after dispose', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    using page = doc.getPage(0);
    const objects = page.getObjects();
    const obj = objects[0]!;
    page.dispose();
    expect(() => obj.setLineJoin(LineJoinStyle.Miter)).toThrow();
  });

  test('should throw on dashPattern after dispose', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    using page = doc.getPage(0);
    const objects = page.getObjects();
    const obj = objects[0]!;
    page.dispose();
    expect(() => obj.dashPattern).toThrow();
  });

  test('should throw on setDashPattern after dispose', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    using page = doc.getPage(0);
    const objects = page.getObjects();
    const obj = objects[0]!;
    page.dispose();
    expect(() => obj.setDashPattern({ dashArray: [], phase: 0 })).toThrow();
  });

  test('should throw on setDashPhase after dispose', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    using page = doc.getPage(0);
    const objects = page.getObjects();
    const obj = objects[0]!;
    page.dispose();
    expect(() => obj.setDashPhase(0)).toThrow();
  });

  test('should throw on destroy after dispose', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    using page = doc.getPage(0);
    const objects = page.getObjects();
    const obj = objects[0]!;
    page.dispose();
    expect(() => obj.destroy()).toThrow();
  });

  test('should throw on hasTransparency after dispose', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    using page = doc.getPage(0);
    const objects = page.getObjects();
    const obj = objects[0]!;
    page.dispose();
    expect(() => obj.hasTransparency).toThrow();
  });

  test('should throw on setBlendMode after dispose', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    using page = doc.getPage(0);
    const objects = page.getObjects();
    const obj = objects[0]!;
    page.dispose();
    expect(() => obj.setBlendMode(BlendMode.Normal)).toThrow();
  });

  test('should throw on hasClipPath after dispose', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    using page = doc.getPage(0);
    const objects = page.getObjects();
    const obj = objects[0]!;
    page.dispose();
    expect(() => obj.hasClipPath).toThrow();
  });

  test('should throw on transformClipPath after dispose', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    using page = doc.getPage(0);
    const objects = page.getObjects();
    const obj = objects[0]!;
    page.dispose();
    expect(() => obj.transformClipPath({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })).toThrow();
  });

  test('should throw on rotatedBounds after dispose', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    using page = doc.getPage(0);
    const objects = page.getObjects();
    const obj = objects[0]!;
    page.dispose();
    expect(() => obj.rotatedBounds).toThrow();
  });
});
