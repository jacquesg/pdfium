import { beforeEach, describe, expect, test, vi } from 'vitest';
import { PDFiumErrorCode } from '../../../src/core/errors.js';
import { PageRotation } from '../../../src/core/types.js';
import { PageObjectTypeNative } from '../../../src/wasm/bindings/types.js';
import { createMockWasmModule } from '../../utils/mock-wasm.js';

describe('PDFiumPage - NULL_FORM branches', () => {
  let mockModule: ReturnType<typeof createMockWasmModule>;

  beforeEach(() => {
    vi.resetModules();
    mockModule = createMockWasmModule();
    // Make form handle NULL (0)
    mockModule._FPDFDOC_InitFormFillEnvironment = vi.fn(() => 0);
  });

  async function getPageWithNoForm() {
    vi.doMock('../../../src/wasm/index.js', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../../../src/wasm/index.js')>();
      return { ...actual, loadWASM: vi.fn(() => Promise.resolve(mockModule)) };
    });
    const { PDFium } = await import('../../../src/pdfium.js');
    const pdfium = await PDFium.init();
    const document = await pdfium.openDocument(new Uint8Array([0x25, 0x50, 0x44, 0x46]));
    const page = document.getPage(0);
    return { pdfium, document, page };
  }

  test('all form methods return NULL_FORM defaults when no form handle', async () => {
    const { document, page, pdfium } = await getPageWithNoForm();

    // Form field query methods
    expect(page.getFormFieldTypeAtPoint(100, 100)).toBeNull();
    expect(page.getFormFieldZOrderAtPoint(100, 100)).toBe(-1);

    // Form text methods
    expect(page.getFormSelectedText()).toBeUndefined();
    expect(page.getFormFocusedText()).toBeUndefined();

    // Form modification methods (void)
    page.replaceFormSelection('test');
    page.replaceFormSelectionAndKeep('test');

    // Form undo/redo
    expect(page.canFormUndo()).toBe(false);
    expect(page.canFormRedo()).toBe(false);
    expect(page.formUndo()).toBe(false);
    expect(page.formRedo()).toBe(false);

    // Form mouse events
    expect(page.formMouseMove(0, 10, 20)).toBe(false);
    expect(page.formMouseWheel(0, 10, 20, 0, 5)).toBe(false);
    expect(page.formFocus(0, 10, 20)).toBe(false);
    expect(page.formMouseDown('left', 0, 10, 20)).toBe(false);
    expect(page.formMouseDown('right', 0, 10, 20)).toBe(false);
    expect(page.formMouseUp('left', 0, 10, 20)).toBe(false);
    expect(page.formMouseUp('right', 0, 10, 20)).toBe(false);
    expect(page.formDoubleClick(0, 10, 20)).toBe(false);

    // Form keyboard events
    expect(page.formKeyDown(13, 0)).toBe(false);
    expect(page.formKeyUp(13, 0)).toBe(false);
    expect(page.formChar(65, 0)).toBe(false);

    // Form text selection
    expect(page.formSelectAllText()).toBe(false);

    // Form index selection
    expect(page.setFormIndexSelected(0, true)).toBe(false);
    expect(page.isFormIndexSelected(0)).toBe(false);

    // Focusable subtypes
    expect(page.getFocusableSubtypesCount()).toBe(0);
    expect(page.getFocusableSubtypes()).toEqual([]);
    expect(page.setFocusableSubtypes([])).toBe(false);

    page.dispose();
    document.dispose();
    pdfium.dispose();
  });
});

