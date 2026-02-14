import { describe, expect, it } from 'vitest';
import * as text from '../../../src/document/page_impl/text.js';
import { NULL_TEXT_PAGE } from '../../../src/internal/constants.js';
import { asHandle, WASMMemoryManager } from '../../../src/wasm/memory.js';
import { createMockWasmModule } from '../../utils/mock-wasm.js';

describe('Text implementation (failure paths)', () => {
  describe('getCharBox', () => {
    it('should return undefined when _FPDFText_GetCharBox returns false', () => {
      const mockModule = createMockWasmModule();
      // @ts-expect-error - Mock module type mismatch
      const memory = new WASMMemoryManager(mockModule);
      const textPageHandle = asHandle(300);

      // Mock the function to return false (0)
      mockModule._FPDFText_GetCharBox.mockReturnValue(0);

      // @ts-expect-error - Mock module type mismatch
      const result = text.getCharBox(mockModule, memory, textPageHandle, 0);

      expect(result).toBeUndefined();
      expect(mockModule._FPDFText_GetCharBox).toHaveBeenCalled();
    });

    it('should return CharBox when _FPDFText_GetCharBox returns true', () => {
      const mockModule = createMockWasmModule();
      // @ts-expect-error - Mock module type mismatch
      const memory = new WASMMemoryManager(mockModule);
      const textPageHandle = asHandle(300);

      // Mock the function to return true and populate the out params
      // @ts-expect-error - Mock signature mismatch
      mockModule._FPDFText_GetCharBox.mockImplementation((_page, _index, leftPtr, rightPtr, bottomPtr, topPtr) => {
        const heap = mockModule.HEAPF64;
        heap[leftPtr / 8] = 10.5;
        heap[rightPtr / 8] = 50.5;
        heap[bottomPtr / 8] = 20.0;
        heap[topPtr / 8] = 40.0;
        return 1; // true
      });

      // @ts-expect-error - Mock module type mismatch
      const result = text.getCharBox(mockModule, memory, textPageHandle, 5);

      expect(result).toBeDefined();
      expect(result?.left).toBe(10.5);
      expect(result?.right).toBe(50.5);
      expect(result?.bottom).toBe(20.0);
      expect(result?.top).toBe(40.0);
    });
  });

  describe('getText', () => {
    it('should return empty string when count <= 0', () => {
      const mockModule = createMockWasmModule();
      // @ts-expect-error - Mock module type mismatch
      const memory = new WASMMemoryManager(mockModule);
      const textPageHandle = asHandle(300);

      // @ts-expect-error - Mock module type mismatch
      const result = text.getText(mockModule, memory, textPageHandle, 0, 0);

      expect(result).toBe('');
    });

    it('should return empty string when _FPDFText_GetText returns <= 0', () => {
      const mockModule = createMockWasmModule();
      // @ts-expect-error - Mock module type mismatch
      const memory = new WASMMemoryManager(mockModule);
      const textPageHandle = asHandle(300);

      // Mock the function to return 0 (failure)
      mockModule._FPDFText_GetText.mockReturnValue(0);

      // @ts-expect-error - Mock module type mismatch
      const result = text.getText(mockModule, memory, textPageHandle, 0, 10);

      expect(result).toBe('');
      expect(mockModule._FPDFText_GetText).toHaveBeenCalled();
    });

    it('should return text when _FPDFText_GetText succeeds', () => {
      const mockModule = createMockWasmModule();
      // @ts-expect-error - Mock module type mismatch
      const memory = new WASMMemoryManager(mockModule);
      const textPageHandle = asHandle(300);

      // Mock to return a count of characters + null terminator
      // @ts-expect-error - Mock signature mismatch
      mockModule._FPDFText_GetText.mockImplementation((_page, _start, _count, bufferPtr) => {
        // Write UTF-16LE for 'Hi' (2 chars + null terminator = 3)
        const view = new Uint16Array(mockModule.HEAPU8.buffer, bufferPtr, 3);
        view[0] = 0x0048; // 'H'
        view[1] = 0x0069; // 'i'
        view[2] = 0x0000; // null terminator
        return 3; // char count including null
      });

      // @ts-expect-error - Mock module type mismatch
      const result = text.getText(mockModule, memory, textPageHandle, 0, 2);

      expect(result).toBe('Hi');
    });
  });

  describe('getTextBounded', () => {
    it('should return empty string when count <= 1', () => {
      const mockModule = createMockWasmModule();
      // @ts-expect-error - Mock module type mismatch
      const memory = new WASMMemoryManager(mockModule);
      const textPageHandle = asHandle(300);

      // Mock first call (to get count) to return 1 (just null terminator)
      mockModule._FPDFText_GetBoundedText.mockReturnValue(1);

      // @ts-expect-error - Mock module type mismatch
      const result = text.getTextBounded(mockModule, memory, textPageHandle, 0, 0, 100, 100);

      expect(result).toBe('');
    });

    it('should return empty string when count is 0', () => {
      const mockModule = createMockWasmModule();
      // @ts-expect-error - Mock module type mismatch
      const memory = new WASMMemoryManager(mockModule);
      const textPageHandle = asHandle(300);

      // Mock to return 0 (no text)
      mockModule._FPDFText_GetBoundedText.mockReturnValue(0);

      // @ts-expect-error - Mock module type mismatch
      const result = text.getTextBounded(mockModule, memory, textPageHandle, 10, 10, 50, 50);

      expect(result).toBe('');
    });

    it('should return text when bounded text exists', () => {
      const mockModule = createMockWasmModule();
      // @ts-expect-error - Mock module type mismatch
      const memory = new WASMMemoryManager(mockModule);
      const textPageHandle = asHandle(300);

      let callCount = 0;
      // @ts-expect-error - Mock signature mismatch
      mockModule._FPDFText_GetBoundedText.mockImplementation((_page, _l, _t, _r, _b, bufferPtr, count) => {
        callCount++;
        if (callCount === 1) {
          // First call: return char count (3 = 2 chars + null)
          return 3;
        }
        // Second call: write the text
        const view = new Uint16Array(mockModule.HEAPU8.buffer, bufferPtr, count);
        view[0] = 0x004f; // 'O'
        view[1] = 0x004b; // 'K'
        view[2] = 0x0000; // null
        return 3;
      });

      // @ts-expect-error - Mock module type mismatch
      const result = text.getTextBounded(mockModule, memory, textPageHandle, 0, 0, 100, 100);

      expect(result).toBe('OK');
      expect(callCount).toBe(2);
    });
  });

  describe('getTextRect', () => {
    it('should return undefined when _FPDFText_GetRect returns false', () => {
      const mockModule = createMockWasmModule();
      // @ts-expect-error - Mock module type mismatch
      const memory = new WASMMemoryManager(mockModule);
      const textPageHandle = asHandle(300);

      // Mock to return false (0)
      mockModule._FPDFText_GetRect.mockReturnValue(0);

      // @ts-expect-error - Mock module type mismatch
      const result = text.getRect(mockModule, memory, textPageHandle, 0);

      expect(result).toBeUndefined();
      expect(mockModule._FPDFText_GetRect).toHaveBeenCalled();
    });

    it('should return Rect when _FPDFText_GetRect succeeds', () => {
      const mockModule = createMockWasmModule();
      // @ts-expect-error - Mock module type mismatch
      const memory = new WASMMemoryManager(mockModule);
      const textPageHandle = asHandle(300);

      // @ts-expect-error - Mock signature mismatch
      mockModule._FPDFText_GetRect.mockImplementation((_page, _index, leftPtr, topPtr, rightPtr, bottomPtr) => {
        const heap = mockModule.HEAPF64;
        heap[leftPtr / 8] = 5.0;
        heap[topPtr / 8] = 95.0;
        heap[rightPtr / 8] = 55.0;
        heap[bottomPtr / 8] = 85.0;
        return 1; // true
      });

      // @ts-expect-error - Mock module type mismatch
      const result = text.getRect(mockModule, memory, textPageHandle, 2);

      expect(result).toBeDefined();
      expect(result?.left).toBe(5.0);
      expect(result?.top).toBe(95.0);
      expect(result?.right).toBe(55.0);
      expect(result?.bottom).toBe(85.0);
    });
  });

  describe('loadTextPage', () => {
    it('should return NULL_TEXT_PAGE when loading fails', () => {
      const mockModule = createMockWasmModule();
      const pageHandle = asHandle(200);

      mockModule._FPDFText_LoadPage.mockReturnValue(NULL_TEXT_PAGE as number);

      // @ts-expect-error - Mock module type mismatch
      const result = text.loadTextPage(mockModule, pageHandle);

      expect(result).toBe(NULL_TEXT_PAGE);
    });

    it('should return text page handle when loading succeeds', () => {
      const mockModule = createMockWasmModule();
      const pageHandle = asHandle(200);

      mockModule._FPDFText_LoadPage.mockReturnValue(300);

      // @ts-expect-error - Mock module type mismatch
      const result = text.loadTextPage(mockModule, pageHandle);

      expect(result).toBe(300);
    });
  });
});
