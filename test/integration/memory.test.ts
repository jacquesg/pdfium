/**
 * Integration tests for memory leak detection.
 *
 * Verifies that internal WASM memory tracking reports zero active allocations
 * after resources are disposed.
 */

import { INTERNAL } from '../../src/internal/symbols.js';
import { describe, expect, test } from '../utils/fixtures.js';

describe('Memory Management', () => {
  test('should have zero allocations after library initialization', async ({ pdfium }) => {
    const memory = pdfium[INTERNAL].memory;
    expect(memory.activeAllocations).toBe(0);
  });

  test('should have zero allocations after document open/close', async ({ pdfium, openDocument }) => {
    const memory = pdfium[INTERNAL].memory;

    {
      const _doc = await openDocument('test_1.pdf');
      // Document keeps data buffer and potentially other allocations
      expect(memory.activeAllocations).toBeGreaterThan(0);
      _doc.dispose();
    }

    expect(memory.activeAllocations).toBe(0);
  });

  test('should have zero allocations after page render', async ({ pdfium, openDocument }) => {
    const memory = pdfium[INTERNAL].memory;

    {
      const doc = await openDocument('test_1.pdf');
      {
        using page = doc.getPage(0);
        // Render creates bitmap and buffer allocations
        page.render({ scale: 1 });
      }
      // Page disposed, but doc still alive
      expect(memory.activeAllocations).toBeGreaterThan(0);
      doc.dispose();
    }

    // All disposed
    expect(memory.activeAllocations).toBe(0);
  });

  test('should have zero allocations after text extraction', async ({ pdfium, openDocument }) => {
    const memory = pdfium[INTERNAL].memory;

    {
      const doc = await openDocument('test_1.pdf');
      {
        using page = doc.getPage(0);
        page.getText();
      }
      doc.dispose();
    }

    expect(memory.activeAllocations).toBe(0);
  });

  test('should have zero allocations after fetching annotations', async ({ pdfium, openDocument }) => {
    const memory = pdfium[INTERNAL].memory;

    {
      const doc = await openDocument('test_6_with_form.pdf');
      {
        using page = doc.getPage(0);
        // This triggers multiple internal allocations for structs
        const annotations = page.getAnnotations();
        expect(annotations.length).toBeGreaterThan(0);
      }
      doc.dispose();
    }

    expect(memory.activeAllocations).toBe(0);
  });
});
