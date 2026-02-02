import type { PDFiumWASM } from '../wasm/bindings/index.js';

interface CreatePdfiumOptions {
  wasmBinary?: ArrayBuffer;
}

declare function createPdfium(options?: CreatePdfiumOptions): Promise<PDFiumWASM>;
export default createPdfium;
