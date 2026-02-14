/**
 * Coverage tests for font.ts uncovered branches.
 *
 * Targets:
 * - flags returns 0 when _FPDFFont_GetFlags returns -1
 * - weight returns 0 when _FPDFFont_GetWeight returns -1
 * - getGlyphWidth returns 0 when call fails
 * - getFontData 3 failure paths (first call fails, size=0, second call fails)
 */
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createMockWasmModule } from '../../utils/mock-wasm.js';

describe('PDFiumFont - coverage for uncovered branches', () => {
  let mockModule: ReturnType<typeof createMockWasmModule>;

  beforeEach(() => {
    vi.resetModules();
    mockModule = createMockWasmModule();
  });

  async function openDocAndGetFont() {
    vi.doMock('../../../src/wasm/index.js', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../../../src/wasm/index.js')>();
      return {
        ...actual,
        loadWASM: vi.fn(() => Promise.resolve(mockModule)),
      };
    });

    // Setup mocks for text object with font
    mockModule._FPDFPage_CountObjects = vi.fn(() => 1);
    mockModule._FPDFPage_GetObject = vi.fn(() => 500);
    mockModule._FPDFPageObj_GetType = vi.fn(() => 1); // FPDF_PAGEOBJ_TEXT
    mockModule._FPDFPageObj_GetBounds = vi.fn(() => 1);
    mockModule._FPDFTextObj_GetText = vi.fn(() => 0);
    mockModule._FPDFTextObj_GetFontSize = vi.fn(() => 12);
    mockModule._FPDFTextObj_GetFont = vi.fn(() => 600);
    mockModule._FPDFFont_GetFamilyName = vi.fn(() => 0);
    mockModule._FPDFFont_GetBaseFontName = vi.fn(() => 0);

    const { PDFium } = await import('../../../src/pdfium.js');
    const pdfium = await PDFium.init();
    const document = await pdfium.openDocument(new Uint8Array([0x25, 0x50, 0x44, 0x46]));
    const page = document.getPage(0);

    const objects = [...page.objects()];
    const textObj = objects[0];
    if (!textObj || !('getFont' in textObj)) {
      throw new Error('Expected text object with getFont');
    }

    const { PDFiumFont } = await import('../../../src/document/font.js');
    const font = (textObj as unknown as { getFont(): InstanceType<typeof PDFiumFont> | null }).getFont();
    if (!font) {
      throw new Error('No font found');
    }

    return { pdfium, document, page, font };
  }

  test('getGlyphWidth returns 0 when _FPDFFont_GetGlyphWidth returns falsy', async () => {
    mockModule._FPDFFont_GetGlyphWidth = vi.fn(() => 0);
    const { pdfium, document, page, font } = await openDocAndGetFont();
    expect(font.getGlyphWidth(0, 12)).toBe(0);
    font.dispose();
    page.dispose();
    document.dispose();
    pdfium.dispose();
  });

  test('getFontData returns undefined when first call fails', async () => {
    mockModule._FPDFFont_GetFontData = vi.fn(() => 0);
    const { pdfium, document, page, font } = await openDocAndGetFont();
    expect(font.getFontData()).toBeUndefined();
    font.dispose();
    page.dispose();
    document.dispose();
    pdfium.dispose();
  });

  test('getFontData returns undefined when dataSize is 0', async () => {
    mockModule._FPDFFont_GetFontData.mockImplementation(
      // @ts-expect-error -- mock accepts more args than stub signature
      (_handle: number, _buf: number, _bufSize: number, sizePtr: number) => {
        if (sizePtr > 0) {
          mockModule.HEAP32[sizePtr >> 2] = 0;
        }
        return 1;
      },
    );
    const { pdfium, document, page, font } = await openDocAndGetFont();
    expect(font.getFontData()).toBeUndefined();
    font.dispose();
    page.dispose();
    document.dispose();
    pdfium.dispose();
  });

  test('getFontData returns undefined when second call fails', async () => {
    let callCount = 0;
    mockModule._FPDFFont_GetFontData.mockImplementation(
      // @ts-expect-error -- mock accepts more args than stub signature
      (_handle: number, _buf: number, _bufSize: number, sizePtr: number) => {
        callCount++;
        if (callCount === 1) {
          if (sizePtr > 0) {
            mockModule.HEAP32[sizePtr >> 2] = 100;
          }
          return 1;
        }
        return 0;
      },
    );
    const { pdfium, document, page, font } = await openDocAndGetFont();
    expect(font.getFontData()).toBeUndefined();
    font.dispose();
    page.dispose();
    document.dispose();
    pdfium.dispose();
  });

  test('flags returns 0 when _FPDFFont_GetFlags returns -1', async () => {
    mockModule._FPDFFont_GetFlags = vi.fn(() => -1);
    const { pdfium, document, page, font } = await openDocAndGetFont();
    expect(font.flags).toBe(0);
    font.dispose();
    page.dispose();
    document.dispose();
    pdfium.dispose();
  });

  test('weight returns 0 when _FPDFFont_GetWeight returns -1', async () => {
    mockModule._FPDFFont_GetWeight = vi.fn(() => -1);
    const { pdfium, document, page, font } = await openDocAndGetFont();
    expect(font.weight).toBe(0);
    font.dispose();
    page.dispose();
    document.dispose();
    pdfium.dispose();
  });

  test('getInfo maps -1 flags and weight to 0', async () => {
    mockModule._FPDFFont_GetFlags = vi.fn(() => -1);
    mockModule._FPDFFont_GetWeight = vi.fn(() => -1);
    const { pdfium, document, page, font } = await openDocAndGetFont();
    const info = font.getInfo();
    expect(info.flags).toBe(0);
    expect(info.weight).toBe(0);
    font.dispose();
    page.dispose();
    document.dispose();
    pdfium.dispose();
  });
});
