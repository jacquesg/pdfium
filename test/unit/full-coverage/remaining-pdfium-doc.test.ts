/**
 * Coverage tests for remaining uncovered branches in pdfium.ts, document.ts, annotation.ts, and builder.ts.
 *
 * Targets specific uncovered lines:
 * - pdfium.ts: 219, 228, 280, 309
 * - document.ts: 403, 474, 642-643
 * - annotation.ts: 489, 520, 563, 809
 * - builder.ts: 48, 53-62, 107, 263
 */

import { beforeEach, describe, expect, test, vi } from 'vitest';
import { InitialisationError, PDFiumErrorCode } from '../../../src/core/errors.js';
import { INTERNAL } from '../../../src/internal/symbols.js';
import { createMockWasmModule } from '../../utils/mock-wasm.js';

describe('Remaining uncovered branches - pdfium.ts', () => {
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

  test('line 219 - workerDestroyTimeout option passed to WorkerPDFium', async () => {
    // Create a valid WASM binary (magic number: \0asm)
    const wasmBinary = new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]);

    const mockWorkerPDFium = {
      create: vi.fn().mockResolvedValue({}),
    };

    vi.doMock('../../../src/context/worker-client.js', () => ({
      WorkerPDFium: mockWorkerPDFium,
    }));

    const { PDFium } = await import('../../../src/pdfium.js');

    await PDFium.init({
      useWorker: true,
      wasmBinary: wasmBinary.buffer,
      workerUrl: 'https://example.com/worker.js',
      workerDestroyTimeout: 5000,
    });

    expect(mockWorkerPDFium.create).toHaveBeenCalledWith(
      expect.objectContaining({
        destroyTimeout: 5000,
      }),
    );
  });

  test('line 228 - return native when initNative succeeds', async () => {
    const mockNativeInstance = {
      pageCount: 10,
      dispose: vi.fn(),
    };

    vi.doMock('../../../src/native/loader.js', () => ({
      loadNativeBinding: () => ({ init: vi.fn() }),
    }));

    vi.doMock('../../../src/document/native-instance.js', () => ({
      NativePDFiumInstance: {
        fromBinding: vi.fn(() => mockNativeInstance),
      },
    }));

    const { PDFium } = await import('../../../src/pdfium.js');

    const result = await PDFium.init({ useNative: true });

    expect(result).toBe(mockNativeInstance);
  });

  test('line 280 - rethrow InitialisationError from #initialiseLibrary', async () => {
    const initError = new InitialisationError(PDFiumErrorCode.INIT_LIBRARY_FAILED, 'Library init failed');

    mockModule._FPDF_InitLibraryWithConfig = vi.fn(() => {
      throw initError;
    });

    const PDFium = await importPDFiumWithMock();

    await expect(PDFium.init()).rejects.toThrow('Library init failed');
    await expect(PDFium.init()).rejects.toMatchObject({
      code: PDFiumErrorCode.INIT_LIBRARY_FAILED,
    });
  });

  test('line 309 - NativePDFiumInstance.fromBinding with limits', async () => {
    const mockBinding = { init: vi.fn() };
    const mockNativeInstance = { dispose: vi.fn() };

    vi.doMock('../../../src/native/loader.js', () => ({
      loadNativeBinding: () => mockBinding,
    }));

    const fromBindingSpy = vi.fn(() => mockNativeInstance);
    vi.doMock('../../../src/document/native-instance.js', () => ({
      NativePDFiumInstance: {
        fromBinding: fromBindingSpy,
      },
    }));

    const { PDFium } = await import('../../../src/pdfium.js');

    const limits = { maxDocumentSize: 10000, maxRenderDimension: 2000, maxTextCharCount: 5000 };
    await PDFium.initNative({ limits });

    expect(fromBindingSpy).toHaveBeenCalledWith(mockBinding, limits);
  });
});

