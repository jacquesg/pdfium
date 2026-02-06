import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FlattenFlags, FlattenResult } from '../../../src/core/types.js';
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

describe('PDFium Page Forms & Manipulation (Full Coverage)', () => {
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

  describe('Form Interaction', () => {
    it('should replace selection and keep', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      mockModule._FPDFDOC_InitFormFillEnvironment.mockReturnValue(500); // Has form handle

      page.replaceFormSelectionAndKeep('test');
      expect(mockModule._FORM_ReplaceAndKeepSelection).toHaveBeenCalled();
    });

    it('should select all text', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      mockModule._FPDFDOC_InitFormFillEnvironment.mockReturnValue(500);

      expect(page.formSelectAllText()).toBe(true);
      expect(mockModule._FORM_SelectAllText).toHaveBeenCalled();
    });

    it('should handle listbox/combobox selection', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      mockModule._FPDFDOC_InitFormFillEnvironment.mockReturnValue(500);

      expect(page.setFormIndexSelected(0, true)).toBe(true);
      expect(mockModule._FORM_SetIndexSelected).toHaveBeenCalledWith(500, expect.anything(), 0, 1);

      expect(page.isFormIndexSelected(0)).toBe(true);
      expect(mockModule._FORM_IsIndexSelected).toHaveBeenCalled();
    });
  });

  describe('Page Manipulation', () => {
    it('should flatten page', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      expect(page.flatten(FlattenFlags.Print)).toBe(FlattenResult.Fail); // Mock returns 0 (Fail)
      expect(mockModule._FPDFPage_Flatten).toHaveBeenCalled();
    });

    it('should check transparency', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      expect(page.hasTransparency()).toBe(false);
      expect(mockModule._FPDFPage_HasTransparency).toHaveBeenCalled();
    });

    it('should transform with clip', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);

      expect(
        page.transformWithClip({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }, { left: 0, bottom: 0, right: 100, top: 100 }),
      ).toBe(true);
      expect(mockModule._FPDFPage_TransFormWithClip).toHaveBeenCalled();
    });
  });
});
