/**
 * Integration tests for the React viewer's underlying worker-level operations.
 *
 * These tests exercise the real WASM module through the worker pipeline, testing
 * the operations that `usePageDimensions`, `PDFDocumentView`, and `useDocumentSearch`
 * depend on — without React rendering (Node.js environment, no DOM).
 *
 * IMPORTANT: Requires `pnpm build` to produce `dist/worker.js` before running.
 */

import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import type { WorkerPDFiumDocument } from '../../../src/context/worker-client.js';
import { WorkerPDFium } from '../../../src/context/worker-client.js';

const WORKER_JS = new URL('../../../dist/worker.js', import.meta.url);
const HAS_DIST = existsSync(new URL('../../../dist/worker.js', import.meta.url));

async function loadWasmBinary(): Promise<ArrayBuffer> {
  const buffer = await readFile('dist/vendor/pdfium.wasm');
  const result = new ArrayBuffer(buffer.byteLength);
  new Uint8Array(result).set(buffer);
  return result;
}

async function loadTestPdf(filename: string): Promise<Uint8Array> {
  return new Uint8Array(await readFile(`test/fixtures/${filename}`));
}

describe.skipIf(!HAS_DIST)('React Viewer Integration', { timeout: 30_000 }, () => {
  let workerPdfium!: WorkerPDFium;
  let doc!: WorkerPDFiumDocument;

  beforeAll(async () => {
    workerPdfium = await createWorkerPDFium();
    const pdf = await loadTestPdf('test_1.pdf');
    doc = await workerPdfium.openDocument(pdf);
  });

  afterAll(async () => {
    await doc?.dispose();
    await workerPdfium?.dispose();
  });

  describe('getAllPageDimensions (usePageDimensions dependency)', () => {
    test('returns dimensions array matching page count', async () => {
      const dimensions = await doc.getAllPageDimensions();

      expect(dimensions).toHaveLength(doc.pageCount);
    });

    test('each dimension has positive width and height', async () => {
      const dimensions = await doc.getAllPageDimensions();

      for (const dim of dimensions) {
        expect(dim.width).toBeGreaterThan(0);
        expect(dim.height).toBeGreaterThan(0);
      }
    });

    test('dimensions match individual page queries', async () => {
      const dimensions = await doc.getAllPageDimensions();

      // Verify first page matches getPage().getPageInfo()
      await using page = await doc.getPage(0);
      const info = await page.getPageInfo();
      const box = info.boundingBox;
      const expectedWidth = Math.abs(box.right - box.left);
      const expectedHeight = Math.abs(box.top - box.bottom);

      const firstDim = dimensions[0];
      expect(firstDim).toBeDefined();
      expect(firstDim?.width).toBeCloseTo(expectedWidth, 0);
      expect(firstDim?.height).toBeCloseTo(expectedHeight, 0);
    });
  });

  describe('renderPage (PDFDocumentView/PDFPageView dependency)', () => {
    test('renders multiple pages without errors', async () => {
      const pageCount = doc.pageCount;
      expect(pageCount).toBeGreaterThanOrEqual(2);

      for (let i = 0; i < Math.min(pageCount, 3); i++) {
        const result = await doc.renderPage(i, { scale: 0.25 });

        expect(result.width).toBeGreaterThan(0);
        expect(result.height).toBeGreaterThan(0);
        expect(result.originalWidth).toBeGreaterThan(0);
        expect(result.originalHeight).toBeGreaterThan(0);
        expect(result.data).toBeInstanceOf(Uint8Array);
        expect(result.data.byteLength).toBe(result.width * result.height * 4);
      }
    });

    test('renders at different scales', async () => {
      const result1 = await doc.renderPage(0, { scale: 0.5 });
      const result2 = await doc.renderPage(0, { scale: 1 });

      // Larger scale = larger dimensions
      expect(result2.width).toBeGreaterThan(result1.width);
      expect(result2.height).toBeGreaterThan(result1.height);

      // Original dimensions stay the same regardless of scale
      expect(result1.originalWidth).toBe(result2.originalWidth);
      expect(result1.originalHeight).toBe(result2.originalHeight);
    });
  });

  describe('findText (useDocumentSearch dependency)', () => {
    test('finds text across pages using extracted text', async () => {
      // Extract actual text from page 0, then search for its first 3 characters
      await using page = await doc.getPage(0);
      const layout = await page.getTextLayout();
      const text = layout.text.trim();
      expect(text.length).toBeGreaterThan(3);

      const query = text.substring(0, 3);
      const results = await page.findText(query);

      expect(results).toBeInstanceOf(Array);
      expect(results.length).toBeGreaterThan(0);
    });

    test('returns empty array for text not in document', async () => {
      await using page = await doc.getPage(0);
      const results = await page.findText('xyznonexistent123');

      expect(results).toEqual([]);
    });

    test('search results have charIndex, charCount, and rects', async () => {
      await using page = await doc.getPage(0);
      const layout = await page.getTextLayout();
      const text = layout.text.trim();
      const query = text.substring(0, 3);
      const results = await page.findText(query);

      expect(results.length).toBeGreaterThan(0);
      const match = results[0];
      expect(match).toBeDefined();
      expect(match?.charIndex).toBeTypeOf('number');
      expect(match?.charCount).toBeTypeOf('number');
      expect(match?.charCount).toBeGreaterThan(0);
      expect(match?.rects).toBeInstanceOf(Array);
      expect(match?.rects.length).toBeGreaterThan(0);
    });
  });
});

async function createWorkerPDFium(): Promise<WorkerPDFium> {
  const wasmBinary = await loadWasmBinary();
  return WorkerPDFium.create({
    workerUrl: WORKER_JS,
    wasmBinary,
    timeout: 15_000,
  });
}
