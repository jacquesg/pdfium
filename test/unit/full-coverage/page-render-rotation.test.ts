/**
 * Coverage tests for render rotation branches in page.ts (#renderWithClipRect).
 *
 * Targets:
 * - Lines 874-881: Rotate180 case
 * - Lines 882-889: CounterClockwise90 case
 * - Line 595: __DEV__ mark/measure (covered via test env)
 * - Line 963: integer overflow render dimensions
 * - Line 2009: #ensureTextPage failure
 * - Line 2017: #getTextRects returns empty when rectCount <= 0
 * - Line 1949: getTextInRect extractedChars <= 0
 * - Line 1973: getTextLayout charCount <= 0
 */
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { PageRotation } from '../../../src/core/types.js';
import { createMockWasmModule } from '../../utils/mock-wasm.js';

describe('PDFiumPage - render rotation & text branches', () => {
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

  test('render with Rotate180 + clipRect hits rotation branch', async () => {
    const { pdfium, document, page } = await getPage();
    const result = page.render({
      width: 100,
      height: 100,
      rotation: PageRotation.Rotate180,
      clipRect: { left: 0, top: 0, right: 50, bottom: 50 },
    });
    expect(result.width).toBe(100);
    expect(result.height).toBe(100);
    expect(mockModule._FPDF_RenderPageBitmapWithMatrix).toHaveBeenCalled();
    page.dispose();
    document.dispose();
    pdfium.dispose();
  });

  test('render with CounterClockwise90 + clipRect hits rotation branch', async () => {
    const { pdfium, document, page } = await getPage();
    const result = page.render({
      width: 100,
      height: 100,
      rotation: PageRotation.CounterClockwise90,
      clipRect: { left: 0, top: 0, right: 50, bottom: 50 },
    });
    expect(result.width).toBe(100);
    expect(result.height).toBe(100);
    expect(mockModule._FPDF_RenderPageBitmapWithMatrix).toHaveBeenCalled();
    page.dispose();
    document.dispose();
    pdfium.dispose();
  });

  test('render with default rotation + clipRect hits default branch', async () => {
    const { pdfium, document, page } = await getPage();
    const result = page.render({
      width: 100,
      height: 100,
      clipRect: { left: 0, top: 0, right: 50, bottom: 50 },
    });
    expect(result.width).toBe(100);
    expect(result.height).toBe(100);
    page.dispose();
    document.dispose();
    pdfium.dispose();
  });

  test('#ensureTextPage throws when _FPDFText_LoadPage returns null', async () => {
    mockModule._FPDFText_LoadPage = vi.fn(() => 0);
    const { pdfium, document, page } = await getPage();
    expect(() => page.getText()).toThrow('Failed to load text page');
    page.dispose();
    document.dispose();
    pdfium.dispose();
  });

  test('getTextLayout returns empty when charCount <= 0', async () => {
    mockModule._FPDFText_CountChars = vi.fn(() => 0);
    const { pdfium, document, page } = await getPage();
    const layout = page.getTextLayout();
    expect(layout.text).toBe('');
    expect(layout.rects).toHaveLength(0);
    page.dispose();
    document.dispose();
    pdfium.dispose();
  });

  test('getTextInRect returns empty when extractedChars <= 0', async () => {
    mockModule._FPDFText_GetBoundedText = vi.fn(() => 0);
    const { pdfium, document, page } = await getPage();
    const text = page.getTextInRect(0, 0, 100, 100);
    expect(text).toBe('');
    page.dispose();
    document.dispose();
    pdfium.dispose();
  });
});
