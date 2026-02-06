/**
 * Round-trip testing utilities for PDF save/reload verification.
 *
 * @module test/utils/round-trip
 */

import type { SaveOptions } from '../../src/core/types.js';
import type { PDFiumDocument } from '../../src/document/document.js';
import type { PDFium } from '../../src/pdfium.js';

/**
 * Options for round-trip testing.
 */
export interface RoundTripOptions {
  /** Save options for the document. */
  saveOptions?: SaveOptions;
  /** Whether to compare page counts. Default: true. */
  comparePageCount?: boolean;
  /** Whether to compare text content. Default: true. */
  compareText?: boolean;
  /** Whether to compare rendered output. Default: false (expensive). */
  compareRendered?: boolean;
  /** Tolerance for text comparison (0-1, where 0 means exact match). Default: 0. */
  textTolerance?: number;
}

/**
 * Result of a round-trip test.
 */
export interface RoundTripResult {
  /** Whether the round-trip was successful. */
  success: boolean;
  /** The saved PDF bytes. */
  savedBytes: Uint8Array;
  /** The reloaded document (must be disposed by caller). */
  reloadedDocument: PDFiumDocument;
  /** Page count matches. */
  pageCountMatches?: boolean;
  /** Text content matches for each page. */
  textMatches?: boolean[];
  /** Any error messages. */
  errors: string[];
}

/**
 * Perform a round-trip test: save a document and reload it.
 *
 * This is useful for verifying that document modifications are persisted correctly.
 *
 * @param pdfium - The PDFium instance.
 * @param document - The document to test.
 * @param options - Round-trip options.
 * @returns The round-trip test result. Note: caller must dispose reloadedDocument.
 */
export async function roundTripDocument(
  pdfium: PDFium,
  document: PDFiumDocument,
  options: RoundTripOptions = {},
): Promise<RoundTripResult> {
  const { saveOptions = {}, comparePageCount = true, compareText = true, textTolerance = 0 } = options;

  const errors: string[] = [];

  // Save the document
  let savedBytes: Uint8Array;
  try {
    savedBytes = document.save(saveOptions);
  } catch (error) {
    return {
      success: false,
      savedBytes: new Uint8Array(0),
      reloadedDocument: document, // Return original on failure
      errors: [`Failed to save document: ${String(error)}`],
    };
  }

  // Reload the document
  let reloadedDocument: PDFiumDocument;
  try {
    reloadedDocument = await pdfium.openDocument(savedBytes);
  } catch (error) {
    return {
      success: false,
      savedBytes,
      reloadedDocument: document, // Return original on failure
      errors: [`Failed to reload saved document: ${String(error)}`],
    };
  }

  let pageCountMatches: boolean | undefined;
  let textMatches: boolean[] | undefined;

  // Compare page counts
  if (comparePageCount) {
    const originalPageCount = document.pageCount;
    const reloadedPageCount = reloadedDocument.pageCount;
    pageCountMatches = originalPageCount === reloadedPageCount;

    if (!pageCountMatches) {
      errors.push(`Page count mismatch: original=${originalPageCount}, reloaded=${reloadedPageCount}`);
    }
  }

  // Compare text content
  if (compareText && (pageCountMatches ?? true)) {
    textMatches = [];
    const pageCount = Math.min(document.pageCount, reloadedDocument.pageCount);

    for (let i = 0; i < pageCount; i++) {
      using originalPage = document.getPage(i);
      using reloadedPage = reloadedDocument.getPage(i);

      const originalText = originalPage.getText();
      const reloadedText = reloadedPage.getText();

      let matches: boolean;
      if (textTolerance === 0) {
        matches = originalText === reloadedText;
      } else {
        // Allow some tolerance for whitespace differences
        const normalise = (s: string) => s.replace(/\s+/g, ' ').trim();
        const original = normalise(originalText);
        const reloaded = normalise(reloadedText);
        const distance = levenshteinDistance(original, reloaded);
        const maxLen = Math.max(original.length, reloaded.length);
        const similarity = maxLen > 0 ? 1 - distance / maxLen : 1;
        matches = similarity >= 1 - textTolerance;
      }

      textMatches.push(matches);

      if (!matches) {
        errors.push(`Text mismatch on page ${i}`);
      }
    }
  }

  const success = errors.length === 0;

  const result: RoundTripResult = {
    success,
    savedBytes,
    reloadedDocument,
    errors,
  };

  if (pageCountMatches !== undefined) {
    result.pageCountMatches = pageCountMatches;
  }

  if (textMatches !== undefined) {
    result.textMatches = textMatches;
  }

  return result;
}

/**
 * Verify a function that modifies a document preserves its changes after save/reload.
 *
 * @param pdfium - The PDFium instance.
 * @param document - The document to test.
 * @param verifyFn - Function to verify the document state (called before and after round-trip).
 * @param options - Round-trip options.
 * @throws {Error} If verification fails.
 */
export async function verifyRoundTrip(
  pdfium: PDFium,
  document: PDFiumDocument,
  verifyFn: (doc: PDFiumDocument) => void | Promise<void>,
  options: RoundTripOptions = {},
): Promise<void> {
  // Verify original document
  await verifyFn(document);

  // Perform round-trip
  const result = await roundTripDocument(pdfium, document, options);

  if (!result.success) {
    throw new Error(`Round-trip failed: ${result.errors.join('; ')}`);
  }

  // Verify reloaded document
  using reloadedDoc = result.reloadedDocument;
  await verifyFn(reloadedDoc);
}

/**
 * Calculate the Levenshtein distance between two strings.
 */
function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    const row = matrix[0];
    if (row !== undefined) {
      row[j] = j;
    }
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const row = matrix[i];
      const prevRow = matrix[i - 1];
      if (row === undefined || prevRow === undefined) continue;

      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        row[j] = prevRow[j - 1] ?? 0;
      } else {
        row[j] = Math.min((prevRow[j - 1] ?? 0) + 1, (row[j - 1] ?? 0) + 1, (prevRow[j] ?? 0) + 1);
      }
    }
  }

  return matrix[b.length]?.[a.length] ?? Math.max(a.length, b.length);
}

/**
 * Create a test helper for repeated round-trip testing.
 */
export function createRoundTripTester(pdfium: PDFium) {
  return {
    /**
     * Test that a document survives a save/reload cycle.
     */
    async testRoundTrip(document: PDFiumDocument, options?: RoundTripOptions): Promise<RoundTripResult> {
      return roundTripDocument(pdfium, document, options);
    },

    /**
     * Verify a document modification persists after round-trip.
     */
    async verifyModification(
      document: PDFiumDocument,
      verifyFn: (doc: PDFiumDocument) => void | Promise<void>,
      options?: RoundTripOptions,
    ): Promise<void> {
      return verifyRoundTrip(pdfium, document, verifyFn, options);
    },
  };
}
