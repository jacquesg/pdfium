import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnnotationAppearanceMode, AnnotationType, FormFieldFlags, FormFieldType } from '../../../src/core/types.js';
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

describe('PDFiumAnnotation (Full Coverage)', () => {
  let mockModule: ReturnType<typeof createMockWasmModule>;
  let pdfium: PDFium;

  beforeEach(async () => {
    mockModule = createMockWasmModule();
    // @ts-expect-error - Mock module is incomplete but sufficient for tests
    vi.mocked(WasmLoader.loadWASM).mockResolvedValue(mockModule);
    pdfium = await PDFium.init();

    // Setup: mock 1 annotation on the page
    mockModule._FPDFPage_GetAnnotCount.mockReturnValue(1);
    mockModule._FPDFPage_GetAnnot.mockReturnValue(700);
    mockModule._FPDFPage_GetAnnotIndex.mockReturnValue(0);
    mockModule._FPDFAnnot_GetSubtype.mockReturnValue(1); // Text
  });

  afterEach(() => {
    pdfium.dispose();
    vi.clearAllMocks();
  });

  describe('basic properties', () => {
    it('should return annotation type', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      using annot = page.getAnnotation(0);

      expect(annot.type).toBe(AnnotationType.Text);
      expect(mockModule._FPDFAnnot_GetSubtype).toHaveBeenCalledWith(700);
    });

    it('should return annotation index', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      using annot = page.getAnnotation(0);

      expect(annot.index).toBe(0);
      expect(mockModule._FPDFPage_GetAnnotIndex).toHaveBeenCalled();
    });

    it('should return objectCount', async () => {
      mockModule._FPDFAnnot_GetObjectCount.mockReturnValue(3);
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      using annot = page.getAnnotation(0);

      expect(annot.objectCount).toBe(3);
    });

    it('should return flags', async () => {
      mockModule._FPDFAnnot_GetFlags.mockReturnValue(4); // Print
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      using annot = page.getAnnotation(0);

      expect(annot.flags).toBe(4);
    });
  });

  describe('appearance', () => {
    it('should call _FPDFAnnot_GetAP with correct mode', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      using annot = page.getAnnotation(0);

      annot.getAppearance(AnnotationAppearanceMode.Normal);
      expect(mockModule._FPDFAnnot_GetAP).toHaveBeenCalledWith(700, 0, expect.anything(), expect.anything());
    });

    it('should call _FPDFAnnot_GetAP with rollover mode', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      using annot = page.getAnnotation(0);

      annot.getAppearance(AnnotationAppearanceMode.Rollover);
      expect(mockModule._FPDFAnnot_GetAP).toHaveBeenCalledWith(700, 1, expect.anything(), expect.anything());
    });

    it('should call _FPDFAnnot_SetAP with correct mode for set', async () => {
      mockModule._FPDFAnnot_SetAP.mockReturnValue(1);
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      using annot = page.getAnnotation(0);

      const result = annot.setAppearance(AnnotationAppearanceMode.Normal, 'test');
      expect(result).toBe(true);
      expect(mockModule._FPDFAnnot_SetAP).toHaveBeenCalledWith(700, 0, expect.anything());
    });

    it('should pass NULL_PTR when removing appearance', async () => {
      mockModule._FPDFAnnot_SetAP.mockReturnValue(1);
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      using annot = page.getAnnotation(0);

      const result = annot.setAppearance(AnnotationAppearanceMode.Down, undefined);
      expect(result).toBe(true);
      expect(mockModule._FPDFAnnot_SetAP).toHaveBeenCalledWith(700, 2, 0); // NULL_PTR = 0
    });
  });

  describe('form field properties', () => {
    it('should return FormFieldType.Unknown when no form handle', async () => {
      mockModule._FPDFDOC_InitFormFillEnvironment.mockReturnValue(0); // NULL_FORM
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      using annot = page.getAnnotation(0);

      expect(annot.getFormFieldType()).toBe(FormFieldType.Unknown);
      expect(mockModule._FPDFAnnot_GetFormFieldType).not.toHaveBeenCalled();
    });

    it('should return mapped form field type', async () => {
      mockModule._FPDFAnnot_GetFormFieldType.mockReturnValue(6); // TextField
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      using annot = page.getAnnotation(0);

      expect(annot.getFormFieldType()).toBe(FormFieldType.TextField);
    });

    it('should return FormFieldFlags.None when no form handle', async () => {
      mockModule._FPDFDOC_InitFormFillEnvironment.mockReturnValue(0);
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      using annot = page.getAnnotation(0);

      expect(annot.getFormFieldFlags()).toBe(FormFieldFlags.None);
    });

    it('should return form field flags', async () => {
      mockModule._FPDFAnnot_GetFormFieldFlags.mockReturnValue(3); // ReadOnly | Required
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      using annot = page.getAnnotation(0);

      expect(annot.getFormFieldFlags()).toBe(3);
    });

    it('should return undefined for form field name when no form handle', async () => {
      mockModule._FPDFDOC_InitFormFillEnvironment.mockReturnValue(0);
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      using annot = page.getAnnotation(0);

      expect(annot.getFormFieldName()).toBeUndefined();
    });

    it('should call _FPDFAnnot_GetFormFieldName', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      using annot = page.getAnnotation(0);

      annot.getFormFieldName();
      expect(mockModule._FPDFAnnot_GetFormFieldName).toHaveBeenCalled();
    });

    it('should return undefined for form field value when no form handle', async () => {
      mockModule._FPDFDOC_InitFormFillEnvironment.mockReturnValue(0);
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      using annot = page.getAnnotation(0);

      expect(annot.getFormFieldValue()).toBeUndefined();
    });

    it('should call _FPDFAnnot_GetFormFieldValue', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      using annot = page.getAnnotation(0);

      annot.getFormFieldValue();
      expect(mockModule._FPDFAnnot_GetFormFieldValue).toHaveBeenCalled();
    });

    it('should return undefined for alternate name when no form handle', async () => {
      mockModule._FPDFDOC_InitFormFillEnvironment.mockReturnValue(0);
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      using annot = page.getAnnotation(0);

      expect(annot.getFormFieldAlternateName()).toBeUndefined();
    });

    it('should call _FPDFAnnot_GetFormFieldAlternateName', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      using annot = page.getAnnotation(0);

      annot.getFormFieldAlternateName();
      expect(mockModule._FPDFAnnot_GetFormFieldAlternateName).toHaveBeenCalled();
    });
  });

  describe('form field options', () => {
    it('should return undefined when no form handle', async () => {
      mockModule._FPDFDOC_InitFormFillEnvironment.mockReturnValue(0);
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      using annot = page.getAnnotation(0);

      expect(annot.getFormFieldOptions()).toBeUndefined();
    });

    it('should return undefined for non-combo/list field type', async () => {
      mockModule._FPDFAnnot_GetFormFieldType.mockReturnValue(6); // TextField
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      using annot = page.getAnnotation(0);

      expect(annot.getFormFieldOptions()).toBeUndefined();
    });

    it('should return undefined when option count is 0', async () => {
      mockModule._FPDFAnnot_GetFormFieldType.mockReturnValue(4); // ComboBox
      mockModule._FPDFAnnot_GetOptionCount.mockReturnValue(0);
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      using annot = page.getAnnotation(0);

      expect(annot.getFormFieldOptions()).toBeUndefined();
    });

    it('should return options for combo box', async () => {
      mockModule._FPDFAnnot_GetFormFieldType.mockReturnValue(4); // ComboBox
      mockModule._FPDFAnnot_GetOptionCount.mockReturnValue(2);
      mockModule._FPDFAnnot_GetOptionLabel.mockReturnValue(0); // empty label
      mockModule._FPDFAnnot_IsOptionSelected.mockImplementation(
        // @ts-expect-error - Mock accepts more args than typed signature
        (_form: number, _annot: number, index: number) => (index === 0 ? 1 : 0),
      );

      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      using annot = page.getAnnotation(0);

      const options = annot.getFormFieldOptions();
      expect(options).toBeDefined();
      expect(options).toHaveLength(2);
      expect(options![0]!.index).toBe(0);
      expect(options![0]!.selected).toBe(true);
      expect(options![1]!.index).toBe(1);
      expect(options![1]!.selected).toBe(false);
    });
  });

  describe('form field export value', () => {
    it('should return undefined when no form handle', async () => {
      mockModule._FPDFDOC_InitFormFillEnvironment.mockReturnValue(0);
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      using annot = page.getAnnotation(0);

      expect(annot.getFormFieldExportValue()).toBeUndefined();
      expect(mockModule._FPDFAnnot_GetFormFieldExportValue).not.toHaveBeenCalled();
    });

    it('should call _FPDFAnnot_GetFormFieldExportValue', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      using annot = page.getAnnotation(0);

      annot.getFormFieldExportValue();
      expect(mockModule._FPDFAnnot_GetFormFieldExportValue).toHaveBeenCalled();
    });

    it('should throw on getFormFieldExportValue after dispose', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      const annot = page.getAnnotation(0);
      annot.dispose();

      expect(() => annot.getFormFieldExportValue()).toThrow();
    });
  });

  describe('focus', () => {
    it('should return false when no form handle', async () => {
      mockModule._FPDFDOC_InitFormFillEnvironment.mockReturnValue(0);
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      using annot = page.getAnnotation(0);

      expect(annot.focus()).toBe(false);
    });

    it('should call _FORM_SetFocusedAnnot', async () => {
      mockModule._FORM_SetFocusedAnnot.mockReturnValue(1);
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      using annot = page.getAnnotation(0);

      expect(annot.focus()).toBe(true);
      expect(mockModule._FORM_SetFocusedAnnot).toHaveBeenCalledWith(500, 700);
    });
  });

  describe('contents getter/setter', () => {
    it('should return contents via getStringValue("Contents")', async () => {
      // _FPDFAnnot_GetStringValue returns 0 length for empty value
      mockModule._FPDFAnnot_GetStringValue.mockReturnValue(0);
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      using annot = page.getAnnotation(0);

      const result = annot.contents;
      expect(result).toBeUndefined();
      expect(mockModule._FPDFAnnot_GetStringValue).toHaveBeenCalled();
    });

    it('should call setStringValue("Contents", ...) on set', async () => {
      mockModule._FPDFAnnot_SetStringValue.mockReturnValue(1);
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      using annot = page.getAnnotation(0);

      annot.contents = 'Hello World';
      expect(mockModule._FPDFAnnot_SetStringValue).toHaveBeenCalled();
    });
  });

  describe('author getter/setter', () => {
    it('should return undefined when no author is set', async () => {
      mockModule._FPDFAnnot_GetStringValue.mockReturnValue(0);
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      using annot = page.getAnnotation(0);

      expect(annot.author).toBeUndefined();
    });

    it('should call setStringValue("T", ...) on set', async () => {
      mockModule._FPDFAnnot_SetStringValue.mockReturnValue(1);
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      using annot = page.getAnnotation(0);

      annot.author = 'Test Author';
      expect(mockModule._FPDFAnnot_SetStringValue).toHaveBeenCalled();
    });
  });

  describe('subject getter/setter', () => {
    it('should return undefined when no subject is set', async () => {
      mockModule._FPDFAnnot_GetStringValue.mockReturnValue(0);
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      using annot = page.getAnnotation(0);

      expect(annot.subject).toBeUndefined();
    });

    it('should call setStringValue("Subject", ...) on set', async () => {
      mockModule._FPDFAnnot_SetStringValue.mockReturnValue(1);
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      using annot = page.getAnnotation(0);

      annot.subject = 'Test Subject';
      expect(mockModule._FPDFAnnot_SetStringValue).toHaveBeenCalled();
    });
  });

  describe('isWidget()', () => {
    it('should return true for Widget annotation with known field type', async () => {
      mockModule._FPDFAnnot_GetSubtype.mockReturnValue(20); // Widget
      mockModule._FPDFAnnot_GetFormFieldType.mockReturnValue(6); // TextField
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      using annot = page.getAnnotation(0);

      expect(annot.isWidget()).toBe(true);
    });

    it('should return false for Widget annotation with Unknown field type', async () => {
      mockModule._FPDFAnnot_GetSubtype.mockReturnValue(20); // Widget
      mockModule._FPDFAnnot_GetFormFieldType.mockReturnValue(0); // Unknown
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      using annot = page.getAnnotation(0);

      expect(annot.isWidget()).toBe(false);
    });

    it('should return false for non-Widget annotation', async () => {
      // Text annotation (subtype 1)
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      using annot = page.getAnnotation(0);

      expect(annot.isWidget()).toBe(false);
    });
  });

  describe('getFontSize()', () => {
    it('should return font size on success', async () => {
      mockModule._FPDFAnnot_GetFontSize.mockImplementation(
        // @ts-expect-error - Mock accepts more args than typed signature
        (_form: number, _annot: number, bufPtr: number) => {
          const view = new Float32Array(mockModule.HEAPU8.buffer, bufPtr, 1);
          view[0] = 12.0;
          return 1;
        },
      );
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      using annot = page.getAnnotation(0);

      expect(annot.getFontSize()).toBe(12.0);
    });

    it('should return null on failure', async () => {
      mockModule._FPDFAnnot_GetFontSize.mockReturnValue(0);
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      using annot = page.getAnnotation(0);

      expect(annot.getFontSize()).toBeNull();
    });

    it('should return null when no form handle', async () => {
      mockModule._FPDFDOC_InitFormFillEnvironment.mockReturnValue(0);
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      using annot = page.getAnnotation(0);

      expect(annot.getFontSize()).toBeNull();
    });
  });

  describe('dispose guards', () => {
    it('should throw on type after dispose', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      const annot = page.getAnnotation(0);
      annot.dispose();

      expect(() => annot.type).toThrow();
    });

    it('should throw on getAppearance after dispose', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      const annot = page.getAnnotation(0);
      annot.dispose();

      expect(() => annot.getAppearance(AnnotationAppearanceMode.Normal)).toThrow();
    });

    it('should throw on setAppearance after dispose', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      const annot = page.getAnnotation(0);
      annot.dispose();

      expect(() => annot.setAppearance(AnnotationAppearanceMode.Normal, 'test')).toThrow();
    });

    it('should throw on getFormFieldType after dispose', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      const annot = page.getAnnotation(0);
      annot.dispose();

      expect(() => annot.getFormFieldType()).toThrow();
    });

    it('should throw on getFormFieldFlags after dispose', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      const annot = page.getAnnotation(0);
      annot.dispose();

      expect(() => annot.getFormFieldFlags()).toThrow();
    });

    it('should throw on getFormFieldName after dispose', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      const annot = page.getAnnotation(0);
      annot.dispose();

      expect(() => annot.getFormFieldName()).toThrow();
    });

    it('should throw on getFormFieldValue after dispose', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      const annot = page.getAnnotation(0);
      annot.dispose();

      expect(() => annot.getFormFieldValue()).toThrow();
    });

    it('should throw on getFormFieldAlternateName after dispose', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      const annot = page.getAnnotation(0);
      annot.dispose();

      expect(() => annot.getFormFieldAlternateName()).toThrow();
    });

    it('should throw on getFormFieldOptions after dispose', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      const annot = page.getAnnotation(0);
      annot.dispose();

      expect(() => annot.getFormFieldOptions()).toThrow();
    });

    it('should throw on focus after dispose', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      const annot = page.getAnnotation(0);
      annot.dispose();

      expect(() => annot.focus()).toThrow();
    });
  });
});
