/**
 * PDF document handling with automatic resource management.
 *
 * @module document/document
 */

import { Disposable } from '../core/disposable.js';
import { DocumentError, MemoryError, PageError, PDFiumErrorCode } from '../core/errors.js';
import {
  DEFAULT_LIMITS,
  type AttachmentHandle,
  type Bookmark,
  type BookmarkHandle,
  type DocumentHandle,
  type FormHandle,
  type PDFAttachment,
  type PDFiumLimits,
  type SaveOptions,
  type WASMPointer,
} from '../core/types.js';
import { WASMAllocation } from '../wasm/allocation.js';
import type { PDFiumWASM } from '../wasm/bindings.js';
import { asHandle, NULL_PTR, type WASMMemoryManager } from '../wasm/memory.js';
import { PDFiumPage } from './page.js';
import { saveDocument } from './save-utils.js';

/** Null handle constants. */
const NULL_FORM: FormHandle = asHandle<FormHandle>(0);
const NULL_BOOKMARK: BookmarkHandle = asHandle<BookmarkHandle>(0);
const NULL_ATTACHMENT: AttachmentHandle = asHandle<AttachmentHandle>(0);

/** Maximum recursion depth for bookmark tree traversal. */
const MAX_BOOKMARK_DEPTH = 100;

/**
 * Size of the FPDF_FORMFILLINFO structure.
 *
 * The structure contains a version field and many callback function pointers.
 * We need at least 140 bytes for the structure, allocate 256 to be safe.
 */
const FORM_FILL_INFO_SIZE = 256;

/**
 * Represents a loaded PDF document.
 *
 * Documents must be disposed when no longer needed to free WASM memory.
 * Use the `using` keyword for automatic disposal.
 *
 * @example
 * ```typescript
 * using document = await pdfium.openDocument(pdfBytes);
 * console.log(`Document has ${document.pageCount} pages`);
 *
 * for (const page of document.pages()) {
 *   using p = page;
 *   const text = p.getText();
 * }
 * ```
 */
export class PDFiumDocument extends Disposable {
  readonly #module: PDFiumWASM;
  readonly #memory: WASMMemoryManager;
  readonly #documentHandle: DocumentHandle;
  readonly #dataPtr: WASMPointer;
  readonly #limits: Readonly<Required<PDFiumLimits>>;
  readonly #pages = new Set<PDFiumPage>();
  #formHandle: FormHandle = NULL_FORM;
  #formInfoPtr: WASMPointer = NULL_PTR;

  /** @internal */
  constructor(
    module: PDFiumWASM,
    memory: WASMMemoryManager,
    documentHandle: DocumentHandle,
    dataPtr: WASMPointer,
    limits?: Readonly<Required<PDFiumLimits>>,
  ) {
    super('PDFiumDocument', PDFiumErrorCode.DOC_ALREADY_CLOSED);
    this.#module = module;
    this.#memory = memory;
    this.#documentHandle = documentHandle;
    this.#dataPtr = dataPtr;
    this.#limits = limits ?? DEFAULT_LIMITS;

    // Initialise form fill environment
    this.#initFormFillEnvironment();

    // Register finalizer cleanup for safety-net GC disposal
    this.setFinalizerCleanup(() => {
      // Dispose tracked pages first to maintain safe ordering
      for (const page of this.#pages) {
        page.dispose();
      }
      this.#pages.clear();

      if (this.#formHandle !== NULL_FORM) {
        this.#module._FPDFDOC_ExitFormFillEnvironment(this.#formHandle);
      }
      this.#module._FPDF_CloseDocument(this.#documentHandle);
      this.#memory.free(this.#dataPtr);
      if (this.#formInfoPtr !== NULL_PTR) {
        this.#memory.free(this.#formInfoPtr);
      }
    });
  }

  /**
   * Initialise the form fill environment for rendering interactive form fields.
   */
  #initFormFillEnvironment(): void {
    using formInfo = this.#tryAllocFormInfo();
    if (formInfo === undefined) {
      return;
    }

    // Zero out the structure (required - callback pointers must be null)
    this.#memory.heapU8.fill(0, formInfo.ptr, formInfo.ptr + FORM_FILL_INFO_SIZE);

    // Set version to 2 (supports XFA and other features)
    this.#memory.writeInt32(formInfo.ptr, 2);

    // Initialise form fill environment
    this.#formHandle = this.#module._FPDFDOC_InitFormFillEnvironment(this.#documentHandle, formInfo.ptr);

    // If initialisation failed, formInfo auto-freed at scope exit
    if (this.#formHandle === NULL_FORM) {
      return;
    }

