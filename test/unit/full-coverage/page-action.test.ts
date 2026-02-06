import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PageError } from '../../../src/core/errors.js';
import { ActionType, PageRotation } from '../../../src/core/types.js';
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

describe('PDFium Page Actions & Coordinates (Full Coverage)', () => {
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

  describe('Actions', () => {
    it('should handle URI action path retrieval failure', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      mockModule._FPDFLink_GetLinkAtPoint.mockReturnValue(100);
      mockModule._FPDFLink_GetAction.mockReturnValue(200);
      mockModule._FPDFAction_GetType.mockReturnValue(3); // Native value for URI
      mockModule._FPDFAction_GetURIPath.mockReturnValue(0); // Fail

      const link = page.getLinkAtPoint(0, 0);
      expect(link?.action?.type).toBe(ActionType.URI);
      expect(link?.action?.uri).toBeUndefined();
    });

    it('should handle Launch action file path retrieval failure', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      mockModule._FPDFLink_GetLinkAtPoint.mockReturnValue(100);
      mockModule._FPDFLink_GetAction.mockReturnValue(200);
      mockModule._FPDFAction_GetType.mockReturnValue(4); // Native value for Launch
      mockModule._FPDFAction_GetFilePath.mockReturnValue(0); // Fail

      const link = page.getLinkAtPoint(0, 0);
      expect(link?.action?.type).toBe(ActionType.Launch);
      expect(link?.action?.filePath).toBeUndefined();
    });
  });

  describe('Coordinate Conversion', () => {
    const context = {
      startX: 0,
      startY: 0,
      sizeX: 100,
      sizeY: 100,
      rotate: PageRotation.None,
    };

    it('deviceToPage should throw on infinite inputs', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      expect(() => page.deviceToPage(context, Infinity, 0)).toThrow(PageError);
      expect(() => page.deviceToPage(context, 0, -Infinity)).toThrow(PageError);
    });

    it('pageToDevice should throw on infinite inputs', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);
      expect(() => page.pageToDevice(context, Infinity, 0)).toThrow(PageError);
      expect(() => page.pageToDevice(context, 0, -Infinity)).toThrow(PageError);
    });
  });
});
