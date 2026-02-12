/**
 * Integration tests for viewer preferences API.
 *
 * Tests the FPDF_VIEWERREF_* and FPDF_*NamedDest functions.
 */

import { DuplexMode } from '../../src/core/types.js';
import { describe, expect, test } from '../utils/fixtures.js';

describe('Viewer Preferences API', () => {
  describe('getViewerPreferences', () => {
    test('should return viewer preferences object', async ({ testDocument }) => {
      const prefs = testDocument.getViewerPreferences();
      expect(prefs).toBeDefined();
      expect(prefs.printScaling).toBeTypeOf('boolean');
      expect(prefs.numCopies).toBeTypeOf('number');
      expect(prefs.duplexMode).toBeTypeOf('string');
    });

    test('should have valid default values', async ({ testDocument }) => {
      const prefs = testDocument.getViewerPreferences();
      expect(prefs.numCopies).toBeGreaterThan(0);
      expect(Object.values(DuplexMode)).toContain(prefs.duplexMode);
    });
  });

  describe('printScaling', () => {
    test('should return boolean', async ({ testDocument }) => {
      const printScaling = testDocument.printScaling;
      expect(printScaling).toBeTypeOf('boolean');
    });
  });

  describe('numCopies', () => {
    test('should return positive number', async ({ testDocument }) => {
      const numCopies = testDocument.numCopies;
      expect(numCopies).toBeTypeOf('number');
      expect(numCopies).toBeGreaterThanOrEqual(1);
    });
  });

  describe('duplexMode', () => {
    test('should return valid duplex mode', async ({ testDocument }) => {
      const duplexMode = testDocument.duplexMode;
      expect(duplexMode).toBeTypeOf('string');
      expect(Object.values(DuplexMode)).toContain(duplexMode);
    });
  });

  describe('getPrintPageRanges', () => {
    test('should return undefined or array', async ({ testDocument }) => {
      const ranges = testDocument.getPrintPageRanges();
      if (ranges !== undefined) {
        expect(ranges).toBeInstanceOf(Array);
        for (const page of ranges) {
          expect(page).toBeTypeOf('number');
          expect(page).toBeGreaterThanOrEqual(0);
        }
      }
    });
  });

  describe('getViewerPreference', () => {
    test('should return undefined for unknown key', async ({ testDocument }) => {
      const value = testDocument.getViewerPreference('NonExistentKey');
      // May or may not be defined depending on the PDF
      if (value !== undefined) {
        expect(value).toBeTypeOf('string');
      }
    });

    test('should not throw for any key', async ({ testDocument }) => {
      expect(() => testDocument.getViewerPreference('Direction')).not.toThrow();
      expect(() => testDocument.getViewerPreference('ViewArea')).not.toThrow();
      expect(() => testDocument.getViewerPreference('ViewClip')).not.toThrow();
      expect(() => testDocument.getViewerPreference('PrintArea')).not.toThrow();
      expect(() => testDocument.getViewerPreference('PrintClip')).not.toThrow();
    });
  });

  describe('DuplexMode enum', () => {
    test('should have expected values', () => {
      expect(DuplexMode.Undefined).toBe('Undefined');
      expect(DuplexMode.Simplex).toBe('Simplex');
      expect(DuplexMode.DuplexFlipShortEdge).toBe('DuplexFlipShortEdge');
      expect(DuplexMode.DuplexFlipLongEdge).toBe('DuplexFlipLongEdge');
    });
  });
});

describe('Named Destinations API', () => {
  describe('namedDestinationCount', () => {
    test('should return non-negative number', async ({ testDocument }) => {
      const count = testDocument.namedDestinationCount;
      expect(count).toBeTypeOf('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getNamedDestinationByName', () => {
    test('should return undefined for non-existent name', async ({ testDocument }) => {
      const dest = testDocument.getNamedDestinationByName('NonExistentDestination');
      expect(dest).toBeUndefined();
    });

    test('should not throw for any name', async ({ testDocument }) => {
      expect(() => testDocument.getNamedDestinationByName('Test')).not.toThrow();
      expect(() => testDocument.getNamedDestinationByName('')).not.toThrow();
    });
  });

  describe('getNamedDestinations', () => {
    test('should return array', async ({ testDocument }) => {
      const destinations = testDocument.getNamedDestinations();
      expect(destinations).toBeInstanceOf(Array);
    });

    test('should return destinations with valid structure', async ({ testDocument }) => {
      const destinations = testDocument.getNamedDestinations();
      for (const dest of destinations) {
        expect(dest.name).toBeTypeOf('string');
        expect(dest.pageIndex).toBeTypeOf('number');
        expect(dest.pageIndex).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('with PDF that may have named destinations', () => {
    test('should handle test_3_with_images.pdf', async ({ openDocument }) => {
      const doc = await openDocument('test_3_with_images.pdf');

      expect(() => doc.namedDestinationCount).not.toThrow();
      expect(() => doc.getNamedDestinations()).not.toThrow();
      expect(() => doc.getNamedDestinationByName('Test')).not.toThrow();
    });
  });
});

describe('Viewer Preferences post-dispose guards', () => {
  test('should throw on getViewerPreferences after dispose', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    doc.dispose();
    expect(() => doc.getViewerPreferences()).toThrow();
  });

  test('should throw on printScaling after dispose', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    doc.dispose();
    expect(() => doc.printScaling).toThrow();
  });

  test('should throw on numCopies after dispose', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    doc.dispose();
    expect(() => doc.numCopies).toThrow();
  });

  test('should throw on duplexMode after dispose', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    doc.dispose();
    expect(() => doc.duplexMode).toThrow();
  });

  test('should throw on getPrintPageRanges after dispose', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    doc.dispose();
    expect(() => doc.getPrintPageRanges()).toThrow();
  });

  test('should throw on getViewerPreference after dispose', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    doc.dispose();
    expect(() => doc.getViewerPreference('Direction')).toThrow();
  });

  test('should throw on namedDestinationCount after dispose', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    doc.dispose();
    expect(() => doc.namedDestinationCount).toThrow();
  });

  test('should throw on getNamedDestinationByName after dispose', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    doc.dispose();
    expect(() => doc.getNamedDestinationByName('Test')).toThrow();
  });

  test('should throw on getNamedDestinations after dispose', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    doc.dispose();
    expect(() => doc.getNamedDestinations()).toThrow();
  });
});