    // Transfer ownership to instance
    this.#formInfoPtr = formInfo.take();
  }

  #tryAllocFormInfo(): WASMAllocation | undefined {
    try {
      return this.#memory.alloc(FORM_FILL_INFO_SIZE);
    } catch (error) {
      // Form fill is optional - continue without it if allocation fails
      if (error instanceof MemoryError) {
        return undefined;
      }
      throw error;
    }
  }

  /**
   * Get the number of pages in the document.
   */
  get pageCount(): number {
    this.ensureNotDisposed();
    return this.#module._FPDF_GetPageCount(this.#documentHandle);
  }

  /**
   * Load a specific page from the document.
   *
   * @param pageIndex - Zero-based page index
   * @returns The loaded page
   * @throws {PageError} If the page cannot be loaded
   */
  getPage(pageIndex: number): PDFiumPage {
    this.ensureNotDisposed();

    if (!Number.isSafeInteger(pageIndex)) {
      throw new PageError(PDFiumErrorCode.PAGE_INDEX_OUT_OF_RANGE, `Page index must be a safe integer, got ${pageIndex}`, {
        requestedIndex: pageIndex,
      });
    }

    const pageCount = this.#module._FPDF_GetPageCount(this.#documentHandle);

    if (pageIndex < 0 || pageIndex >= pageCount) {
      throw new PageError(PDFiumErrorCode.PAGE_INDEX_OUT_OF_RANGE, `Page index ${pageIndex} out of range [0, ${pageCount})`, {
        requestedIndex: pageIndex,
        pageCount,
      });
    }

    const pageHandle = this.#module._FPDF_LoadPage(this.#documentHandle, pageIndex);
    if (pageHandle === asHandle(0)) {
      throw new PageError(PDFiumErrorCode.PAGE_LOAD_FAILED, `Failed to load page ${pageIndex}`, {
        requestedIndex: pageIndex,
      });
    }

    // Notify form system after loading page
    if (this.#formHandle !== NULL_FORM) {
      this.#module._FORM_OnAfterLoadPage(pageHandle, this.#formHandle);
    }

    const page = new PDFiumPage(
      this.#module,
      this.#memory,
      pageHandle,
      pageIndex,
      this.#formHandle,
      this.#limits,
      (p: PDFiumPage) => this.#pages.delete(p),
    );
    this.#pages.add(page);
    return page;
  }

  /**
   * Iterate over all pages in the document.
   *
   * Each page is yielded directly. Throws on failure.
   *
   * @example
   * ```typescript
   * for (const page of document.pages()) {
   *   using p = page;
   *   // Use the page
   * }
   * ```
   */
  *pages(): Generator<PDFiumPage> {
    this.ensureNotDisposed();
    const count = this.pageCount;
    for (let i = 0; i < count; i++) {
      yield this.getPage(i);
    }
  }

  /**
   * Get the bookmark (outline) tree for this document.
   *
   * Returns an array of top-level bookmarks, each with nested children.
   * Returns an empty array if the document has no bookmarks.
   */
  getBookmarks(): Bookmark[] {
    this.ensureNotDisposed();
    return this.#readBookmarkChildren(NULL_BOOKMARK);
  }

  #readBookmarkChildren(parent: BookmarkHandle, depth = 0): Bookmark[] {
    if (depth > MAX_BOOKMARK_DEPTH) {
      throw new DocumentError(
        PDFiumErrorCode.DOC_FORMAT_INVALID,
        `Bookmark tree depth exceeds maximum of ${MAX_BOOKMARK_DEPTH}`,
      );
    }

    const bookmarks: Bookmark[] = [];
    let current = this.#module._FPDFBookmark_GetFirstChild(this.#documentHandle, parent);

    while (current !== NULL_BOOKMARK) {
      const title = this.#readBookmarkTitle(current);
      const dest = this.#module._FPDFBookmark_GetDest(this.#documentHandle, current);
      const pageIndex = dest !== asHandle(0)
        ? this.#module._FPDFDest_GetDestPageIndex(this.#documentHandle, dest)
        : undefined;
      const children = this.#readBookmarkChildren(current, depth + 1);

      bookmarks.push({ title, pageIndex: pageIndex === -1 ? undefined : pageIndex, children });
      current = this.#module._FPDFBookmark_GetNextSibling(this.#documentHandle, current);
    }

    return bookmarks;
  }

  #readBookmarkTitle(bookmark: BookmarkHandle): string {
    // First call with 0 buffer to get required size (in bytes, including null terminator)
    const requiredBytes = this.#module._FPDFBookmark_GetTitle(bookmark, NULL_PTR, 0);
    if (requiredBytes <= 2) {
      return '';
    }

    using buffer = this.#memory.alloc(requiredBytes);
    this.#module._FPDFBookmark_GetTitle(bookmark, buffer.ptr, requiredBytes);

    // UTF-16LE: 2 bytes per char, subtract 2 for null terminator
    const charCount = (requiredBytes - 2) / 2;
    return this.#memory.readUTF16LE(buffer.ptr, charCount);
  }

  /**
   * Get the number of file attachments in this document.
   */
  get attachmentCount(): number {
    this.ensureNotDisposed();
    return this.#module._FPDFDoc_GetAttachmentCount(this.#documentHandle);
  }

  /**
   * Get a file attachment by index.
   *
   * @param index - Zero-based attachment index
   * @returns The attachment metadata and data
   * @throws {DocumentError} If the attachment cannot be loaded
   */
  getAttachment(index: number): PDFAttachment {
    this.ensureNotDisposed();

    const count = this.#module._FPDFDoc_GetAttachmentCount(this.#documentHandle);
    if (index < 0 || index >= count) {
      throw new DocumentError(
        PDFiumErrorCode.DOC_FORMAT_INVALID,
        `Attachment index ${index} out of range [0, ${count})`,
      );
    }

    const handle = this.#module._FPDFDoc_GetAttachment(this.#documentHandle, index);
    if (handle === NULL_ATTACHMENT) {
      throw new DocumentError(PDFiumErrorCode.DOC_LOAD_UNKNOWN, `Failed to load attachment ${index}`);
    }

    const name = this.#readAttachmentName(handle);
    const data = this.#readAttachmentData(handle);

    return { index, name, data };
  }

  /**
   * Get all file attachments in this document.
   */
  getAttachments(): PDFAttachment[] {
    this.ensureNotDisposed();

    const count = this.#module._FPDFDoc_GetAttachmentCount(this.#documentHandle);
    const attachments: PDFAttachment[] = [];

    for (let i = 0; i < count; i++) {
      const handle = this.#module._FPDFDoc_GetAttachment(this.#documentHandle, i);
      if (handle === NULL_ATTACHMENT) {
        continue;
      }

      const name = this.#readAttachmentName(handle);
      const data = this.#readAttachmentData(handle);
      attachments.push({ index: i, name, data });
    }

    return attachments;
  }

  #readAttachmentName(handle: AttachmentHandle): string {
    // First call with 0 buffer to get required size (in bytes, including null terminator)
    const requiredBytes = this.#module._FPDFAttachment_GetName(handle, NULL_PTR, 0);
    if (requiredBytes <= 2) {
      return '';
    }

    using buffer = this.#memory.alloc(requiredBytes);
    this.#module._FPDFAttachment_GetName(handle, buffer.ptr, requiredBytes);

    // UTF-16LE: 2 bytes per char, subtract 2 for null terminator
    const charCount = (requiredBytes - 2) / 2;
    return this.#memory.readUTF16LE(buffer.ptr, charCount);
  }

  #readAttachmentData(handle: AttachmentHandle): Uint8Array {
    // First call to get size
    using sizeOut = this.#memory.alloc(8);
    const hasData = this.#module._FPDFAttachment_GetFile(handle, NULL_PTR, 0, sizeOut.ptr);
    if (!hasData) {
      return new Uint8Array(0);
    }

    // Read the size (unsigned long = 4 bytes on WASM32)
    const fileSize = this.#memory.readInt32(sizeOut.ptr);
    if (fileSize <= 0) {
      return new Uint8Array(0);
    }

    // Allocate and read data
    using dataBuf = this.#memory.alloc(fileSize);
    this.#module._FPDFAttachment_GetFile(handle, dataBuf.ptr, fileSize, sizeOut.ptr);

    return this.#memory.heapU8.slice(dataBuf.ptr, dataBuf.ptr + fileSize);
  }

  /**
   * Save the document to a new byte array.
   *
   * @param options - Save options (flags, version)
   * @returns The serialised PDF bytes
   * @throws {DocumentError} If the save operation fails
   */
  save(options: SaveOptions = {}): Uint8Array {
    this.ensureNotDisposed();
    return saveDocument(this.#module, this.#memory, this.#documentHandle, options);
  }

  /**
   * Get the internal document handle for advanced usage.
   *
   * @internal
   */
  get handle(): DocumentHandle {
    this.ensureNotDisposed();
    return this.#documentHandle;
  }

  /**
   * Get the form handle for advanced usage.
   *
   * @internal
   */
  get formHandle(): FormHandle {
    this.ensureNotDisposed();
    return this.#formHandle;
  }

  protected disposeInternal(): void {
    // Dispose all tracked pages first (safe ordering)
    for (const page of this.#pages) {
      page.dispose();
    }
    this.#pages.clear();

    // Exit form fill environment
    if (this.#formHandle !== NULL_FORM) {
      this.#module._FPDFDOC_ExitFormFillEnvironment(this.#formHandle);
      this.#formHandle = NULL_FORM;
    }

    // Free form info structure
    if (this.#formInfoPtr !== NULL_PTR) {
      this.#memory.free(this.#formInfoPtr);
      this.#formInfoPtr = NULL_PTR;
    }

    // Close the document
    this.#module._FPDF_CloseDocument(this.#documentHandle);

    // Free the document data buffer
    this.#memory.free(this.#dataPtr);
  }
}
