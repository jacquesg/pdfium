/**
 * Unit tests for worker-script message handlers.
 *
 * Mocks PDFium, PDFiumDocument, and PDFiumPage to test each handler
 * in isolation without WASM dependencies.
 */

import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { WorkerRequest, WorkerResponse } from '../../../src/context/protocol.js';
import { PDFiumErrorCode } from '../../../src/core/errors.js';

// Captured postMessage calls
const postedMessages: Array<{ data: WorkerResponse; transfer: Transferable[] }> = [];

// Mock page instances
function createMockPage(index: number, width: number, height: number) {
  return {
    index,
    width,
    height,
    size: { width, height },
    render: vi.fn().mockReturnValue({
      width: Math.round(width),
      height: Math.round(height),
      originalWidth: width,
      originalHeight: height,
      data: new Uint8Array([1, 2, 3, 4]),
    }),
    getText: vi.fn().mockReturnValue('Hello PDF'),
    dispose: vi.fn(),
  };
}

// Mock document instances
function createMockDocument(pageCount: number) {
  const mockPage = createMockPage(0, 612, 792);
  return {
    pageCount,
    getPage: vi.fn().mockReturnValue(mockPage),
    dispose: vi.fn(),
    _mockPage: mockPage,
  };
}

// Track mock instances for assertions
let mockPdfiumDispose: ReturnType<typeof vi.fn>;
let mockOpenDocument: ReturnType<typeof vi.fn>;

