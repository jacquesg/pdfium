/**
 * Integration tests for memory leak detection.
 *
 * Verifies that internal WASM memory tracking reports zero active allocations
 * after resources are disposed.
 */

import { readFile } from 'node:fs/promises';
import { describe, expect, test } from 'vitest';
import { INTERNAL } from '../../src/internal/symbols.js';
import { initPdfium } from '../utils/helpers.js';

describe('Memory Management', () => {
  test('should have zero allocations after library initialization', async () => {
    using pdfium = await initPdfium();
    const memory = pdfium[INTERNAL].memory;
    expect(memory.activeAllocations).toBe(0);
  });

  test('should have zero allocations after document open/close', async () => {
    using pdfium = await initPdfium();
    const memory = pdfium[INTERNAL].memory;
    const pdfData = await readFile('test/fixtures/test_1.pdf');

    {
      using _doc = await pdfium.openDocument(pdfData);
      // Document keeps data buffer and potentially other allocations
      expect(memory.activeAllocations).toBeGreaterThan(0);
    }

    expect(memory.activeAllocations).toBe(0);
  });

  test('should have zero allocations after page render', async () => {
    using pdfium = await initPdfium();
    const memory = pdfium[INTERNAL].memory;
    const pdfData = await readFile('test/fixtures/test_1.pdf');

    {
      using doc = await pdfium.openDocument(pdfData);
      {
        using page = doc.getPage(0);
        // Render creates bitmap and buffer allocations
        page.render({ scale: 1 });
      }
      // Page disposed, but doc still alive
      expect(memory.activeAllocations).toBeGreaterThan(0);
    }

    // All disposed
    expect(memory.activeAllocations).toBe(0);
  });

  test('should have zero allocations after text extraction', async () => {
    using pdfium = await initPdfium();
    const memory = pdfium[INTERNAL].memory;
    const pdfData = await readFile('test/fixtures/test_1.pdf');

    {
      using doc = await pdfium.openDocument(pdfData);
      {
        using page = doc.getPage(0);
        page.getText();
      }
    }

    expect(memory.activeAllocations).toBe(0);
  });

  test('should have zero allocations after fetching annotations', async () => {
    using pdfium = await initPdfium();
    const memory = pdfium[INTERNAL].memory;
    const pdfData = await readFile('test/fixtures/test_6_with_form.pdf');

    {
      using doc = await pdfium.openDocument(pdfData);
      {
        using page = doc.getPage(0);
        // This triggers multiple internal allocations for structs
        const annotations = page.getAnnotations();
        expect(annotations.length).toBeGreaterThan(0);
      }
    }

    expect(memory.activeAllocations).toBe(0);
  });
});
