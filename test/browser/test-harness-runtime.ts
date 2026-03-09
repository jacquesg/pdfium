import type { BrowserPDFiumModule } from './test-harness-browser-types.js';
import { describeRuntimeKind, getRequestedRuntimeKind, updateStatus } from './test-harness-status.js';
import type { TestHarness } from './test-harness-types.js';

export function resetHarnessState(harness: TestHarness): void {
  harness.runtimeKind = getRequestedRuntimeKind();
  harness.isReady = false;
  harness.isSettled = false;
  harness.error = null;
  harness.errorStack = null;
  harness.statusMessage = 'Loading PDFium...';
  updateStatus(harness.statusMessage, false);
}

export async function initHarnessPdfium(harness: TestHarness): Promise<boolean> {
  const runtimeKind = getRequestedRuntimeKind();
  harness.runtimeKind = runtimeKind;
  harness.isReady = false;
  harness.isSettled = false;
  harness.error = null;
  harness.errorStack = null;
  harness.statusMessage = `Initialising PDFium (${describeRuntimeKind(runtimeKind)})...`;
  updateStatus(harness.statusMessage, false);

  try {
    const wasmResponse = await fetch('/pdfium.wasm');
    if (!wasmResponse.ok) {
      throw new Error(`Failed to fetch WASM: ${wasmResponse.status}`);
    }
    const wasmBinary = await wasmResponse.arrayBuffer();
    const browserModule = (await import(
      /* @vite-ignore */ new URL('../../dist/browser.js', import.meta.url).href
    )) as BrowserPDFiumModule;

    harness.pdfium =
      runtimeKind === 'worker'
        ? await browserModule.PDFium.init({
            wasmBinary,
            useWorker: true,
            workerUrl: new URL('../../dist/worker.js', import.meta.url),
          })
        : await browserModule.PDFium.init({ wasmBinary });
    harness.isReady = true;
    harness.isSettled = true;
    harness.statusMessage = `PDFium initialised successfully (${describeRuntimeKind(runtimeKind)})`;
    updateStatus(harness.statusMessage, false);
    return true;
  } catch (err) {
    harness.error = err instanceof Error ? err.message : String(err);
    harness.errorStack = err instanceof Error ? (err.stack ?? null) : null;
    harness.isSettled = true;
    harness.statusMessage = `Failed to initialise PDFium (${describeRuntimeKind(runtimeKind)}): ${harness.error}`;
    updateStatus(harness.statusMessage, true);
    return false;
  }
}
