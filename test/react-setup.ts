/**
 * Vitest setup file for the React test project.
 *
 * - Clears module-level caches between tests to prevent pollution.
 * - Stubs Canvas 2D context methods that happy-dom may not provide.
 * - Exports mock factories for WorkerPDFiumDocument / WorkerPDFiumPage.
 */

import { cleanup, type RenderHookOptions, type RenderHookResult, renderHook } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { afterEach, beforeEach, vi } from 'vitest';
import { queryStore } from '../src/react/internal/query-store.js';
import { renderStore } from '../src/react/internal/render-store.js';
import { PDFiumStoresContext } from '../src/react/internal/stores-context.js';

// ── Clear caches between tests ──────────────────────────────────
beforeEach(() => {
  queryStore.clear();
  renderStore.clear();
});

// ── Global teardown for React tests ────────────────────────────
// Enforce deterministic release of DOM nodes, timers, mocks, and stubs
// after each test to avoid cross-test retention in long runs.
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
  vi.restoreAllMocks();
  vi.resetModules();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

// ── Canvas 2D stub for happy-dom ────────────────────────────────
// happy-dom provides basic Canvas support but getContext('2d') may lack putImageData.
// Patch it so component tests that paint to canvas don't throw.
if (typeof HTMLCanvasElement !== 'undefined') {
  const proto = HTMLCanvasElement.prototype;
  const originalGetContext = proto.getContext.bind(proto);
  Object.defineProperty(proto, 'getContext', {
    value(this: HTMLCanvasElement, contextId: string, options?: CanvasRenderingContext2DSettings) {
      const ctx = originalGetContext.call(this, contextId, options) as CanvasRenderingContext2D | null;
      if (contextId === '2d' && ctx) {
        if (!ctx.putImageData) ctx.putImageData = vi.fn() as CanvasRenderingContext2D['putImageData'];
        if (!ctx.clearRect) ctx.clearRect = vi.fn() as CanvasRenderingContext2D['clearRect'];
        if (!ctx.fillRect) ctx.fillRect = vi.fn() as CanvasRenderingContext2D['fillRect'];
        if (!ctx.strokeRect) ctx.strokeRect = vi.fn() as CanvasRenderingContext2D['strokeRect'];
        if (!ctx.setLineDash) ctx.setLineDash = vi.fn() as CanvasRenderingContext2D['setLineDash'];
      }
      return ctx;
    },
    writable: true,
    configurable: true,
  });
}

// ── Stores context wrapper ──────────────────────────────────────

/**
 * Returns a React wrapper component that provides the module-level
 * `queryStore` and `renderStore` singletons via `PDFiumStoresContext`.
 *
 * Use this as the `wrapper` option in `renderHook` for any hook that
 * internally calls `usePDFiumStores()` (e.g. `useStoreQuery`, `PDFCanvas`).
 *
 * The module-level stores are cleared in `beforeEach` by this setup file,
 * so tests that seed data into `queryStore`/`renderStore` directly will
 * see those values through the context.
 */
export function createStoresWrapper() {
  return function StoresWrapper({ children }: { children: ReactNode }) {
    return createElement(PDFiumStoresContext.Provider, { value: { queryStore, renderStore } }, children);
  };
}

/**
 * Drop-in replacement for `renderHook` that wraps in the stores context.
 * Avoids adding `{ wrapper: createStoresWrapper() }` to every call site.
 */
export function renderHookWithStores<Result, Props>(
  render: (initialProps: Props) => Result,
  options?: Omit<RenderHookOptions<Props>, 'wrapper'>,
): RenderHookResult<Result, Props> {
  return renderHook(render, { wrapper: createStoresWrapper(), ...options });
}

// ── Mock factories ──────────────────────────────────────────────

/** Creates a mock WorkerPDFiumPage with sensible defaults. */
export function createMockPage(overrides?: Record<string, unknown>) {
  return {
    getPageInfo: vi.fn().mockResolvedValue({
      rotation: 0,
      hasTransparency: false,
      boundingBox: { left: 0, top: 792, right: 612, bottom: 0 },
      charCount: 100,
      pageBoxes: {},
    }),
    getTextLayout: vi.fn().mockResolvedValue({ text: 'Hello world', rects: new Float32Array(44) }),
    getAnnotations: vi.fn().mockResolvedValue([]),
    getLinks: vi.fn().mockResolvedValue([]),
    getWebLinks: vi.fn().mockResolvedValue([]),
    getPageObjects: vi.fn().mockResolvedValue([]),
    getStructureTree: vi.fn().mockResolvedValue(null),
    getFormWidgets: vi.fn().mockResolvedValue([]),
    getCharAtPos: vi.fn().mockResolvedValue(null),
    flatten: vi.fn().mockResolvedValue('NothingToDo'),
    formUndo: vi.fn().mockResolvedValue(false),
    canFormUndo: vi.fn().mockResolvedValue(false),
    getFormSelectedText: vi.fn().mockResolvedValue(null),
    findText: vi.fn().mockResolvedValue([]),
    dispose: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

/** Creates a mock WorkerPDFiumDocument with sensible defaults. */
export function createMockDocument(overrides?: Record<string, unknown>) {
  return {
    id: 'mock-doc-id',
    pageCount: 5,
    getPage: vi.fn().mockImplementation(() => Promise.resolve(createMockPage())),
    getBookmarks: vi.fn().mockResolvedValue([]),
    getAttachments: vi.fn().mockResolvedValue([]),
    getDocumentInfo: vi.fn().mockResolvedValue({
      isTagged: false,
      hasForm: false,
      formType: 'None',
      namedDestinationCount: 0,
      pageMode: 'UseNone',
    }),
    getNamedDestinations: vi.fn().mockResolvedValue([]),
    getPageLabel: vi.fn().mockResolvedValue(null),
    killFormFocus: vi.fn().mockResolvedValue(true),
    setFormHighlight: vi.fn().mockResolvedValue(undefined),
    getAllPageDimensions: vi.fn().mockResolvedValue(Array.from({ length: 5 }, () => ({ width: 612, height: 792 }))),
    getMetadata: vi
      .fn()
      .mockResolvedValue({ title: 'Test', author: '', subject: '', keywords: '', creator: '', producer: '' }),
    getPermissions: vi.fn().mockResolvedValue({
      raw: -1,
      canPrint: true,
      canModifyContents: true,
      canCopyOrExtract: true,
      canAddOrModifyAnnotations: true,
      canFillForms: true,
      canExtractForAccessibility: true,
      canAssemble: true,
      canPrintHighQuality: true,
    }),
    getViewerPreferences: vi.fn().mockResolvedValue({ printScaling: true, numCopies: 1, duplexMode: 'Undefined' }),
    getJavaScriptActions: vi.fn().mockResolvedValue([]),
    getSignatures: vi.fn().mockResolvedValue([]),
    getPrintPageRanges: vi.fn().mockResolvedValue(undefined),
    getExtendedDocumentInfo: vi.fn().mockResolvedValue({
      fileVersion: 17,
      rawPermissions: -1,
      securityHandlerRevision: 0,
      signatureCount: 0,
      hasValidCrossReferenceTable: true,
    }),
    save: vi.fn().mockResolvedValue(new Uint8Array([37, 80, 68, 70])),
    renderPage: vi.fn().mockResolvedValue({
      data: new Uint8Array(100),
      width: 100,
      height: 100,
      originalWidth: 612,
      originalHeight: 792,
    }),
    dispose: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}
