/**
 * Coverage tests for pdfium.ts uncovered lines.
 *
 * Targets specific uncovered edge cases:
 * - Line 311: initNative catch block (native addon load failure)
 * - Line 408: #allocPassword catch block
 * - Lines 428-430: #getDocumentError PAGE and default cases
 */

import { beforeEach, describe, expect, test, vi } from 'vitest';
import { PDFiumErrorCode } from '../../../src/core/errors.js';
import { INTERNAL } from '../../../src/internal/symbols.js';
import { createMockWasmModule } from '../../utils/mock-wasm.js';

describe('PDFium - coverage for uncovered lines', () => {
  let mockModule: ReturnType<typeof createMockWasmModule>;

  beforeEach(() => {
    vi.resetModules();
    mockModule = createMockWasmModule();
  });

  /** Helper: mock loadWASM to return the mock module, then import PDFium */
  async function importPDFiumWithMock() {
    vi.doMock('../../../src/wasm/index.js', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../../../src/wasm/index.js')>();
      return {
        ...actual,
        loadWASM: vi.fn(() => Promise.resolve(mockModule)),
      };
    });
    const { PDFium } = await import('../../../src/pdfium.js');
    return PDFium;
  }

  test('line 311 - initNative catch block when native binding fails', async () => {
    vi.doMock('../../../src/native/loader.js', () => ({
      loadNativeBinding: () => {
        throw new Error('Native binding not available');
      },
    }));

    const { PDFium } = await import('../../../src/pdfium.js');

    const native = await PDFium.initNative();
    expect(native).toBeNull();
  });

  test('line 408 - #allocPassword memory allocation failure', async () => {
    const PDFium = await importPDFiumWithMock();

    using pdfium = await PDFium.init();

    // Access internal memory via INTERNAL symbol
    const internals = pdfium[INTERNAL];
    vi.spyOn(internals.memory, 'allocString').mockImplementation(() => {
      throw new Error('Out of memory');
    });

    const pdfData = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // "%PDF"

    await expect(pdfium.openDocument(pdfData, { password: 'test' })).rejects.toThrow(
      'Failed to allocate memory for password',
    );
    await expect(pdfium.openDocument(pdfData, { password: 'test' })).rejects.toMatchObject({
      code: PDFiumErrorCode.DOC_LOAD_UNKNOWN,
    });
  });

  test('lines 428-430 - getDocumentError PAGE case', async () => {
    // Make FPDF_LoadMemDocument fail with PAGE error (native error code 6)
    mockModule._FPDF_LoadMemDocument = vi.fn(() => 0); // Fail
    mockModule._FPDF_GetLastError = vi.fn(() => 6); // PAGE

    const PDFium = await importPDFiumWithMock();
    using pdfium = await PDFium.init();

    const pdfData = new Uint8Array([0x25, 0x50, 0x44, 0x46]);

    await expect(pdfium.openDocument(pdfData)).rejects.toThrow('Invalid page');
    await expect(pdfium.openDocument(pdfData)).rejects.toMatchObject({
      code: PDFiumErrorCode.DOC_FORMAT_INVALID,
    });
  });

  test('lines 428-430 - getDocumentError default case (unknown error)', async () => {
    mockModule._FPDF_LoadMemDocument = vi.fn(() => 0); // Fail
    mockModule._FPDF_GetLastError = vi.fn(() => 999); // Unknown

    const PDFium = await importPDFiumWithMock();
    using pdfium = await PDFium.init();

    const pdfData = new Uint8Array([0x25, 0x50, 0x44, 0x46]);

    await expect(pdfium.openDocument(pdfData)).rejects.toThrow('Unknown error code: 999');
    await expect(pdfium.openDocument(pdfData)).rejects.toMatchObject({
      code: PDFiumErrorCode.DOC_LOAD_UNKNOWN,
    });
  });

  test('init with conflicting options - forceWasm and useNative', async () => {
    const { PDFium } = await import('../../../src/pdfium.js');

    await expect(PDFium.init({ forceWasm: true, useNative: true })).rejects.toThrow(
      'Cannot use forceWasm and useNative together',
    );
  });

  test('init with conflicting options - useWorker and useNative', async () => {
    const { PDFium } = await import('../../../src/pdfium.js');

    await expect(PDFium.init({ useWorker: true, useNative: true })).rejects.toThrow(
      'Cannot use useWorker and useNative together',
    );
  });

  test('init with invalid limits - maxDocumentSize not integer', async () => {
    const PDFium = await importPDFiumWithMock();

    await expect(PDFium.init({ limits: { maxDocumentSize: 1.5 } })).rejects.toThrow(
      'maxDocumentSize must be a positive integer',
    );
  });

  test('init with invalid limits - maxRenderDimension not integer', async () => {
    const PDFium = await importPDFiumWithMock();

    await expect(PDFium.init({ limits: { maxRenderDimension: -100 } })).rejects.toThrow(
      'maxRenderDimension must be a positive integer',
    );
  });

  test('init with invalid limits - maxTextCharCount not integer', async () => {
    const PDFium = await importPDFiumWithMock();

    await expect(PDFium.init({ limits: { maxTextCharCount: 0 } })).rejects.toThrow(
      'maxTextCharCount must be a positive integer',
    );
  });

  test('line 428 - getDocumentError SECURITY case', async () => {
    mockModule._FPDF_LoadMemDocument = vi.fn(() => 0);
    mockModule._FPDF_GetLastError = vi.fn(() => 5); // SECURITY

    const PDFium = await importPDFiumWithMock();
    using pdfium = await PDFium.init();

    const pdfData = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
    await expect(pdfium.openDocument(pdfData)).rejects.toMatchObject({
      code: PDFiumErrorCode.DOC_SECURITY_UNSUPPORTED,
    });
  });

  test('line 238 - init with wasmUrl option', async () => {
    // wasmUrl branch: loadOptions.wasmUrl = options.wasmUrl
    vi.doMock('../../../src/wasm/index.js', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../../../src/wasm/index.js')>();
      return {
        ...actual,
        loadWASM: vi.fn((_opts: unknown) => Promise.resolve(mockModule)),
      };
    });
    const { PDFium } = await import('../../../src/pdfium.js');
    using pdfium = await PDFium.init({ wasmUrl: 'https://example.com/pdfium.wasm' });
    expect(pdfium).toBeDefined();
  });

  test('line 280 - init catch rethrows InitialisationError', async () => {
    // Make _FPDF_InitLibraryWithConfig throw to trigger the catch block
    mockModule._FPDF_InitLibraryWithConfig = vi.fn(() => {
      throw new Error('Library init failed');
    });

    const PDFium = await importPDFiumWithMock();
    await expect(PDFium.init()).rejects.toThrow('Failed to initialise PDFium');
  });

  test('openDocument with ArrayBuffer input', async () => {
    const PDFium = await importPDFiumWithMock();
    using pdfium = await PDFium.init();

    const buffer = new ArrayBuffer(4);
    new Uint8Array(buffer).set([0x25, 0x50, 0x44, 0x46]);
    const document = await pdfium.openDocument(buffer);
    expect(document).toBeDefined();
    document.dispose();
  });

  test('openDocument exceeds maxDocumentSize', async () => {
    const PDFium = await importPDFiumWithMock();
    using pdfium = await PDFium.init({ limits: { maxDocumentSize: 2 } });

    const pdfData = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
    await expect(pdfium.openDocument(pdfData)).rejects.toThrow('exceeds maximum allowed size');
  });

  test('openDocument with onProgress callback', async () => {
    const PDFium = await importPDFiumWithMock();
    using pdfium = await PDFium.init();

    const progressValues: number[] = [];
    const pdfData = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
    const document = await pdfium.openDocument(pdfData, {
      onProgress: (p) => progressValues.push(p),
    });
    expect(progressValues).toContain(0);
    expect(progressValues).toContain(1.0);
    document.dispose();
  });

  test('post-dispose: openDocument throws', async () => {
    const PDFium = await importPDFiumWithMock();
    const pdfium = await PDFium.init();
    pdfium.dispose();

    const pdfData = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
    await expect(pdfium.openDocument(pdfData)).rejects.toThrow();
  });

  test('post-dispose: createDocument throws', async () => {
    const PDFium = await importPDFiumWithMock();
    const pdfium = await PDFium.init();
    pdfium.dispose();

    expect(() => pdfium.createDocument()).toThrow();
  });

  test('useWorker rejects invalid wasmBinary magic header', async () => {
    const createSpy = vi.fn().mockResolvedValue({});
    vi.doMock('../../../src/context/worker-client.js', () => ({
      WorkerPDFium: { create: createSpy },
    }));

    const { PDFium } = await import('../../../src/pdfium.js');

    await expect(
      PDFium.init({
        useWorker: true,
        wasmBinary: new Uint8Array([1, 2, 3, 4]).buffer,
        workerUrl: '/worker.js',
      }),
    ).rejects.toThrow('Invalid WASM binary: missing magic number');
    expect(createSpy).not.toHaveBeenCalled();
  });

  test('useWorker with wasmUrl surfaces fetch HTTP failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('not found', { status: 404, statusText: 'Not Found' })),
    );
    vi.doMock('../../../src/context/worker-client.js', () => ({
      WorkerPDFium: { create: vi.fn().mockResolvedValue({}) },
    }));

    const { PDFium } = await import('../../../src/pdfium.js');

    await expect(
      PDFium.init({
        useWorker: true,
        wasmUrl: 'https://example.com/pdfium.wasm',
        workerUrl: '/worker.js',
      }),
    ).rejects.toThrow('HTTP 404');
  });

  test('useWorker passes timeout options and logger when wasmUrl succeeds', async () => {
    const createSpy = vi.fn().mockResolvedValue({});
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]), { status: 200 }),
        ),
    );
    vi.doMock('../../../src/context/worker-client.js', () => ({
      WorkerPDFium: { create: createSpy },
    }));

    const { PDFium } = await import('../../../src/pdfium.js');

    const logger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    await PDFium.init({
      useWorker: true,
      wasmUrl: 'https://example.com/pdfium.wasm',
      workerUrl: '/worker.js',
      workerTimeout: 12_000,
      workerRenderTimeout: 34_000,
      logger,
    });

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        workerUrl: '/worker.js',
        timeout: 12_000,
        renderTimeout: 34_000,
      }),
    );
  });

  test('browser worker mode requires wasmBinary or wasmUrl when not in Node', async () => {
    vi.doMock('../../../src/core/env.js', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../../../src/core/env.js')>();
      return {
        ...actual,
        isNodeEnvironment: () => false,
      };
    });
    vi.doMock('../../../src/context/worker-client.js', () => ({
      WorkerPDFium: { create: vi.fn().mockResolvedValue({}) },
    }));

    const { PDFium } = await import('../../../src/pdfium.js');

    await expect(
      PDFium.init({
        useWorker: true,
      }),
    ).rejects.toThrow('Worker mode requires wasmBinary or wasmUrl in browser environments.');
  });

  test('browser worker mode uses default worker.js URL when workerUrl is omitted', async () => {
    const createSpy = vi.fn().mockResolvedValue({});
    vi.doMock('../../../src/core/env.js', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../../../src/core/env.js')>();
      return {
        ...actual,
        isNodeEnvironment: () => false,
      };
    });
    vi.doMock('../../../src/context/worker-client.js', () => ({
      WorkerPDFium: { create: createSpy },
    }));

    const { PDFium } = await import('../../../src/pdfium.js');
    await PDFium.init({
      useWorker: true,
      wasmBinary: new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]).buffer,
    });

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        workerUrl: expect.any(URL),
      }),
    );
  });
});
