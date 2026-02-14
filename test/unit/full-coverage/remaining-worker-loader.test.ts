/**
 * Coverage tests for remaining uncovered branches in worker-proxy.ts, worker-script.ts, and loader.ts.
 *
 * Targets:
 * - worker-proxy.ts: lines 199, 227, 264 (Node.js fallback paths and error wrapping)
 * - worker-script.ts: lines 162-167, 195, 390-395, 457-461, 465 (invalid wasmBinary, document limit, missing page, Node.js transfer)
 * - loader.ts: lines 193, 221-223, 244 (runtime timeout, browser ESM factory, Module restore)
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { WorkerRequest, WorkerResponse } from '../../../src/context/protocol.js';
import { PDFiumErrorCode } from '../../../src/core/errors.js';

describe('WorkerProxy - remaining uncovered branches', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  test('line 199 - no global Worker and not Node.js throws error', async () => {
    // Remove global Worker
    vi.stubGlobal('Worker', undefined);

    // Mock isNodeEnvironment to return false
    vi.doMock('../../../src/core/env.js', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../../../src/core/env.js')>();
      return { ...actual, isNodeEnvironment: vi.fn(() => false) };
    });

    const { WorkerProxy } = await import('../../../src/context/worker-proxy.js');
    const { InitialisationError } = await import('../../../src/core/errors.js');

    await expect(WorkerProxy.create('worker.js', new ArrayBuffer(8))).rejects.toThrow(InitialisationError);
    await expect(WorkerProxy.create('worker.js', new ArrayBuffer(8))).rejects.toMatchObject({
      code: PDFiumErrorCode.INIT_INVALID_OPTIONS,
    });
  });

  test('line 227 - non-InitialisationError in outer catch block', async () => {
    // Create a Worker that throws generic Error in onmessage setter
    const mockWorker = {
      postMessage: vi.fn(),
      terminate: vi.fn(),
    };

    // Define onmessage setter that throws
    Object.defineProperty(mockWorker, 'onmessage', {
      set() {
        throw new Error('Generic error during worker setup');
      },
      get() {
        return null;
      },
    });

    vi.stubGlobal(
      'Worker',
      class {
        constructor() {
          // biome-ignore lint/correctness/noConstructorReturn: intentional mock
          return mockWorker;
        }
      },
    );

    const { WorkerProxy } = await import('../../../src/context/worker-proxy.js');
    const { InitialisationError } = await import('../../../src/core/errors.js');

    await expect(WorkerProxy.create('worker.js', new ArrayBuffer(8))).rejects.toThrow(InitialisationError);
    await expect(WorkerProxy.create('worker.js', new ArrayBuffer(8))).rejects.toMatchObject({
      code: PDFiumErrorCode.WORKER_CREATE_FAILED,
      message: expect.stringContaining('Failed to create worker'),
    });
  });
});

describe('WorkerScript - remaining uncovered branches', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('line 195 - document limit reached', async () => {
    // Mock browser worker scope
    const postedMessages: WorkerResponse[] = [];
    const mockScope = {
      postMessage: vi.fn((msg: WorkerResponse) => {
        postedMessages.push(msg);
      }),
      onmessage: null as ((event: MessageEvent) => void) | null,
    };

    vi.stubGlobal('self', mockScope);

    // Mock PDFium and document
    const mockDocument = { pageCount: 1, dispose: vi.fn() };
    vi.doMock('../../../src/pdfium.js', () => ({
      PDFium: {
        init: vi.fn(() => Promise.resolve({ openDocument: vi.fn(() => Promise.resolve(mockDocument)) })),
      },
    }));

    const { setupWorker } = await import('../../../src/context/worker-script.js');
    await setupWorker();

    // Send INIT with maxDocuments: 2
    const initMessage: WorkerRequest = {
      type: 'INIT',
      id: 'init-id',
      payload: {
        wasmBinary: new ArrayBuffer(8),
        maxDocuments: 2,
      },
    };
    mockScope.onmessage?.(new MessageEvent('message', { data: initMessage }));
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Open 2 documents (at limit)
    for (let i = 0; i < 2; i++) {
      const openMessage: WorkerRequest = {
        type: 'OPEN_DOCUMENT',
        id: `doc-${i}`,
        payload: {
          data: new ArrayBuffer(8),
        },
      };
      mockScope.onmessage?.(new MessageEvent('message', { data: openMessage }));
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    // Try to open one more (should hit limit)
    const limitMessage: WorkerRequest = {
      type: 'OPEN_DOCUMENT',
      id: 'doc-limit',
      payload: {
        data: new ArrayBuffer(8),
      },
    };
    mockScope.onmessage?.(new MessageEvent('message', { data: limitMessage }));
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Should have error response with WORKER_RESOURCE_LIMIT
    const errorResponse = postedMessages.find((m) => m.type === 'ERROR' && m.id === 'doc-limit');
    expect(errorResponse).toBeDefined();
    if (errorResponse?.type === 'ERROR') {
      expect(errorResponse.error.code).toBe(PDFiumErrorCode.WORKER_RESOURCE_LIMIT);
      expect(errorResponse.error.message).toContain('Document limit reached');
    }
  });

  test('lines 457-461 - Node.js postMessage with transfer', async () => {
    // Mock Node.js environment
    vi.doMock('../../../src/core/env.js', () => ({
      isNodeEnvironment: () => true,
    }));

    // Mock self to not be a browser worker
    vi.stubGlobal('self', {});

    // Track postMessage calls with transfer
    const postMessageCalls: Array<{ message: unknown; transfer: unknown }> = [];
    const mockParentPort = {
      postMessage: vi.fn((message: unknown, transfer?: unknown) => {
        postMessageCalls.push({ message, transfer });
      }),
      on: vi.fn(),
    };

    vi.doMock('node:worker_threads', () => ({
      parentPort: mockParentPort,
    }));

    // Mock PDFium and page with render
    const mockRenderData = new Uint8Array(100);
    const mockPage = {
      render: vi.fn(() => ({
        width: 10,
        height: 10,
        originalWidth: 10,
        originalHeight: 10,
        data: mockRenderData,
      })),
      dispose: vi.fn(),
    };
    const mockDocument = {
      pageCount: 1,
      getPage: vi.fn(() => mockPage),
      dispose: vi.fn(),
    };
    vi.doMock('../../../src/pdfium.js', () => ({
      PDFium: {
        init: vi.fn(() => Promise.resolve({ openDocument: vi.fn(() => Promise.resolve(mockDocument)) })),
      },
    }));

    const { setupWorker } = await import('../../../src/context/worker-script.js');
    await setupWorker();

    // Get the message handler
    const messageHandler = mockParentPort.on.mock.calls.find((call) => call[0] === 'message')?.[1];
    expect(messageHandler).toBeDefined();

    // Send INIT
    const initMessage: WorkerRequest = {
      type: 'INIT',
      id: 'init-id',
      payload: {
        wasmBinary: new ArrayBuffer(8),
      },
    };
    messageHandler(initMessage);
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Open document and load page
    const openMessage: WorkerRequest = {
      type: 'OPEN_DOCUMENT',
      id: 'doc-id',
      payload: {
        data: new ArrayBuffer(8),
      },
    };
    messageHandler(openMessage);
    await new Promise((resolve) => setTimeout(resolve, 10));

    const successResponse = postMessageCalls.find((call) => (call.message as WorkerResponse).id === 'doc-id')
      ?.message as WorkerResponse;
    const documentId =
      successResponse?.type === 'SUCCESS' ? (successResponse.payload as { documentId: string }).documentId : '';

    const loadPageMessage: WorkerRequest = {
      type: 'LOAD_PAGE',
      id: 'page-id',
      payload: {
        documentId,
        pageIndex: 0,
      },
    };
    messageHandler(loadPageMessage);
    await new Promise((resolve) => setTimeout(resolve, 10));

    const pageResponse = postMessageCalls.find((call) => (call.message as WorkerResponse).id === 'page-id')
      ?.message as WorkerResponse;
    const pageId = pageResponse?.type === 'SUCCESS' ? (pageResponse.payload as { pageId: string }).pageId : '';

    // Render page (should use transfer)
    const renderMessage: WorkerRequest = {
      type: 'RENDER_PAGE',
      id: 'render-id',
      payload: {
        pageId,
        options: {},
      },
    };
    messageHandler(renderMessage);
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Find the render response with transfer
    const renderCall = postMessageCalls.find((call) => (call.message as WorkerResponse).id === 'render-id');
    expect(renderCall).toBeDefined();
    expect(renderCall?.transfer).toBeDefined();
    expect(Array.isArray(renderCall?.transfer)).toBe(true);
    expect((renderCall?.transfer as unknown[]).length).toBeGreaterThan(0);
  });

  test('line 465 - Node.js parentPort.on message handler', async () => {
    // Mock Node.js environment
    vi.doMock('../../../src/core/env.js', () => ({
      isNodeEnvironment: () => true,
    }));

    vi.stubGlobal('self', {});

    const mockParentPort = {
      postMessage: vi.fn(),
      on: vi.fn(),
    };

    vi.doMock('node:worker_threads', () => ({
      parentPort: mockParentPort,
    }));

    const { setupWorker } = await import('../../../src/context/worker-script.js');
    await setupWorker();

    // Verify parentPort.on was called for 'message' event
    expect(mockParentPort.on).toHaveBeenCalledWith('message', expect.any(Function));

    // Get the message handler
    const messageHandler = mockParentPort.on.mock.calls.find((call) => call[0] === 'message')?.[1];
    expect(messageHandler).toBeDefined();

    // Trigger the handler with a PING message
    const pingMessage: WorkerRequest = {
      type: 'PING',
      id: 'ping-id',
      payload: {},
    };
    messageHandler(pingMessage);

    // Wait for async handling
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Should have posted success response
    expect(mockParentPort.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'SUCCESS',
        id: 'ping-id',
      }),
    );
  });

  test('lines 162-167 - INIT with wasmBinary not an ArrayBuffer', async () => {
    // Mock browser worker scope
    const postedMessages: WorkerResponse[] = [];
    const mockScope = {
      postMessage: vi.fn((msg: WorkerResponse) => {
        postedMessages.push(msg);
      }),
      onmessage: null as ((event: MessageEvent) => void) | null,
    };

    vi.stubGlobal('self', mockScope);

    const { setupWorker } = await import('../../../src/context/worker-script.js');
    await setupWorker();

    // Send INIT with Uint8Array instead of ArrayBuffer
    const initMessage: WorkerRequest = {
      type: 'INIT',
      id: 'init-id',
      payload: {
        // @ts-expect-error Testing invalid type
        wasmBinary: new Uint8Array([0x00, 0x61, 0x73, 0x6d]),
      },
    };
    mockScope.onmessage?.(new MessageEvent('message', { data: initMessage }));
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Should have error response
    const errorResponse = postedMessages.find((m) => m.type === 'ERROR' && m.id === 'init-id');
    expect(errorResponse).toBeDefined();
    if (errorResponse?.type === 'ERROR') {
      expect(errorResponse.error.code).toBe(PDFiumErrorCode.INIT_INVALID_OPTIONS);
      expect(errorResponse.error.message).toContain('wasmBinary must be an ArrayBuffer');
    }
  });

  test('lines 128-134 - postError with generic Error (not PDFiumError)', async () => {
    // Mock browser worker scope
    const postedMessages: WorkerResponse[] = [];
    const mockScope = {
      postMessage: vi.fn((msg: WorkerResponse) => {
        postedMessages.push(msg);
      }),
      onmessage: null as ((event: MessageEvent) => void) | null,
    };

    vi.stubGlobal('self', mockScope);

    // Mock PDFium.init to throw a GENERIC Error (not PDFiumError)
    vi.doMock('../../../src/pdfium.js', () => ({
      PDFium: {
        init: vi.fn(() => {
          throw new TypeError('Cannot read property of undefined');
        }),
      },
    }));

    const { setupWorker } = await import('../../../src/context/worker-script.js');
    await setupWorker();

    // Send INIT — PDFium.init() will throw generic TypeError
    const initMessage: WorkerRequest = {
      type: 'INIT',
      id: 'init-generic-err',
      payload: {
        wasmBinary: new ArrayBuffer(8),
      },
    };
    mockScope.onmessage?.(new MessageEvent('message', { data: initMessage }));
    await new Promise((resolve) => setTimeout(resolve, 10));

    // The catch block calls postError(id, error) where error is a TypeError
    // This exercises lines 128-134 (generic Error serialisation)
    const errorResponse = postedMessages.find((m) => m.type === 'ERROR' && m.id === 'init-generic-err');
    expect(errorResponse).toBeDefined();
    if (errorResponse?.type === 'ERROR') {
      expect(errorResponse.error.name).toBe('TypeError');
      expect(errorResponse.error.message).toContain('Cannot read property of undefined');
      expect(errorResponse.error.code).toBe(0); // Generic errors get code 0
      // In __DEV__ mode, stack should be included
      expect(errorResponse.error.stack).toBeDefined();
    }
  });

  test('lines 390-395 - GET_TEXT_LAYOUT with missing page', async () => {
    // Mock browser worker scope
    const postedMessages: WorkerResponse[] = [];
    const mockScope = {
      postMessage: vi.fn((msg: WorkerResponse) => {
        postedMessages.push(msg);
      }),
      onmessage: null as ((event: MessageEvent) => void) | null,
    };

    vi.stubGlobal('self', mockScope);

    const { setupWorker } = await import('../../../src/context/worker-script.js');
    await setupWorker();

    // Send GET_TEXT_LAYOUT for non-existent page
    const layoutMessage: WorkerRequest = {
      type: 'GET_TEXT_LAYOUT',
      id: 'layout-id',
      payload: {
        pageId: 'non-existent-page-id',
      },
    };
    mockScope.onmessage?.(new MessageEvent('message', { data: layoutMessage }));
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Should have error response
    const errorResponse = postedMessages.find((m) => m.type === 'ERROR' && m.id === 'layout-id');
    expect(errorResponse).toBeDefined();
    if (errorResponse?.type === 'ERROR') {
      expect(errorResponse.error.code).toBe(PDFiumErrorCode.PAGE_ALREADY_CLOSED);
      expect(errorResponse.error.message).toContain('Page non-existent-page-id not found');
    }
  });
});

describe('Loader - remaining uncovered branches', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  test('line 193 - waitForRuntime timeout', async () => {
    vi.useFakeTimers();

    // Mock Node.js environment
    vi.doMock('../../../src/core/env.js', () => ({
      isNodeEnvironment: () => true,
    }));

    // Mock vendor CJS to return module where calledRun is false and onRuntimeInitialized is never called
    const mockModule = {
      calledRun: false,
      onRuntimeInitialized: undefined,
      _FPDF_InitLibrary: vi.fn(),
    };

    // Mock createRequire and related Node modules
    vi.doMock('node:module', () => ({
      createRequire: vi.fn(() => vi.fn(() => ({ default: mockModule }))),
    }));
    vi.doMock('node:path', () => ({
      dirname: vi.fn(() => '/dist'),
      join: vi.fn((...args: string[]) => args.join('/')),
    }));
    vi.doMock('node:url', () => ({
      fileURLToPath: vi.fn(() => '/dist/loader.js'),
    }));

    const { loadWASM } = await import('../../../src/wasm/loader.js');
    const { InitialisationError } = await import('../../../src/core/errors.js');

    // Create WASM binary with correct magic number
    const wasmBinary = new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]);

    const loadPromise = loadWASM({ wasmBinary: wasmBinary.buffer });
    // Prevent unhandled rejection during timer advancement
    loadPromise.catch(() => {});

    // Advance time past the 10s timeout
    await vi.advanceTimersByTimeAsync(11_000);

    await expect(loadPromise).rejects.toThrow(InitialisationError);
  });

  test('lines 221-223 - browser ESM factory path', async () => {
    // Mock browser environment
    vi.doMock('../../../src/core/env.js', () => ({
      isNodeEnvironment: () => false,
    }));

    // Import REQUIRED_SYMBOLS to create complete mock
    const { REQUIRED_SYMBOLS } = await import('../../../src/wasm/manifest.js');

    // Create mock module with all required symbols
    const mockModule: Record<string, unknown> = {
      HEAPU8: new Uint8Array(),
      HEAP32: new Int32Array(),
      HEAPF32: new Float32Array(),
      _malloc: vi.fn(() => 1000),
      _free: vi.fn(),
    };

    // Add all required symbols as functions
    for (const symbol of REQUIRED_SYMBOLS) {
      mockModule[symbol] = vi.fn();
    }

    // Mock the vendor ESM factory
    vi.doMock('../../../src/vendor/pdfium-factory.mjs', () => ({
      default: vi.fn(() => Promise.resolve(mockModule)),
    }));

    const { loadWASM } = await import('../../../src/wasm/loader.js');

    // Provide WASM binary with correct magic number
    const wasmBinary = new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]);

    const module = await loadWASM({ wasmBinary: wasmBinary.buffer });

    expect(module).toBeDefined();
    expect(module._FPDF_InitLibraryWithConfig).toBeDefined();
  });
});