describe('worker-script', () => {
  beforeEach(async () => {
    vi.resetModules();
    postedMessages.length = 0;

    mockPdfiumDispose = vi.fn();
    const mockDocument = createMockDocument(5);
    mockOpenDocument = vi.fn().mockResolvedValue(mockDocument);

    // Mock self.postMessage
    vi.stubGlobal('self', {
      postMessage: (data: WorkerResponse, options?: { transfer?: Transferable[] }) => {
        postedMessages.push({ data, transfer: options?.transfer ?? [] });
      },
      onmessage: null,
    });

    // Mock PDFium module
    vi.doMock('../../../src/pdfium.js', () => ({
      PDFium: {
        init: vi.fn().mockResolvedValue({
          openDocument: mockOpenDocument,
          dispose: mockPdfiumDispose,
        }),
      },
    }));
  });

  /** Helper: import setupWorker and install the message handler. */
  async function setup(): Promise<(request: WorkerRequest) => Promise<void>> {
    const { setupWorker } = await import('../../../src/context/worker-script.js');
    await setupWorker();

    const handler = (self as unknown as { onmessage: (event: MessageEvent<WorkerRequest>) => Promise<void> }).onmessage;
    return async (request: WorkerRequest) => {
      await handler(new MessageEvent('message', { data: request }));
    };
  }

  /** Helper: get the last posted response. */
  function lastResponse(): WorkerResponse {
    return postedMessages[postedMessages.length - 1]!.data;
  }

  test('INIT should initialise PDFium and post success', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });

    const response = lastResponse();
    expect(response.type).toBe('SUCCESS');
    expect(response.id).toBe('init-1');
  });

  test('INIT should reject double initialisation', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'INIT', id: 'init-2', payload: { wasmBinary: new ArrayBuffer(8) } });

    const response = lastResponse();
    expect(response.type).toBe('ERROR');
    expect(response.id).toBe('init-2');
    if (response.type === 'ERROR') {
      expect(response.error.code).toBe(PDFiumErrorCode.INIT_LIBRARY_FAILED);
    }
  });

  test('OPEN_DOCUMENT should open document and return documentId + pageCount', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'OPEN_DOCUMENT', id: 'open-1', payload: { data: new ArrayBuffer(100) } });

    const response = lastResponse();
    expect(response.type).toBe('SUCCESS');
    if (response.type === 'SUCCESS') {
      const payload = response.payload as { documentId: string; pageCount: number };
      expect(typeof payload.documentId).toBe('string');
      expect(payload.documentId.length).toBeGreaterThan(0);
      expect(payload.pageCount).toBe(5);
    }
  });

  test('OPEN_DOCUMENT should reject when not initialised', async () => {
    const send = await setup();

    await send({ type: 'OPEN_DOCUMENT', id: 'open-1', payload: { data: new ArrayBuffer(100) } });

    const response = lastResponse();
    expect(response.type).toBe('ERROR');
    if (response.type === 'ERROR') {
      expect(response.error.code).toBe(PDFiumErrorCode.INIT_LIBRARY_FAILED);
    }
  });

  test('OPEN_DOCUMENT should reject when document limit reached', async () => {
    const send = await setup();

    await send({
      type: 'INIT',
      id: 'init-1',
      payload: { wasmBinary: new ArrayBuffer(8), maxDocuments: 1, maxPages: 10 },
    });

    await send({ type: 'OPEN_DOCUMENT', id: 'open-1', payload: { data: new ArrayBuffer(100) } });
    await send({ type: 'OPEN_DOCUMENT', id: 'open-2', payload: { data: new ArrayBuffer(100) } });

    const response = lastResponse();
    expect(response.type).toBe('ERROR');
    if (response.type === 'ERROR') {
      expect(response.error.code).toBe(PDFiumErrorCode.WORKER_RESOURCE_LIMIT);
    }
  });

  test('CLOSE_DOCUMENT should close document and associated pages', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'OPEN_DOCUMENT', id: 'open-1', payload: { data: new ArrayBuffer(100) } });

    const openResponse = postedMessages[1]!.data;
    const documentId = (openResponse as { type: 'SUCCESS'; payload: { documentId: string } }).payload.documentId;

    // Load a page first
    await send({ type: 'LOAD_PAGE', id: 'load-1', payload: { documentId, pageIndex: 0 } });

    // Now close the document — should also close the page
    await send({ type: 'CLOSE_DOCUMENT', id: 'close-1', payload: { documentId } });

    const response = lastResponse();
    expect(response.type).toBe('SUCCESS');
    expect(response.id).toBe('close-1');
  });

  test('CLOSE_DOCUMENT should error for unknown documentId', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'CLOSE_DOCUMENT', id: 'close-1', payload: { documentId: 'nonexistent' } });

    const response = lastResponse();
    expect(response.type).toBe('ERROR');
    if (response.type === 'ERROR') {
      expect(response.error.code).toBe(PDFiumErrorCode.DOC_ALREADY_CLOSED);
    }
  });

  test('GET_PAGE_COUNT should return page count', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'OPEN_DOCUMENT', id: 'open-1', payload: { data: new ArrayBuffer(100) } });

    const openResponse = postedMessages[1]!.data;
    const documentId = (openResponse as { type: 'SUCCESS'; payload: { documentId: string } }).payload.documentId;

    await send({ type: 'GET_PAGE_COUNT', id: 'count-1', payload: { documentId } });

    const response = lastResponse();
    expect(response.type).toBe('SUCCESS');
    if (response.type === 'SUCCESS') {
      expect(response.payload).toBe(5);
    }
  });

  test('GET_PAGE_COUNT should error for unknown documentId', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'GET_PAGE_COUNT', id: 'count-1', payload: { documentId: 'nonexistent' } });

    const response = lastResponse();
    expect(response.type).toBe('ERROR');
    if (response.type === 'ERROR') {
      expect(response.error.code).toBe(PDFiumErrorCode.DOC_ALREADY_CLOSED);
    }
  });

  test('LOAD_PAGE should load page and return dimensions', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'OPEN_DOCUMENT', id: 'open-1', payload: { data: new ArrayBuffer(100) } });

    const openResponse = postedMessages[1]!.data;
    const documentId = (openResponse as { type: 'SUCCESS'; payload: { documentId: string } }).payload.documentId;

    await send({ type: 'LOAD_PAGE', id: 'load-1', payload: { documentId, pageIndex: 0 } });

    const response = lastResponse();
    expect(response.type).toBe('SUCCESS');
    if (response.type === 'SUCCESS') {
      const payload = response.payload as { pageId: string; index: number; width: number; height: number };
      expect(typeof payload.pageId).toBe('string');
      expect(payload.pageId.length).toBeGreaterThan(0);
      expect(payload.index).toBe(0);
      expect(payload.width).toBe(612);
      expect(payload.height).toBe(792);
    }
  });

  test('LOAD_PAGE should error for unknown documentId', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'LOAD_PAGE', id: 'load-1', payload: { documentId: 'nonexistent', pageIndex: 0 } });

    const response = lastResponse();
    expect(response.type).toBe('ERROR');
    if (response.type === 'ERROR') {
      expect(response.error.code).toBe(PDFiumErrorCode.DOC_ALREADY_CLOSED);
    }
  });

  test('LOAD_PAGE should reject when page limit reached', async () => {
    const send = await setup();

    await send({
      type: 'INIT',
      id: 'init-1',
      payload: { wasmBinary: new ArrayBuffer(8), maxDocuments: 10, maxPages: 1 },
    });
    await send({ type: 'OPEN_DOCUMENT', id: 'open-1', payload: { data: new ArrayBuffer(100) } });

    const openResponse = postedMessages[1]!.data;
    const documentId = (openResponse as { type: 'SUCCESS'; payload: { documentId: string } }).payload.documentId;

    await send({ type: 'LOAD_PAGE', id: 'load-1', payload: { documentId, pageIndex: 0 } });
    await send({ type: 'LOAD_PAGE', id: 'load-2', payload: { documentId, pageIndex: 1 } });

    const response = lastResponse();
    expect(response.type).toBe('ERROR');
    if (response.type === 'ERROR') {
      expect(response.error.code).toBe(PDFiumErrorCode.WORKER_RESOURCE_LIMIT);
    }
  });

  test('CLOSE_PAGE should close page', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'OPEN_DOCUMENT', id: 'open-1', payload: { data: new ArrayBuffer(100) } });

    const openResponse = postedMessages[1]!.data;
    const documentId = (openResponse as { type: 'SUCCESS'; payload: { documentId: string } }).payload.documentId;

    await send({ type: 'LOAD_PAGE', id: 'load-1', payload: { documentId, pageIndex: 0 } });
    const loadResponse = postedMessages[2]!.data;
    const pageId = (loadResponse as { type: 'SUCCESS'; payload: { pageId: string } }).payload.pageId;

    await send({ type: 'CLOSE_PAGE', id: 'close-1', payload: { pageId } });

    const response = lastResponse();
    expect(response.type).toBe('SUCCESS');
    expect(response.id).toBe('close-1');
  });

  test('CLOSE_PAGE should error for unknown pageId', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'CLOSE_PAGE', id: 'close-1', payload: { pageId: 'nonexistent' } });

    const response = lastResponse();
    expect(response.type).toBe('ERROR');
    if (response.type === 'ERROR') {
      expect(response.error.code).toBe(PDFiumErrorCode.PAGE_ALREADY_CLOSED);
    }
  });

  test('GET_PAGE_SIZE should return width and height', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'OPEN_DOCUMENT', id: 'open-1', payload: { data: new ArrayBuffer(100) } });

    const openResponse = postedMessages[1]!.data;
    const documentId = (openResponse as { type: 'SUCCESS'; payload: { documentId: string } }).payload.documentId;

    await send({ type: 'LOAD_PAGE', id: 'load-1', payload: { documentId, pageIndex: 0 } });
    const loadResponse = postedMessages[2]!.data;
    const pageId = (loadResponse as { type: 'SUCCESS'; payload: { pageId: string } }).payload.pageId;

    await send({ type: 'GET_PAGE_SIZE', id: 'size-1', payload: { pageId } });

    const response = lastResponse();
    expect(response.type).toBe('SUCCESS');
    if (response.type === 'SUCCESS') {
      const payload = response.payload as { width: number; height: number };
      expect(payload.width).toBe(612);
      expect(payload.height).toBe(792);
    }
  });

  test('GET_PAGE_SIZE should error for unknown pageId', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'GET_PAGE_SIZE', id: 'size-1', payload: { pageId: 'nonexistent' } });

    const response = lastResponse();
    expect(response.type).toBe('ERROR');
    if (response.type === 'ERROR') {
      expect(response.error.code).toBe(PDFiumErrorCode.PAGE_ALREADY_CLOSED);
    }
  });

  test('RENDER_PAGE should render and transfer buffer', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'OPEN_DOCUMENT', id: 'open-1', payload: { data: new ArrayBuffer(100) } });

    const openResponse = postedMessages[1]!.data;
    const documentId = (openResponse as { type: 'SUCCESS'; payload: { documentId: string } }).payload.documentId;

    await send({ type: 'LOAD_PAGE', id: 'load-1', payload: { documentId, pageIndex: 0 } });
    const loadResponse = postedMessages[2]!.data;
    const pageId = (loadResponse as { type: 'SUCCESS'; payload: { pageId: string } }).payload.pageId;

    await send({ type: 'RENDER_PAGE', id: 'render-1', payload: { pageId, options: {} } });

    const response = lastResponse();
    expect(response.type).toBe('SUCCESS');
    if (response.type === 'SUCCESS') {
      const payload = response.payload as { width: number; height: number; data: ArrayBuffer };
      expect(payload.width).toBe(612);
      expect(payload.height).toBe(792);
      expect(payload.data).toBeInstanceOf(ArrayBuffer);
    }

    // Verify buffer was transferred
    const lastPost = postedMessages[postedMessages.length - 1]!;
    expect(lastPost.transfer.length).toBe(1);
  });

  test('RENDER_PAGE should error for unknown pageId', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'RENDER_PAGE', id: 'render-1', payload: { pageId: 'nonexistent', options: {} } });

    const response = lastResponse();
    expect(response.type).toBe('ERROR');
    if (response.type === 'ERROR') {
      expect(response.error.code).toBe(PDFiumErrorCode.PAGE_ALREADY_CLOSED);
    }
  });

  test('GET_TEXT should extract text content', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'OPEN_DOCUMENT', id: 'open-1', payload: { data: new ArrayBuffer(100) } });

    const openResponse = postedMessages[1]!.data;
    const documentId = (openResponse as { type: 'SUCCESS'; payload: { documentId: string } }).payload.documentId;

    await send({ type: 'LOAD_PAGE', id: 'load-1', payload: { documentId, pageIndex: 0 } });
    const loadResponse = postedMessages[2]!.data;
    const pageId = (loadResponse as { type: 'SUCCESS'; payload: { pageId: string } }).payload.pageId;

    await send({ type: 'GET_TEXT', id: 'text-1', payload: { pageId } });

    const response = lastResponse();
    expect(response.type).toBe('SUCCESS');
    if (response.type === 'SUCCESS') {
      expect(response.payload).toBe('Hello PDF');
    }
  });

  test('GET_TEXT should error for unknown pageId', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'GET_TEXT', id: 'text-1', payload: { pageId: 'nonexistent' } });

    const response = lastResponse();
    expect(response.type).toBe('ERROR');
    if (response.type === 'ERROR') {
      expect(response.error.code).toBe(PDFiumErrorCode.PAGE_ALREADY_CLOSED);
    }
  });

  test('DESTROY should dispose all resources', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'OPEN_DOCUMENT', id: 'open-1', payload: { data: new ArrayBuffer(100) } });

    const openResponse = postedMessages[1]!.data;
    const documentId = (openResponse as { type: 'SUCCESS'; payload: { documentId: string } }).payload.documentId;

    await send({ type: 'LOAD_PAGE', id: 'load-1', payload: { documentId, pageIndex: 0 } });

    await send({ type: 'DESTROY', id: 'destroy-1' } as WorkerRequest);

    const response = lastResponse();
    expect(response.type).toBe('SUCCESS');
    expect(response.id).toBe('destroy-1');
    expect(mockPdfiumDispose).toHaveBeenCalled();
  });

  test('unknown request type should return error', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'UNKNOWN_TYPE', id: 'unknown-1' } as unknown as WorkerRequest);

    const response = lastResponse();
    expect(response.type).toBe('ERROR');
    if (response.type === 'ERROR') {
      expect(response.error.code).toBe(PDFiumErrorCode.WORKER_COMMUNICATION_FAILED);
    }
  });
});
