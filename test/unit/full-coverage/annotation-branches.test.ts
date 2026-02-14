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

describe('Annotation branch coverage', () => {
  let mockModule: ReturnType<typeof createMockWasmModule>;
  let pdfium: PDFium;

  beforeEach(async () => {
    mockModule = createMockWasmModule();
    // @ts-expect-error - Mock module is incomplete but sufficient for tests
    vi.mocked(WasmLoader.loadWASM).mockResolvedValue(mockModule);
    pdfium = await PDFium.init();
  });

  afterEach(() => {
    pdfium.dispose();
    vi.clearAllMocks();
  });

  it('getLine returns null when _FPDFAnnot_GetLine fails', async () => {
    using doc = await pdfium.openDocument(new Uint8Array(10));
    using page = doc.getPage(0);

    // Set up line annotation
    mockModule._FPDFPage_GetAnnotCount.mockReturnValue(1);
    mockModule._FPDFPage_GetAnnot.mockReturnValue(100);
    mockModule._FPDFAnnot_GetSubtype.mockReturnValue(3); // Line annotation
    mockModule._FPDFAnnot_GetLine.mockReturnValue(0); // Failure - cannot retrieve line coords

    const annots = page.getAnnotations();
    expect(annots).toHaveLength(1);
    if (annots[0]) {
      expect(annots[0].getLine()).toBeNull();
    }
    for (const a of annots) a.dispose();
  });

  it('getVertices returns null when _FPDFAnnot_GetVertices returns 0 after count', async () => {
    using doc = await pdfium.openDocument(new Uint8Array(10));
    using page = doc.getPage(0);

    mockModule._FPDFPage_GetAnnotCount.mockReturnValue(1);
    mockModule._FPDFPage_GetAnnot.mockReturnValue(100);
    mockModule._FPDFAnnot_GetSubtype.mockReturnValue(5); // Polygon annotation
    // First call (count check) returns 3, but second call (data retrieval) fails
    mockModule._FPDFAnnot_GetVertices.mockReturnValueOnce(3).mockReturnValueOnce(0);

    const annots = page.getAnnotations();
    expect(annots).toHaveLength(1);
    if (annots[0]) {
      expect(annots[0].getVertices()).toBeNull();
    }
    for (const a of annots) a.dispose();
  });

  it('getInkPath returns null when _FPDFAnnot_GetInkListPath returns 0 after count', async () => {
    using doc = await pdfium.openDocument(new Uint8Array(10));
    using page = doc.getPage(0);

    mockModule._FPDFPage_GetAnnotCount.mockReturnValue(1);
    mockModule._FPDFPage_GetAnnot.mockReturnValue(100);
    mockModule._FPDFAnnot_GetSubtype.mockReturnValue(15); // Ink annotation
    mockModule._FPDFAnnot_GetInkListCount.mockReturnValue(1);
    // First call (count check) returns 3, but second call (data retrieval) fails
    mockModule._FPDFAnnot_GetInkListPath.mockReturnValueOnce(3).mockReturnValueOnce(0);

    const annots = page.getAnnotations();
    expect(annots).toHaveLength(1);
    if (annots[0]) {
      expect(annots[0].getInkPath(0)).toBeNull();
    }
    for (const a of annots) a.dispose();
  });

  it('getBorder returns null when _FPDFAnnot_GetBorder fails', async () => {
    using doc = await pdfium.openDocument(new Uint8Array(10));
    using page = doc.getPage(0);

    mockModule._FPDFPage_GetAnnotCount.mockReturnValue(1);
    mockModule._FPDFPage_GetAnnot.mockReturnValue(100);
    mockModule._FPDFAnnot_GetSubtype.mockReturnValue(4); // Square
    mockModule._FPDFAnnot_GetBorder.mockReturnValue(0); // Failure

    const annots = page.getAnnotations();
    expect(annots).toHaveLength(1);
    if (annots[0]) {
      expect(annots[0].getBorder()).toBeNull();
    }
    for (const a of annots) a.dispose();
  });

  it('getRect returns null when _FPDFAnnot_GetRect fails', async () => {
    using doc = await pdfium.openDocument(new Uint8Array(10));
    using page = doc.getPage(0);

    mockModule._FPDFPage_GetAnnotCount.mockReturnValue(1);
    mockModule._FPDFPage_GetAnnot.mockReturnValue(100);
    mockModule._FPDFAnnot_GetSubtype.mockReturnValue(1); // Text
    mockModule._FPDFAnnot_GetRect.mockReturnValue(0); // Failure

    const annots = page.getAnnotations();
    expect(annots).toHaveLength(1);
    if (annots[0]) {
      expect(annots[0].getRect()).toBeNull();
    }
    for (const a of annots) a.dispose();
  });

  it('hasKey returns boolean from FPDFAnnot_HasKey', async () => {
    using doc = await pdfium.openDocument(new Uint8Array(10));
    using page = doc.getPage(0);

    mockModule._FPDFPage_GetAnnotCount.mockReturnValue(1);
    mockModule._FPDFPage_GetAnnot.mockReturnValue(100);
    mockModule._FPDFAnnot_GetSubtype.mockReturnValue(1); // Text
    mockModule._FPDFAnnot_HasKey.mockReturnValue(1); // Key exists

    const annots = page.getAnnotations();
    expect(annots).toHaveLength(1);
    if (annots[0]) {
      expect(annots[0].hasKey('Contents')).toBe(true);
    }
    for (const a of annots) a.dispose();
  });
});