describe('Remaining uncovered branches - document.ts', () => {
  let mockModule: ReturnType<typeof createMockWasmModule>;

  beforeEach(() => {
    vi.resetModules();
    mockModule = createMockWasmModule();
  });

  async function openMockDocument() {
    vi.doMock('../../../src/wasm/index.js', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../../../src/wasm/index.js')>();
      return {
        ...actual,
        loadWASM: vi.fn(() => Promise.resolve(mockModule)),
      };
    });
    const { PDFium } = await import('../../../src/pdfium.js');
    const pdfium = await PDFium.init();
    const pdfData = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
    const document = await pdfium.openDocument(pdfData);
    return { pdfium, document };
  }

  test('line 403 - getAttachment throws when handle is NULL_ATTACHMENT', async () => {
    mockModule._FPDFDoc_GetAttachmentCount = vi.fn(() => 1);
    mockModule._FPDFDoc_GetAttachment = vi.fn(() => 0); // NULL_ATTACHMENT

    const { pdfium, document } = await openMockDocument();

    expect(() => document.getAttachment(0)).toThrow('Failed to load attachment');
    expect(() => document.getAttachment(0)).toThrow(/Failed to load attachment/);

    document.dispose();
    pdfium.dispose();
  });

  test('line 474 - readAttachmentData returns empty when fileSize <= 0', async () => {
    const attachmentHandle = 700;
    mockModule._FPDFDoc_GetAttachmentCount = vi.fn(() => 1);
    mockModule._FPDFDoc_GetAttachment = vi.fn(() => attachmentHandle);
    mockModule._FPDFAttachment_GetName = vi.fn(() => 2); // Null terminator only
    let getFileCallCount = 0;
    mockModule._FPDFAttachment_GetFile = vi.fn(() => {
      getFileCallCount++;
      if (getFileCallCount === 1) {
        // First call (size query): we need to write a negative value to the sizeOut pointer
        // This simulates the size <= 0 branch
        return 1; // hasData = true, but size will be read as 0 from uninitialised memory
      }
      return 0;
    });

    const { pdfium, document } = await openMockDocument();

    const attachment = document.getAttachment(0);
    expect(attachment.data).toEqual(new Uint8Array(0));

    document.dispose();
    pdfium.dispose();
  });

  test('lines 642-643 - getPermissions decodes all permission flags', async () => {
    // Set all permission bits
    const allPermissions = 0xfffffffc; // All bits set
    mockModule._FPDF_GetDocPermissions = vi.fn(() => allPermissions);

    const { pdfium, document } = await openMockDocument();

    const perms = document.getPermissions();

    expect(perms.raw).toBe(allPermissions);
    expect(perms.canPrint).toBe(true);
    expect(perms.canModifyContents).toBe(true);
    expect(perms.canCopyOrExtract).toBe(true);
    expect(perms.canAddOrModifyAnnotations).toBe(true);
    expect(perms.canFillForms).toBe(true);
    expect(perms.canExtractForAccessibility).toBe(true);
    expect(perms.canAssemble).toBe(true);
    expect(perms.canPrintHighQuality).toBe(true);

    document.dispose();
    pdfium.dispose();
  });
});