describe('PDFiumPage - render dimension overflow', () => {
  let mockModule: ReturnType<typeof createMockWasmModule>;

  beforeEach(() => {
    vi.resetModules();
    mockModule = createMockWasmModule();
  });

  async function getPage() {
    vi.doMock('../../../src/wasm/index.js', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../../../src/wasm/index.js')>();
      return { ...actual, loadWASM: vi.fn(() => Promise.resolve(mockModule)) };
    });
    const { PDFium } = await import('../../../src/pdfium.js');
    const pdfium = await PDFium.init();
    const document = await pdfium.openDocument(new Uint8Array([0x25, 0x50, 0x44, 0x46]));
    const page = document.getPage(0);
    return { pdfium, document, page };
  }

  test('render throws on integer overflow dimensions', async () => {
    const { document, page, pdfium } = await getPage();

    // First need to increase maxRenderDimension limit to get past that check
    // Then test overflow: width > MAX_SAFE_INTEGER / (height * 4)
    // MAX_SAFE_INTEGER = 9007199254740991
    // If height = 20000, then width must be > 9007199254740991 / 80000 = 112589990684
    const hugeWidth = 150_000_000_000; // 150 billion
    const largeHeight = 20_000;

    page.dispose();
    document.dispose();
    pdfium.dispose();

    // Reinitialize with higher limits
    const { PDFium } = await import('../../../src/pdfium.js');
    using pdfium2 = await PDFium.init({ limits: { maxRenderDimension: 200_000_000_000 } });
    const doc2 = await pdfium2.openDocument(new Uint8Array([0x25, 0x50, 0x44, 0x46]));
    const page2 = doc2.getPage(0);

    expect(() => page2.render({ width: hugeWidth, height: largeHeight })).toThrow(
      expect.objectContaining({
        code: PDFiumErrorCode.RENDER_INVALID_DIMENSIONS,
        message: expect.stringContaining('integer overflow'),
      }),
    );

    page2.dispose();
    doc2.dispose();
  });
});

describe('PDFiumPage - NULL object/annotation handles', () => {
  let mockModule: ReturnType<typeof createMockWasmModule>;

  beforeEach(() => {
    vi.resetModules();
    mockModule = createMockWasmModule();
  });

  async function getPage() {
    vi.doMock('../../../src/wasm/index.js', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../../../src/wasm/index.js')>();
      return { ...actual, loadWASM: vi.fn(() => Promise.resolve(mockModule)) };
    });
    const { PDFium } = await import('../../../src/pdfium.js');
    const pdfium = await PDFium.init();
    const document = await pdfium.openDocument(new Uint8Array([0x25, 0x50, 0x44, 0x46]));
    const page = document.getPage(0);
    return { pdfium, document, page };
  }

  test('objects() generator skips NULL_PAGE_OBJECT', async () => {
    const { document, page, pdfium } = await getPage();

    // Mock: 3 objects but middle one returns NULL (0)
    mockModule._FPDFPage_CountObjects = vi.fn(() => 3);
    let getObjCallCount = 0;
    mockModule._FPDFPage_GetObject = vi.fn(() => {
      const index = getObjCallCount++;
      if (index === 1) return 0; // NULL_PAGE_OBJECT
      return 300 + index; // Valid handles
    });
    mockModule._FPDFPageObj_GetType = vi.fn(() => PageObjectTypeNative.PATH);
    mockModule._FPDFPageObj_GetBounds = vi.fn(() => 1);

    const objects = [...page.objects()];
    expect(objects).toHaveLength(2); // Only 2 objects (skipped the NULL one)

    page.dispose();
    document.dispose();
    pdfium.dispose();
  });

  test('getAnnotation throws on NULL_ANNOT', async () => {
    const { document, page, pdfium } = await getPage();

    mockModule._FPDFPage_GetAnnotCount = vi.fn(() => 1);
    mockModule._FPDFPage_GetAnnot = vi.fn(() => 0); // NULL_ANNOT

    expect(() => page.getAnnotation(0)).toThrow(
      expect.objectContaining({
        code: PDFiumErrorCode.ANNOT_LOAD_FAILED,
        message: expect.stringContaining('Failed to load annotation'),
      }),
    );

    page.dispose();
    document.dispose();
    pdfium.dispose();
  });

  test('getAnnotations skips NULL_ANNOT', async () => {
    const { document, page, pdfium } = await getPage();

    mockModule._FPDFPage_GetAnnotCount = vi.fn(() => 3);
    let getAnnotCallCount1 = 0;
    mockModule._FPDFPage_GetAnnot = vi.fn(() => {
      const index = getAnnotCallCount1++;
      if (index === 1) return 0; // NULL_ANNOT
      return 400 + index; // Valid handles
    });
    mockModule._FPDFAnnot_GetSubtype = vi.fn(() => 1);
    mockModule._FPDFAnnot_GetRect = vi.fn(() => 1);

    const annotations = page.getAnnotations();
    expect(annotations).toHaveLength(2); // Only 2 annotations (skipped the NULL one)

    // Clean up
    for (const annot of annotations) {
      annot.dispose();
    }
    page.dispose();
    document.dispose();
    pdfium.dispose();
  });

  test('annotations() generator skips NULL_ANNOT', async () => {
    const { document, page, pdfium } = await getPage();

    mockModule._FPDFPage_GetAnnotCount = vi.fn(() => 3);
    let getAnnotCallCount2 = 0;
    mockModule._FPDFPage_GetAnnot = vi.fn(() => {
      const index = getAnnotCallCount2++;
      if (index === 1) return 0; // NULL_ANNOT
      return 400 + index; // Valid handles
    });
    mockModule._FPDFAnnot_GetSubtype = vi.fn(() => 1);
    mockModule._FPDFAnnot_GetRect = vi.fn(() => 1);

    const annotations: unknown[] = [];
    for (using annot of page.annotations()) {
      annotations.push(annot);
    }
    expect(annotations).toHaveLength(2); // Only 2 annotations (skipped the NULL one)

    page.dispose();
    document.dispose();
    pdfium.dispose();
  });
});

