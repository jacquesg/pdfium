/**
 * Coverage tests for progressive.ts uncovered branches.
 *
 * Targets specific uncovered edge cases:
 * - Line 132: fromBuffer where document size exceeds maxDocumentSize limit
 * - Line 245: getDocument() where #getTemporaryDocument() returns undefined
 * - Lines 271-272: getBlock callback where position + size > availableBytes()
 * - Line 282: addSegment callback (it just returns 0, but needs to be called)
 */

import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createMockWasmModule } from '../../utils/mock-wasm.js';

describe('ProgressivePDFLoader - coverage for uncovered branches', () => {
  let mockModule: ReturnType<typeof createMockWasmModule>;

  beforeEach(() => {
    vi.resetModules();
    mockModule = createMockWasmModule();
  });

  test('line 122 - fromBuffer throws when document size exceeds maxDocumentSize', async () => {
    const { ProgressivePDFLoader } = await import('../../../src/document/progressive.js');
    const { WASMMemoryManager } = await import('../../../src/wasm/memory.js');

    // @ts-expect-error - Mock module type mismatch
    const memory = new WASMMemoryManager(mockModule);

    // Create a buffer larger than the limit
    const largeBuffer = new Uint8Array(100);
    const limits = {
      maxDocumentSize: 10,
      maxPageSize: 1000,
      maxPages: 100,
      maxRenderDimension: 5000,
    };

    expect(() => {
      // @ts-expect-error - Mock module type mismatch
      ProgressivePDFLoader.fromBuffer(largeBuffer, mockModule, memory, limits);
    }).toThrow('Document size 100 exceeds maximum allowed size of 10 bytes');
  });

  test('line 245 - getDocument where FPDFAvail_GetDocument returns 0', async () => {
    // Make _FPDFAvail_GetDocument return 0 (null handle)
    mockModule._FPDFAvail_GetDocument.mockImplementation(() => 0);

    const { ProgressivePDFLoader } = await import('../../../src/document/progressive.js');
    const { WASMMemoryManager } = await import('../../../src/wasm/memory.js');

    // @ts-expect-error - Mock module type mismatch
    const memory = new WASMMemoryManager(mockModule);
    const pdfData = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // "%PDF"

    // @ts-expect-error - Mock module type mismatch
    using loader = ProgressivePDFLoader.fromBuffer(pdfData, mockModule, memory);

    // Should throw when getDocument() fails to get a document handle
    expect(() => loader.getDocument()).toThrow('Failed to get document from availability provider');
  });

  test('lines 271-272 - getBlock callback returns 0 when position + size > availableBytes', async () => {
    // Track getBlock callback invocations
    let getBlockCallback: ((param: number, position: number, pBuf: number, size: number) => number) | undefined;

    // Create a new addFunction implementation that captures callbacks
    const addFunctionCalls: Array<{ callback: unknown; signature: string }> = [];
    let nextPtr = 1000;
    mockModule.addFunction = vi.fn((callback, signature) => {
      addFunctionCalls.push({ callback, signature });
      if (signature === 'iiiii') {
        getBlockCallback = callback as (param: number, position: number, pBuf: number, size: number) => number;
      }
      return nextPtr++;
    });

    const { ProgressivePDFLoader } = await import('../../../src/document/progressive.js');
    const { WASMMemoryManager } = await import('../../../src/wasm/memory.js');

    // @ts-expect-error - Mock module type mismatch
    const memory = new WASMMemoryManager(mockModule);
    const pdfData = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // "%PDF" - 4 bytes

    // @ts-expect-error - Mock module type mismatch
    using _loader = ProgressivePDFLoader.fromBuffer(pdfData, mockModule, memory);

    // Ensure getBlock callback was registered
    expect(getBlockCallback).toBeDefined();

    // Test the overflow branch: request position=2, size=10, but only 4 bytes available
    // Should return 0 because 2 + 10 > 4
    const result = getBlockCallback !== undefined ? getBlockCallback(0, 2, 100, 10) : -1;
    expect(result).toBe(0);
  });

  test('lines 271-272 - getBlock callback returns 1 when position + size <= availableBytes', async () => {
    // Track getBlock callback invocations
    let getBlockCallback: ((param: number, position: number, pBuf: number, size: number) => number) | undefined;

    let nextPtr = 1000;
    mockModule.addFunction = vi.fn((callback, signature) => {
      if (signature === 'iiiii') {
        getBlockCallback = callback as (param: number, position: number, pBuf: number, size: number) => number;
      }
      return nextPtr++;
    });

    const { ProgressivePDFLoader } = await import('../../../src/document/progressive.js');
    const { WASMMemoryManager } = await import('../../../src/wasm/memory.js');

    // @ts-expect-error - Mock module type mismatch
    const memory = new WASMMemoryManager(mockModule);
    const pdfData = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]); // "%PDF-1.7" - 8 bytes

    // @ts-expect-error - Mock module type mismatch
    using _loader = ProgressivePDFLoader.fromBuffer(pdfData, mockModule, memory);

    expect(getBlockCallback).toBeDefined();

    // Test the success path: request position=2, size=4, total=6 which is <= 8 bytes available
    const result = getBlockCallback !== undefined ? getBlockCallback(0, 2, 100, 4) : -1;
    expect(result).toBe(1);
  });

  test('line 282 - addSegment callback is registered and returns 0', async () => {
    // Track addSegment callback
    let addSegmentCallback: ((pThis: number, offset: number, size: number) => number) | undefined;

    // Intercept addFunction to capture the addSegment callback (signature 'iiii')
    // Note: Both IsDataAvail and AddSegment use 'iiii', but AddSegment is the second one registered
    let iiiiCallCount = 0;
    let nextPtr = 1000;
    mockModule.addFunction = vi.fn((callback, signature) => {
      if (signature === 'iiii') {
        iiiiCallCount++;
        if (iiiiCallCount === 2) {
          // Second 'iiii' is AddSegment (first is IsDataAvail)
          addSegmentCallback = callback as (pThis: number, offset: number, size: number) => number;
        }
      }
      return nextPtr++;
    });

    const { ProgressivePDFLoader } = await import('../../../src/document/progressive.js');
    const { WASMMemoryManager } = await import('../../../src/wasm/memory.js');

    // @ts-expect-error - Mock module type mismatch
    const memory = new WASMMemoryManager(mockModule);
    const pdfData = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // "%PDF"

    // @ts-expect-error - Mock module type mismatch
    using _loader = ProgressivePDFLoader.fromBuffer(pdfData, mockModule, memory);

    // Ensure addSegment callback was registered
    expect(addSegmentCallback).toBeDefined();

    // Call it and verify it returns 0
    const result = addSegmentCallback !== undefined ? addSegmentCallback(0, 0, 100) : -1;
    expect(result).toBe(0);
  });

  test('line 294 - FPDFAvail_Create returns NULL_AVAIL triggers error', async () => {
    // Make FPDFAvail_Create fail
    mockModule._FPDFAvail_Create.mockImplementation(() => 0);

    const { ProgressivePDFLoader } = await import('../../../src/document/progressive.js');
    const { WASMMemoryManager } = await import('../../../src/wasm/memory.js');

    // @ts-expect-error - Mock module type mismatch
    const memory = new WASMMemoryManager(mockModule);
    const pdfData = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // "%PDF"

    // Should throw DocumentError when FPDFAvail_Create fails
    expect(() => {
      // @ts-expect-error - Mock module type mismatch
      ProgressivePDFLoader.fromBuffer(pdfData, mockModule, memory);
    }).toThrow('Failed to create availability provider');
  });

  test('lines 299-300 - cleanup is called when initialisation throws', async () => {
    // Make FPDFAvail_Create fail to trigger cleanup path
    mockModule._FPDFAvail_Create.mockImplementation(() => 0);

    const { ProgressivePDFLoader } = await import('../../../src/document/progressive.js');
    const { WASMMemoryManager } = await import('../../../src/wasm/memory.js');

    // @ts-expect-error - Mock module type mismatch
    const memory = new WASMMemoryManager(mockModule);
    const pdfData = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // "%PDF"

    const freeSpy = vi.spyOn(mockModule, '_free');

    // Should throw and clean up allocated memory
    expect(() => {
      // @ts-expect-error - Mock module type mismatch
      ProgressivePDFLoader.fromBuffer(pdfData, mockModule, memory);
    }).toThrow();

    // Cleanup should free allocated resources (data buffer allocation)
    expect(freeSpy).toHaveBeenCalled();
  });

  test('firstPageNumber when isDocumentAvailable is false returns -1', async () => {
    // Make document not available
    mockModule._FPDFAvail_IsDocAvail.mockImplementation(() => 0);

    const { ProgressivePDFLoader } = await import('../../../src/document/progressive.js');
    const { WASMMemoryManager } = await import('../../../src/wasm/memory.js');

    // @ts-expect-error - Mock module type mismatch
    const memory = new WASMMemoryManager(mockModule);
    const pdfData = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // "%PDF"

    // @ts-expect-error - Mock module type mismatch
    using loader = ProgressivePDFLoader.fromBuffer(pdfData, mockModule, memory);

    expect(loader.firstPageNumber).toBe(-1);
  });

  test('firstPageNumber when getTemporaryDocument returns undefined returns -1', async () => {
    // Document is available, but GetDocument returns null
    mockModule._FPDFAvail_IsDocAvail.mockImplementation(() => 1);
    mockModule._FPDFAvail_GetDocument.mockImplementation(() => 0);

    const { ProgressivePDFLoader } = await import('../../../src/document/progressive.js');
    const { WASMMemoryManager } = await import('../../../src/wasm/memory.js');

    // @ts-expect-error - Mock module type mismatch
    const memory = new WASMMemoryManager(mockModule);
    const pdfData = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // "%PDF"

    // @ts-expect-error - Mock module type mismatch
    using loader = ProgressivePDFLoader.fromBuffer(pdfData, mockModule, memory);

    // firstPageNumber should return -1 when getTemporaryDocument fails
    expect(loader.firstPageNumber).toBe(-1);
  });

  test('getDocument with password - successful path', async () => {
    // Setup successful document loading
    mockModule._FPDFAvail_GetDocument.mockImplementation(() => 100);

    const { ProgressivePDFLoader } = await import('../../../src/document/progressive.js');
    const { WASMMemoryManager } = await import('../../../src/wasm/memory.js');

    // @ts-expect-error - Mock module type mismatch
    const memory = new WASMMemoryManager(mockModule);
    const pdfData = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // "%PDF"

    // @ts-expect-error - Mock module type mismatch
    using loader = ProgressivePDFLoader.fromBuffer(pdfData, mockModule, memory);

    // Call getDocument with password
    using document = loader.getDocument('test-password');

    expect(document).toBeDefined();
    expect(mockModule._FPDFAvail_GetDocument).toHaveBeenCalled();
  });

  test('getDocument after already extracted throws', async () => {
    mockModule._FPDFAvail_GetDocument.mockImplementation(() => 100);

    const { ProgressivePDFLoader } = await import('../../../src/document/progressive.js');
    const { WASMMemoryManager } = await import('../../../src/wasm/memory.js');

    // @ts-expect-error - Mock module type mismatch
    const memory = new WASMMemoryManager(mockModule);
    const pdfData = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // "%PDF"

    // @ts-expect-error - Mock module type mismatch
    using loader = ProgressivePDFLoader.fromBuffer(pdfData, mockModule, memory);

    // Extract document once
    using document = loader.getDocument();

    expect(document).toBeDefined();

    // Second attempt should fail
    expect(() => loader.getDocument()).toThrow('Document already extracted');
  });

  test('isPageAvailable edge case - disposed loader throws', async () => {
    const { ProgressivePDFLoader } = await import('../../../src/document/progressive.js');
    const { WASMMemoryManager } = await import('../../../src/wasm/memory.js');

    // @ts-expect-error - Mock module type mismatch
    const memory = new WASMMemoryManager(mockModule);
    const pdfData = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // "%PDF"

    // @ts-expect-error - Mock module type mismatch
    const loader = ProgressivePDFLoader.fromBuffer(pdfData, mockModule, memory);
    loader.dispose();

    // Should throw after disposal
    expect(() => loader.isPageAvailable(0)).toThrow();
  });

  test('fromBuffer accepts ArrayBuffer and converts to Uint8Array', async () => {
    const { ProgressivePDFLoader } = await import('../../../src/document/progressive.js');
    const { WASMMemoryManager } = await import('../../../src/wasm/memory.js');

    // @ts-expect-error - Mock module type mismatch
    const memory = new WASMMemoryManager(mockModule);
    const arrayBuffer = new ArrayBuffer(4);
    const view = new Uint8Array(arrayBuffer);
    view.set([0x25, 0x50, 0x44, 0x46]); // "%PDF"

    // Should accept ArrayBuffer
    // @ts-expect-error - Mock module type mismatch
    using loader = ProgressivePDFLoader.fromBuffer(arrayBuffer, mockModule, memory);

    expect(loader).toBeDefined();
  });

  test('linearisationStatus returns correct values', async () => {
    const { ProgressivePDFLoader } = await import('../../../src/document/progressive.js');
    const { WASMMemoryManager } = await import('../../../src/wasm/memory.js');
    const { LinearisationStatus } = await import('../../../src/core/types.js');

    // @ts-expect-error - Mock module type mismatch
    const memory = new WASMMemoryManager(mockModule);
    const pdfData = new Uint8Array([0x25, 0x50, 0x44, 0x46]);

    // Test Linearised
    mockModule._FPDFAvail_IsLinearized.mockImplementation(() => 1);
    {
      // @ts-expect-error - Mock module type mismatch
      using loader = ProgressivePDFLoader.fromBuffer(pdfData, mockModule, memory);
      expect(loader.linearisationStatus).toBe(LinearisationStatus.Linearised);
      expect(loader.isLinearised).toBe(true);
    }

    // Test NotLinearised
    mockModule._FPDFAvail_IsLinearized.mockImplementation(() => 0);
    {
      // @ts-expect-error - Mock module type mismatch
      using loader = ProgressivePDFLoader.fromBuffer(pdfData, mockModule, memory);
      expect(loader.linearisationStatus).toBe(LinearisationStatus.NotLinearised);
      expect(loader.isLinearised).toBe(false);
    }

    // Test Unknown
    mockModule._FPDFAvail_IsLinearized.mockImplementation(() => -1);
    {
      // @ts-expect-error - Mock module type mismatch
      using loader = ProgressivePDFLoader.fromBuffer(pdfData, mockModule, memory);
      expect(loader.linearisationStatus).toBe(LinearisationStatus.Unknown);
      expect(loader.isLinearised).toBe(false);
    }
  });

  test('isDocumentAvailable checks return correct boolean', async () => {
    const { ProgressivePDFLoader } = await import('../../../src/document/progressive.js');
    const { WASMMemoryManager } = await import('../../../src/wasm/memory.js');

    // @ts-expect-error - Mock module type mismatch
    const memory = new WASMMemoryManager(mockModule);
    const pdfData = new Uint8Array([0x25, 0x50, 0x44, 0x46]);

    // Test available
    mockModule._FPDFAvail_IsDocAvail.mockImplementation(() => 1);
    {
      // @ts-expect-error - Mock module type mismatch
      using loader = ProgressivePDFLoader.fromBuffer(pdfData, mockModule, memory);
      expect(loader.isDocumentAvailable).toBe(true);
    }

    // Test not available
    mockModule._FPDFAvail_IsDocAvail.mockImplementation(() => 0);
    {
      // @ts-expect-error - Mock module type mismatch
      using loader = ProgressivePDFLoader.fromBuffer(pdfData, mockModule, memory);
      expect(loader.isDocumentAvailable).toBe(false);
    }
  });

  test('isPageAvailable checks return correct boolean', async () => {
    const { ProgressivePDFLoader } = await import('../../../src/document/progressive.js');
    const { WASMMemoryManager } = await import('../../../src/wasm/memory.js');

    // @ts-expect-error - Mock module type mismatch
    const memory = new WASMMemoryManager(mockModule);
    const pdfData = new Uint8Array([0x25, 0x50, 0x44, 0x46]);

    // Test available
    mockModule._FPDFAvail_IsPageAvail.mockImplementation(() => 1);
    {
      // @ts-expect-error - Mock module type mismatch
      using loader = ProgressivePDFLoader.fromBuffer(pdfData, mockModule, memory);
      expect(loader.isPageAvailable(0)).toBe(true);
    }

    // Test not available
    mockModule._FPDFAvail_IsPageAvail.mockImplementation(() => 0);
    {
      // @ts-expect-error - Mock module type mismatch
      using loader = ProgressivePDFLoader.fromBuffer(pdfData, mockModule, memory);
      expect(loader.isPageAvailable(0)).toBe(false);
    }
  });
});
