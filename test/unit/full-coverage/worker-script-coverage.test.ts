/**
 * Coverage tests for context/worker-script.ts uncovered lines.
 *
 * Targets specific uncovered edge cases:
 * - Line 395: message origin validation warning
 * - Lines 450-470: Node.js worker_threads path setup
 * - Line 552: Error catch with non-Error values
 * - Serialisation branches: ink paths, link data, image/path objects, PDFiumError context/stack
 * - CREATE_N_UP failure path
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { WorkerRequest, WorkerResponse } from '../../../src/context/protocol.js';
import { PDFiumErrorCode } from '../../../src/core/errors.js';

describe('Worker Script - coverage for uncovered lines', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('line 395 - origin validation warning for mismatched origin', async () => {
    // Mock browser worker scope with location.origin
    const mockScope = {
      postMessage: vi.fn(),
      onmessage: null as ((event: MessageEvent) => void) | null,
      location: {
        origin: 'https://example.com',
      },
    };

    vi.stubGlobal('self', mockScope);

    // Mock logger to capture warning
    const warnSpy = vi.fn();
    vi.doMock('../../../src/core/logger.js', () => ({
      getLogger: () => ({ warn: warnSpy, info: vi.fn(), error: vi.fn() }),
    }));

    const { setupWorker } = await import('../../../src/context/worker-script.js');

    await setupWorker();

    // Send a message with mismatched origin
    const message: WorkerRequest = {
      type: 'PING',
      id: 'test-id',
      payload: {},
    };

    // Trigger the message handler with wrong origin
    const messageEvent = new MessageEvent('message', {
      data: message,
      origin: 'https://malicious.com',
    });

    mockScope.onmessage?.(messageEvent);

    // Wait for async handling
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Should have logged warning
    expect(warnSpy).toHaveBeenCalledWith('Worker rejected message from unexpected origin:', 'https://malicious.com');
  });

  test('lines 450-470 - Node.js worker_threads setup', async () => {
    // Mock Node.js environment
    vi.doMock('../../../src/core/env.js', () => ({
      isNodeEnvironment: () => true,
    }));

    // Mock self to not be a browser worker
    vi.stubGlobal('self', {});

    // Mock worker_threads parentPort
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
  });

  test('line 470 - unsupported worker runtime throws', async () => {
    // Mock environment where neither browser worker nor Node.js worker is available
    vi.doMock('../../../src/core/env.js', () => ({
      isNodeEnvironment: () => false,
    }));

    // Mock self to be an empty object (not a worker scope)
    vi.stubGlobal('self', {});

    const { setupWorker } = await import('../../../src/context/worker-script.js');

    await expect(setupWorker()).rejects.toThrow('Unsupported worker runtime');
  });

  test('line 470 - Node.js with null parentPort', async () => {
    // Mock Node.js environment but parentPort is null
    vi.doMock('../../../src/core/env.js', () => ({
      isNodeEnvironment: () => true,
    }));

    vi.stubGlobal('self', {});

    vi.doMock('node:worker_threads', () => ({
      parentPort: null,
    }));

    const { setupWorker } = await import('../../../src/context/worker-script.js');

    await expect(setupWorker()).rejects.toThrow('parentPort is not available');
  });

  test('line 552 - catch block with non-Error value', async () => {
    // Mock browser worker scope
    const postedMessages: WorkerResponse[] = [];
    const mockScope = {
      postMessage: vi.fn((msg: WorkerResponse) => {
        postedMessages.push(msg);
      }),
      onmessage: null as ((event: MessageEvent) => void) | null,
    };

    vi.stubGlobal('self', mockScope);

    // Mock PDFium to throw a non-Error value
    vi.doMock('../../../src/pdfium.js', () => ({
      PDFium: {
        init: vi.fn(() => {
          throw 'String error'; // Non-Error throw
        }),
      },
    }));

    const { setupWorker } = await import('../../../src/context/worker-script.js');

    await setupWorker();

    // Send INIT message
    const initMessage: WorkerRequest = {
      type: 'INIT',
      id: 'init-id',
      payload: {
        wasmBinary: new ArrayBuffer(8),
      },
    };

    mockScope.onmessage?.(new MessageEvent('message', { data: initMessage }));

    // Wait for async handling
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Should have posted error response with string error
    const errorResponse = postedMessages.find((m) => m.type === 'ERROR');
    expect(errorResponse).toBeDefined();
    expect(errorResponse?.type).toBe('ERROR');
    if (errorResponse?.type === 'ERROR') {
      expect(errorResponse.error.message).toBe('String error');
      expect(errorResponse.error.code).toBe(PDFiumErrorCode.WORKER_COMMUNICATION_FAILED);
    }
  });

  test('default case - unknown request type', async () => {
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

    // Send unknown message type
    const unknownMessage = {
      type: 'UNKNOWN_TYPE',
      id: 'test-id',
      payload: {},
    } as unknown as WorkerRequest;

    mockScope.onmessage?.(new MessageEvent('message', { data: unknownMessage }));

    // Wait for async handling
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Should have posted error response
    const errorResponse = postedMessages.find((m) => m.type === 'ERROR');
    expect(errorResponse).toBeDefined();
    if (errorResponse?.type === 'ERROR') {
      expect(errorResponse.error.message).toContain('Unknown request type');
    }
  });

  test('line 106 - getBrowserWorkerScope returns null when self is a primitive', async () => {
    // Mock self as a number — scopeCandidate is not an object
    vi.stubGlobal('self', 42);

    vi.doMock('../../../src/core/env.js', () => ({
      isNodeEnvironment: () => false,
    }));

    const { setupWorker } = await import('../../../src/context/worker-script.js');
    await expect(setupWorker()).rejects.toThrow('Unsupported worker runtime');
  });

  test('line 114 - getBrowserWorkerScope returns null when onmessage not in scope', async () => {
    // Mock self with postMessage but without onmessage property
    vi.stubGlobal('self', { postMessage: vi.fn() });

    vi.doMock('../../../src/core/env.js', () => ({
      isNodeEnvironment: () => false,
    }));

    const { setupWorker } = await import('../../../src/context/worker-script.js');
    await expect(setupWorker()).rejects.toThrow('Unsupported worker runtime');
  });
});

/**
 * Serialisation branch coverage tests.
 *
 * These tests exercise the serialiseAnnotation and serialisePageObject branches
 * that aren't covered by the main handler tests, specifically:
 * - Ink paths (inkPathCount > 0 with actual paths)
 * - Link data with action and destination
 * - Image object serialisation (instanceof PDFiumImageObject)
 * - Path object serialisation (instanceof PDFiumPathObject)
 * - Text object with null font
 * - CREATE_N_UP failure when createNUpDocument returns undefined
 * - postError with PDFiumError context and stack
 */