describe('PDFiumPage - rotation variants', () => {
  let mockModule: ReturnType<typeof createMockWasmModule>;

  beforeEach(() => {
    vi.resetModules();
    mockModule = createMockWasmModule();
  });

  async function getPage() {
    vi.doMock('../../../src/wasm/index.js', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../../../src/wasm/index.js')>();
      return { ...actual, loadWASM: vi.fn(() => Promise.resolve(mockModule)) };
    });
    const { PDFium } = await import('../../../src/pdfium.js');
    const pdfium = await PDFium.init();
    const document = await pdfium.openDocument(new Uint8Array([0x25, 0x50, 0x44, 0x46]));
    const page = document.getPage(0);
    return { pdfium, document, page };
  }

  test('render with Rotate180', async () => {
    const { document, page, pdfium } = await getPage();

    mockModule._FPDFBitmap_GetBuffer = vi.fn(() => 1024); // Valid buffer pointer

    const result = page.render({ width: 100, height: 100, rotation: PageRotation.Rotate180 });

    // Just verify the render completes and returns correct structure
    // (this covers the Rotate180 switch case branch in the render method)
    expect(result.data).toBeInstanceOf(Uint8Array);
    expect(result.width).toBe(100);
    expect(result.height).toBe(100);

    page.dispose();
    document.dispose();
    pdfium.dispose();
  });

  test('render with CounterClockwise90', async () => {
    const { document, page, pdfium } = await getPage();

    mockModule._FPDFBitmap_GetBuffer = vi.fn(() => 1024); // Valid buffer pointer

    const result = page.render({ width: 100, height: 100, rotation: PageRotation.CounterClockwise90 });

    // Just verify the render completes and returns correct structure
    // (this covers the CounterClockwise90 switch case branch in the render method)
    expect(result.data).toBeInstanceOf(Uint8Array);
    expect(result.width).toBe(100);
    expect(result.height).toBe(100);

    page.dispose();
    document.dispose();
    pdfium.dispose();
  });
});

describe('PDFiumPage - text page loading failure', () => {
  let mockModule: ReturnType<typeof createMockWasmModule>;

  beforeEach(() => {
    vi.resetModules();
    mockModule = createMockWasmModule();
  });

  async function getPage() {
    vi.doMock('../../../src/wasm/index.js', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../../../src/wasm/index.js')>();
      return { ...actual, loadWASM: vi.fn(() => Promise.resolve(mockModule)) };
    });
    const { PDFium } = await import('../../../src/pdfium.js');
    const pdfium = await PDFium.init();
    const document = await pdfium.openDocument(new Uint8Array([0x25, 0x50, 0x44, 0x46]));
    const page = document.getPage(0);
    return { pdfium, document, page };
  }

  test('getText throws when _FPDFText_LoadPage returns 0', async () => {
    const { document, page, pdfium } = await getPage();

    mockModule._FPDFText_LoadPage = vi.fn(() => 0); // NULL_TEXT_PAGE

    expect(() => page.getText()).toThrow(
      expect.objectContaining({
        code: PDFiumErrorCode.TEXT_LOAD_FAILED,
        message: expect.stringContaining('Failed to load text page'),
      }),
    );

    page.dispose();
    document.dispose();
    pdfium.dispose();
  });
});

