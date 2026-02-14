import { afterEach, describe, expect, it, vi } from 'vitest';
import type { WorkerPDFiumDocument } from '../../../../src/context/worker-client.js';
import {
  buildPrintDocumentHtml,
  renderPrintPageToBlobUrl,
  resolvePrintPages,
  waitForIframeLoad,
  waitForImageLoad,
} from '../../../../src/react/internal/print-pipeline.js';

describe('print-pipeline', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('resolves all pages when pageRange is undefined', () => {
    expect(resolvePrintPages(4, undefined)).toEqual([0, 1, 2, 3]);
  });

  it('filters invalid print pages from pageRange', () => {
    expect(resolvePrintPages(5, [-1, 0, 2, 5, 3.2, 4])).toEqual([0, 2, 4]);
  });

  it('builds printable html with image tags for each blob url', () => {
    const html = buildPrintDocumentHtml(['blob:a', 'blob:b']);
    expect(html).toContain('<img src="blob:a"');
    expect(html).toContain('<img src="blob:b"');
    expect(html).toContain('@media print');
    expect(html).toContain('@media screen');
  });

  it('renders a page into a blob url', async () => {
    const renderPage = vi.fn().mockResolvedValue({
      data: new Uint8ClampedArray(4),
      width: 1,
      height: 1,
    });
    const doc = { renderPage } as unknown as WorkerPDFiumDocument;

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      createImageData: vi.fn().mockReturnValue({ data: new Uint8ClampedArray(4), width: 1, height: 1 }),
      putImageData: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => {
      callback(new Blob(['x'], { type: 'image/png' }));
    });
    const createObjectUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:page-0');

    const result = await renderPrintPageToBlobUrl({
      document: doc,
      pageIndex: 0,
      scale: 3,
      signal: new AbortController().signal,
    });

    expect(result).toBe('blob:page-0');
    expect(renderPage).toHaveBeenCalledWith(0, { scale: 3 });
    expect(createObjectUrlSpy).toHaveBeenCalledTimes(1);
  });

  it('returns null when aborted before rendering starts', async () => {
    const controller = new AbortController();
    controller.abort();

    const renderPage = vi.fn();
    const doc = { renderPage } as unknown as WorkerPDFiumDocument;

    const result = await renderPrintPageToBlobUrl({
      document: doc,
      pageIndex: 0,
      scale: 2,
      signal: controller.signal,
    });

    expect(result).toBeNull();
    expect(renderPage).not.toHaveBeenCalled();
  });

  it('waitForIframeLoad resolves on load event', async () => {
    const iframe = document.createElement('iframe');
    const controller = new AbortController();
    const promise = waitForIframeLoad(iframe, controller.signal);
    iframe.dispatchEvent(new Event('load'));
    await expect(promise).resolves.toBeUndefined();
  });

  it('waitForImageLoad resolves on image load event', async () => {
    const image = document.createElement('img');
    const controller = new AbortController();
    const promise = waitForImageLoad(image, controller.signal);
    image.dispatchEvent(new Event('load'));
    await expect(promise).resolves.toBeUndefined();
  });
});
