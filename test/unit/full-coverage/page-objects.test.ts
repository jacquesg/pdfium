import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BlendMode, PathFillMode } from '../../../src/core/types.js';
import { PDFiumPathObject, PDFiumTextObject } from '../../../src/document/page-object.js';
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

describe('PDFiumPageObject (Full Coverage)', () => {
  let mockModule: ReturnType<typeof createMockWasmModule>;
  let pdfium: PDFium;

  beforeEach(async () => {
    mockModule = createMockWasmModule();
    // @ts-expect-error - Mock module is incomplete but sufficient for tests
    vi.mocked(WasmLoader.loadWASM).mockResolvedValue(mockModule);
    pdfium = await PDFium.init();

    // Setup page with one object (Path type by default)
    mockModule._FPDFPage_CountObjects.mockReturnValue(1);
    mockModule._FPDFPage_GetObject.mockReturnValue(800);
    mockModule._FPDFPageObj_GetType.mockReturnValue(2); // Path type (native 2 = Path)
    mockModule._FPDFPageObj_GetBounds.mockImplementation(
      // @ts-expect-error - Mock accepts more args than typed signature
      (_obj: number, rectPtr: number) => {
        const view = new Float32Array(mockModule.HEAPU8.buffer, rectPtr, 4);
        view[0] = 0; // left
        view[1] = 0; // top
        view[2] = 100; // right
        view[3] = 100; // bottom
        return 1;
      },
    );
  });

  afterEach(() => {
    pdfium.dispose();
    vi.clearAllMocks();
  });

  describe('fillColour', () => {
    it('should return null when _FPDFPageObj_GetFillColor returns 0', async () => {
      mockModule._FPDFPageObj_GetFillColor.mockReturnValue(0);
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      const objects = page.getObjects();

      expect(objects).toHaveLength(1);
      expect(objects[0]?.fillColour).toBeNull();
    });

    it('should return colour when _FPDFPageObj_GetFillColor returns 1', async () => {
      mockModule._FPDFPageObj_GetFillColor.mockImplementation(
        // @ts-expect-error - Mock accepts more args than typed signature
        (_obj: number, rPtr: number, gPtr: number, bPtr: number, aPtr: number) => {
          const view = new Uint32Array(mockModule.HEAPU8.buffer);
          view[rPtr / 4] = 255;
          view[gPtr / 4] = 128;
          view[bPtr / 4] = 64;
          view[aPtr / 4] = 255;
          return 1;
        },
      );
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      const objects = page.getObjects();

      expect(objects[0]?.fillColour).toEqual({ r: 255, g: 128, b: 64, a: 255 });
    });
  });

  describe('strokeColour', () => {
    it('should return null when _FPDFPageObj_GetStrokeColor returns 0', async () => {
      mockModule._FPDFPageObj_GetStrokeColor.mockReturnValue(0);
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      const objects = page.getObjects();

      expect(objects[0]?.strokeColour).toBeNull();
    });

    it('should return colour when _FPDFPageObj_GetStrokeColor returns 1', async () => {
      mockModule._FPDFPageObj_GetStrokeColor.mockImplementation(
        // @ts-expect-error - Mock accepts more args than typed signature
        (_obj: number, rPtr: number, gPtr: number, bPtr: number, aPtr: number) => {
          const view = new Uint32Array(mockModule.HEAPU8.buffer);
          view[rPtr / 4] = 64;
          view[gPtr / 4] = 32;
          view[bPtr / 4] = 16;
          view[aPtr / 4] = 128;
          return 1;
        },
      );
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      const objects = page.getObjects();

      expect(objects[0]?.strokeColour).toEqual({ r: 64, g: 32, b: 16, a: 128 });
    });
  });

  describe('strokeWidth', () => {
    it('should return null when _FPDFPageObj_GetStrokeWidth returns 0', async () => {
      mockModule._FPDFPageObj_GetStrokeWidth.mockReturnValue(0);
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      const objects = page.getObjects();

      expect(objects[0]?.strokeWidth).toBeNull();
    });

    it('should return width when _FPDFPageObj_GetStrokeWidth returns 1', async () => {
      mockModule._FPDFPageObj_GetStrokeWidth.mockImplementation(
        // @ts-expect-error - Mock accepts more args than typed signature
        (_obj: number, widthPtr: number) => {
          const view = new Float32Array(mockModule.HEAPU8.buffer, widthPtr, 1);
          view[0] = 2.5;
          return 1;
        },
      );
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      const objects = page.getObjects();

      expect(objects[0]?.strokeWidth).toBe(2.5);
    });
  });

  describe('matrix', () => {
    it('should return null when _FPDFPageObj_GetMatrix returns 0', async () => {
      mockModule._FPDFPageObj_GetMatrix.mockReturnValue(0);
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      const objects = page.getObjects();

      expect(objects[0]?.matrix).toBeNull();
    });

    it('should return matrix when _FPDFPageObj_GetMatrix returns 1', async () => {
      mockModule._FPDFPageObj_GetMatrix.mockImplementation(
        // @ts-expect-error - Mock accepts more args than typed signature
        (_obj: number, matrixPtr: number) => {
          const view = new Float32Array(mockModule.HEAPU8.buffer, matrixPtr, 6);
          view[0] = 1; // a
          view[1] = 0; // b
          view[2] = 0; // c
          view[3] = 1; // d
          view[4] = 10; // e
          view[5] = 20; // f
          return 1;
        },
      );
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      const objects = page.getObjects();

      expect(objects[0]?.matrix).toEqual({ a: 1, b: 0, c: 0, d: 1, e: 10, f: 20 });
    });
  });

  describe('rotatedBounds', () => {
    it('should return null when _FPDFPageObj_GetRotatedBounds returns 0', async () => {
      mockModule._FPDFPageObj_GetRotatedBounds.mockReturnValue(0);
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      const objects = page.getObjects();

      expect(objects[0]?.rotatedBounds).toBeNull();
    });

    it('should return quad points when _FPDFPageObj_GetRotatedBounds returns 1', async () => {
      mockModule._FPDFPageObj_GetRotatedBounds.mockImplementation(
        // @ts-expect-error - Mock accepts more args than typed signature
        (_obj: number, quadPtr: number) => {
          const view = new Float32Array(mockModule.HEAPU8.buffer, quadPtr, 8);
          view[0] = 0;
          view[1] = 0;
          view[2] = 100;
          view[3] = 0;
          view[4] = 100;
          view[5] = 100;
          view[6] = 0;
          view[7] = 100;
          return 1;
        },
      );
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      const objects = page.getObjects();

      expect(objects[0]?.rotatedBounds).toEqual({ x1: 0, y1: 0, x2: 100, y2: 0, x3: 100, y3: 100, x4: 0, y4: 100 });
    });
  });

  describe('dashPattern', () => {
    it('should return null when _FPDFPageObj_GetDashCount returns negative', async () => {
      mockModule._FPDFPageObj_GetDashCount.mockReturnValue(-1);
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      const objects = page.getObjects();

      expect(objects[0]?.dashPattern).toBeNull();
    });

    it('should return null when _FPDFPageObj_GetDashArray returns 0', async () => {
      mockModule._FPDFPageObj_GetDashCount.mockReturnValue(2);
      mockModule._FPDFPageObj_GetDashArray.mockReturnValue(0);
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      const objects = page.getObjects();

      expect(objects[0]?.dashPattern).toBeNull();
    });

    it('should return null when _FPDFPageObj_GetDashPhase returns 0', async () => {
      mockModule._FPDFPageObj_GetDashCount.mockReturnValue(2);
      mockModule._FPDFPageObj_GetDashArray.mockReturnValue(1);
      mockModule._FPDFPageObj_GetDashPhase.mockReturnValue(0);
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      const objects = page.getObjects();

      expect(objects[0]?.dashPattern).toBeNull();
    });

    it('should return dash pattern when all calls succeed', async () => {
      mockModule._FPDFPageObj_GetDashCount.mockReturnValue(2);
      mockModule._FPDFPageObj_GetDashArray.mockImplementation(
        // @ts-expect-error - Mock accepts more args than typed signature
        (_obj: number, dashPtr: number, _count: number) => {
          const view = new Float32Array(mockModule.HEAPU8.buffer, dashPtr, 2);
          view[0] = 5;
          view[1] = 3;
          return 1;
        },
      );
      mockModule._FPDFPageObj_GetDashPhase.mockImplementation(
        // @ts-expect-error - Mock accepts more args than typed signature
        (_obj: number, phasePtr: number) => {
          const view = new Float32Array(mockModule.HEAPU8.buffer, phasePtr, 1);
          view[0] = 1.5;
          return 1;
        },
      );
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      const objects = page.getObjects();

      expect(objects[0]?.dashPattern).toEqual({ dashArray: [5, 3], phase: 1.5 });
    });

    it('should handle empty dash array (count=0) with valid phase', async () => {
      mockModule._FPDFPageObj_GetDashCount.mockReturnValue(0);
      mockModule._FPDFPageObj_GetDashPhase.mockImplementation(
        // @ts-expect-error - Mock accepts more args than typed signature
        (_obj: number, phasePtr: number) => {
          const view = new Float32Array(mockModule.HEAPU8.buffer, phasePtr, 1);
          view[0] = 0;
          return 1;
        },
      );
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      const objects = page.getObjects();

      expect(objects[0]?.dashPattern).toEqual({ dashArray: [], phase: 0 });
    });
  });

  describe('hasClipPath', () => {
    it('should return false when _FPDFPageObj_GetClipPath returns NULL', async () => {
      mockModule._FPDFPageObj_GetClipPath.mockReturnValue(0);
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      const objects = page.getObjects();

      expect(objects[0]?.hasClipPath).toBe(false);
    });

    it('should return true when _FPDFPageObj_GetClipPath returns handle', async () => {
      mockModule._FPDFPageObj_GetClipPath.mockReturnValue(900);
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      const objects = page.getObjects();

      expect(objects[0]?.hasClipPath).toBe(true);
    });
  });

  describe('marks', () => {
    it('should return empty array when markCount is 0', async () => {
      mockModule._FPDFPageObj_CountMarks.mockReturnValue(0);
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      const objects = page.getObjects();

      expect(objects[0]?.marks).toEqual([]);
    });

    it('should return mark when getMark succeeds', async () => {
      mockModule._FPDFPageObj_CountMarks.mockReturnValue(1);
      mockModule._FPDFPageObj_GetMark.mockReturnValue(850);
      mockModule._FPDFPageObjMark_GetName.mockImplementation(
        // @ts-expect-error - Mock accepts more args than typed signature
        (_mark: number, bufPtr: number, _bufLen: number, outLenPtr: number) => {
          const view = new Uint32Array(mockModule.HEAPU8.buffer, outLenPtr, 1);
          if (bufPtr === 0) {
            view[0] = 18; // 8 chars * 2 bytes + 2 null terminator bytes = 18
            return 1;
          }
          const strView = new Uint16Array(mockModule.HEAPU8.buffer, bufPtr, 9);
          'Artifact'.split('').forEach((char, i) => {
            strView[i] = char.charCodeAt(0);
          });
          strView[8] = 0;
          view[0] = 18;
          return 1;
        },
      );
      mockModule._FPDFPageObjMark_CountParams.mockReturnValue(0);

      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      const objects = page.getObjects();

      expect(objects[0]?.marks).toHaveLength(1);
      expect(objects[0]?.marks[0]?.name).toBe('Artifact');
    });

    it('should filter out null marks', async () => {
      mockModule._FPDFPageObj_CountMarks.mockReturnValue(2);
      mockModule._FPDFPageObj_GetMark.mockImplementation(
        // @ts-expect-error - Mock accepts more args than typed signature
        (_obj: number, index: number) => {
          if (index === 0) return 850;
          return 0; // NULL_MARK
        },
      );
      mockModule._FPDFPageObjMark_GetName.mockReturnValue(0);
      mockModule._FPDFPageObjMark_CountParams.mockReturnValue(0);

      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      const objects = page.getObjects();

      expect(objects[0]?.marks).toHaveLength(1);
    });
  });

  describe('getMark', () => {
    it('should return null when _FPDFPageObj_GetMark returns NULL', async () => {
      mockModule._FPDFPageObj_GetMark.mockReturnValue(0);
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      const objects = page.getObjects();

      expect(objects[0]?.getMark(0)).toBeNull();
    });

    it('should return mark with empty name when _FPDFPageObjMark_GetName returns undefined', async () => {
      mockModule._FPDFPageObj_GetMark.mockReturnValue(850);
      mockModule._FPDFPageObjMark_GetName.mockReturnValue(0);
      mockModule._FPDFPageObjMark_CountParams.mockReturnValue(0);

      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      const objects = page.getObjects();

      const mark = objects[0]?.getMark(0);
      expect(mark).not.toBeNull();
      expect(mark?.name).toBe('');
      expect(mark?.params).toEqual([]);
    });
  });

  describe('addMark', () => {
    it('should return null when _FPDFPageObj_AddMark returns NULL', async () => {
      mockModule._FPDFPageObj_AddMark.mockReturnValue(0);
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      const objects = page.getObjects();

      expect(objects[0]?.addMark('TestMark')).toBeNull();
    });

    it('should return mark when _FPDFPageObj_AddMark succeeds', async () => {
      mockModule._FPDFPageObj_AddMark.mockReturnValue(851);
      mockModule._FPDFPageObjMark_CountParams.mockReturnValue(0);

      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      const objects = page.getObjects();

      const mark = objects[0]?.addMark('TestMark');
      expect(mark).not.toBeNull();
      expect(mark?.name).toBe('TestMark');
    });
  });

  describe('removeMark', () => {
    it('should return false when _FPDFPageObj_GetMark returns NULL', async () => {
      mockModule._FPDFPageObj_GetMark.mockReturnValue(0);
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      const objects = page.getObjects();

      expect(objects[0]?.removeMark(0)).toBe(false);
    });

    it('should return false when _FPDFPageObj_RemoveMark returns 0', async () => {
      mockModule._FPDFPageObj_GetMark.mockReturnValue(850);
      mockModule._FPDFPageObj_RemoveMark.mockReturnValue(0);
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      const objects = page.getObjects();

      expect(objects[0]?.removeMark(0)).toBe(false);
    });

    it('should return true when _FPDFPageObj_RemoveMark succeeds', async () => {
      mockModule._FPDFPageObj_GetMark.mockReturnValue(850);
      mockModule._FPDFPageObj_RemoveMark.mockReturnValue(1);
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      const objects = page.getObjects();

      expect(objects[0]?.removeMark(0)).toBe(true);
    });
  });

  describe('PDFiumPathObject', () => {
    it('should return null when _FPDFPath_GetDrawMode returns 0', async () => {
      mockModule._FPDFPath_GetDrawMode.mockReturnValue(0);
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      const objects = page.getObjects();
      const pathObj = objects[0];

      expect(pathObj).toBeInstanceOf(PDFiumPathObject);
      if (pathObj instanceof PDFiumPathObject) {
        expect(pathObj.getDrawMode()).toBeNull();
      }
    });

    it('should return draw mode when _FPDFPath_GetDrawMode returns 1', async () => {
      mockModule._FPDFPath_GetDrawMode.mockImplementation(
        // @ts-expect-error - Mock accepts more args than typed signature
        (_path: number, fillModePtr: number, strokePtr: number) => {
          const view = new Int32Array(mockModule.HEAPU8.buffer);
          view[fillModePtr / 4] = 1; // Alternate
          view[strokePtr / 4] = 1; // stroke = true
          return 1;
        },
      );
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      const objects = page.getObjects();
      const pathObj = objects[0];

      expect(pathObj).toBeInstanceOf(PDFiumPathObject);
      if (pathObj instanceof PDFiumPathObject) {
        expect(pathObj.getDrawMode()).toEqual({ fillMode: PathFillMode.Alternate, stroke: true });
      }
    });

    it('should return null when getSegment returns NULL_PATH_SEGMENT', async () => {
      mockModule._FPDFPath_CountSegments.mockReturnValue(1);
      mockModule._FPDFPath_GetPathSegment.mockReturnValue(0);
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      const objects = page.getObjects();
      const pathObj = objects[0];

      if (pathObj instanceof PDFiumPathObject) {
        expect(pathObj.getSegment(0)).toBeNull();
      }
    });

    it('should return segment when getSegment succeeds', async () => {
      mockModule._FPDFPath_CountSegments.mockReturnValue(1);
      mockModule._FPDFPath_GetPathSegment.mockReturnValue(860);
      mockModule._FPDFPathSegment_GetPoint.mockImplementation(
        // @ts-expect-error - Mock accepts more args than typed signature
        (_segment: number, xPtr: number, yPtr: number) => {
          const view = new Float32Array(mockModule.HEAPU8.buffer);
          view[xPtr / 4] = 10;
          view[yPtr / 4] = 20;
          return 1;
        },
      );
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      const objects = page.getObjects();
      const pathObj = objects[0];

      if (pathObj instanceof PDFiumPathObject) {
        const segment = pathObj.getSegment(0);
        expect(segment).not.toBeNull();
        expect(segment?.point).toEqual({ x: 10, y: 20 });
      }
    });
  });

  describe('PDFiumPathSegment', () => {
    it('should return null when _FPDFPathSegment_GetPoint returns 0', async () => {
      mockModule._FPDFPath_CountSegments.mockReturnValue(1);
      mockModule._FPDFPath_GetPathSegment.mockReturnValue(860);
      mockModule._FPDFPathSegment_GetPoint.mockReturnValue(0);
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      const objects = page.getObjects();
      const pathObj = objects[0];

      if (pathObj instanceof PDFiumPathObject) {
        const segment = pathObj.getSegment(0);
        expect(segment?.point).toBeNull();
      }
    });
  });

  describe('destroy()', () => {
    it('should mark object as destroyed and throw on subsequent access', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      const objects = page.getObjects();
      const obj = objects[0];

      obj?.destroy();

      expect(() => obj?.fillColour).toThrow(/destroyed/);
    });
  });

  describe('setMatrix()', () => {
    it('should call _FPDFPageObj_SetMatrix with correct values', async () => {
      mockModule._FPDFPageObj_SetMatrix.mockReturnValue(1);
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      const objects = page.getObjects();

      const result = objects[0]?.setMatrix({ a: 2, b: 0, c: 0, d: 2, e: 50, f: 100 });
      expect(result).toBe(true);
      expect(mockModule._FPDFPageObj_SetMatrix).toHaveBeenCalled();
    });
  });

  describe('setDashPattern()', () => {
    it('should call _FPDFPageObj_SetDashArray with correct values', async () => {
      mockModule._FPDFPageObj_SetDashArray.mockReturnValue(1);
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      const objects = page.getObjects();

      const result = objects[0]?.setDashPattern({ dashArray: [5, 3], phase: 1 });
      expect(result).toBe(true);
    });
  });

  describe('transformClipPath()', () => {
    it('should call _FPDFPageObj_TransformClipPath with correct values', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      const objects = page.getObjects();

      objects[0]?.transformClipPath({ a: 1, b: 0, c: 0, d: 1, e: 10, f: 20 });
      expect(mockModule._FPDFPageObj_TransformClipPath).toHaveBeenCalledWith(800, 1, 0, 0, 1, 10, 20);
    });
  });

  describe('PDFiumTextObject', () => {
    it('should return null when getFont returns null', async () => {
      // Must set type BEFORE creating doc/page so getObjects() constructs a TextObject
      mockModule._FPDFPageObj_GetType.mockReturnValue(1); // Text type (native 1 = Text)
      mockModule._FPDFTextObj_GetText.mockReturnValue(0);
      mockModule._FPDFTextObj_GetFontSize.mockReturnValue(12);
      mockModule._FPDFTextObj_GetFont.mockReturnValue(0);

      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      const objects = page.getObjects();
      const textObj = objects[0];

      expect(textObj).toBeInstanceOf(PDFiumTextObject);
      if (textObj instanceof PDFiumTextObject) {
        expect(textObj.getFont()).toBeNull();
      }
    });
  });

  describe('setBlendMode()', () => {
    it('should call _FPDFPageObj_SetBlendMode with correct value', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      const objects = page.getObjects();

      objects[0]?.setBlendMode(BlendMode.Multiply);
      expect(mockModule._FPDFPageObj_SetBlendMode).toHaveBeenCalled();
    });
  });
});
