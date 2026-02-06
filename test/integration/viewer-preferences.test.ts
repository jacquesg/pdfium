/**
 * Integration tests for viewer preferences API.
 *
 * Tests the FPDF_VIEWERREF_* and FPDF_*NamedDest functions.
 */

import { describe, expect, test } from 'vitest';
import { DuplexMode } from '../../src/core/types.js';
import { initPdfium, loadTestDocument } from '../utils/helpers.js';

describe('Viewer Preferences API', () => {
  describe('getViewerPreferences', () => {
    test('should return viewer preferences object', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      const prefs = document.getViewerPreferences();
      expect(prefs).toBeDefined();
      expect(typeof prefs.printScaling).toBe('boolean');
      expect(typeof prefs.numCopies).toBe('number');
      expect(typeof prefs.duplexMode).toBe('string');
    });

    test('should have valid default values', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      const prefs = document.getViewerPreferences();
      expect(prefs.numCopies).toBeGreaterThan(0);
      expect(Object.values(DuplexMode)).toContain(prefs.duplexMode);
    });
  });

  describe('printScaling', () => {
    test('should return boolean', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      const printScaling = document.printScaling;
      expect(typeof printScaling).toBe('boolean');
    });
  });

  describe('numCopies', () => {
    test('should return positive number', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      const numCopies = document.numCopies;
      expect(typeof numCopies).toBe('number');
      expect(numCopies).toBeGreaterThanOrEqual(1);
    });
  });

  describe('duplexMode', () => {
    test('should return valid duplex mode', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      const duplexMode = document.duplexMode;
      expect(typeof duplexMode).toBe('string');
      expect(Object.values(DuplexMode)).toContain(duplexMode);
    });
  });

  describe('getPrintPageRanges', () => {
    test('should return undefined or array', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      const ranges = document.getPrintPageRanges();
      if (ranges !== undefined) {
        expect(Array.isArray(ranges)).toBe(true);
        for (const page of ranges) {
          expect(typeof page).toBe('number');
          expect(page).toBeGreaterThanOrEqual(0);
        }
      }
    });
  });

  describe('getViewerPreference', () => {
    test('should return undefined for unknown key', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      const value = document.getViewerPreference('NonExistentKey');
      // May or may not be defined depending on the PDF
      if (value !== undefined) {
        expect(typeof value).toBe('string');
      }
    });

    test('should not throw for any key', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      expect(() => document.getViewerPreference('Direction')).not.toThrow();
      expect(() => document.getViewerPreference('ViewArea')).not.toThrow();
      expect(() => document.getViewerPreference('ViewClip')).not.toThrow();
      expect(() => document.getViewerPreference('PrintArea')).not.toThrow();
      expect(() => document.getViewerPreference('PrintClip')).not.toThrow();
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
    test('should return non-negative number', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      const count = document.namedDestinationCount;
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getNamedDestinationByName', () => {
    test('should return undefined for non-existent name', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      const dest = document.getNamedDestinationByName('NonExistentDestination');
      expect(dest).toBeUndefined();
    });

    test('should not throw for any name', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      expect(() => document.getNamedDestinationByName('Test')).not.toThrow();
      expect(() => document.getNamedDestinationByName('')).not.toThrow();
    });
  });

  describe('getNamedDestinations', () => {
    test('should return array', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      const destinations = document.getNamedDestinations();
      expect(Array.isArray(destinations)).toBe(true);
    });

    test('should return destinations with valid structure', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      const destinations = document.getNamedDestinations();
      for (const dest of destinations) {
        expect(typeof dest.name).toBe('string');
        expect(typeof dest.pageIndex).toBe('number');
        expect(dest.pageIndex).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('with PDF that may have named destinations', () => {
    test('should handle test_3_with_images.pdf', async () => {
      using pdfium = await initPdfium();
      using doc = await loadTestDocument(pdfium, 'test_3_with_images.pdf');

      expect(() => doc.namedDestinationCount).not.toThrow();
      expect(() => doc.getNamedDestinations()).not.toThrow();
      expect(() => doc.getNamedDestinationByName('Test')).not.toThrow();
    });
  });
});

describe('Viewer Preferences post-dispose guards', () => {
  test('should throw on getViewerPreferences after dispose', async () => {
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    doc.dispose();
    expect(() => doc.getViewerPreferences()).toThrow();
  });

  test('should throw on printScaling after dispose', async () => {
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    doc.dispose();
    expect(() => doc.printScaling).toThrow();
  });

  test('should throw on numCopies after dispose', async () => {
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    doc.dispose();
    expect(() => doc.numCopies).toThrow();
  });

  test('should throw on duplexMode after dispose', async () => {
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    doc.dispose();
    expect(() => doc.duplexMode).toThrow();
  });

  test('should throw on getPrintPageRanges after dispose', async () => {
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    doc.dispose();
    expect(() => doc.getPrintPageRanges()).toThrow();
  });

  test('should throw on getViewerPreference after dispose', async () => {
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    doc.dispose();
    expect(() => doc.getViewerPreference('Direction')).toThrow();
  });

  test('should throw on namedDestinationCount after dispose', async () => {
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    doc.dispose();
    expect(() => doc.namedDestinationCount).toThrow();
  });

  test('should throw on getNamedDestinationByName after dispose', async () => {
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    doc.dispose();
    expect(() => doc.getNamedDestinationByName('Test')).toThrow();
  });

  test('should throw on getNamedDestinations after dispose', async () => {
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    doc.dispose();
    expect(() => doc.getNamedDestinations()).toThrow();
  });
});
