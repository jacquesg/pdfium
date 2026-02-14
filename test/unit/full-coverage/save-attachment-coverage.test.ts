/**
 * Coverage tests for save-utils.ts and attachment-writer.ts.
 *
 * Targets specific uncovered branches:
 * save-utils.ts:
 * - Lines 74-77: writeBlock catch block (error handling in __DEV__ mode)
 * - Lines 83-86: _FPDF_SaveWithVersion branch (when options.version !== undefined)
 *
 * attachment-writer.ts:
 * - Line 57: setFile with empty contents (contents.length === 0)
 * - Line 126: INTERNAL accessor (get [INTERNAL])
 */

import { beforeEach, describe, expect, test, vi } from 'vitest';
import { INTERNAL } from '../../../src/internal/symbols.js';
import { createMockWasmModule } from '../../utils/mock-wasm.js';

describe('save-utils + attachment-writer coverage', () => {
  let mockModule: ReturnType<typeof createMockWasmModule>;

  beforeEach(() => {
    vi.resetModules();
    mockModule = createMockWasmModule();
  });

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

  describe('save-utils.ts - save with version', () => {
    test('saves document with specific PDF version', async () => {
      // Make save succeed
      mockModule._FPDF_SaveWithVersion = vi.fn(() => 1);

      const PDFium = await importPDFiumWithMock();
      using pdfium = await PDFium.init();
      const pdfData = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
      const document = await pdfium.openDocument(pdfData);

      // Save with a version
      const saved = document.save({ version: 17 });
      expect(saved).toBeInstanceOf(Uint8Array);
      expect(mockModule._FPDF_SaveWithVersion).toHaveBeenCalled();

      document.dispose();
    });

    test('throws for invalid version (too low)', async () => {
      const PDFium = await importPDFiumWithMock();
      using pdfium = await PDFium.init();
      const pdfData = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
      const document = await pdfium.openDocument(pdfData);

      // Should throw for version < 10
      expect(() => document.save({ version: 9 })).toThrow('Save version must be an integer between 10');

      document.dispose();
    });

    test('throws for invalid version (too high)', async () => {
      const PDFium = await importPDFiumWithMock();
      using pdfium = await PDFium.init();
      const pdfData = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
      const document = await pdfium.openDocument(pdfData);

      // Should throw for version > 21
      expect(() => document.save({ version: 22 })).toThrow('Save version must be an integer between 10');

      document.dispose();
    });

    test('throws for non-integer version', async () => {
      const PDFium = await importPDFiumWithMock();
      using pdfium = await PDFium.init();
      const pdfData = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
      const document = await pdfium.openDocument(pdfData);

      // Should throw for non-integer
      expect(() => document.save({ version: 14.5 })).toThrow('Save version must be an integer');

      document.dispose();
    });
  });

  describe('attachment-writer.ts', () => {
    test('setFile with empty contents calls with NULL_PTR', async () => {
      const attachHandle = 800;
      mockModule._FPDFDoc_AddAttachment = vi.fn(() => attachHandle);
      mockModule._FPDFAttachment_SetFile = vi.fn(() => 1);

      const PDFium = await importPDFiumWithMock();
      using pdfium = await PDFium.init();
      const pdfData = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
      const document = await pdfium.openDocument(pdfData);

      const writer = document.addAttachment('empty.txt');
      expect(writer).not.toBeNull();

      // Set empty file
      const result = writer!.setFile(new Uint8Array(0));
      expect(result).toBe(true);
      // Should have been called with NULL_PTR (0) and size 0
      expect(mockModule._FPDFAttachment_SetFile).toHaveBeenCalledWith(
        attachHandle,
        expect.anything(), // documentHandle
        0, // NULL_PTR
        0, // size
      );

      document.dispose();
    });

    test('setFile with non-empty contents', async () => {
      const attachHandle = 800;
      mockModule._FPDFDoc_AddAttachment = vi.fn(() => attachHandle);
      mockModule._FPDFAttachment_SetFile = vi.fn(() => 1);

      const PDFium = await importPDFiumWithMock();
      using pdfium = await PDFium.init();
      const pdfData = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
      const document = await pdfium.openDocument(pdfData);

      const writer = document.addAttachment('test.txt');
      expect(writer).not.toBeNull();

      // Set file with actual contents
      const contents = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]); // "Hello"
      const result = writer!.setFile(contents);
      expect(result).toBe(true);
      // Should have been called with non-zero pointer and size
      expect(mockModule._FPDFAttachment_SetFile).toHaveBeenCalledTimes(1);
      // Args: (attachHandle, docHandle, pointer, size)
      const args = mockModule._FPDFAttachment_SetFile.mock.lastCall as unknown as number[];
      expect(args[2]).toBeGreaterThan(0); // Non-zero pointer
      expect(args[3]).toBe(5);

      document.dispose();
    });

    test('INTERNAL accessor returns handle', async () => {
      const attachHandle = 800;
      mockModule._FPDFDoc_AddAttachment = vi.fn(() => attachHandle);

      const PDFium = await importPDFiumWithMock();
      using pdfium = await PDFium.init();
      const pdfData = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
      const document = await pdfium.openDocument(pdfData);

      const writer = document.addAttachment('test.txt');
      expect(writer).not.toBeNull();

      // Access INTERNAL symbol
      const internals = writer![INTERNAL];
      expect(internals).toBeDefined();
      expect(internals.handle).toBe(attachHandle);

      document.dispose();
    });

    test('hasKey checks attachment for key', async () => {
      const attachHandle = 800;
      mockModule._FPDFDoc_AddAttachment = vi.fn(() => attachHandle);
      mockModule._FPDFAttachment_HasKey = vi.fn(() => 1);

      const PDFium = await importPDFiumWithMock();
      using pdfium = await PDFium.init();
      const pdfData = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
      const document = await pdfium.openDocument(pdfData);

      const writer = document.addAttachment('test.txt');
      expect(writer).not.toBeNull();

      const hasKey = writer!.hasKey('Author');
      expect(hasKey).toBe(true);
      expect(mockModule._FPDFAttachment_HasKey).toHaveBeenCalled();

      document.dispose();
    });

    test('getValueType returns value type', async () => {
      const attachHandle = 800;
      mockModule._FPDFDoc_AddAttachment = vi.fn(() => attachHandle);
      mockModule._FPDFAttachment_GetValueType = vi.fn(() => 3); // String type

      const PDFium = await importPDFiumWithMock();
      using pdfium = await PDFium.init();
      const pdfData = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
      const document = await pdfium.openDocument(pdfData);

      const writer = document.addAttachment('test.txt');
      expect(writer).not.toBeNull();

      const valueType = writer!.getValueType('Author');
      expect(valueType).toBeDefined();
      expect(mockModule._FPDFAttachment_GetValueType).toHaveBeenCalled();

      document.dispose();
    });

    test('getStringValue returns string value', async () => {
      const attachHandle = 800;
      mockModule._FPDFDoc_AddAttachment = vi.fn(() => attachHandle);
      mockModule._FPDFAttachment_GetStringValue = vi.fn(() => 0); // No value

      const PDFium = await importPDFiumWithMock();
      using pdfium = await PDFium.init();
      const pdfData = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
      const document = await pdfium.openDocument(pdfData);

      const writer = document.addAttachment('test.txt');
      expect(writer).not.toBeNull();

      const value = writer!.getStringValue('Author');
      expect(value).toBeUndefined();
      expect(mockModule._FPDFAttachment_GetStringValue).toHaveBeenCalled();

      document.dispose();
    });

    test('setStringValue sets string value', async () => {
      const attachHandle = 800;
      mockModule._FPDFDoc_AddAttachment = vi.fn(() => attachHandle);
      mockModule._FPDFAttachment_SetStringValue = vi.fn(() => 1);

      const PDFium = await importPDFiumWithMock();
      using pdfium = await PDFium.init();
      const pdfData = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
      const document = await pdfium.openDocument(pdfData);

      const writer = document.addAttachment('test.txt');
      expect(writer).not.toBeNull();

      const result = writer!.setStringValue('Author', 'Test Author');
      expect(result).toBe(true);
      expect(mockModule._FPDFAttachment_SetStringValue).toHaveBeenCalled();

      document.dispose();
    });
  });
});