describe('Remaining uncovered branches - annotation.ts', () => {
  let mockModule: ReturnType<typeof createMockWasmModule>;

  beforeEach(() => {
    vi.resetModules();
    mockModule = createMockWasmModule();
  });

  async function openMockDocumentWithAnnotations() {
    vi.doMock('../../../src/wasm/index.js', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../../../src/wasm/index.js')>();
      return {
        ...actual,
        loadWASM: vi.fn(() => Promise.resolve(mockModule)),
      };
    });

    mockModule._FPDFPage_GetAnnotCount = vi.fn(() => 1);
    mockModule._FPDFPage_GetAnnot = vi.fn(() => 800); // Annotation handle
    mockModule._FPDFAnnot_GetSubtype = vi.fn(() => 2); // Line type
    mockModule._FPDFPage_GetAnnotIndex = vi.fn(() => 0);
    mockModule._FPDFAnnot_GetColor = vi.fn(() => 0); // No stroke colour
    mockModule._FPDFPage_CloseAnnot = vi.fn();

    const { PDFium } = await import('../../../src/pdfium.js');
    const pdfium = await PDFium.init();
    const pdfData = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
    const document = await pdfium.openDocument(pdfData);
    const page = document.getPage(0);
    return { pdfium, document, page };
  }

  test('line 489 - getLine returns null when type is not Line', async () => {
    mockModule._FPDFAnnot_GetSubtype = vi.fn(() => 1); // Text type, not Line

    const { pdfium, document, page } = await openMockDocumentWithAnnotations();
    const annot = page.getAnnotation(0);

    const line = annot.getLine();
    expect(line).toBeNull();

    annot.dispose();
    page.dispose();
    document.dispose();
    pdfium.dispose();
  });

  test('line 520 - getVertices returns null when written <= 0', async () => {
    mockModule._FPDFAnnot_GetVertices = vi.fn(() => -1); // No vertices

    const { pdfium, document, page } = await openMockDocumentWithAnnotations();
    const annot = page.getAnnotation(0);

    const vertices = annot.getVertices();
    expect(vertices).toBeNull();

    annot.dispose();
    page.dispose();
    document.dispose();
    pdfium.dispose();
  });

  test('line 563 - getInkPath returns null when written <= 0', async () => {
    mockModule._FPDFAnnot_GetInkListPath = vi.fn(() => -1); // No path points

    const { pdfium, document, page } = await openMockDocumentWithAnnotations();
    const annot = page.getAnnotation(0);

    const inkPath = annot.getInkPath(0);
    expect(inkPath).toBeNull();

    annot.dispose();
    page.dispose();
    document.dispose();
    pdfium.dispose();
  });

  test('line 809 - getFormControlIndex returns -1 when formHandle is NULL_FORM', async () => {
    // Force NULL_FORM by making form init fail
    mockModule._FPDFDOC_InitFormFillEnvironment = vi.fn(() => 0); // NULL_FORM

    const { pdfium, document, page } = await openMockDocumentWithAnnotations();
    const annot = page.getAnnotation(0);

    const controlIndex = annot.getFormControlIndex();
    expect(controlIndex).toBe(-1);

    annot.dispose();
    page.dispose();
    document.dispose();
    pdfium.dispose();
  });
});

