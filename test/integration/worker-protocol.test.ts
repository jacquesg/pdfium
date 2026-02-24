/**
 * Integration tests for the worker protocol.
 *
 * These tests exercise the full worker pipeline — real WASM running inside a
 * real Node.js `worker_threads` Worker, communicating via the protocol layer.
 * No mocks are used: every message travels through `postMessage` / `parentPort`.
 *
 * IMPORTANT: Requires `pnpm build` to produce `dist/worker.js` before running.
 */

import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { WorkerPDFium } from '../../src/context/worker-client.js';
import { PDFiumErrorCode } from '../../src/core/errors.js';

const WORKER_JS = new URL('../../dist/worker.js', import.meta.url);
const HAS_DIST = existsSync(new URL('../../dist/worker.js', import.meta.url));

async function loadWasmBinary(): Promise<ArrayBuffer> {
  const buffer = await readFile('dist/vendor/pdfium.wasm');
  const result = new ArrayBuffer(buffer.byteLength);
  new Uint8Array(result).set(buffer);
  return result;
}

async function loadTestPdf(filename: string): Promise<Uint8Array> {
  return new Uint8Array(await readFile(`test/fixtures/${filename}`));
}

/**
 * Helper to create a fresh WorkerPDFium instance.
 * Each describe block that needs isolation should use its own instance.
 */
async function createWorkerPDFium(): Promise<WorkerPDFium> {
  const wasmBinary = await loadWasmBinary();
  return WorkerPDFium.create({
    workerUrl: WORKER_JS,
    wasmBinary,
    timeout: 15_000,
  });
}

