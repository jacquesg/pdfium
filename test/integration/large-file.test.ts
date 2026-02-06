/**
 * Tests for large file handling.
 *
 * Simulates a large file (e.g., 100MB) to verify memory limits and
 * safe error handling.
 */

import { describe, expect, test } from 'vitest';
import { DocumentError, PDFiumErrorCode } from '../../src/core/errors.js';
import { initPdfium } from '../utils/helpers.js';

// Skip if not enough memory (e.g. CI environments with tight limits)
// 100MB allocation + overhead might fail on small VMs
const LARGE_SIZE = 100 * 1024 * 1024;

describe('Large File Handling', () => {
  test('should handle large file allocation gracefully (even if invalid PDF)', async () => {
    using pdfium = await initPdfium();
    let largeBuffer: Uint8Array;

    try {
      largeBuffer = new Uint8Array(LARGE_SIZE);
    } catch {
      console.warn('Skipping large file test: allocation failed');
      return;
    }

    try {
      // It's just zeros, so it's invalid PDF, but it tests the allocation path
      await pdfium.openDocument(largeBuffer);
      expect.fail('Should have thrown DOC_FORMAT_INVALID');
    } catch (error) {
      expect(error).toBeInstanceOf(DocumentError);
      // Should be format error, not allocation error (unless WASM OOM)
      // If it throws allocation error, that's also "handling it", but we prefer specific error codes
      if (error instanceof DocumentError && error.code !== PDFiumErrorCode.DOC_FORMAT_INVALID) {
        // If it's not format invalid, it might be OOM or Unknown
        expect([PDFiumErrorCode.MEMORY_ALLOCATION_FAILED, PDFiumErrorCode.DOC_LOAD_UNKNOWN]).toContain(error.code);
      }
    }
  });

  test('should respect maxDocumentSize limit', async () => {
    // Init with small limit
    using pdfium = await initPdfium({ limits: { maxDocumentSize: 1024 } });
    const buffer = new Uint8Array(2048);

    await expect(pdfium.openDocument(buffer)).rejects.toThrow(/exceeds maximum/);
  });
});
