import type { WorkerPDFiumDocument } from '../../context/worker-client.js';

interface RenderPrintPageInput {
  document: WorkerPDFiumDocument;
  pageIndex: number;
  scale: number;
  signal: AbortSignal;
}

function resolvePrintPages(pageCount: number, pageRange: readonly number[] | undefined): number[] {
  const pages = pageRange ?? Array.from({ length: pageCount }, (_, index) => index);
  return pages.filter((pageIndex) => Number.isInteger(pageIndex) && pageIndex >= 0 && pageIndex < pageCount);
}

function buildPrintDocumentHtml(blobUrls: readonly string[]): string {
  const imgTags = blobUrls.map((url) => `<img src="${url}" style="width:100%;page-break-after:always;">`).join('\n');
  return `<!DOCTYPE html><html><head><style>@media print{body{margin:0}img{display:block;width:100%;page-break-after:always}img:last-child{page-break-after:auto}}@media screen{body{display:none}}</style></head><body>${imgTags}</body></html>`;
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('canvas.toBlob returned null'));
    }, 'image/png');
  });
}

async function renderPrintPageToBlobUrl(input: RenderPrintPageInput): Promise<string | null> {
  const { document, pageIndex, scale, signal } = input;
  if (signal.aborted) return null;

  const result = await document.renderPage(pageIndex, { scale });
  if (signal.aborted) return null;

  const canvas = globalThis.document.createElement('canvas');
  canvas.width = result.width;
  canvas.height = result.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const imageData = ctx.createImageData(result.width, result.height);
  imageData.data.set(result.data);
  ctx.putImageData(imageData, 0, 0);

  const blob = await canvasToBlob(canvas);
  if (signal.aborted) return null;
  return URL.createObjectURL(blob);
}

function waitForIframeLoad(iframe: HTMLIFrameElement, signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.resolve();
  if (iframe.contentDocument?.readyState === 'complete') return Promise.resolve();

  return new Promise((resolve) => {
    const cleanup = () => {
      iframe.removeEventListener('load', onLoad);
      signal.removeEventListener('abort', onAbort);
    };
    const onLoad = () => {
      cleanup();
      resolve();
    };
    const onAbort = () => {
      cleanup();
      resolve();
    };
    iframe.addEventListener('load', onLoad, { once: true });
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

function waitForImageLoad(image: HTMLImageElement, signal: AbortSignal): Promise<void> {
  if (image.complete || signal.aborted) return Promise.resolve();

  return new Promise((resolve) => {
    const cleanup = () => {
      image.removeEventListener('load', onDone);
      image.removeEventListener('error', onDone);
      signal.removeEventListener('abort', onAbort);
    };
    const onDone = () => {
      cleanup();
      resolve();
    };
    const onAbort = () => {
      cleanup();
      resolve();
    };
    image.addEventListener('load', onDone, { once: true });
    image.addEventListener('error', onDone, { once: true });
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

export {
  buildPrintDocumentHtml,
  canvasToBlob,
  renderPrintPageToBlobUrl,
  resolvePrintPages,
  waitForIframeLoad,
  waitForImageLoad,
};
export type { RenderPrintPageInput };