describe.skipIf(!HAS_DIST)('Worker Protocol Integration', { timeout: 30_000 }, () => {
  describe('basic operations', () => {
    let workerPdfium!: WorkerPDFium;

    beforeAll(async () => {
      workerPdfium = await createWorkerPDFium();
    });

    afterAll(async () => {
      await workerPdfium?.dispose();
    });

    test('ping returns true', async () => {
      const alive = await workerPdfium.ping();
      expect(alive).toBe(true);
    });

    test('open document and get page count', async () => {
      const pdf = await loadTestPdf('test_1.pdf');
      await using doc = await workerPdfium.openDocument(pdf);
      expect(doc.pageCount).toBe(4);
    });

    test('render a page and return valid RGBA data', async () => {
      const pdf = await loadTestPdf('test_1.pdf');
      await using doc = await workerPdfium.openDocument(pdf);
      const result = await doc.renderPage(0, { scale: 0.25 });

      expect(result.width).toBeGreaterThan(0);
      expect(result.height).toBeGreaterThan(0);
      expect(result.data).toBeInstanceOf(Uint8Array);
      expect(result.data.byteLength).toBe(result.width * result.height * 4);
    });

    test('extract text via worker', async () => {
      const pdf = await loadTestPdf('test_1.pdf');
      await using doc = await workerPdfium.openDocument(pdf);
      await using page = await doc.getPage(0);
      const text = await page.getText();

      expect(text).toBeTypeOf('string');
      expect(text.length).toBeGreaterThan(0);
    });

    test('get text layout returns text and rects', async () => {
      const pdf = await loadTestPdf('test_1.pdf');
      await using doc = await workerPdfium.openDocument(pdf);
      await using page = await doc.getPage(0);
      const layout = await page.getTextLayout();

      expect(layout.text).toBeTypeOf('string');
      expect(layout.rects).toBeInstanceOf(Float32Array);
    });
  });

  describe('page queries', () => {
    let workerPdfium!: WorkerPDFium;

    beforeAll(async () => {
      workerPdfium = await createWorkerPDFium();
    });

    afterAll(async () => {
      await workerPdfium?.dispose();
    });

    test('get page info returns rotation, boxes, charCount', async () => {
      const pdf = await loadTestPdf('test_1.pdf');
      await using doc = await workerPdfium.openDocument(pdf);
      await using page = await doc.getPage(0);
      const info = await page.getPageInfo();

      expect(info.rotation).toBeTypeOf('string');
      expect(info.hasTransparency).toBeTypeOf('boolean');
      expect(info.charCount).toBeTypeOf('number');
      expect(info.charCount).toBeGreaterThanOrEqual(0);
      expect(info.boundingBox).toBeDefined();
    });

    test('get annotations from annotated PDF', async () => {
      const pdf = await loadTestPdf('pdfium/annots.pdf');
      await using doc = await workerPdfium.openDocument(pdf);
      await using page = await doc.getPage(0);
      const annotations = await page.getAnnotations();

      expect(annotations.length).toBeGreaterThan(0);
      for (const annot of annotations) {
        expect(annot.index).toBeTypeOf('number');
        expect(annot.type).toBeTypeOf('string');
        expect(annot.bounds).toBeDefined();
      }
    });

    test('get page objects', async () => {
      const pdf = await loadTestPdf('test_1.pdf');
      await using doc = await workerPdfium.openDocument(pdf);
      await using page = await doc.getPage(0);
      const objects = await page.getPageObjects();

      expect(objects.length).toBeGreaterThan(0);
      for (const obj of objects) {
        expect(obj.type).toBeTypeOf('string');
        expect(obj.bounds).toBeDefined();
      }
    });

    test('find text returns search results', async () => {
      const pdf = await loadTestPdf('test_1.pdf');
      await using doc = await workerPdfium.openDocument(pdf);
      await using page = await doc.getPage(0);

      const text = await page.getText();
      if (text.length > 3) {
        const query = text.slice(0, 3);
        const results = await page.findText(query);
        expect(results.length).toBeGreaterThanOrEqual(1);
        for (const result of results) {
          expect(result.charIndex).toBeTypeOf('number');
          expect(result.charCount).toBeTypeOf('number');
        }
      }
    });

    test('get character info at valid index', async () => {
      const pdf = await loadTestPdf('test_1.pdf');
      await using doc = await workerPdfium.openDocument(pdf);
      await using page = await doc.getPage(0);
      const info = await page.getCharacterInfo(0);

      expect(info).toBeDefined();
      if (info) {
        expect(info.unicode).toBeTypeOf('number');
        expect(info.fontSize).toBeTypeOf('number');
      }
    });

    test('get web links', async () => {
      const pdf = await loadTestPdf('pdfium/weblinks.pdf');
      await using doc = await workerPdfium.openDocument(pdf);
      await using page = await doc.getPage(0);
      const links = await page.getWebLinks();

      expect(links.length).toBeGreaterThan(0);
      for (const link of links) {
        expect(link.url).toBeTypeOf('string');
        expect(link.url.length).toBeGreaterThan(0);
      }
    });

    test('get structure tree from tagged PDF', async () => {
      const pdf = await loadTestPdf('test_3_with_images.pdf');
      await using doc = await workerPdfium.openDocument(pdf);
      await using page = await doc.getPage(0);
      const tree = await page.getStructureTree();

      expect(tree).not.toBeNull();
      if (tree) {
        expect(tree.length).toBeGreaterThan(0);
        for (const element of tree) {
          expect(element.type).toBeTypeOf('string');
          expect(element.children).toBeInstanceOf(Array);
        }
      }
    });
  });

  describe('document queries', () => {
    let workerPdfium!: WorkerPDFium;

    beforeAll(async () => {
      workerPdfium = await createWorkerPDFium();
    });

    afterAll(async () => {
      await workerPdfium?.dispose();
    });

    test('get document info', async () => {
      const pdf = await loadTestPdf('test_1.pdf');
      await using doc = await workerPdfium.openDocument(pdf);
      const info = await doc.getDocumentInfo();

      expect(info.isTagged).toBeTypeOf('boolean');
      expect(info.namedDestinationCount).toBeTypeOf('number');
    });

    test('get bookmarks from document with bookmarks', async () => {
      const pdf = await loadTestPdf('pdfium/bookmarks.pdf');
      await using doc = await workerPdfium.openDocument(pdf);
      const bookmarks = await doc.getBookmarks();

      expect(bookmarks.length).toBeGreaterThan(0);
      const titles = bookmarks.map((b) => b.title);
      expect(titles).toContain('A Good Beginning');
    });

    test('get named destinations', async () => {
      const pdf = await loadTestPdf('pdfium/named_dests.pdf');
      await using doc = await workerPdfium.openDocument(pdf);
      const dests = await doc.getNamedDestinations();

      expect(dests.length).toBeGreaterThanOrEqual(2);
      const names = dests.map((d) => d.name);
      expect(names).toContain('First');
    });

    test('get named destination by name', async () => {
      const pdf = await loadTestPdf('pdfium/named_dests.pdf');
      await using doc = await workerPdfium.openDocument(pdf);

      const dest = await doc.getNamedDestinationByName('First');
      expect(dest).not.toBeNull();
      expect(dest!.name).toBe('First');
      expect(dest!.pageIndex).toBeTypeOf('number');

      const missing = await doc.getNamedDestinationByName('NonExistent');
      expect(missing).toBeNull();
    });

    test('get attachments from PDF with attachments', async () => {
      const pdf = await loadTestPdf('test_9_with_attachment.pdf');
      await using doc = await workerPdfium.openDocument(pdf);
      const attachments = await doc.getAttachments();

      expect(attachments.length).toBe(1);
      expect(attachments[0]!.name).toBe('test-attachment.txt');
      expect(attachments[0]!.data).toBeDefined();
    });

    test('save document and reopen', async () => {
      const pdf = await loadTestPdf('test_1.pdf');
      await using doc = await workerPdfium.openDocument(pdf);
      const savedBytes = await doc.save();

      expect(savedBytes).toBeInstanceOf(Uint8Array);
      expect(savedBytes.byteLength).toBeGreaterThan(0);

      const header = new TextDecoder().decode(savedBytes.subarray(0, 5));
      expect(header).toBe('%PDF-');

      await using reopened = await workerPdfium.openDocument(savedBytes);
      expect(reopened.pageCount).toBe(4);
    });

    test('handle password-protected documents', async () => {
      const pdf = await loadTestPdf('test_1_pass_12345678.pdf');

      await expect(workerPdfium.openDocument(pdf)).rejects.toMatchObject({
        code: PDFiumErrorCode.DOC_PASSWORD_REQUIRED,
      });

      await using doc = await workerPdfium.openDocument(pdf, { password: '12345678' });
      expect(doc.pageCount).toBe(4);
    });
  });

  describe('concurrency', () => {
    let workerPdfium!: WorkerPDFium;

    beforeAll(async () => {
      workerPdfium = await createWorkerPDFium();
    });

    afterAll(async () => {
      await workerPdfium?.dispose();
    });

    test('concurrent requests do not cross-contaminate', async () => {
      const pdf = await loadTestPdf('test_1.pdf');
      await using doc = await workerPdfium.openDocument(pdf);

      const [page0, page1] = await Promise.all([doc.getPage(0), doc.getPage(1)]);

      const [text0, text1] = await Promise.all([page0.getText(), page1.getText()]);

      expect(text0.length).toBeGreaterThan(0);
      expect(text1.length).toBeGreaterThan(0);

      await page0.dispose();
      await page1.dispose();
    });
  });
});