describe('Remaining uncovered branches - builder.ts', () => {
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

  test('line 48 - createDocument throws when FPDF_CreateNewDocument returns null', async () => {
    mockModule._FPDF_CreateNewDocument = vi.fn(() => 0); // NULL handle

    const PDFium = await importPDFiumWithMock();
    using pdfium = await PDFium.init();

    expect(() => pdfium.createDocument()).toThrow(/Failed to create new document/);
  });

  test('lines 53-62 - builder finalizer cleanup disposes page builders, pages, and fonts', async () => {
    const PDFium = await importPDFiumWithMock();
    using pdfium = await PDFium.init();

    using builder = pdfium.createDocument();
    const font = builder.loadStandardFont('Helvetica');
    builder.addPage({ width: 612, height: 792 });

    const fontHandle = font[INTERNAL].handle;

    // Trigger cleanup explicitly.
    builder.dispose();

    // Verify cleanup calls
    expect(mockModule._FPDF_ClosePage).toHaveBeenCalled();
    expect(mockModule._FPDFFont_Close).toHaveBeenCalledWith(fontHandle);
    expect(mockModule._FPDF_CloseDocument).toHaveBeenCalled();
  });

  test('line 107 - addPage throws when FPDFPage_New returns null', async () => {
    mockModule._FPDFPage_New = vi.fn(() => 0); // NULL page handle

    const PDFium = await importPDFiumWithMock();
    using pdfium = await PDFium.init();
    using builder = pdfium.createDocument();

    expect(() => builder.addPage()).toThrow('Failed to create new page');
    expect(() => builder.addPage()).toThrow(/Failed to create new page/);
  });

  test('line 263 - addRectangle throws when FPDFPageObj_CreateNewRect returns null', async () => {
    mockModule._FPDFPageObj_CreateNewRect = vi.fn(() => 0); // NULL object handle

    const PDFium = await importPDFiumWithMock();
    using pdfium = await PDFium.init();
    using builder = pdfium.createDocument();
    const pageBuilder = builder.addPage();

    expect(() => pageBuilder.addRectangle(0, 0, 100, 100)).toThrow('Failed to create rectangle');
    expect(() => pageBuilder.addRectangle(0, 0, 100, 100)).toThrow(/Failed to create rectangle/);
  });

  test('addPage validates width and height are positive finite numbers', async () => {
    const PDFium = await importPDFiumWithMock();
    using pdfium = await PDFium.init();
    using builder = pdfium.createDocument();

    expect(() => builder.addPage({ width: -100, height: 792 })).toThrow('width must be a positive finite number');
    expect(() => builder.addPage({ width: 612, height: 0 })).toThrow('height must be a positive finite number');
    expect(() => builder.addPage({ width: Number.POSITIVE_INFINITY, height: 792 })).toThrow(
      'width must be a positive finite number',
    );
  });

  test('addRectangle validates dimensions are positive finite numbers', async () => {
    const PDFium = await importPDFiumWithMock();
    using pdfium = await PDFium.init();
    using builder = pdfium.createDocument();
    const pageBuilder = builder.addPage();

    expect(() => pageBuilder.addRectangle(0, 0, -50, 100)).toThrow('width and height must be positive finite numbers');
    expect(() => pageBuilder.addRectangle(0, 0, 100, 0)).toThrow('width and height must be positive finite numbers');
    expect(() => pageBuilder.addRectangle(0, 0, Number.NaN, 100)).toThrow(
      'width and height must be positive finite numbers',
    );
  });

  test('addText validates fontSize is positive finite number', async () => {
    const PDFium = await importPDFiumWithMock();
    using pdfium = await PDFium.init();
    using builder = pdfium.createDocument();
    const font = builder.loadStandardFont('Helvetica');
    const pageBuilder = builder.addPage();

    expect(() => pageBuilder.addText('Hello', 0, 0, font, -12)).toThrow('Font size must be a positive finite number');
    expect(() => pageBuilder.addText('Hello', 0, 0, font, 0)).toThrow('Font size must be a positive finite number');
  });

  test('deletePage validates index is safe integer in range', async () => {
    const PDFium = await importPDFiumWithMock();
    using pdfium = await PDFium.init();
    using builder = pdfium.createDocument();
    builder.addPage();

    expect(() => builder.deletePage(1.5)).toThrow('Page index must be a safe integer');
    expect(() => builder.deletePage(-1)).toThrow('out of range');
    expect(() => builder.deletePage(10)).toThrow('out of range');
  });

  test('loadStandardFont throws when fontName is empty', async () => {
    const PDFium = await importPDFiumWithMock();
    using pdfium = await PDFium.init();
    using builder = pdfium.createDocument();

    expect(() => builder.loadStandardFont('')).toThrow('Font name must not be empty');
  });

  test('loadStandardFont throws when FPDFText_LoadStandardFont returns null', async () => {
    mockModule._FPDFText_LoadStandardFont = vi.fn(() => 0); // NULL font handle

    const PDFium = await importPDFiumWithMock();
    using pdfium = await PDFium.init();
    using builder = pdfium.createDocument();

    expect(() => builder.loadStandardFont('InvalidFont')).toThrow('Failed to load standard font: InvalidFont');
  });

  test('addText throws when FPDFPageObj_CreateTextObj returns null', async () => {
    mockModule._FPDFPageObj_CreateTextObj = vi.fn(() => 0); // NULL text object handle

    const PDFium = await importPDFiumWithMock();
    using pdfium = await PDFium.init();
    using builder = pdfium.createDocument();
    const font = builder.loadStandardFont('Helvetica');
    const pageBuilder = builder.addPage();

    expect(() => pageBuilder.addText('Hello', 0, 0, font, 12)).toThrow('Failed to create text object');
  });

  test('save generates content for all pages before saving', async () => {
    // Mock save to succeed
    mockModule._FPDF_SaveAsCopy = vi.fn(() => 1); // Success

    const PDFium = await importPDFiumWithMock();
    using pdfium = await PDFium.init();
    using builder = pdfium.createDocument();
    builder.addPage();
    builder.addPage();

    builder.save();

    // Verify FPDFPage_GenerateContent was called for each page
    expect(mockModule._FPDFPage_GenerateContent).toHaveBeenCalledTimes(2);
  });
});
