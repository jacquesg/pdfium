import { describe, expect, it, vi } from 'vitest';
import { InitialisationError } from '../../../src/core/errors.js';
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
});
