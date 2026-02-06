/**
 * Verify high-level worker mode in real Node worker_threads runtime.
 *
 * This script exercises the packaged dist artefacts and ensures worker mode
 * can initialise, open a document, render a page, and dispose cleanly.
 */

import { readFile } from 'node:fs/promises';
import { PDFium } from '../dist/index.js';

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

async function main(): Promise<void> {
  const [wasmBytes, pdfBytes] = await Promise.all([
    readFile(new URL('../dist/vendor/pdfium.wasm', import.meta.url)),
    readFile(new URL('../test/fixtures/test_1.pdf', import.meta.url)),
  ]);

  const wasmBinary = toArrayBuffer(wasmBytes);

  await using workerPdfium = await PDFium.init({
    useWorker: true,
    workerUrl: new URL('../dist/worker.js', import.meta.url),
    wasmBinary,
  });

  const isAlive = await workerPdfium.ping();
  if (!isAlive) {
    throw new Error('Worker did not respond to ping');
  }

  const explicitPdfInput = toArrayBuffer(pdfBytes);
  const explicitInputSize = explicitPdfInput.byteLength;
  await using document = await workerPdfium.openDocument(explicitPdfInput);
  if (explicitPdfInput.byteLength !== explicitInputSize) {
    throw new Error('openDocument detached the caller ArrayBuffer in worker mode');
  }
  const explicitRender = await document.renderPage(0, { scale: 0.25 });

  if (explicitRender.width <= 0 || explicitRender.height <= 0) {
    throw new Error(`Invalid render dimensions: ${String(explicitRender.width)}x${String(explicitRender.height)}`);
  }
  if (explicitRender.data.byteLength === 0) {
    throw new Error('Rendered pixel buffer is empty');
  }

  // Also verify default worker script resolution from dist/index.js
  await using defaultWorkerPdfium = await PDFium.init({
    useWorker: true,
    wasmBinary,
  });
  const defaultAlive = await defaultWorkerPdfium.ping();
  if (!defaultAlive) {
    throw new Error('Default worker script did not respond to ping');
  }

  const defaultPdfInput = toArrayBuffer(pdfBytes);
  const defaultInputSize = defaultPdfInput.byteLength;
  await using defaultDocument = await defaultWorkerPdfium.openDocument(defaultPdfInput);
  if (defaultPdfInput.byteLength !== defaultInputSize) {
    throw new Error('openDocument detached the caller ArrayBuffer when using default workerUrl');
  }
  const defaultRender = await defaultDocument.renderPage(0, { scale: 0.25 });
  if (defaultRender.width <= 0 || defaultRender.height <= 0) {
    throw new Error(`Invalid default render dimensions: ${String(defaultRender.width)}x${String(defaultRender.height)}`);
  }
  if (defaultRender.data.byteLength === 0) {
    throw new Error('Default worker render pixel buffer is empty');
  }

  console.log(
    `Worker runtime verification passed (explicit ${String(explicitRender.width)}x${String(
      explicitRender.height,
    )}, default ${String(defaultRender.width)}x${String(defaultRender.height)})`,
  );
}

main().catch((error) => {
  console.error('Worker runtime verification failed:', error);
  process.exit(1);
});
