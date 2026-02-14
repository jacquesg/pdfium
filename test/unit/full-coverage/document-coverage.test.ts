/**
 * Coverage tests for document.ts uncovered lines.
 *
 * Targets specific uncovered edge cases:
 * - Line 1023: CloseJavaScriptAction cleanup in finally block
 * - Lines 1040-1048: getJavaScriptActions iteration with undefined actions
 * - Bookmark depth limit
 * - Attachment iteration with NULL handles
 */

import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createMockWasmModule } from '../../utils/mock-wasm.js';

describe('PDFiumDocument - coverage for uncovered lines', () => {
  let mockModule: ReturnType<typeof createMockWasmModule>;

  beforeEach(() => {
    vi.resetModules();
    mockModule = createMockWasmModule();
  });

  /** Helper: mock loadWASM to return the mock module, then import PDFium and open a document */
  async function openMockDocument() {
    vi.doMock('../../../src/wasm/index.js', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../../../src/wasm/index.js')>();
      return {
        ...actual,
        loadWASM: vi.fn(() => Promise.resolve(mockModule)),
      };
    });
    const { PDFium } = await import('../../../src/pdfium.js');
    const pdfium = await PDFium.init();
    const pdfData = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // "%PDF"
    const document = await pdfium.openDocument(pdfData);
    return { pdfium, document };
  }

  test('line 1023 - CloseJavaScriptAction in finally block', async () => {
    const jsHandle = 500;
    mockModule._FPDFDoc_GetJavaScriptActionCount = vi.fn(() => 1);
    mockModule._FPDFDoc_GetJavaScriptAction = vi.fn(() => jsHandle);
    mockModule._FPDFJavaScriptAction_GetName = vi.fn(() => {
      throw new Error('Simulated name extraction failure');
    });
    mockModule._FPDFDoc_CloseJavaScriptAction = vi.fn();

    const { pdfium, document } = await openMockDocument();

    // Should throw during name extraction
    expect(() => document.getJavaScriptAction(0)).toThrow('Simulated name extraction failure');

    // Verify CloseJavaScriptAction was called in finally block
    expect(mockModule._FPDFDoc_CloseJavaScriptAction).toHaveBeenCalledWith(jsHandle);

    document.dispose();
    pdfium.dispose();
  });

  test('lines 1040-1048 - getJavaScriptActions with some undefined actions', async () => {
    // Setup: return 3 actions, but middle one is NULL
    mockModule._FPDFDoc_GetJavaScriptActionCount = vi.fn(() => 3);
    mockModule._FPDFDoc_GetJavaScriptAction = vi
      .fn()
      .mockReturnValueOnce(500) // Valid
      .mockReturnValueOnce(0) // NULL - undefined action
      .mockReturnValueOnce(501); // Valid

    mockModule._FPDFJavaScriptAction_GetName = vi.fn(() => 2); // Null terminator only (2 bytes UTF-16LE)
    mockModule._FPDFJavaScriptAction_GetScript = vi.fn(() => 2); // Null terminator only
    mockModule._FPDFDoc_CloseJavaScriptAction = vi.fn();

    const { pdfium, document } = await openMockDocument();

    const actions = document.getJavaScriptActions();

    // Should get only 2 actions (skipping the undefined one at index 1)
    expect(actions).toHaveLength(2);
    expect(mockModule._FPDFDoc_GetJavaScriptAction).toHaveBeenCalledTimes(3);

    document.dispose();
    pdfium.dispose();
  });

  test('bookmark depth limit - exactly at MAX_BOOKMARK_DEPTH', async () => {
    // Create a deeply nested bookmark structure at exactly the limit (100 levels)
    let depth = 0;
    mockModule._FPDFBookmark_GetFirstChild = vi.fn(() => {
      if (depth < 100) {
        depth++;
        return 1000 + depth;
      }
      return 0; // NULL_BOOKMARK - stop recursion
    });
    mockModule._FPDFBookmark_GetNextSibling = vi.fn(() => 0);
    mockModule._FPDFBookmark_GetTitle = vi.fn(() => 2); // 2 bytes = null terminator only
    mockModule._FPDFBookmark_GetDest = vi.fn(() => 0);
    mockModule._FPDFBookmark_GetAction = vi.fn(() => 0);

    const { pdfium, document } = await openMockDocument();

    // Should succeed at exactly depth 100
    const bookmarks = document.getBookmarks();
    expect(bookmarks.length).toBeGreaterThan(0);

    document.dispose();
    pdfium.dispose();
  });

  test('bookmark depth limit - exceeds MAX_BOOKMARK_DEPTH', async () => {
    // Create bookmarks that exceed the depth limit
    let depth = 0;
    mockModule._FPDFBookmark_GetFirstChild = vi.fn(() => {
      if (depth < 150) {
        depth++;
        return 1000 + depth;
      }
      return 0;
    });
    mockModule._FPDFBookmark_GetNextSibling = vi.fn(() => 0);
    mockModule._FPDFBookmark_GetTitle = vi.fn(() => 2);
    mockModule._FPDFBookmark_GetDest = vi.fn(() => 0);
    mockModule._FPDFBookmark_GetAction = vi.fn(() => 0);

    const { pdfium, document } = await openMockDocument();

    // Should throw when depth exceeds limit
    expect(() => document.getBookmarks()).toThrow();

    document.dispose();
    pdfium.dispose();
  });

  test('attachment iteration - skip NULL attachment', async () => {
    // Setup: 3 attachments but middle one is NULL
    mockModule._FPDFDoc_GetAttachmentCount = vi.fn(() => 3);
    mockModule._FPDFDoc_GetAttachment = vi
      .fn()
      .mockReturnValueOnce(600) // Valid
      .mockReturnValueOnce(0) // NULL - should skip
      .mockReturnValueOnce(601); // Valid

    mockModule._FPDFAttachment_GetName = vi.fn(() => 2); // Null terminator only
    mockModule._FPDFAttachment_GetFile = vi.fn(() => 0); // No data

    const { pdfium, document } = await openMockDocument();

    const attachments = [...document.attachments()];

    // Should get only 2 attachments (skipping NULL at index 1)
    expect(attachments).toHaveLength(2);

    document.dispose();
    pdfium.dispose();
  });
});