describe('Worker Script - serialisation branch coverage', () => {
  // Track posted messages
  const postedMessages: Array<{ data: WorkerResponse; transfer: Transferable[] }> = [];

  // Mock annotation with ink paths
  function createAnnotationWithInkPaths() {
    return {
      index: 0,
      type: 4,
      bounds: { left: 72, bottom: 700, right: 200, top: 720 },
      getColour: vi.fn().mockReturnValue(undefined),
      flags: 4,
      getStringValue: vi.fn().mockReturnValue(''),
      getBorder: vi.fn().mockReturnValue(null),
      getAppearance: vi.fn().mockReturnValue(null),
      getLine: vi.fn().mockReturnValue(undefined),
      getVertices: vi.fn().mockReturnValue(undefined),
      // Ink paths: 2 paths, first has points, second is falsy (null)
      inkPathCount: 2,
      getInkPath: vi.fn().mockImplementation((index: number) => {
        if (index === 0)
          return [
            { x: 10, y: 20 },
            { x: 30, y: 40 },
          ];
        return null;
      }),
      attachmentPointCount: 2,
      getAttachmentPoints: vi.fn().mockImplementation((index: number) => {
        if (index === 0) return { x1: 72, y1: 720, x2: 200, y2: 720, x3: 72, y3: 700, x4: 200, y4: 700 };
        return null; // Second quad point is null — covers the if(quad) false branch
      }),
      isWidget: vi.fn().mockReturnValue(false),
      getLink: vi.fn().mockReturnValue(undefined),
      getFontSize: vi.fn().mockReturnValue(12),
      dispose: vi.fn(),
      [Symbol.dispose]: vi.fn(),
    };
  }

  // Mock annotation with link data (action + destination)
  function createAnnotationWithLink() {
    return {
      index: 1,
      type: 26, // Link type
      bounds: { left: 72, bottom: 700, right: 200, top: 720 },
      getColour: vi.fn().mockReturnValue(undefined),
      flags: 0,
      getStringValue: vi.fn().mockReturnValue(''),
      getBorder: vi.fn().mockReturnValue(null),
      getAppearance: vi.fn().mockReturnValue(null),
      getLine: vi.fn().mockReturnValue(undefined),
      getVertices: vi.fn().mockReturnValue(undefined),
      inkPathCount: 0,
      getInkPath: vi.fn().mockReturnValue([]),
      attachmentPointCount: 0,
      getAttachmentPoints: vi.fn().mockReturnValue(null),
      isWidget: vi.fn().mockReturnValue(false),
      getLink: vi.fn().mockReturnValue({
        action: { type: 'uri', uri: 'https://example.com', filePath: undefined },
        destination: { pageIndex: 3, fitType: 'XYZ', x: 0, y: 792, zoom: 1.5 },
      }),
      getFontSize: vi.fn().mockReturnValue(0),
      dispose: vi.fn(),
      [Symbol.dispose]: vi.fn(),
    };
  }

  let mockOpenDocument: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.resetModules();
    postedMessages.length = 0;

    vi.stubGlobal('self', {
      postMessage: (data: WorkerResponse, options?: { transfer?: Transferable[] }) => {
        postedMessages.push({ data, transfer: options?.transfer ?? [] });
      },
      onmessage: null,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  /** Set up with custom mock page objects. */
  async function setupWithMocks(overrides: {
    annotations?: () => Iterable<unknown>;
    objects?: () => unknown[];
    createNUpDocument?: () => unknown;
  }) {
    const mockPage = {
      index: 0,
      width: 612,
      height: 792,
      size: { width: 612, height: 792 },
      rotation: 0,
      charCount: 5,
      render: vi
        .fn()
        .mockReturnValue({ width: 612, height: 792, originalWidth: 612, originalHeight: 792, data: new Uint8Array(4) }),
      getText: vi.fn().mockReturnValue('Hello'),
      getTextLayout: vi.fn().mockReturnValue({ text: 'Hello', rects: new Float32Array(0) }),
      hasTransparency: vi.fn().mockReturnValue(false),
      getPageBox: vi.fn().mockReturnValue(undefined),
      annotations: overrides.annotations ?? vi.fn().mockReturnValue((function* () {})()),
      objects: overrides.objects ?? vi.fn().mockReturnValue([]),
      getLinks: vi.fn().mockReturnValue([]),
      getWebLinks: vi.fn().mockReturnValue([]),
      getStructureTree: vi.fn().mockReturnValue(null),
      getCharIndexAtPos: vi.fn().mockReturnValue(-1),
      getCharacterInfo: vi.fn().mockReturnValue(undefined),
      getCharBox: vi.fn().mockReturnValue(undefined),
      getTextInRect: vi.fn().mockReturnValue(''),
      findText: vi.fn().mockReturnValue([]),
      flatten: vi.fn().mockReturnValue(1),
      getFormSelectedText: vi.fn().mockReturnValue(null),
      canFormUndo: vi.fn().mockReturnValue(false),
      formUndo: vi.fn().mockReturnValue(false),
      dispose: vi.fn(),
    };

    const mockDocument = {
      pageCount: 1,
      getPage: vi.fn().mockReturnValue(mockPage),
      isTagged: vi.fn().mockReturnValue(false),
      hasForm: vi.fn().mockReturnValue(false),
      formType: 0,
      namedDestinationCount: 0,
      pageMode: 'useNone',
      getBookmarks: vi.fn().mockReturnValue([]),
      getAttachments: vi.fn().mockReturnValue([]),
      getMetadata: vi.fn().mockReturnValue({ title: 'Mock Title', author: 'Mock Author' }),
      getPermissions: vi.fn().mockReturnValue({ raw: -1, canPrint: true }),
      getViewerPreferences: vi.fn().mockReturnValue({ hideToolbar: false }),
      getJavaScriptActions: vi.fn().mockReturnValue([{ name: 'OpenAction', script: 'app.alert("hi")' }]),
      getSignatures: vi.fn().mockReturnValue([
        {
          index: 0,
          contents: new Uint8Array([1, 2, 3]),
          byteRange: [0, 3, 5, 7],
          subFilter: 'adbe.pkcs7.detached',
          reason: 'approved',
          time: 'D:20260101000000Z',
          docMDPPermission: 0,
        },
        {
          index: 1,
          contents: undefined,
          byteRange: [0, 2, 4, 6],
          subFilter: undefined,
          reason: undefined,
          time: undefined,
          docMDPPermission: undefined,
        },
      ]),
      getPrintPageRanges: vi.fn().mockReturnValue([0, 2, 4]),
      fileVersion: 17,
      rawPermissions: -4,
      securityHandlerRevision: 6,
      signatureCount: 2,
      hasValidCrossReferenceTable: vi.fn().mockReturnValue(true),
      getNamedDestinations: vi.fn().mockReturnValue([]),
      getNamedDestinationByName: vi.fn().mockReturnValue(undefined),
      getPageLabel: vi.fn().mockReturnValue(null),
      save: vi.fn().mockReturnValue(new Uint8Array([37, 80, 68, 70])),
      killFormFocus: vi.fn().mockReturnValue(true),
      setFormFieldHighlightColour: vi.fn(),
      setFormFieldHighlightAlpha: vi.fn(),
      importPages: vi.fn(),
      createNUpDocument: overrides.createNUpDocument ?? vi.fn().mockReturnValue({ pageCount: 2, dispose: vi.fn() }),
      dispose: vi.fn(),
    };

    mockOpenDocument = vi.fn().mockResolvedValue(mockDocument);

    vi.doMock('../../../src/pdfium.js', () => ({
      PDFium: {
        init: vi.fn().mockResolvedValue({
          openDocument: mockOpenDocument,
          dispose: vi.fn(),
        }),
      },
    }));

    const { setupWorker } = await import('../../../src/context/worker-script.js');
    await setupWorker();

    const handler = (self as unknown as { onmessage: (event: MessageEvent<WorkerRequest>) => Promise<void> }).onmessage;
    const send = async (request: WorkerRequest) => {
      await handler(new MessageEvent('message', { data: request }));
    };

    // Init + open + load
    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'OPEN_DOCUMENT', id: 'open-1', payload: { data: new ArrayBuffer(100) } });
    const openResponse = postedMessages[1]!.data;
    const documentId = (openResponse as { type: 'SUCCESS'; payload: { documentId: string } }).payload.documentId;

    await send({ type: 'LOAD_PAGE', id: 'load-1', payload: { documentId, pageIndex: 0 } });
    const loadResponse = postedMessages[2]!.data;
    const pageId = (loadResponse as { type: 'SUCCESS'; payload: { pageId: string } }).payload.pageId;

    return { send, documentId, pageId };
  }

  function lastResponse(): WorkerResponse {
    return postedMessages[postedMessages.length - 1]!.data;
  }

  test('serialiseAnnotation - ink paths with actual path data', async () => {
    const inkAnnot = createAnnotationWithInkPaths();
    const { send, pageId } = await setupWithMocks({
      annotations: vi.fn().mockReturnValue(
        (function* () {
          yield inkAnnot;
        })(),
      ),
    });

    await send({ type: 'GET_ANNOTATIONS', id: 'annots-1', payload: { pageId } });

    const response = lastResponse();
    expect(response.type).toBe('SUCCESS');
    if (response.type === 'SUCCESS') {
      const payload = response.payload as Array<{ inkPaths?: Array<Array<{ x: number; y: number }>> }>;
      expect(payload).toHaveLength(1);
      // Should have 1 valid ink path (index 0), index 1 was null
      expect(payload[0]!.inkPaths).toHaveLength(1);
      expect(payload[0]!.inkPaths![0]).toEqual([
        { x: 10, y: 20 },
        { x: 30, y: 40 },
      ]);
    }
  });

  test('serialiseAnnotation - attachment points with some null quads', async () => {
    const annot = createAnnotationWithInkPaths();
    const { send, pageId } = await setupWithMocks({
      annotations: vi.fn().mockReturnValue(
        (function* () {
          yield annot;
        })(),
      ),
    });

    await send({ type: 'GET_ANNOTATIONS', id: 'annots-1', payload: { pageId } });

    const response = lastResponse();
    expect(response.type).toBe('SUCCESS');
    if (response.type === 'SUCCESS') {
      const payload = response.payload as Array<{ attachmentPoints?: Array<{ x1: number }> }>;
      expect(payload).toHaveLength(1);
      // Should have 1 valid attachment point (index 0), index 1 was null
      expect(payload[0]!.attachmentPoints).toHaveLength(1);
      expect(payload[0]!.attachmentPoints![0]!.x1).toBe(72);
    }
  });

  test('serialiseAnnotation - link with action and destination', async () => {
    const linkAnnot = createAnnotationWithLink();
    const { send, pageId } = await setupWithMocks({
      annotations: vi.fn().mockReturnValue(
        (function* () {
          yield linkAnnot;
        })(),
      ),
    });

    await send({ type: 'GET_ANNOTATIONS', id: 'annots-1', payload: { pageId } });

    const response = lastResponse();
    expect(response.type).toBe('SUCCESS');
    if (response.type === 'SUCCESS') {
      const payload = response.payload as Array<{
        link?: {
          action?: { type: string; uri: string };
          destination?: { pageIndex: number; fitType: string; zoom: number };
        };
      }>;
      expect(payload).toHaveLength(1);
      expect(payload[0]!.link).toBeDefined();
      expect(payload[0]!.link!.action!.type).toBe('uri');
      expect(payload[0]!.link!.action!.uri).toBe('https://example.com');
      expect(payload[0]!.link!.destination!.pageIndex).toBe(3);
      expect(payload[0]!.link!.destination!.zoom).toBe(1.5);
    }
  });

  /** Create a mock page object with the right prototype for instanceof checks. */
  function createMockPageObject(
    // biome-ignore lint/suspicious/noExplicitAny: prototype mock requires any
    Cls: { prototype: any },
    props: Record<string, unknown>,
  ) {
    const obj = Object.create(Cls.prototype);
    for (const [key, value] of Object.entries(props)) {
      if (typeof value === 'function') {
        obj[key] = value;
      } else {
        Object.defineProperty(obj, key, { get: () => value, configurable: true });
      }
    }
    return obj;
  }

  test('serialisePageObject - image object with metadata', async () => {
    const { PDFiumImageObject } = await import('../../../src/document/page-object.js');
    const imageObj = createMockPageObject(PDFiumImageObject, {
      type: 2,
      bounds: { left: 0, bottom: 0, right: 100, top: 100 },
      matrix: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 },
      marks: [],
      width: 640,
      height: 480,
      getMetadata: vi.fn().mockReturnValue({
        width: 640,
        height: 480,
        bitsPerPixel: 24,
        colourSpace: 'DeviceRGB',
        horizontalDpi: 72,
        verticalDpi: 72,
        markedContent: 'None',
      }),
    });

    const { send, pageId } = await setupWithMocks({
      objects: vi.fn().mockReturnValue([imageObj]),
    });

    await send({ type: 'GET_PAGE_OBJECTS', id: 'objects-1', payload: { pageId } });

    const response = lastResponse();
    expect(response.type).toBe('SUCCESS');
    if (response.type === 'SUCCESS') {
      const payload = response.payload as Array<{
        image?: { width: number; height: number; metadata: { bitsPerPixel: number } };
      }>;
      expect(payload).toHaveLength(1);
      expect(payload[0]!.image).toBeDefined();
      expect(payload[0]!.image!.width).toBe(640);
      expect(payload[0]!.image!.metadata.bitsPerPixel).toBe(24);
    }
  });

  test('serialisePageObject - image object without metadata (null fallback)', async () => {
    const { PDFiumImageObject } = await import('../../../src/document/page-object.js');
    const imageObj = createMockPageObject(PDFiumImageObject, {
      type: 2,
      bounds: { left: 0, bottom: 0, right: 100, top: 100 },
      matrix: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 },
      marks: [],
      width: 200,
      height: 150,
      getMetadata: vi.fn().mockReturnValue(null),
    });

    const { send, pageId } = await setupWithMocks({
      objects: vi.fn().mockReturnValue([imageObj]),
    });

    await send({ type: 'GET_PAGE_OBJECTS', id: 'objects-1', payload: { pageId } });

    const response = lastResponse();
    expect(response.type).toBe('SUCCESS');
    if (response.type === 'SUCCESS') {
      const payload = response.payload as Array<{
        image?: { width: number; height: number; metadata: { bitsPerPixel: number; colourSpace: string } };
      }>;
      expect(payload).toHaveLength(1);
      expect(payload[0]!.image!.metadata.bitsPerPixel).toBe(0);
      expect(payload[0]!.image!.metadata.colourSpace).toBe('Unknown');
    }
  });

  test('serialisePageObject - path object with segments and draw mode', async () => {
    const { PDFiumPathObject } = await import('../../../src/document/page-object.js');
    const pathObj = createMockPageObject(PDFiumPathObject, {
      type: 3,
      bounds: { left: 10, bottom: 10, right: 100, top: 100 },
      matrix: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 },
      marks: [],
      segmentCount: 2,
      getSegment: vi.fn().mockImplementation((index: number) => {
        if (index === 0) return { type: 0, point: { x: 10, y: 10 }, isClosing: false };
        if (index === 1) return { type: 1, point: { x: 100, y: 100 }, isClosing: true };
        return null;
      }),
      getDrawMode: vi.fn().mockReturnValue({ fillMode: 1, stroke: true }),
      strokeWidth: 2.5,
      lineCap: 1,
      lineJoin: 0,
    });

    const { send, pageId } = await setupWithMocks({
      objects: vi.fn().mockReturnValue([pathObj]),
    });

    await send({ type: 'GET_PAGE_OBJECTS', id: 'objects-1', payload: { pageId } });

    const response = lastResponse();
    expect(response.type).toBe('SUCCESS');
    if (response.type === 'SUCCESS') {
      const payload = response.payload as Array<{
        path?: {
          segmentCount: number;
          segments: unknown[];
          drawMode: { fill: number; stroke: boolean };
          strokeWidth: number;
        };
      }>;
      expect(payload).toHaveLength(1);
      expect(payload[0]!.path).toBeDefined();
      expect(payload[0]!.path!.segmentCount).toBe(2);
      expect(payload[0]!.path!.segments).toHaveLength(2);
      expect(payload[0]!.path!.drawMode.fill).toBe(1);
      expect(payload[0]!.path!.drawMode.stroke).toBe(true);
      expect(payload[0]!.path!.strokeWidth).toBe(2.5);
    }
  });

  test('serialisePageObject - path object with null draw mode (fallback)', async () => {
    const { PDFiumPathObject } = await import('../../../src/document/page-object.js');
    const pathObj = createMockPageObject(PDFiumPathObject, {
      type: 3,
      bounds: { left: 10, bottom: 10, right: 100, top: 100 },
      matrix: null, // Also covers the matrix ?? fallback
      marks: [],
      segmentCount: 1,
      getSegment: vi.fn().mockReturnValue({ type: 0, point: null, isClosing: false }), // null point covers pt?.x fallback
      getDrawMode: vi.fn().mockReturnValue(null),
      strokeWidth: null,
      lineCap: 0,
      lineJoin: 0,
    });

    const { send, pageId } = await setupWithMocks({
      objects: vi.fn().mockReturnValue([pathObj]),
    });

    await send({ type: 'GET_PAGE_OBJECTS', id: 'objects-1', payload: { pageId } });

    const response = lastResponse();
    expect(response.type).toBe('SUCCESS');
    if (response.type === 'SUCCESS') {
      const payload = response.payload as Array<{
        path?: { drawMode: { fill: number; stroke: boolean }; segments: Array<{ x: number; y: number }> };
        matrix: { a: number };
      }>;
      expect(payload[0]!.path!.drawMode.fill).toBe('None'); // PathFillMode.None
      expect(payload[0]!.path!.drawMode.stroke).toBe(false);
      expect(payload[0]!.path!.segments[0]!.x).toBe(0);
      expect(payload[0]!.path!.segments[0]!.y).toBe(0);
      expect(payload[0]!.matrix.a).toBe(1); // Fallback identity matrix
    }
  });

  test('serialisePageObject - text object with null font', async () => {
    const { PDFiumTextObject } = await import('../../../src/document/page-object.js');
    const textObj = createMockPageObject(PDFiumTextObject, {
      type: 1,
      bounds: { left: 72, bottom: 700, right: 200, top: 720 },
      matrix: { a: 1, b: 0, c: 0, d: 1, e: 72, f: 700 },
      marks: [],
      text: 'Hello',
      fontSize: 12,
      getFont: vi.fn().mockReturnValue(null),
    });

    const { send, pageId } = await setupWithMocks({
      objects: vi.fn().mockReturnValue([textObj]),
    });

    await send({ type: 'GET_PAGE_OBJECTS', id: 'objects-1', payload: { pageId } });

    const response = lastResponse();
    expect(response.type).toBe('SUCCESS');
    if (response.type === 'SUCCESS') {
      const payload = response.payload as Array<{
        text?: { text: string; fontName: string; weight: number; metrics: { ascent: number } };
      }>;
      expect(payload[0]!.text!.text).toBe('Hello');
      expect(payload[0]!.text!.fontName).toBe(''); // Fallback
      expect(payload[0]!.text!.weight).toBe(0); // Fallback
      expect(payload[0]!.text!.metrics.ascent).toBe(0); // Fallback
    }
  });

  test('CREATE_N_UP should error when createNUpDocument returns undefined', async () => {
    const { send, documentId } = await setupWithMocks({
      createNUpDocument: vi.fn().mockReturnValue(undefined),
    });

    await send({
      type: 'CREATE_N_UP',
      id: 'nup-1',
      payload: { documentId, options: { pagesPerRow: 2, pagesPerColumn: 2, outputWidth: 612, outputHeight: 792 } },
    } as WorkerRequest);

    const response = lastResponse();
    expect(response.type).toBe('ERROR');
    if (response.type === 'ERROR') {
      expect(response.error.message).toBe('Failed to create N-up document');
      expect(response.error.code).toBe(PDFiumErrorCode.DOC_FORMAT_INVALID);
    }
  });

  test('postError serialises PDFiumError with context', async () => {
    // Import PDFiumError first (before mocking)
    const { PDFiumError: PE, PDFiumErrorCode: EC } = await import('../../../src/core/errors.js');

    // Mock PDFium.init to throw a PDFiumError with context
    vi.doMock('../../../src/pdfium.js', () => ({
      PDFium: {
        init: vi.fn(() => {
          const err = new PE(EC.INIT_LIBRARY_FAILED, 'Failed with context', { details: 'extra info' });
          throw err;
        }),
      },
    }));

    const { setupWorker } = await import('../../../src/context/worker-script.js');
    await setupWorker();

    const handler = (self as unknown as { onmessage: (event: MessageEvent<WorkerRequest>) => Promise<void> }).onmessage;
    await handler(
      new MessageEvent('message', {
        data: { type: 'INIT', id: 'init-ctx', payload: { wasmBinary: new ArrayBuffer(8) } },
      }),
    );

    // Wait for async handling
    await new Promise((resolve) => setTimeout(resolve, 10));

    const errorResponse = postedMessages.find((m) => m.data.type === 'ERROR');
    expect(errorResponse).toBeDefined();
    if (errorResponse?.data.type === 'ERROR') {
      expect(errorResponse.data.error.context).toEqual({ details: 'extra info' });
    }
  });

  test('postError serialises Error with stack in __DEV__ mode', async () => {
    vi.stubGlobal('__DEV__', true);

    // Mock PDFium.init to throw a plain Error
    vi.doMock('../../../src/pdfium.js', () => ({
      PDFium: {
        init: vi.fn(() => {
          throw new Error('Plain error with stack');
        }),
      },
    }));

    const { setupWorker } = await import('../../../src/context/worker-script.js');
    await setupWorker();

    const handler = (self as unknown as { onmessage: (event: MessageEvent<WorkerRequest>) => Promise<void> }).onmessage;
    await handler(
      new MessageEvent('message', {
        data: { type: 'INIT', id: 'init-stack', payload: { wasmBinary: new ArrayBuffer(8) } },
      }),
    );

    await new Promise((resolve) => setTimeout(resolve, 10));

    const errorResponse = postedMessages.find((m) => m.data.type === 'ERROR');
    expect(errorResponse).toBeDefined();
    if (errorResponse?.data.type === 'ERROR') {
      expect(errorResponse.data.error.stack).toBeDefined();
      expect(errorResponse.data.error.stack).toContain('Plain error with stack');
    }
  });

  test('serialisePageObject - path object with null segment', async () => {
    const { PDFiumPathObject } = await import('../../../src/document/page-object.js');
    const pathObj = createMockPageObject(PDFiumPathObject, {
      type: 3,
      bounds: { left: 0, bottom: 0, right: 50, top: 50 },
      matrix: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 },
      marks: [],
      segmentCount: 2,
      getSegment: vi.fn().mockImplementation((index: number) => {
        if (index === 0) return { type: 0, point: { x: 5, y: 5 }, isClosing: false };
        return null; // null segment — covers the `if (seg)` false branch
      }),
      getDrawMode: vi.fn().mockReturnValue({ fillMode: 0, stroke: false }),
      strokeWidth: 1,
      lineCap: 0,
      lineJoin: 0,
    });

    const { send, pageId } = await setupWithMocks({
      objects: vi.fn().mockReturnValue([pathObj]),
    });

    await send({ type: 'GET_PAGE_OBJECTS', id: 'objects-1', payload: { pageId } });

    const response = lastResponse();
    expect(response.type).toBe('SUCCESS');
    if (response.type === 'SUCCESS') {
      const payload = response.payload as Array<{ path?: { segments: unknown[] } }>;
      // Only 1 segment should be in the output (the null one was skipped)
      expect(payload[0]!.path!.segments).toHaveLength(1);
    }
  });

  test('extended document handlers and all-page-dimensions return expected payloads', async () => {
    const { send, documentId } = await setupWithMocks({});

    await send({ type: 'GET_ALL_PAGE_DIMENSIONS', id: 'dims-1', payload: { documentId } });
    let response = lastResponse();
    expect(response.type).toBe('SUCCESS');
    if (response.type === 'SUCCESS') {
      expect(response.payload).toEqual([{ width: 612, height: 792 }]);
    }

    await send({ type: 'GET_METADATA', id: 'meta-1', payload: { documentId } });
    response = lastResponse();
    expect(response.type).toBe('SUCCESS');
    if (response.type === 'SUCCESS') {
      expect(response.payload).toEqual({ title: 'Mock Title', author: 'Mock Author' });
    }

    await send({ type: 'GET_PERMISSIONS', id: 'perm-1', payload: { documentId } });
    response = lastResponse();
    expect(response.type).toBe('SUCCESS');
    if (response.type === 'SUCCESS') {
      expect(response.payload).toEqual({ raw: -1, canPrint: true });
    }

    await send({ type: 'GET_VIEWER_PREFERENCES', id: 'vp-1', payload: { documentId } });
    response = lastResponse();
    expect(response.type).toBe('SUCCESS');
    if (response.type === 'SUCCESS') {
      expect(response.payload).toEqual({ hideToolbar: false });
    }

    await send({ type: 'GET_JAVASCRIPT_ACTIONS', id: 'js-1', payload: { documentId } });
    response = lastResponse();
    expect(response.type).toBe('SUCCESS');
    if (response.type === 'SUCCESS') {
      expect(response.payload).toEqual([{ name: 'OpenAction', script: 'app.alert("hi")' }]);
    }

    await send({ type: 'GET_PRINT_PAGE_RANGES', id: 'ranges-1', payload: { documentId } });
    response = lastResponse();
    expect(response.type).toBe('SUCCESS');
    if (response.type === 'SUCCESS') {
      expect(response.payload).toEqual([0, 2, 4]);
    }

    await send({ type: 'GET_EXTENDED_DOCUMENT_INFO', id: 'ext-1', payload: { documentId } });
    response = lastResponse();
    expect(response.type).toBe('SUCCESS');
    if (response.type === 'SUCCESS') {
      expect(response.payload).toEqual({
        fileVersion: 17,
        rawPermissions: -4,
        securityHandlerRevision: 6,
        signatureCount: 2,
        hasValidCrossReferenceTable: true,
      });
    }
  });

  test('signature serialisation transfers only entries that include contents', async () => {
    const { send, documentId } = await setupWithMocks({});

    await send({ type: 'GET_SIGNATURES', id: 'sig-1', payload: { documentId } });

    const responseWithTransfer = postedMessages[postedMessages.length - 1]!;
    expect(responseWithTransfer.data.type).toBe('SUCCESS');
    if (responseWithTransfer.data.type === 'SUCCESS') {
      const payload = responseWithTransfer.data.payload as Array<{ index: number; contents?: ArrayBuffer }>;
      expect(payload).toHaveLength(2);
      expect(payload[0]!.contents).toBeInstanceOf(ArrayBuffer);
      expect(payload[1]!.contents).toBeUndefined();
      expect(responseWithTransfer.transfer).toHaveLength(1);
    }
  });

  test('document-level handlers return early when document lookup fails', async () => {
    const { send } = await setupWithMocks({});
    const missingDocumentId = 'missing-doc';

    const requests: WorkerRequest[] = [
      { type: 'GET_ALL_PAGE_DIMENSIONS', id: 'missing-dims', payload: { documentId: missingDocumentId } },
      { type: 'GET_METADATA', id: 'missing-meta', payload: { documentId: missingDocumentId } },
      { type: 'GET_PERMISSIONS', id: 'missing-perm', payload: { documentId: missingDocumentId } },
      { type: 'GET_VIEWER_PREFERENCES', id: 'missing-vp', payload: { documentId: missingDocumentId } },
      { type: 'GET_JAVASCRIPT_ACTIONS', id: 'missing-js', payload: { documentId: missingDocumentId } },
      { type: 'GET_SIGNATURES', id: 'missing-sig', payload: { documentId: missingDocumentId } },
      { type: 'GET_PRINT_PAGE_RANGES', id: 'missing-ranges', payload: { documentId: missingDocumentId } },
      { type: 'GET_EXTENDED_DOCUMENT_INFO', id: 'missing-ext', payload: { documentId: missingDocumentId } },
      { type: 'GET_BOOKMARKS', id: 'missing-bookmarks', payload: { documentId: missingDocumentId } },
      { type: 'SAVE_DOCUMENT', id: 'missing-save', payload: { documentId: missingDocumentId } },
    ];

    for (const req of requests) {
      await send(req);
      const response = lastResponse();
      expect(response.type).toBe('ERROR');
      if (response.type === 'ERROR') {
        expect(response.error.code).toBe(PDFiumErrorCode.DOC_ALREADY_CLOSED);
      }
    }
  });
});
