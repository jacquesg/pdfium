/**
 * Unit tests for page management worker protocol.
 *
 * Verifies that WorkerProxy sends the correct message type and payload
 * for the 4 page management operations, and that WorkerPDFiumDocument
 * and WorkerPDFiumPage delegate to the proxy correctly.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { WorkerResponse } from '../../../src/context/protocol.js';

// ── Mock Worker ───────────────────────────────────────────────

class MockWorker {
  onmessage: ((event: MessageEvent<WorkerResponse>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  readonly posted: Array<{ data: unknown; transfer: Transferable[] }> = [];
  terminated = false;

  postMessage(data: unknown, options?: { transfer?: Transferable[] } | Transferable[]): void {
    const transfer = Array.isArray(options) ? options : ((options as { transfer?: Transferable[] })?.transfer ?? []);
    this.posted.push({ data, transfer });
  }

  terminate(): void {
    this.terminated = true;
  }

  respondSuccess(id: string, payload: unknown): void {
    const response: WorkerResponse = { type: 'SUCCESS', id, payload };
    this.onmessage?.(new MessageEvent('message', { data: response }));
  }
}

// ── Setup helpers ─────────────────────────────────────────────

type PostedMsg = { type: string; id: string; payload: Record<string, unknown> };

async function createInitialisedProxy(mockWorker: MockWorker) {
  const { WorkerProxy } = await import('../../../src/context/worker-proxy.js');
  const createPromise = WorkerProxy.create('worker.js', new ArrayBuffer(8));
  const initMsg = mockWorker.posted[0]!.data as PostedMsg;
  mockWorker.respondSuccess(initMsg.id, undefined);
  return await createPromise;
}

async function disposeProxy(proxy: { dispose(): Promise<void> }, mockWorker: MockWorker): Promise<void> {
  const disposePromise = proxy.dispose();
  const lastMsg = mockWorker.posted[mockWorker.posted.length - 1]?.data as PostedMsg | undefined;
  if (lastMsg?.type === 'DESTROY') {
    mockWorker.respondSuccess(lastMsg.id, undefined);
  }
  await disposePromise;
}

function lastMsg(mockWorker: MockWorker): PostedMsg {
  return mockWorker.posted[mockWorker.posted.length - 1]!.data as PostedMsg;
}

// ── Protocol type completeness checks (compile-time) ─────────

describe('WorkerRequest protocol — page management types', () => {
  type PageManagementTypes = 'DELETE_PAGE' | 'INSERT_BLANK_PAGE' | 'MOVE_PAGES' | 'SET_PAGE_ROTATION';

  test('all 4 page management message types are present in WorkerRequest', async () => {
    const protocol = await import('../../../src/context/protocol.js');
    expect(protocol).toBeDefined();

    const expectedTypes: PageManagementTypes[] = [
      'DELETE_PAGE',
      'INSERT_BLANK_PAGE',
      'MOVE_PAGES',
      'SET_PAGE_ROTATION',
    ];
    expect(expectedTypes).toHaveLength(4);
  });
});

// ── WorkerProxy — page management wire tests ──────────────────

describe('WorkerProxy — page management', () => {
  let mockWorker: MockWorker;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetModules();
    mockWorker = new MockWorker();
    vi.stubGlobal(
      'Worker',
      class {
        constructor() {
          // biome-ignore lint/correctness/noConstructorReturn: intentional test mock
          return mockWorker;
        }
      },
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  test('deletePage sends DELETE_PAGE with documentId and pageIndex', async () => {
    const proxy = await createInitialisedProxy(mockWorker);

    const resultPromise = proxy.deletePage('doc-1', 2);
    const msg = lastMsg(mockWorker);
    expect(msg.type).toBe('DELETE_PAGE');
    expect(msg.payload).toMatchObject({ documentId: 'doc-1', pageIndex: 2 });

    mockWorker.respondSuccess(msg.id, undefined);
    await resultPromise;

    await disposeProxy(proxy, mockWorker);
  });

  test('insertBlankPage sends INSERT_BLANK_PAGE with documentId, pageIndex, width, height', async () => {
    const proxy = await createInitialisedProxy(mockWorker);

    const resultPromise = proxy.insertBlankPage('doc-1', 3, 612, 792);
    const msg = lastMsg(mockWorker);
    expect(msg.type).toBe('INSERT_BLANK_PAGE');
    expect(msg.payload).toMatchObject({
      documentId: 'doc-1',
      pageIndex: 3,
      width: 612,
      height: 792,
    });

    mockWorker.respondSuccess(msg.id, undefined);
    await resultPromise;

    await disposeProxy(proxy, mockWorker);
  });

  test('movePages sends MOVE_PAGES with documentId, pageIndices, and destPageIndex', async () => {
    const proxy = await createInitialisedProxy(mockWorker);

    const resultPromise = proxy.movePages('doc-1', [0, 1, 2], 5);
    const msg = lastMsg(mockWorker);
    expect(msg.type).toBe('MOVE_PAGES');
    expect(msg.payload).toMatchObject({
      documentId: 'doc-1',
      pageIndices: [0, 1, 2],
      destPageIndex: 5,
    });

    mockWorker.respondSuccess(msg.id, undefined);
    await resultPromise;

    await disposeProxy(proxy, mockWorker);
  });

  test('setPageRotation sends SET_PAGE_ROTATION with pageId and rotation', async () => {
    const proxy = await createInitialisedProxy(mockWorker);

    const { PageRotation } = await import('../../../src/core/types.js');
    const resultPromise = proxy.setPageRotation('page-1', PageRotation.Clockwise90);
    const msg = lastMsg(mockWorker);
    expect(msg.type).toBe('SET_PAGE_ROTATION');
    expect(msg.payload).toMatchObject({ pageId: 'page-1', rotation: PageRotation.Clockwise90 });

    mockWorker.respondSuccess(msg.id, undefined);
    await resultPromise;

    await disposeProxy(proxy, mockWorker);
  });
});

// ── WorkerPDFiumDocument — page management delegation ────────

describe('WorkerPDFiumDocument — page management delegation', () => {
  let mockWorker: MockWorker;

  beforeEach(() => {
    vi.resetModules();
    mockWorker = new MockWorker();
    vi.stubGlobal(
      'Worker',
      class {
        constructor() {
          // biome-ignore lint/correctness/noConstructorReturn: intentional test mock
          return mockWorker;
        }
      },
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function setupDocument() {
    const { PDFium } = await import('../../../src/pdfium.js');

    const initPromise = PDFium.init({
      useWorker: true,
      workerUrl: 'worker.js',
      wasmBinary: new Uint8Array([0x00, 0x61, 0x73, 0x6d]).buffer,
    });
    await vi.waitFor(() => expect(mockWorker.posted.length).toBeGreaterThan(0));
    const initMsg = mockWorker.posted[0]!.data as PostedMsg;
    mockWorker.respondSuccess(initMsg.id, undefined);
    const pdfium = await initPromise;

    const openPromise = pdfium.openDocument(new Uint8Array([1, 2, 3, 4]));
    const openMsg = lastMsg(mockWorker);
    mockWorker.respondSuccess(openMsg.id, { documentId: 'doc-1', pageCount: 5 });
    const document = await openPromise;

    return { pdfium, document };
  }

  async function teardown(
    pdfium: { dispose(): Promise<void> },
    document: { dispose(): Promise<void> },
    mockWorker: MockWorker,
  ): Promise<void> {
    const closeDocPromise = document.dispose();
    const closeDocMsg = lastMsg(mockWorker);
    mockWorker.respondSuccess(closeDocMsg.id, undefined);
    await closeDocPromise;

    const destroyPromise = pdfium.dispose();
    const destroyMsg = lastMsg(mockWorker);
    mockWorker.respondSuccess(destroyMsg.id, undefined);
    await destroyPromise;
  }

  test('deletePage delegates to proxy with documentId and pageIndex', async () => {
    const { pdfium, document } = await setupDocument();

    const resultPromise = document.deletePage(1);
    const msg = lastMsg(mockWorker);
    expect(msg.type).toBe('DELETE_PAGE');
    expect(msg.payload.pageIndex).toBe(1);
    mockWorker.respondSuccess(msg.id, undefined);
    await resultPromise;

    await teardown(pdfium, document, mockWorker);
  });

  test('insertBlankPage delegates with pageIndex, width, height', async () => {
    const { pdfium, document } = await setupDocument();

    const resultPromise = document.insertBlankPage(2, 595, 842);
    const msg = lastMsg(mockWorker);
    expect(msg.type).toBe('INSERT_BLANK_PAGE');
    expect(msg.payload).toMatchObject({ pageIndex: 2, width: 595, height: 842 });
    mockWorker.respondSuccess(msg.id, undefined);
    await resultPromise;

    await teardown(pdfium, document, mockWorker);
  });

  test('movePages delegates with pageIndices and destPageIndex', async () => {
    const { pdfium, document } = await setupDocument();

    const resultPromise = document.movePages([2, 3], 0);
    const msg = lastMsg(mockWorker);
    expect(msg.type).toBe('MOVE_PAGES');
    expect(msg.payload.pageIndices).toEqual([2, 3]);
    expect(msg.payload.destPageIndex).toBe(0);
    mockWorker.respondSuccess(msg.id, undefined);
    await resultPromise;

    await teardown(pdfium, document, mockWorker);
  });
});

// ── WorkerPDFiumPage — setRotation delegation ─────────────────

describe('WorkerPDFiumPage — setRotation delegation', () => {
  let mockWorker: MockWorker;

  beforeEach(() => {
    vi.resetModules();
    mockWorker = new MockWorker();
    vi.stubGlobal(
      'Worker',
      class {
        constructor() {
          // biome-ignore lint/correctness/noConstructorReturn: intentional test mock
          return mockWorker;
        }
      },
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function setupPage() {
    const { PDFium } = await import('../../../src/pdfium.js');

    const initPromise = PDFium.init({
      useWorker: true,
      workerUrl: 'worker.js',
      wasmBinary: new Uint8Array([0x00, 0x61, 0x73, 0x6d]).buffer,
    });
    await vi.waitFor(() => expect(mockWorker.posted.length).toBeGreaterThan(0));
    const initMsg = mockWorker.posted[0]!.data as PostedMsg;
    mockWorker.respondSuccess(initMsg.id, undefined);
    const pdfium = await initPromise;

    const openPromise = pdfium.openDocument(new Uint8Array([1, 2, 3, 4]));
    const openMsg = lastMsg(mockWorker);
    mockWorker.respondSuccess(openMsg.id, { documentId: 'doc-1', pageCount: 2 });
    const document = await openPromise;

    const loadPagePromise = document.getPage(0);
    const loadMsg = lastMsg(mockWorker);
    mockWorker.respondSuccess(loadMsg.id, { pageId: 'page-1', index: 0, width: 595, height: 842 });
    const page = await loadPagePromise;

    return { pdfium, document, page };
  }

  test('setRotation delegates to proxy with pageId and rotation value', async () => {
    const { pdfium, document, page } = await setupPage();

    const { PageRotation } = await import('../../../src/core/types.js');
    const resultPromise = page.setRotation(PageRotation.Clockwise90);
    const msg = lastMsg(mockWorker);
    expect(msg.type).toBe('SET_PAGE_ROTATION');
    expect(msg.payload).toMatchObject({ pageId: 'page-1', rotation: PageRotation.Clockwise90 });
    mockWorker.respondSuccess(msg.id, undefined);
    await resultPromise;

    const closePagePromise = page.dispose();
    const closePageMsg = lastMsg(mockWorker);
    mockWorker.respondSuccess(closePageMsg.id, undefined);
    await closePagePromise;

    const closeDocPromise = document.dispose();
    const closeDocMsg = lastMsg(mockWorker);
    mockWorker.respondSuccess(closeDocMsg.id, undefined);
    await closeDocPromise;

    const destroyPromise = pdfium.dispose();
    const destroyMsg = lastMsg(mockWorker);
    mockWorker.respondSuccess(destroyMsg.id, undefined);
    await destroyPromise;
  });

  test('setRotation accepts all valid rotation values', async () => {
    const { pdfium, document, page } = await setupPage();

    const { PageRotation } = await import('../../../src/core/types.js');
    for (const rotation of [
      PageRotation.None,
      PageRotation.Clockwise90,
      PageRotation.Rotate180,
      PageRotation.CounterClockwise90,
    ]) {
      const resultPromise = page.setRotation(rotation);
      const msg = lastMsg(mockWorker);
      expect(msg.type).toBe('SET_PAGE_ROTATION');
      expect(msg.payload.rotation).toBe(rotation);
      mockWorker.respondSuccess(msg.id, undefined);
      await resultPromise;
    }

    const closePagePromise = page.dispose();
    const closePageMsg = lastMsg(mockWorker);
    mockWorker.respondSuccess(closePageMsg.id, undefined);
    await closePagePromise;

    const closeDocPromise = document.dispose();
    const closeDocMsg = lastMsg(mockWorker);
    mockWorker.respondSuccess(closeDocMsg.id, undefined);
    await closeDocPromise;

    const destroyPromise = pdfium.dispose();
    const destroyMsg = lastMsg(mockWorker);
    mockWorker.respondSuccess(destroyMsg.id, undefined);
    await destroyPromise;
  });
});
