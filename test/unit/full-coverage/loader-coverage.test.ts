/**
 * Coverage tests for wasm/loader.ts uncovered lines.
 *
 * Targets specific uncovered edge cases:
 * - validateWASMMagic with binary too small
 * - validateWASMMagic with wrong magic number
 * - Browser environment without wasmBinary/wasmUrl
 * - fetchWASMBinary with invalid URL protocol
 * - hasSIMDSupport success/failure
 */

import { beforeEach, describe, expect, test, vi } from 'vitest';

describe('WASM Loader - coverage for uncovered lines', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  test('validateWASMMagic with binary too small', async () => {
    vi.doMock('../../../src/core/env.js', () => ({
      isNodeEnvironment: () => false,
    }));

    const { loadWASM } = await import('../../../src/wasm/loader.js');
    const { InitialisationError } = await import('../../../src/core/errors.js');

    const tinyBinary = new ArrayBuffer(2);

    await expect(loadWASM({ wasmBinary: tinyBinary })).rejects.toThrow(InitialisationError);
    await expect(loadWASM({ wasmBinary: tinyBinary })).rejects.toThrow('expected at least 4 bytes');
  });

  test('validateWASMMagic with wrong magic number', async () => {
    vi.doMock('../../../src/core/env.js', () => ({
      isNodeEnvironment: () => false,
    }));

    const { loadWASM } = await import('../../../src/wasm/loader.js');
    const { InitialisationError } = await import('../../../src/core/errors.js');

    const wrongMagic = new Uint8Array([0xff, 0xff, 0xff, 0xff]);

    await expect(loadWASM({ wasmBinary: wrongMagic.buffer })).rejects.toThrow(InitialisationError);
    await expect(loadWASM({ wasmBinary: wrongMagic.buffer })).rejects.toThrow('missing magic number');
  });

  test('browser environment without explicit WASM source', async () => {
    vi.doMock('../../../src/core/env.js', () => ({
      isNodeEnvironment: () => false,
    }));

    const { loadWASM } = await import('../../../src/wasm/loader.js');
    const { InitialisationError } = await import('../../../src/core/errors.js');

    await expect(loadWASM({})).rejects.toThrow(InitialisationError);
    await expect(loadWASM({})).rejects.toThrow('No WASM source provided');
  });

  test('wasmUrl with invalid protocol', async () => {
    vi.doMock('../../../src/core/env.js', () => ({
      isNodeEnvironment: () => false,
    }));

    const { loadWASM } = await import('../../../src/wasm/loader.js');
    const { InitialisationError } = await import('../../../src/core/errors.js');

    await expect(loadWASM({ wasmUrl: 'file:///etc/passwd' })).rejects.toThrow(InitialisationError);
    await expect(loadWASM({ wasmUrl: 'file:///etc/passwd' })).rejects.toThrow('Invalid WASM URL protocol');
  });

  test('hasSIMDSupport - success case', async () => {
    const originalValidate = WebAssembly.validate;
    WebAssembly.validate = vi.fn(() => true);

    const { hasSIMDSupport } = await import('../../../src/wasm/loader.js');

    const result = hasSIMDSupport();
    expect(result).toBe(true);

    WebAssembly.validate = originalValidate;
  });

  test('hasSIMDSupport - failure case', async () => {
    const originalValidate = WebAssembly.validate;
    WebAssembly.validate = vi.fn(() => {
      throw new Error('SIMD not supported');
    });

    const { hasSIMDSupport } = await import('../../../src/wasm/loader.js');

    const result = hasSIMDSupport();
    expect(result).toBe(false);

    WebAssembly.validate = originalValidate;
  });

  test('wasmUrl fetch failure', async () => {
    vi.doMock('../../../src/core/env.js', () => ({
      isNodeEnvironment: () => false,
    }));

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    });

    const { loadWASM } = await import('../../../src/wasm/loader.js');

    await expect(loadWASM({ wasmUrl: 'https://example.com/pdfium.wasm' })).rejects.toThrow('Failed to fetch');
  });

  test('validateRuntime with missing required symbols', async () => {
    vi.resetModules();
    vi.doMock('../../../src/core/env.js', () => ({
      isNodeEnvironment: () => false,
    }));

    // Mock the factory to return a module missing required symbols
    const validWasmBinary = new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0, 0, 0, 0]);
    vi.doMock('../../../src/vendor/pdfium-factory.mjs', () => ({
      default: vi.fn(() =>
        Promise.resolve({
          // Only include a few symbols, missing most required ones
          _FPDF_InitLibraryWithConfig: vi.fn(),
          _FPDF_DestroyLibrary: vi.fn(),
          // Missing symbols like _FPDF_LoadMemDocument, _FPDF_GetLastError, etc.
        }),
      ),
    }));

    const { loadWASM } = await import('../../../src/wasm/loader.js');
    const { InitialisationError } = await import('../../../src/core/errors.js');

    await expect(loadWASM({ wasmBinary: validWasmBinary.buffer })).rejects.toThrow(InitialisationError);
    await expect(loadWASM({ wasmBinary: validWasmBinary.buffer })).rejects.toThrow('missing required symbols');
  });

  test('loadWASM wraps non-InitialisationError from factory', async () => {
    vi.resetModules();
    vi.doMock('../../../src/core/env.js', () => ({
      isNodeEnvironment: () => false,
    }));

    const validWasmBinary = new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0, 0, 0, 0]);
    vi.doMock('../../../src/vendor/pdfium-factory.mjs', () => ({
      default: vi.fn(() => Promise.reject(new Error('Factory internal error'))),
    }));

    const { loadWASM } = await import('../../../src/wasm/loader.js');
    const { InitialisationError } = await import('../../../src/core/errors.js');

    await expect(loadWASM({ wasmBinary: validWasmBinary.buffer })).rejects.toThrow(InitialisationError);
    await expect(loadWASM({ wasmBinary: validWasmBinary.buffer })).rejects.toThrow('Failed to load WASM module');
  });
});
