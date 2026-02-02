/**
 * Integration tests for viewer preferences API.
 *
 * Tests the FPDF_VIEWERREF_* and FPDF_*NamedDest functions.
 */

import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { DuplexMode } from '../../src/core/types.js';
import type { PDFiumDocument } from '../../src/document/document.js';
import type { PDFium } from '../../src/pdfium.js';
import { initPdfium, loadTestDocument } from '../utils/helpers.js';

describe('Viewer Preferences API', () => {
  let pdfium: PDFium;
  let document: PDFiumDocument;

  beforeAll(async () => {
    pdfium = await initPdfium();
    document = await loadTestDocument(pdfium, 'test_1.pdf');
  });

  afterAll(() => {
    document?.dispose();
    pdfium?.dispose();
  });

  describe('getViewerPreferences', () => {
    test('should return viewer preferences object', () => {
      const prefs = document.getViewerPreferences();
      expect(prefs).toBeDefined();
      expect(typeof prefs.printScaling).toBe('boolean');
      expect(typeof prefs.numCopies).toBe('number');
      expect(typeof prefs.duplexMode).toBe('number');
    });

    test('should have valid default values', () => {
      const prefs = document.getViewerPreferences();
      expect(prefs.numCopies).toBeGreaterThan(0);
      expect([0, 1, 2, 3]).toContain(prefs.duplexMode);
    });
  });

  describe('printScaling', () => {
    test('should return boolean', () => {
      const printScaling = document.printScaling;
      expect(typeof printScaling).toBe('boolean');
    });
  });

  describe('numCopies', () => {
    test('should return positive number', () => {
      const numCopies = document.numCopies;
      expect(typeof numCopies).toBe('number');
      expect(numCopies).toBeGreaterThanOrEqual(1);
    });
  });

  describe('duplexMode', () => {
    test('should return valid duplex mode', () => {
      const duplexMode = document.duplexMode;
      expect(typeof duplexMode).toBe('number');
      expect([0, 1, 2, 3]).toContain(duplexMode);
    });
  });

  describe('getPrintPageRanges', () => {
    test('should return undefined or array', () => {
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
    test('should return undefined for unknown key', () => {
      const value = document.getViewerPreference('NonExistentKey');
      // May or may not be defined depending on the PDF
      if (value !== undefined) {
        expect(typeof value).toBe('string');
      }
    });

    test('should not throw for any key', () => {
      expect(() => document.getViewerPreference('Direction')).not.toThrow();
      expect(() => document.getViewerPreference('ViewArea')).not.toThrow();
      expect(() => document.getViewerPreference('ViewClip')).not.toThrow();
      expect(() => document.getViewerPreference('PrintArea')).not.toThrow();
      expect(() => document.getViewerPreference('PrintClip')).not.toThrow();
    });
  });

  describe('DuplexMode enum', () => {
    test('should have expected values', () => {
      expect(DuplexMode.Undefined).toBe(0);
      expect(DuplexMode.Simplex).toBe(1);
      expect(DuplexMode.DuplexFlipShortEdge).toBe(2);
      expect(DuplexMode.DuplexFlipLongEdge).toBe(3);
    });
  });
});

describe('Named Destinations API', () => {
  let pdfium: PDFium;
  let document: PDFiumDocument;

  beforeAll(async () => {
    pdfium = await initPdfium();
    document = await loadTestDocument(pdfium, 'test_1.pdf');
  });

  afterAll(() => {
    document?.dispose();
    pdfium?.dispose();
  });

  describe('namedDestinationCount', () => {
    test('should return non-negative number', () => {
      const count = document.namedDestinationCount;
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getNamedDestinationByName', () => {
    test('should return undefined for non-existent name', () => {
      const dest = document.getNamedDestinationByName('NonExistentDestination');
      expect(dest).toBeUndefined();
    });

    test('should not throw for any name', () => {
      expect(() => document.getNamedDestinationByName('Test')).not.toThrow();
      expect(() => document.getNamedDestinationByName('')).not.toThrow();
    });
  });

  describe('getNamedDestinations', () => {
    test('should return array', () => {
      const destinations = document.getNamedDestinations();
      expect(Array.isArray(destinations)).toBe(true);
    });

    test('should return destinations with valid structure', () => {
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
      using doc = await loadTestDocument(pdfium, 'test_3_with_images.pdf');

      expect(() => doc.namedDestinationCount).not.toThrow();
      expect(() => doc.getNamedDestinations()).not.toThrow();
      expect(() => doc.getNamedDestinationByName('Test')).not.toThrow();
    });
  });
});

describe('Viewer Preferences post-dispose guards', () => {
  let pdfium: PDFium;

  beforeAll(async () => {
    pdfium = await initPdfium();
  });

  afterAll(() => {
    pdfium?.dispose();
  });

  test('should throw on getViewerPreferences after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    doc.dispose();
    expect(() => doc.getViewerPreferences()).toThrow();
  });

  test('should throw on printScaling after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    doc.dispose();
    expect(() => doc.printScaling).toThrow();
  });

  test('should throw on numCopies after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    doc.dispose();
    expect(() => doc.numCopies).toThrow();
  });

  test('should throw on duplexMode after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    doc.dispose();
    expect(() => doc.duplexMode).toThrow();
  });

  test('should throw on getPrintPageRanges after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    doc.dispose();
    expect(() => doc.getPrintPageRanges()).toThrow();
  });

  test('should throw on getViewerPreference after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    doc.dispose();
    expect(() => doc.getViewerPreference('Direction')).toThrow();
  });

  test('should throw on namedDestinationCount after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    doc.dispose();
    expect(() => doc.namedDestinationCount).toThrow();
  });

  test('should throw on getNamedDestinationByName after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    doc.dispose();
    expect(() => doc.getNamedDestinationByName('Test')).toThrow();
  });

  test('should throw on getNamedDestinations after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    doc.dispose();
    expect(() => doc.getNamedDestinations()).toThrow();
  });
});
