/**
 * Coverage tests for builder.ts and memory.ts uncovered branches.
 *
 * Targets:
 * - builder.ts line 289: createTextObj failure
 * - builder.ts line 320: setFillColour failure
 * - builder.ts line 328: setStrokeColour failure
 * - builder.ts line 339: setDrawMode failure
 * - memory.ts lines 206-209: readInt32 out-of-bounds
 * - memory.ts lines 312-314: writeFloat64 alignment check (defensive path)
 */

import { beforeEach, describe, expect, test, vi } from 'vitest';
import { PDFiumErrorCode } from '../../../src/core/errors.js';
import type { WASMPointer } from '../../../src/internal/handles.js';
import { createMockWasmModule } from '../../utils/mock-wasm.js';

describe('Builder + Memory coverage', () => {
  let mockModule: ReturnType<typeof createMockWasmModule>;

  beforeEach(() => {
    vi.resetModules();
    mockModule = createMockWasmModule();
  });

  async function importPDFiumWithMock() {
    vi.doMock('../../../src/wasm/index.js', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../../../src/wasm/index.js')>();
      return { ...actual, loadWASM: vi.fn(() => Promise.resolve(mockModule)) };
    });
    const { PDFium } = await import('../../../src/pdfium.js');
    return PDFium;
  }

  describe('PDFiumPageBuilder - error branches', () => {
    test('addText throws when createTextObj fails (line 289)', async () => {
      const PDFium = await importPDFiumWithMock();
      using pdfium = await PDFium.init();
      using builder = pdfium.createDocument();
      const font = builder.loadStandardFont('Helvetica');
      using page = builder.addPage();

      // Make createTextObj return 0 (failure)
      mockModule._FPDFPageObj_CreateTextObj.mockImplementation(() => 0);

      expect(() => {
        page.addText('Test', 100, 100, font, 12);
      }).toThrow('Failed to create text object');

      const error = (() => {
        try {
          page.addText('Test', 100, 100, font, 12);
        } catch (err) {
          return err;
        }
        throw new Error('Expected error to be thrown');
      })();

      expect(error).toHaveProperty('code', PDFiumErrorCode.DOC_CREATE_FAILED);
    });

    test('addText throws when setting text colour fails', async () => {
      const PDFium = await importPDFiumWithMock();
      using pdfium = await PDFium.init();
      using builder = pdfium.createDocument();
      const font = builder.loadStandardFont('Helvetica');
      using page = builder.addPage();

      mockModule._FPDFPageObj_SetFillColor.mockImplementation(() => 0);

      expect(() => {
        page.addText('Colour fail', 20, 20, font, 12, { r: 255, g: 0, b: 0, a: 255 });
      }).toThrow('Failed to set text colour');
    });

    test('addLine throws when path creation fails', async () => {
      const PDFium = await importPDFiumWithMock();
      using pdfium = await PDFium.init();
      using builder = pdfium.createDocument();
      using page = builder.addPage();

      mockModule._FPDFPageObj_CreateNewPath.mockImplementation(() => 0);

      expect(() => {
        page.addLine(0, 0, 100, 100);
      }).toThrow('Failed to create path for line');
    });

    test('addEllipse validates positive finite radii', async () => {
      const PDFium = await importPDFiumWithMock();
      using pdfium = await PDFium.init();
      using builder = pdfium.createDocument();
      using page = builder.addPage();

      expect(() => {
        page.addEllipse(100, 100, 0, 10);
      }).toThrow('Ellipse radii must be positive finite numbers');
      expect(() => {
        page.addEllipse(100, 100, 10, Number.NaN);
      }).toThrow('Ellipse radii must be positive finite numbers');
    });

    test('addEllipse throws when path creation fails', async () => {
      const PDFium = await importPDFiumWithMock();
      using pdfium = await PDFium.init();
      using builder = pdfium.createDocument();
      using page = builder.addPage();

      mockModule._FPDFPageObj_CreateNewPath.mockImplementation(() => 0);

      expect(() => {
        page.addEllipse(100, 100, 40, 20);
      }).toThrow('Failed to create path for ellipse');
    });

    test('addRectangle with fill throws when setFillColour fails (line 320)', async () => {
      const PDFium = await importPDFiumWithMock();
      using pdfium = await PDFium.init();
      using builder = pdfium.createDocument();
      using page = builder.addPage();

      // Make setFillColour return 0 (failure)
      mockModule._FPDFPageObj_SetFillColor.mockImplementation(() => 0);

      expect(() => {
        page.addRectangle(50, 50, 100, 100, { fill: { r: 255, g: 0, b: 0, a: 255 } });
      }).toThrow('Failed to set fill colour');

      const error = (() => {
        try {
          page.addRectangle(50, 50, 100, 100, { fill: { r: 255, g: 0, b: 0, a: 255 } });
        } catch (err) {
          return err;
        }
        throw new Error('Expected error to be thrown');
      })();

      expect(error).toHaveProperty('code', PDFiumErrorCode.DOC_CREATE_FAILED);
    });

    test('addRectangle with stroke throws when setStrokeColour fails (line 328)', async () => {
      const PDFium = await importPDFiumWithMock();
      using pdfium = await PDFium.init();
      using builder = pdfium.createDocument();
      using page = builder.addPage();

      // Make setStrokeColour return 0 (failure)
      mockModule._FPDFPageObj_SetStrokeColor.mockImplementation(() => 0);

      expect(() => {
        page.addRectangle(50, 50, 100, 100, { stroke: { r: 0, g: 0, b: 255, a: 255 } });
      }).toThrow('Failed to set stroke colour');

      const error = (() => {
        try {
          page.addRectangle(50, 50, 100, 100, { stroke: { r: 0, g: 0, b: 255, a: 255 } });
        } catch (err) {
          return err;
        }
        throw new Error('Expected error to be thrown');
      })();

      expect(error).toHaveProperty('code', PDFiumErrorCode.DOC_CREATE_FAILED);
    });

    test('addRectangle throws when setDrawMode fails (line 339)', async () => {
      const PDFium = await importPDFiumWithMock();
      using pdfium = await PDFium.init();
      using builder = pdfium.createDocument();
      using page = builder.addPage();

      // Make setDrawMode return 0 (failure)
      mockModule._FPDFPath_SetDrawMode.mockImplementation(() => 0);

      expect(() => {
        page.addRectangle(50, 50, 100, 100, { fill: { r: 255, g: 0, b: 0, a: 255 } });
      }).toThrow('Failed to set path draw mode');

      const error = (() => {
        try {
          page.addRectangle(50, 50, 100, 100, { fill: { r: 255, g: 0, b: 0, a: 255 } });
        } catch (err) {
          return err;
        }
        throw new Error('Expected error to be thrown');
      })();

      expect(error).toHaveProperty('code', PDFiumErrorCode.DOC_CREATE_FAILED);
    });

    test('addRectangle with both fill and stroke triggers setDrawMode branch', async () => {
      const PDFium = await importPDFiumWithMock();
      using pdfium = await PDFium.init();
      using builder = pdfium.createDocument();
      using page = builder.addPage();

      // Normal case — both fill and stroke should call setDrawMode with (1, 1)
      page.addRectangle(50, 50, 100, 100, {
        fill: { r: 255, g: 0, b: 0, a: 255 },
        stroke: { r: 0, g: 0, b: 255, a: 255 },
        strokeWidth: 2,
      });

      expect(mockModule._FPDFPath_SetDrawMode).toHaveBeenCalledWith(expect.anything(), 1, 1);
    });
  });

  describe('WASMMemoryManager - readInt32 out-of-bounds (lines 206-209)', () => {
    test('readInt32 returns 0 and logs warning on out-of-bounds read in dev mode', async () => {
      // Import memory manager directly after mocking
      const { WASMMemoryManager } = await import('../../../src/wasm/memory.js');
      const memory = new WASMMemoryManager(
        mockModule as unknown as import('../../../src/wasm/bindings/index.js').PDFiumWASM,
      );

      // Create a pointer at the edge of the heap to trigger out-of-bounds
      const heapSize = mockModule.HEAP32.length * 4; // HEAP32 is in 4-byte words
      const _edgePtr = (heapSize - 4) as WASMPointer; // Last valid aligned 32-bit position

      // Corrupt the HEAP32 to simulate out-of-bounds by making the index return undefined
      const originalHeap32 = mockModule.HEAP32;
      const mockHeap32 = new Proxy(originalHeap32, {
        get(target, prop) {
          const index = Number(prop);
          if (Number.isInteger(index) && index >= target.length) {
            return undefined; // Simulate out-of-bounds
          }
          return Reflect.get(target, prop);
        },
      });
      mockModule.HEAP32 = mockHeap32;

      // Capture the expected warning
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Now read from a pointer that will access beyond heap bounds
      const outOfBoundsPtr = (heapSize + 4) as WASMPointer;
      const result = memory.readInt32(outOfBoundsPtr);

      expect(result).toBe(0); // Should return 0 on out-of-bounds
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('readInt32: out-of-bounds'));

      // Restore
      warnSpy.mockRestore();
      mockModule.HEAP32 = originalHeap32;
    });

    test('readInt32 throws on misaligned pointer before attempting read', async () => {
      const { WASMMemoryManager } = await import('../../../src/wasm/memory.js');
      const memory = new WASMMemoryManager(
        mockModule as unknown as import('../../../src/wasm/bindings/index.js').PDFiumWASM,
      );

      const unalignedPtr = 5 as WASMPointer; // Not 4-byte aligned

      expect(() => memory.readInt32(unalignedPtr)).toThrow('Misaligned pointer for 32-bit read: 5');
    });
  });

  describe('WASMMemoryManager - writeFloat64 alignment (lines 312-314)', () => {
    test('writeFloat64 succeeds on aligned pointer', async () => {
      const { WASMMemoryManager } = await import('../../../src/wasm/memory.js');
      const memory = new WASMMemoryManager(
        mockModule as unknown as import('../../../src/wasm/bindings/index.js').PDFiumWASM,
      );

      const alignedPtr = 16 as WASMPointer; // 8-byte aligned
      memory.writeFloat64(alignedPtr, Math.PI);

      // Read it back to verify
      const result = memory.readFloat64(alignedPtr);
      expect(result).toBeCloseTo(Math.PI, 5);
    });

    test('writeFloat64 throws on unaligned pointer (defensive check)', async () => {
      const { WASMMemoryManager } = await import('../../../src/wasm/memory.js');
      const memory = new WASMMemoryManager(
        mockModule as unknown as import('../../../src/wasm/bindings/index.js').PDFiumWASM,
      );

      const unalignedPtr = 10 as WASMPointer; // Not 8-byte aligned (10 & 7 = 2)

      expect(() => {
        memory.writeFloat64(unalignedPtr, Math.E);
      }).toThrow('Misaligned pointer for double write: 10');

      const error = (() => {
        try {
          memory.writeFloat64(unalignedPtr, Math.E);
        } catch (err) {
          return err;
        }
        throw new Error('Expected error to be thrown');
      })();

      expect(error).toHaveProperty('code', PDFiumErrorCode.MEMORY_INVALID_POINTER);
    });

    test('readFloat64 throws on unaligned pointer', async () => {
      const { WASMMemoryManager } = await import('../../../src/wasm/memory.js');
      const memory = new WASMMemoryManager(
        mockModule as unknown as import('../../../src/wasm/bindings/index.js').PDFiumWASM,
      );

      const unalignedPtr = 13 as WASMPointer; // Not 8-byte aligned

      expect(() => {
        memory.readFloat64(unalignedPtr);
      }).toThrow('Misaligned pointer for double read: 13');
    });
  });

  describe('Integration - addRectangle style combinations', () => {
    test('addRectangle with no style does not call colour or draw mode functions', async () => {
      const PDFium = await importPDFiumWithMock();
      using pdfium = await PDFium.init();
      using builder = pdfium.createDocument();
      using page = builder.addPage();

      // Clear any prior calls
      mockModule._FPDFPageObj_SetFillColor.mockClear();
      mockModule._FPDFPageObj_SetStrokeColor.mockClear();
      mockModule._FPDFPath_SetDrawMode.mockClear();

      page.addRectangle(50, 50, 100, 100);

      // No style means no colour or draw mode calls
      expect(mockModule._FPDFPageObj_SetFillColor).not.toHaveBeenCalled();
      expect(mockModule._FPDFPageObj_SetStrokeColor).not.toHaveBeenCalled();
      expect(mockModule._FPDFPath_SetDrawMode).not.toHaveBeenCalled();
    });

    test('addRectangle with only fill calls setFillColour and setDrawMode', async () => {
      const PDFium = await importPDFiumWithMock();
      using pdfium = await PDFium.init();
      using builder = pdfium.createDocument();
      using page = builder.addPage();

      mockModule._FPDFPageObj_SetFillColor.mockClear();
      mockModule._FPDFPageObj_SetStrokeColor.mockClear();
      mockModule._FPDFPath_SetDrawMode.mockClear();

      page.addRectangle(50, 50, 100, 100, { fill: { r: 128, g: 64, b: 32, a: 200 } });

      expect(mockModule._FPDFPageObj_SetFillColor).toHaveBeenCalledWith(expect.anything(), 128, 64, 32, 200);
      expect(mockModule._FPDFPageObj_SetStrokeColor).not.toHaveBeenCalled();
      expect(mockModule._FPDFPath_SetDrawMode).toHaveBeenCalledWith(expect.anything(), 1, 0);
    });

    test('addRectangle with only stroke calls setStrokeColour and setDrawMode', async () => {
      const PDFium = await importPDFiumWithMock();
      using pdfium = await PDFium.init();
      using builder = pdfium.createDocument();
      using page = builder.addPage();

      mockModule._FPDFPageObj_SetFillColor.mockClear();
      mockModule._FPDFPageObj_SetStrokeColor.mockClear();
      mockModule._FPDFPath_SetDrawMode.mockClear();

      page.addRectangle(50, 50, 100, 100, { stroke: { r: 10, g: 20, b: 30, a: 40 } });

      expect(mockModule._FPDFPageObj_SetFillColor).not.toHaveBeenCalled();
      expect(mockModule._FPDFPageObj_SetStrokeColor).toHaveBeenCalledWith(expect.anything(), 10, 20, 30, 40);
      expect(mockModule._FPDFPath_SetDrawMode).toHaveBeenCalledWith(expect.anything(), 0, 1);
    });

    test('addRectangle with strokeWidth calls setStrokeWidth', async () => {
      const PDFium = await importPDFiumWithMock();
      using pdfium = await PDFium.init();
      using builder = pdfium.createDocument();
      using page = builder.addPage();

      mockModule._FPDFPageObj_SetStrokeWidth.mockClear();

      page.addRectangle(50, 50, 100, 100, {
        stroke: { r: 0, g: 0, b: 0, a: 255 },
        strokeWidth: 5.5,
      });

      expect(mockModule._FPDFPageObj_SetStrokeWidth).toHaveBeenCalledWith(expect.anything(), 5.5);
    });
  });
});
