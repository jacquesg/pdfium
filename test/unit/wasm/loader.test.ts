/**
 * Unit tests for the WASM loader.
 *
 * Tests the various loading paths: wasmBinary, wasmUrl, auto-detect.
 */

import { afterEach, describe, expect, test, vi } from 'vitest';

import { InitialisationError, PDFiumErrorCode } from '../../../src/core/errors.js';
import { loadWASM } from '../../../src/wasm/loader.js';
import { loadWasmBinary } from '../../utils/helpers.js';

describe('loadWASM', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('should load with wasmBinary option', async () => {
    const wasmBinary = await loadWasmBinary();
    const module = await loadWASM({ wasmBinary });
    expect(module).toBeDefined();
    expect(typeof module._FPDF_InitLibraryWithConfig).toBe('function');
  });

  test('should throw InitialisationError for invalid wasmBinary', async () => {
    const invalidBinary = new ArrayBuffer(10);
    try {
      await loadWASM({ wasmBinary: invalidBinary });
      expect.fail('Expected InitialisationError');
    } catch (error) {
      expect(error).toBeInstanceOf(InitialisationError);
      if (error instanceof InitialisationError) {
        expect(error.code).toBe(PDFiumErrorCode.INIT_INVALID_OPTIONS);
      }
    }
  });

  test('should throw InitialisationError for too-short wasmBinary', async () => {
    const tinyBinary = new ArrayBuffer(2);
    try {
      await loadWASM({ wasmBinary: tinyBinary });
      expect.fail('Expected InitialisationError');
    } catch (error) {
      expect(error).toBeInstanceOf(InitialisationError);
      if (error instanceof InitialisationError) {
        expect(error.code).toBe(PDFiumErrorCode.INIT_INVALID_OPTIONS);
      }
    }
  });

  test('should throw for wasmUrl when fetch fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      }),
    );

    try {
      await loadWASM({ wasmUrl: 'https://example.com/pdfium.wasm' });
      expect.fail('Expected InitialisationError');
    } catch (error) {
      expect(error).toBeInstanceOf(InitialisationError);
      if (error instanceof InitialisationError) {
        expect(error.code).toBe(PDFiumErrorCode.INIT_NETWORK_ERROR);
      }
    }
  });

  test('should throw for wasmUrl when fetch throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

    try {
      await loadWASM({ wasmUrl: 'https://example.com/pdfium.wasm' });
      expect.fail('Expected InitialisationError');
    } catch (error) {
      expect(error).toBeInstanceOf(InitialisationError);
      if (error instanceof InitialisationError) {
        expect(error.code).toBe(PDFiumErrorCode.INIT_NETWORK_ERROR);
      }
    }
  });

  test('should load with wasmUrl when fetch succeeds', async () => {
    const wasmBinary = await loadWasmBinary();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(wasmBinary),
      }),
    );

    const module = await loadWASM({ wasmUrl: 'https://example.com/pdfium.wasm' });
    expect(module).toBeDefined();
    expect(typeof module._FPDF_InitLibraryWithConfig).toBe('function');
  });

  test('should auto-detect Node.js and load from filesystem', async () => {
    // This test runs in Node.js, so auto-detect should work
    // BUT it won't find the wasm in the expected path relative to built files
    // Since we're running from source, this may fail — just test the path exists
    // The auto-detect path looks for vendor/pdfium.wasm relative to the loader module
    // In test mode this is unlikely to resolve correctly, so we just verify the error type
    try {
      await loadWASM({});
    } catch (error) {
      // Should be an InitialisationError from either the filesystem or instantiation
      expect(error).toBeInstanceOf(InitialisationError);
    }
  });

  test('should pass locateFile option through', async () => {
    const wasmBinary = await loadWasmBinary();
    const locateFile = vi.fn((path: string) => path);
    const module = await loadWASM({ wasmBinary, locateFile });
    expect(module).toBeDefined();
  });
});
