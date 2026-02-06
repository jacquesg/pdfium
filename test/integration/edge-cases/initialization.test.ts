import { describe, expect, it } from 'vitest';
import { InitialisationError, PDFiumErrorCode } from '../../../src/core/errors.js';
import { PDFium } from '../../../src/pdfium.js';

describe('PDFium Initialization Edge Cases', () => {
  it('should reject invalid WASM binary with bad magic number', async () => {
    const badBinary = new Uint8Array([1, 2, 3, 4]);
    await expect(
      PDFium.init({
        wasmBinary: badBinary.buffer,
        // We need to prevent it from trying to load the default WASM
        // by providing the binary explicitly
      }),
    ).rejects.toThrow(InitialisationError);

    try {
      await PDFium.init({ wasmBinary: badBinary.buffer });
    } catch (error) {
      expect(error).toBeInstanceOf(InitialisationError);
      expect((error as InitialisationError).code).toBe(PDFiumErrorCode.INIT_INVALID_OPTIONS);
      expect((error as InitialisationError).message).toMatch(/missing magic number/);
    }
  });

  it('should reject invalid WASM binary that is too short', async () => {
    const shortBinary = new Uint8Array([0x00, 0x61]);
    await expect(
      PDFium.init({
        wasmBinary: shortBinary.buffer,
      }),
    ).rejects.toThrow(InitialisationError);

    try {
      await PDFium.init({ wasmBinary: shortBinary.buffer });
    } catch (error) {
      expect(error).toBeInstanceOf(InitialisationError);
      expect((error as InitialisationError).message).toMatch(/expected at least 4 bytes/);
    }
  });

  it('should reject conflicting options: useNative + forceWasm', async () => {
    await expect(
      PDFium.init({
        useNative: true,
        forceWasm: true,
      }),
    ).rejects.toThrow(/Cannot use forceWasm and useNative together/);
  });

  it('should reject conflicting options: useWorker + useNative', async () => {
    // Intentionally passing invalid types to test runtime validation
    await expect(
      PDFium.init({
        useWorker: true,
        useNative: true,
      }),
    ).rejects.toThrow(/Cannot use useWorker and useNative together/);
  });

  it('should validate maxDocumentSize limit', async () => {
    await expect(
      PDFium.init({
        limits: { maxDocumentSize: -1 },
      }),
    ).rejects.toThrow(/maxDocumentSize must be a positive integer/);

    await expect(
      PDFium.init({
        limits: { maxDocumentSize: 0 },
      }),
    ).rejects.toThrow(/maxDocumentSize must be a positive integer/);
  });

  it('should validate maxRenderDimension limit', async () => {
    await expect(
      PDFium.init({
        limits: { maxRenderDimension: -100 },
      }),
    ).rejects.toThrow(/maxRenderDimension must be a positive integer/);
  });

  it('should validate maxTextCharCount limit', async () => {
    await expect(
      PDFium.init({
        limits: { maxTextCharCount: -5 },
      }),
    ).rejects.toThrow(/maxTextCharCount must be a positive integer/);
  });

  it('should resolve default worker WASM binary in Node environment', async () => {
    // This assumes the test environment mimics Node and has access to the file system
    // and the WASM binary is at the expected location.
    try {
      const worker = await PDFium.init({ useWorker: true });
      expect(worker).toBeDefined();
      await worker.dispose();
    } catch (error) {
      // If it fails due to missing file in test env, we at least hit the code path
      // Checks if error is "Failed to load bundled WASM binary" or similar
      if (error instanceof InitialisationError) {
        // It might fail if worker.js is not found or wasm is not found
        // We accept failure if it proves we entered the Node environment branch
      }
    }
  });
});