describe('PDFiumPage - structure tree depth limit', () => {
  let mockModule: ReturnType<typeof createMockWasmModule>;

  beforeEach(() => {
    vi.resetModules();
    mockModule = createMockWasmModule();
  });

  async function getPage() {
    vi.doMock('../../../src/wasm/index.js', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../../../src/wasm/index.js')>();
      return { ...actual, loadWASM: vi.fn(() => Promise.resolve(mockModule)) };
    });
    const { PDFium } = await import('../../../src/pdfium.js');
    const pdfium = await PDFium.init();
    const document = await pdfium.openDocument(new Uint8Array([0x25, 0x50, 0x44, 0x46]));
    const page = document.getPage(0);
    return { pdfium, document, page };
  }

  test('getStructureTree throws on depth exceeded', async () => {
    const { document, page, pdfium } = await getPage();

    mockModule._FPDF_StructTree_GetForPage = vi.fn(() => 800); // Valid tree handle
    mockModule._FPDF_StructTree_CountChildren = vi.fn(() => 1);
    mockModule._FPDF_StructTree_GetChildAtIndex = vi.fn(() => 1001); // Valid element handle

    // Mock deeply nested structure: each element has 1 child
    mockModule._FPDF_StructElement_GetType = vi.fn(() => 2); // 2 bytes for "P\0"
    mockModule._FPDF_StructElement_GetAltText = vi.fn(() => 0);
    mockModule._FPDF_StructElement_GetLang = vi.fn(() => 0);
    mockModule._FPDF_StructElement_CountChildren = vi.fn(() => 1); // Each has 1 child → infinite depth
    mockModule._FPDF_StructElement_GetChildAtIndex = vi.fn(() => 1001); // Always return same handle → circular

    expect(() => page.getStructureTree()).toThrow(
      expect.objectContaining({
        code: PDFiumErrorCode.PAGE_LOAD_FAILED,
        message: expect.stringContaining('Structure tree depth exceeds maximum'),
      }),
    );

    page.dispose();
    document.dispose();
    pdfium.dispose();
  });
});

describe('PDFiumPage - page object type variants', () => {
  let mockModule: ReturnType<typeof createMockWasmModule>;

  beforeEach(() => {
    vi.resetModules();
    mockModule = createMockWasmModule();
  });

  async function getPage() {
    vi.doMock('../../../src/wasm/index.js', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../../../src/wasm/index.js')>();
      return { ...actual, loadWASM: vi.fn(() => Promise.resolve(mockModule)) };
    });
    const { PDFium } = await import('../../../src/pdfium.js');
    const pdfium = await PDFium.init();
    const document = await pdfium.openDocument(new Uint8Array([0x25, 0x50, 0x44, 0x46]));
    const page = document.getPage(0);
    return { pdfium, document, page };
  }

  test('objects() handles SHADING type', async () => {
    const { document, page, pdfium } = await getPage();

    mockModule._FPDFPage_CountObjects = vi.fn(() => 1);
    mockModule._FPDFPage_GetObject = vi.fn(() => 300);
    mockModule._FPDFPageObj_GetType = vi.fn(() => PageObjectTypeNative.SHADING);
    mockModule._FPDFPageObj_GetBounds = vi.fn(() => 1);

    const objects = [...page.objects()];
    expect(objects).toHaveLength(1);
    expect(objects[0]?.type).toBe('Shading');

    page.dispose();
    document.dispose();
    pdfium.dispose();
  });

  test('objects() handles FORM type', async () => {
    const { document, page, pdfium } = await getPage();

    mockModule._FPDFPage_CountObjects = vi.fn(() => 1);
    mockModule._FPDFPage_GetObject = vi.fn(() => 300);
    mockModule._FPDFPageObj_GetType = vi.fn(() => PageObjectTypeNative.FORM);
    mockModule._FPDFPageObj_GetBounds = vi.fn(() => 1);

    const objects = [...page.objects()];
    expect(objects).toHaveLength(1);
    expect(objects[0]?.type).toBe('Form');

    page.dispose();
    document.dispose();
    pdfium.dispose();
  });

  test('objects() handles unknown type', async () => {
    const { document, page, pdfium } = await getPage();

    mockModule._FPDFPage_CountObjects = vi.fn(() => 1);
    mockModule._FPDFPage_GetObject = vi.fn(() => 300);
    mockModule._FPDFPageObj_GetType = vi.fn(() => 99); // Unknown type
    mockModule._FPDFPageObj_GetBounds = vi.fn(() => 1);

    const objects = [...page.objects()];
    expect(objects).toHaveLength(1);
    expect(objects[0]?.type).toBe('Unknown');

    page.dispose();
    document.dispose();
    pdfium.dispose();
  });
});
