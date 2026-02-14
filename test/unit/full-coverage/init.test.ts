import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InitialisationError, PDFiumErrorCode } from '../../../src/core/errors.js';
import { PDFium } from '../../../src/pdfium.js';
import * as WasmLoader from '../../../src/wasm/index.js';
import { createMockWasmModule } from '../../utils/mock-wasm.js';

vi.mock('../../../src/wasm/index.js', async (importOriginal) => {
  const actual = await importOriginal<typeof WasmLoader>();
  return {
    ...actual,
    loadWASM: vi.fn(),
  };
});

describe('PDFium Init (Full Coverage)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle loadWASM failure', async () => {
    const error = new Error('WASM Load Failed');
    vi.mocked(WasmLoader.loadWASM).mockRejectedValue(error);

    // loadWASM is called before the try/catch block in init() that wraps errors
    // so the original error propagates
    await expect(PDFium.init()).rejects.toThrow('WASM Load Failed');
  });

  it('should handle InitLibrary failure (internal throw)', async () => {
    const mockModule = createMockWasmModule();
    // Simulate crash in init
    mockModule._FPDF_InitLibraryWithConfig.mockImplementation(() => {
      throw new Error('Init Crash');
    });
    // @ts-expect-error - Mock module is incomplete but sufficient for tests
    vi.mocked(WasmLoader.loadWASM).mockResolvedValue(mockModule);

    await expect(PDFium.init()).rejects.toThrow(InitialisationError);
  });

  it('should handle plugin onDocumentOpened failure gracefully', async () => {
    const mockModule = createMockWasmModule();
    // @ts-expect-error - Mock module is incomplete but sufficient for tests
    vi.mocked(WasmLoader.loadWASM).mockResolvedValue(mockModule);

    using pdfium = await PDFium.init();

    // Register a plugin that throws
    const { registerPlugin } = await import('../../../src/core/plugin.js');
    registerPlugin({
      name: 'FailingPlugin',
      onDocumentOpened: () => {
        throw new Error('Plugin Error');
      },
    });

    // Capture the expected plugin failure warning
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Opening a document should not fail even if plugin throws
    const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // %PDF
    await expect(pdfium.openDocument(bytes)).resolves.toBeDefined();

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Plugin "FailingPlugin" failed'), expect.any(Error));
    warnSpy.mockRestore();
  });

  // Note: Testing allocPassword and allocDocumentData failure paths is difficult
  // with unit tests as they require specific malloc patterns. These are better
  // tested via integration tests with actual memory exhaustion scenarios.

  it('should handle document load returning unknown error code', async () => {
    const mockModule = createMockWasmModule();
    mockModule._FPDF_LoadMemDocument.mockReturnValue(0); // Failure
    mockModule._FPDF_GetLastError.mockReturnValue(999); // Unknown code
    // @ts-expect-error - Mock module is incomplete but sufficient for tests
    vi.mocked(WasmLoader.loadWASM).mockResolvedValue(mockModule);

    using pdfium = await PDFium.init();
    const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]);

    await expect(pdfium.openDocument(bytes)).rejects.toThrow('Unknown error code: 999');
  });

  it('should wrap non-InitialisationError during init', async () => {
    const mockModule = createMockWasmModule();
    // Throw a non-InitialisationError during library init
    mockModule._FPDF_InitLibraryWithConfig.mockImplementation(() => {
      throw new TypeError('Unexpected null');
    });
    // @ts-expect-error - Mock module is incomplete but sufficient for tests
    vi.mocked(WasmLoader.loadWASM).mockResolvedValue(mockModule);

    await expect(PDFium.init()).rejects.toThrow(InitialisationError);
    await expect(PDFium.init()).rejects.toThrow('Failed to initialise PDFium');
  });

  it('should rethrow InitialisationError directly during init', async () => {
    const mockModule = createMockWasmModule();
    // Throw an InitialisationError directly — exercises line 280 (direct rethrow)
    mockModule._FPDF_InitLibraryWithConfig.mockImplementation(() => {
      throw new InitialisationError(PDFiumErrorCode.INIT_LIBRARY_FAILED, 'Library config failed');
    });
    // @ts-expect-error - Mock module is incomplete but sufficient for tests
    vi.mocked(WasmLoader.loadWASM).mockResolvedValue(mockModule);

    await expect(PDFium.init()).rejects.toThrow(InitialisationError);
    await expect(PDFium.init()).rejects.toThrow('Library config failed');
  });
});
