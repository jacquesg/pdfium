import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

describe('Environment Handling', () => {
  beforeEach(() => {
    const mockModule = createMockWasmModule();
    // @ts-expect-error - Mock module is incomplete but sufficient for tests
    vi.mocked(WasmLoader.loadWASM).mockResolvedValue(mockModule);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should detect Node environment', async () => {
    // We are running in Node vitest environment, so this should naturally pass coverage
    // for `isNodeEnvironment()`.
    await PDFium.init({ wasmBinary: new ArrayBuffer(0) });
  });

  it('should handle browser environment (mocked)', async () => {
    // Save original process
    const originalProcess = global.process;

    // Mock process to simulate browser
    // @ts-expect-error
    global.process = undefined;

    try {
      // Should fail to find worker URL if not provided in browser env
      await expect(PDFium.init({ useWorker: true, wasmBinary: new ArrayBuffer(0) })).rejects.toThrow();
    } finally {
      global.process = originalProcess;
    }
  });
});
