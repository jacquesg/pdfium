/**
 * PDF document handling with automatic resource management.
 *
 * @module document/document
 */

import { Disposable } from '../core/disposable.js';
import { DocumentError, MemoryError, PageError, PDFiumErrorCode } from '../core/errors.js';
import {
  AttachmentValueType,
  type Bookmark,
  DEFAULT_LIMITS,
  DocMDPPermission,
  type DocumentActionType,
  type DocumentMetadata,
  DuplexMode,
  FormType,
  type ImportPagesOptions,
  type JavaScriptAction,
  type NamedDestination,
  type NUpLayoutOptions,
  PageMode,
  type PDFAttachment,
  type PDFiumLimits,
  type PDFSignature,
  type SaveOptions,
  type ViewerPreferences,
} from '../core/types.js';
import {
  NULL_ATTACHMENT,
  NULL_BOOKMARK,
  NULL_DEST,
  NULL_FORM,
  NULL_JAVASCRIPT,
  NULL_SIGNATURE,
  UTF16LE_BYTES_PER_CHAR,
  UTF16LE_NULL_TERMINATOR_BYTES,
} from '../internal/constants.js';
import type {
  AttachmentHandle,
  BookmarkHandle,
  DocumentHandle,
  FormHandle,
  SignatureHandle,
  WASMPointer,
} from '../internal/handles.js';
import { INTERNAL } from '../internal/symbols.js';
import type { WASMAllocation } from '../wasm/allocation.js';
import type { PDFiumWASM } from '../wasm/bindings/index.js';
import {
  asciiDecoder,
  asHandle,
  encodeUTF16LE,
  NULL_PTR,
  textDecoder,
  textEncoder,
  utf16leDecoder,
  type WASMMemoryManager,
} from '../wasm/memory.js';
import { PDFiumPage } from './page.js';
import { saveDocument } from './save-utils.js';

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
    const FORM_FILL_INFO_VERSION = 2;
    this.#memory.writeInt32(formInfo.ptr, FORM_FILL_INFO_VERSION);

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
      throw new PageError(
        PDFiumErrorCode.PAGE_INDEX_OUT_OF_RANGE,
        `Page index must be a safe integer, got ${pageIndex}`,
        {
          requestedIndex: pageIndex,
        },
      );
    }

    const pageCount = this.#module._FPDF_GetPageCount(this.#documentHandle);

    if (pageIndex < 0 || pageIndex >= pageCount) {
      throw new PageError(
        PDFiumErrorCode.PAGE_INDEX_OUT_OF_RANGE,
        `Page index ${pageIndex} out of range [0, ${pageCount})`,
        {
          requestedIndex: pageIndex,
          pageCount,
        },
      );
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
      this.#documentHandle,
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
   *
   * For large bookmark trees, prefer the lazy {@link bookmarks} generator.
   */
  getBookmarks(): Bookmark[] {
    return [...this.bookmarks()];
  }

  /**
   * Iterate over top-level bookmarks lazily.
   *
   * Each yielded bookmark includes its full subtree of children (eagerly loaded).
   * Use this to avoid building the entire bookmark array up-front.
   *
   * @returns A generator yielding top-level bookmarks with their children
   * @throws {DocumentError} If the bookmark tree depth exceeds the maximum
   *
   * @example
   * ```typescript
   * for (const bookmark of document.bookmarks()) {
   *   console.log(bookmark.title);
   * }
   * ```
   */
  *bookmarks(): Generator<Bookmark> {
    this.ensureNotDisposed();
    yield* this.#yieldBookmarkChildren(NULL_BOOKMARK);
  }

  *#yieldBookmarkChildren(parent: BookmarkHandle, depth = 0): Generator<Bookmark> {
    if (depth > MAX_BOOKMARK_DEPTH) {
      throw new DocumentError(
        PDFiumErrorCode.DOC_FORMAT_INVALID,
        `Bookmark tree depth exceeds maximum of ${MAX_BOOKMARK_DEPTH}`,
      );
    }

    let current = this.#module._FPDFBookmark_GetFirstChild(this.#documentHandle, parent);

    while (current !== NULL_BOOKMARK) {
      const title = this.#readBookmarkTitle(current);
      const dest = this.#module._FPDFBookmark_GetDest(this.#documentHandle, current);
      const pageIndex =
        dest !== asHandle(0) ? this.#module._FPDFDest_GetDestPageIndex(this.#documentHandle, dest) : undefined;
      const children = [...this.#yieldBookmarkChildren(current, depth + 1)];

      yield { title, pageIndex: pageIndex === -1 ? undefined : pageIndex, children };
      current = this.#module._FPDFBookmark_GetNextSibling(this.#documentHandle, current);
    }
  }

  #readBookmarkTitle(bookmark: BookmarkHandle): string {
    // First call with 0 buffer to get required size (in bytes, including null terminator)
    const requiredBytes = this.#module._FPDFBookmark_GetTitle(bookmark, NULL_PTR, 0);
    if (requiredBytes <= UTF16LE_NULL_TERMINATOR_BYTES) {
      return '';
    }

    using buffer = this.#memory.alloc(requiredBytes);
    this.#module._FPDFBookmark_GetTitle(bookmark, buffer.ptr, requiredBytes);

    // UTF-16LE: 2 bytes per char, subtract null terminator bytes
    const charCount = (requiredBytes - UTF16LE_NULL_TERMINATOR_BYTES) / UTF16LE_BYTES_PER_CHAR;
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

    if (!Number.isSafeInteger(index)) {
      throw new DocumentError(
        PDFiumErrorCode.DOC_FORMAT_INVALID,
        `Attachment index must be a safe integer, got ${index}`,
      );
    }

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
   * Iterate over file attachments lazily.
   *
   * Use this for memory-efficient iteration over attachments.
   *
   * @example
   * ```typescript
   * for (const attachment of document.attachments()) {
   *   console.log(attachment.name);
   * }
   * ```
   */
  *attachments(): Generator<PDFAttachment> {
    this.ensureNotDisposed();
    const count = this.#module._FPDFDoc_GetAttachmentCount(this.#documentHandle);
    for (let i = 0; i < count; i++) {
      const handle = this.#module._FPDFDoc_GetAttachment(this.#documentHandle, i);
      if (handle === NULL_ATTACHMENT) {
        continue;
      }

      const name = this.#readAttachmentName(handle);
      const data = this.#readAttachmentData(handle);
      yield { index: i, name, data };
    }
  }

  /**
   * Get all file attachments in this document.
   *
   * For documents with many attachments, prefer using the `attachments()` generator.
   */
  getAttachments(): PDFAttachment[] {
    return [...this.attachments()];
  }

  #readAttachmentName(handle: AttachmentHandle): string {
    // First call with 0 buffer to get required size (in bytes, including null terminator)
    const requiredBytes = this.#module._FPDFAttachment_GetName(handle, NULL_PTR, 0);
    if (requiredBytes <= UTF16LE_NULL_TERMINATOR_BYTES) {
      return '';
    }

    using buffer = this.#memory.alloc(requiredBytes);
    this.#module._FPDFAttachment_GetName(handle, buffer.ptr, requiredBytes);

    // UTF-16LE: 2 bytes per char, subtract null terminator bytes
    const charCount = (requiredBytes - UTF16LE_NULL_TERMINATOR_BYTES) / UTF16LE_BYTES_PER_CHAR;
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

  // ─────────────────────────────────────────────────────────────────────────
  // Attachment Modification Methods
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Add a new attachment to the document.
   *
   * @param name - The name of the attachment
   * @returns The attachment handle or null if failed
   */
  addAttachment(name: string): AttachmentHandle | null {
    this.ensureNotDisposed();
    const fn = this.#module._FPDFDoc_AddAttachment;
    if (typeof fn !== 'function') {
      return null;
    }

    // Encode name as UTF-16LE with null terminator
    const nameBytes = encodeUTF16LE(name);
    using nameBuffer = this.#memory.allocFrom(nameBytes);
    const handle = fn(this.#documentHandle, nameBuffer.ptr);
    return handle === NULL_ATTACHMENT ? null : handle;
  }

  /**
   * Delete an attachment from the document.
   *
   * @param index - Zero-based index of the attachment to delete
   * @returns True if successful
   */
  deleteAttachment(index: number): boolean {
    this.ensureNotDisposed();
    const fn = this.#module._FPDFDoc_DeleteAttachment;
    if (typeof fn !== 'function') {
      return false;
    }
    return fn(this.#documentHandle, index) !== 0;
  }

  /**
   * Set the file contents of an attachment.
   *
   * @param attachment - The attachment handle
   * @param contents - The file contents
   * @returns True if successful
   */
  setAttachmentFile(attachment: AttachmentHandle, contents: Uint8Array): boolean {
    this.ensureNotDisposed();
    const fn = this.#module._FPDFAttachment_SetFile;
    if (typeof fn !== 'function') {
      return false;
    }

    // Handle empty content case
    if (contents.length === 0) {
      return fn(attachment, this.#documentHandle, NULL_PTR, 0) !== 0;
    }

    using contentBuffer = this.#memory.alloc(contents.length);
    this.#memory.heapU8.set(contents, contentBuffer.ptr);
    return fn(attachment, this.#documentHandle, contentBuffer.ptr, contents.length) !== 0;
  }

  /**
   * Check if an attachment has a specific key.
   *
   * @param attachment - The attachment handle
   * @param key - The key to check
   * @returns True if the key exists
   */
  attachmentHasKey(attachment: AttachmentHandle, key: string): boolean {
    this.ensureNotDisposed();
    const fn = this.#module._FPDFAttachment_HasKey;
    if (typeof fn !== 'function') {
      return false;
    }

    using keyBuffer = this.#memory.allocString(key);
    return fn(attachment, keyBuffer.ptr) !== 0;
  }

  /**
   * Get the value type of an attachment key.
   *
   * @param attachment - The attachment handle
   * @param key - The key to check
   * @returns The value type
   */
  getAttachmentValueType(attachment: AttachmentHandle, key: string): AttachmentValueType {
    this.ensureNotDisposed();
    const fn = this.#module._FPDFAttachment_GetValueType;
    if (typeof fn !== 'function') {
      return AttachmentValueType.Unknown;
    }

    using keyBuffer = this.#memory.allocString(key);
    const result = fn(attachment, keyBuffer.ptr);
    if (result < 0 || result > 8) {
      return AttachmentValueType.Unknown;
    }
    return result as AttachmentValueType;
  }

  /**
   * Get a string value from an attachment.
   *
   * @param attachment - The attachment handle
   * @param key - The key to get
   * @returns The string value or undefined if not found
   */
  getAttachmentStringValue(attachment: AttachmentHandle, key: string): string | undefined {
    this.ensureNotDisposed();
    const fn = this.#module._FPDFAttachment_GetStringValue;
    if (typeof fn !== 'function') {
      return undefined;
    }

    using keyBuffer = this.#memory.allocString(key);

    // First call to get required buffer size
    const requiredBytes = fn(attachment, keyBuffer.ptr, NULL_PTR, 0);
    if (requiredBytes <= UTF16LE_NULL_TERMINATOR_BYTES) {
      return undefined;
    }

    using valueBuffer = this.#memory.alloc(requiredBytes);
    fn(attachment, keyBuffer.ptr, valueBuffer.ptr, requiredBytes);

    // UTF-16LE: 2 bytes per char, subtract null terminator bytes
    const charCount = (requiredBytes - UTF16LE_NULL_TERMINATOR_BYTES) / UTF16LE_BYTES_PER_CHAR;
    return this.#memory.readUTF16LE(valueBuffer.ptr, charCount);
  }

  /**
   * Set a string value on an attachment.
   *
   * @param attachment - The attachment handle
   * @param key - The key to set
   * @param value - The string value
   * @returns True if successful
   */
  setAttachmentStringValue(attachment: AttachmentHandle, key: string, value: string): boolean {
    this.ensureNotDisposed();
    const fn = this.#module._FPDFAttachment_SetStringValue;
    if (typeof fn !== 'function') {
      return false;
    }

    using keyBuffer = this.#memory.allocString(key);
    const valueBytes = encodeUTF16LE(value);
    using valueBuffer = this.#memory.allocFrom(valueBytes);
    return fn(attachment, keyBuffer.ptr, valueBuffer.ptr) !== 0;
  }

  /**
   * Get all standard metadata fields from the document.
   *
   * Returns an object containing all available metadata fields.
   * Fields that are not present in the document will not be included.
   *
   * @example
   * ```typescript
   * const metadata = document.getMetadata();
   * console.log(`Title: ${metadata.title}`);
   * console.log(`Author: ${metadata.author}`);
   * ```
   */
  getMetadata(): DocumentMetadata {
    this.ensureNotDisposed();

    const metadata: DocumentMetadata = {};

    const title = this.getMetaText('Title');
    if (title !== undefined) metadata.title = title;

    const author = this.getMetaText('Author');
    if (author !== undefined) metadata.author = author;

    const subject = this.getMetaText('Subject');
    if (subject !== undefined) metadata.subject = subject;

    const keywords = this.getMetaText('Keywords');
    if (keywords !== undefined) metadata.keywords = keywords;

    const creator = this.getMetaText('Creator');
    if (creator !== undefined) metadata.creator = creator;

    const producer = this.getMetaText('Producer');
    if (producer !== undefined) metadata.producer = producer;

    const creationDate = this.getMetaText('CreationDate');
    if (creationDate !== undefined) metadata.creationDate = creationDate;

    const modificationDate = this.getMetaText('ModDate');
    if (modificationDate !== undefined) metadata.modificationDate = modificationDate;

    return metadata;
  }

  /**
   * Get a specific metadata field by tag name.
   *
   * Standard tags include: Title, Author, Subject, Keywords, Creator,
   * Producer, CreationDate, ModDate.
   *
   * @param tag - The metadata tag name (case-sensitive)
   * @returns The metadata value, or `undefined` if not present
   */
  getMetaText(tag: string): string | undefined {
    this.ensureNotDisposed();

    using tagAlloc = this.#memory.allocString(tag);

    // First call to get required buffer size (in bytes, including null terminator)
    const requiredBytes = this.#module._FPDF_GetMetaText(this.#documentHandle, tagAlloc.ptr, NULL_PTR, 0);

    // No metadata or empty string (null terminator only in UTF-16LE)
    if (requiredBytes <= UTF16LE_NULL_TERMINATOR_BYTES) {
      return undefined;
    }

    using buffer = this.#memory.alloc(requiredBytes);
    this.#module._FPDF_GetMetaText(this.#documentHandle, tagAlloc.ptr, buffer.ptr, requiredBytes);

    // UTF-16LE: 2 bytes per char, subtract null terminator bytes
    const charCount = (requiredBytes - UTF16LE_NULL_TERMINATOR_BYTES) / UTF16LE_BYTES_PER_CHAR;
    const value = this.#memory.readUTF16LE(buffer.ptr, charCount);

    return value.length > 0 ? value : undefined;
  }

  /**
   * Get the PDF file version.
   *
   * Returns the PDF version as an integer (e.g., 14 for PDF 1.4, 17 for PDF 1.7).
   * Returns `undefined` if the version cannot be determined.
   */
  get fileVersion(): number | undefined {
    this.ensureNotDisposed();

    using versionOut = this.#memory.alloc(4);
    const success = this.#module._FPDF_GetFileVersion(this.#documentHandle, versionOut.ptr);

    if (!success) {
      return undefined;
    }

    return this.#memory.readInt32(versionOut.ptr);
  }

  /**
   * Get the document permissions bitmask.
   *
   * Returns the raw permissions value from the document's encryption dictionary.
   * Use bitwise operations with `DocumentPermission` enum to check specific permissions.
   *
   * @example
   * ```typescript
   * const perms = document.permissions;
   * const canPrint = (perms & DocumentPermission.Print) !== 0;
   * ```
   */
  get permissions(): number {
    this.ensureNotDisposed();
    return this.#module._FPDF_GetDocPermissions(this.#documentHandle);
  }

  /**
   * Get the document user permissions bitmask.
   *
   * Similar to `permissions`, but returns the user-level permissions
   * (which may differ from owner permissions for encrypted documents).
   */
  get userPermissions(): number {
    this.ensureNotDisposed();
    return this.#module._FPDF_GetDocUserPermissions(this.#documentHandle);
  }

  /**
   * Get the document's initial page mode.
   *
   * Determines what panel should be displayed when the document is opened.
   */
  get pageMode(): PageMode {
    this.ensureNotDisposed();
    const mode = this.#module._FPDFDoc_GetPageMode(this.#documentHandle);
    // PDFium returns -1 for unknown, map to UseNone
    return mode >= 0 && mode <= 5 ? mode : PageMode.UseNone;
  }

  /**
   * Get the security handler revision.
   *
   * Returns the revision number of the document's security handler,
   * or -1 if the document is not encrypted.
   */
  get securityHandlerRevision(): number {
    this.ensureNotDisposed();
    return this.#module._FPDF_GetSecurityHandlerRevision(this.#documentHandle);
  }

  /**
   * Check if the document has a valid cross-reference table.
   *
   * A valid cross-reference table is required for proper PDF parsing.
   * Documents with damaged cross-reference tables may still open but
   * could have rendering issues.
   */
  hasValidCrossReferenceTable(): boolean {
    this.ensureNotDisposed();
    return this.#module._FPDF_DocumentHasValidCrossReferenceTable(this.#documentHandle) !== 0;
  }

  /**
   * Get trailer end offsets for incremental saves.
   *
   * Returns an array of byte offsets where trailer sections end.
   * Useful for determining save points in incrementally saved documents.
   * Returns an empty array if no trailer ends are found.
   */
  getTrailerEnds(): number[] {
    this.ensureNotDisposed();

    // First call to get count
    const count = this.#module._FPDF_GetTrailerEnds(this.#documentHandle, NULL_PTR, 0);
    if (count <= 0) {
      return [];
    }

    // Allocate buffer for unsigned int array (4 bytes each)
    using buffer = this.#memory.alloc(count * 4);
    const actualCount = this.#module._FPDF_GetTrailerEnds(this.#documentHandle, buffer.ptr, count);

    const result: number[] = [];
    for (let i = 0; i < actualCount; i++) {
      const offset = buffer.ptr + i * 4;
      result.push(this.#memory.readInt32(offset as WASMPointer));
    }

    return result;
  }

  /**
   * Get the label for a specific page.
   *
   * PDF documents can have custom page labels (e.g., "i", "ii", "1", "2").
   * Returns `undefined` if no label is defined for the page.
   *
   * @param pageIndex - Zero-based page index
   */
  getPageLabel(pageIndex: number): string | undefined {
    this.ensureNotDisposed();

    // Note: this method queries PDFium directly each time; results are not cached.
    // Validate page index
    const count = this.#module._FPDF_GetPageCount(this.#documentHandle);
    if (pageIndex < 0 || pageIndex >= count) {
      return undefined;
    }

    // First call to get required buffer size
    const requiredBytes = this.#module._FPDF_GetPageLabel(this.#documentHandle, pageIndex, NULL_PTR, 0);

    // No label or empty (null terminator only in UTF-16LE)
    if (requiredBytes <= UTF16LE_NULL_TERMINATOR_BYTES) {
      return undefined;
    }

    using buffer = this.#memory.alloc(requiredBytes);
    this.#module._FPDF_GetPageLabel(this.#documentHandle, pageIndex, buffer.ptr, requiredBytes);

    // UTF-16LE: 2 bytes per char, subtract null terminator bytes
    const charCount = (requiredBytes - UTF16LE_NULL_TERMINATOR_BYTES) / UTF16LE_BYTES_PER_CHAR;
    const label = this.#memory.readUTF16LE(buffer.ptr, charCount);

    return label.length > 0 ? label : undefined;
  }

  /**
   * Check if the document is tagged (accessible).
   *
   * Tagged PDFs contain structure information for accessibility tools.
   * Returns `true` if the document's catalog indicates it is tagged.
   */
  isTagged(): boolean {
    this.ensureNotDisposed();
    return this.#module._FPDFCatalog_IsTagged(this.#documentHandle) !== 0;
  }

  // ============================================================================
  // Viewer Preferences
  // ============================================================================

  /**
   * Get the viewer preferences for this document.
   *
   * Returns settings that control how a PDF viewer should display and print
   * the document.
   *
   * @returns The viewer preferences
   */
  getViewerPreferences(): ViewerPreferences {
    this.ensureNotDisposed();

    const printScalingFn = this.#module._FPDF_VIEWERREF_GetPrintScaling;
    const numCopiesFn = this.#module._FPDF_VIEWERREF_GetNumCopies;
    const duplexFn = this.#module._FPDF_VIEWERREF_GetDuplex;

    const printScaling = typeof printScalingFn === 'function' ? printScalingFn(this.#documentHandle) !== 0 : true;

    const numCopies = typeof numCopiesFn === 'function' ? numCopiesFn(this.#documentHandle) : 1;

    const duplexValue = typeof duplexFn === 'function' ? duplexFn(this.#documentHandle) : 0;
    const duplexMode = duplexValue >= 0 && duplexValue <= 3 ? (duplexValue as DuplexMode) : DuplexMode.Undefined;

    return {
      printScaling,
      numCopies: numCopies > 0 ? numCopies : 1,
      duplexMode,
    };
  }

  /**
   * Check if print scaling should be applied.
   *
   * @returns True if print scaling is enabled, false otherwise
   */
  get printScaling(): boolean {
    this.ensureNotDisposed();

    const fn = this.#module._FPDF_VIEWERREF_GetPrintScaling;
    if (typeof fn !== 'function') {
      return true; // Default is to use print scaling
    }

    return fn(this.#documentHandle) !== 0;
  }

  /**
   * Get the number of copies to print by default.
   *
   * @returns The default number of copies
   */
  get numCopies(): number {
    this.ensureNotDisposed();

    const fn = this.#module._FPDF_VIEWERREF_GetNumCopies;
    if (typeof fn !== 'function') {
      return 1;
    }

    const copies = fn(this.#documentHandle);
    return copies > 0 ? copies : 1;
  }

  /**
   * Get the duplex printing mode preference.
   *
   * @returns The duplex mode setting
   */
  get duplexMode(): DuplexMode {
    this.ensureNotDisposed();

    const fn = this.#module._FPDF_VIEWERREF_GetDuplex;
    if (typeof fn !== 'function') {
      return DuplexMode.Undefined;
    }

    const value = fn(this.#documentHandle);
    return value >= 0 && value <= 3 ? (value as DuplexMode) : DuplexMode.Undefined;
  }

  /**
   * Get the print page ranges for this document.
   *
   * @returns Array of page indices to print, or undefined if all pages
   */
  getPrintPageRanges(): number[] | undefined {
    this.ensureNotDisposed();

    const getPageRangeFn = this.#module._FPDF_VIEWERREF_GetPrintPageRange;
    const getCountFn = this.#module._FPDF_VIEWERREF_GetPrintPageRangeCount;
    const getElementFn = this.#module._FPDF_VIEWERREF_GetPrintPageRangeElement;

    if (
      typeof getPageRangeFn !== 'function' ||
      typeof getCountFn !== 'function' ||
      typeof getElementFn !== 'function'
    ) {
      return undefined;
    }

    const pageRange = getPageRangeFn(this.#documentHandle);
    if (pageRange === 0) {
      return undefined;
    }

    const count = getCountFn(pageRange);
    if (count <= 0) {
      return undefined;
    }

    const pages: number[] = [];
    for (let i = 0; i < count; i++) {
      const element = getElementFn(pageRange, i);
      if (element >= 0) {
        pages.push(element);
      }
    }

    return pages.length > 0 ? pages : undefined;
  }

  /**
   * Get a viewer preference value by name.
   *
   * @param key - The preference key name
   * @returns The preference value as a string, or undefined if not found
   */
  getViewerPreference(key: string): string | undefined {
    this.ensureNotDisposed();

    const fn = this.#module._FPDF_VIEWERREF_GetName;
    if (typeof fn !== 'function') {
      return undefined;
    }

    // Encode key as ASCII
    const keyBytes = textEncoder.encode(`${key}\0`);
    using keyBuffer = this.#memory.alloc(keyBytes.length);
    this.#memory.heapU8.set(keyBytes, keyBuffer.ptr);

    // First call to get required buffer size
    const requiredBytes = fn(this.#documentHandle, keyBuffer.ptr, NULL_PTR, 0);
    if (requiredBytes <= 0) {
      return undefined;
    }

    // Allocate buffer and get value
    using valueBuffer = this.#memory.alloc(requiredBytes);
    const actualBytes = fn(this.#documentHandle, keyBuffer.ptr, valueBuffer.ptr, requiredBytes);

    if (actualBytes <= 0) {
      return undefined;
    }

    // Decode UTF-8 string
    const bytes = this.#memory.heapU8.subarray(valueBuffer.ptr, valueBuffer.ptr + actualBytes - 1);
    return textDecoder.decode(bytes);
  }

  // ============================================================================
  // Named Destinations
  // ============================================================================

  /**
   * Get the count of named destinations in this document.
   *
   * @returns The number of named destinations
   */
  get namedDestinationCount(): number {
    this.ensureNotDisposed();

    const fn = this.#module._FPDF_CountNamedDests;
    if (typeof fn !== 'function') {
      return 0;
    }

    return fn(this.#documentHandle);
  }

  /**
   * Get a named destination by its name.
   *
   * @param name - The destination name
   * @returns The destination with page index, or undefined if not found
   */
  getNamedDestinationByName(name: string): NamedDestination | undefined {
    this.ensureNotDisposed();

    const fn = this.#module._FPDF_GetNamedDestByName;
    const getPageIndexFn = this.#module._FPDFDest_GetDestPageIndex;
    if (typeof fn !== 'function' || typeof getPageIndexFn !== 'function') {
      return undefined;
    }

    // Encode name as ASCII
    const nameBytes = textEncoder.encode(`${name}\0`);
    using nameBuffer = this.#memory.alloc(nameBytes.length);
    this.#memory.heapU8.set(nameBytes, nameBuffer.ptr);

    const dest = fn(this.#documentHandle, nameBuffer.ptr);
    if (dest === NULL_DEST || dest === 0) {
      return undefined;
    }

    const pageIndex = getPageIndexFn(this.#documentHandle, dest);
    return {
      name,
      pageIndex: pageIndex >= 0 ? pageIndex : 0,
    };
  }

  /**
   * Get all named destinations in this document.
   *
   * @returns Array of named destinations
   */
  getNamedDestinations(): NamedDestination[] {
    this.ensureNotDisposed();

    const countFn = this.#module._FPDF_CountNamedDests;
    const getDestFn = this.#module._FPDF_GetNamedDest;
    const getPageIndexFn = this.#module._FPDFDest_GetDestPageIndex;

    if (typeof countFn !== 'function' || typeof getDestFn !== 'function' || typeof getPageIndexFn !== 'function') {
      return [];
    }

    const count = countFn(this.#documentHandle);
    if (count <= 0) {
      return [];
    }

    const destinations: NamedDestination[] = [];

    for (let i = 0; i < count; i++) {
      // First call: query required buffer size
      using buflenPtr = this.#memory.alloc(4);
      const int32View = new Int32Array(this.#memory.heapU8.buffer, buflenPtr.ptr, 1);
      int32View[0] = 0;

      getDestFn(this.#documentHandle, i, NULL_PTR, buflenPtr.ptr);
      const requiredLen = int32View[0] ?? 0;
      if (requiredLen <= 0) {
        continue;
      }

      // Second call: read the name into a correctly-sized buffer
      int32View[0] = requiredLen;
      using nameBuffer = this.#memory.alloc(requiredLen);
      const dest = getDestFn(this.#documentHandle, i, nameBuffer.ptr, buflenPtr.ptr);

      if (dest !== NULL_DEST && dest !== 0) {
        const actualLen = int32View[0] ?? 0;
        if (actualLen > 0) {
          // UTF-16LE encoded name
          const bytes = this.#memory.heapU8.subarray(
            nameBuffer.ptr,
            nameBuffer.ptr + actualLen - UTF16LE_NULL_TERMINATOR_BYTES,
          );
          const name = utf16leDecoder.decode(bytes);
          const pageIndex = getPageIndexFn(this.#documentHandle, dest);

          destinations.push({
            name,
            pageIndex: pageIndex >= 0 ? pageIndex : 0,
          });
        }
      }
    }

    return destinations;
  }

  // ============================================================================
  // JavaScript Inspection
  // ============================================================================

  /**
   * Get the count of JavaScript actions in this document.
   *
   * JavaScript actions can be triggered by document events, page events,
   * or user interactions like button clicks.
   *
   * @returns The number of JavaScript actions
   */
  get javaScriptActionCount(): number {
    this.ensureNotDisposed();

    const fn = this.#module._FPDFDoc_GetJavaScriptActionCount;
    if (typeof fn !== 'function') {
      return 0;
    }

    return fn(this.#documentHandle);
  }

  /**
   * Check if this document contains any JavaScript.
   *
   * @returns True if the document contains JavaScript actions
   */
  hasJavaScript(): boolean {
    return this.javaScriptActionCount > 0;
  }

  /**
   * Get a JavaScript action by index.
   *
   * @param index - Zero-based index of the JavaScript action
   * @returns The JavaScript action with name and script, or undefined
   */
  getJavaScriptAction(index: number): JavaScriptAction | undefined {
    this.ensureNotDisposed();

    const getActionFn = this.#module._FPDFDoc_GetJavaScriptAction;
    const getNameFn = this.#module._FPDFJavaScriptAction_GetName;
    const getScriptFn = this.#module._FPDFJavaScriptAction_GetScript;
    const closeFn = this.#module._FPDFJavaScriptAction_Close;

    if (
      typeof getActionFn !== 'function' ||
      typeof getNameFn !== 'function' ||
      typeof getScriptFn !== 'function' ||
      typeof closeFn !== 'function'
    ) {
      return undefined;
    }

    const handle = getActionFn(this.#documentHandle, index);
    if (handle === NULL_JAVASCRIPT || handle === 0) {
      return undefined;
    }

    try {
      // Get name
      const nameSize = getNameFn(handle, NULL_PTR, 0);
      let name = '';
      if (nameSize > 0) {
        using nameBuffer = this.#memory.alloc(nameSize);
        getNameFn(handle, nameBuffer.ptr, nameSize);
        // UTF-16LE encoded
        const nameBytes = this.#memory.heapU8.subarray(
          nameBuffer.ptr,
          nameBuffer.ptr + nameSize - UTF16LE_NULL_TERMINATOR_BYTES,
        );
        name = utf16leDecoder.decode(nameBytes);
      }

      // Get script
      const scriptSize = getScriptFn(handle, NULL_PTR, 0);
      let script = '';
      if (scriptSize > 0) {
        using scriptBuffer = this.#memory.alloc(scriptSize);
        getScriptFn(handle, scriptBuffer.ptr, scriptSize);
        // UTF-16LE encoded
        const scriptBytes = this.#memory.heapU8.subarray(
          scriptBuffer.ptr,
          scriptBuffer.ptr + scriptSize - UTF16LE_NULL_TERMINATOR_BYTES,
        );
        script = utf16leDecoder.decode(scriptBytes);
      }

      return { name, script };
    } finally {
      closeFn(handle);
    }
  }

  /**
   * Get all JavaScript actions in this document.
   *
   * @returns Array of JavaScript actions with names and scripts
   */
  getJavaScriptActions(): JavaScriptAction[] {
    this.ensureNotDisposed();

    const count = this.javaScriptActionCount;
    if (count <= 0) {
      return [];
    }

    const actions: JavaScriptAction[] = [];
    for (let i = 0; i < count; i++) {
      const action = this.getJavaScriptAction(i);
      if (action !== undefined) {
        actions.push(action);
      }
    }

    return actions;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Digital Signature Methods
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Get the number of digital signatures in this document.
   */
  get signatureCount(): number {
    this.ensureNotDisposed();
    const fn = this.#module._FPDF_GetSignatureCount;
    if (typeof fn !== 'function') {
      return 0;
    }
    return fn(this.#documentHandle);
  }

  /**
   * Check if this document has digital signatures.
   */
  hasSignatures(): boolean {
    return this.signatureCount > 0;
  }

  /**
   * Get a digital signature by index.
   *
   * @param index - Zero-based signature index
   * @returns Signature information, or undefined if not found
   */
  getSignature(index: number): PDFSignature | undefined {
    this.ensureNotDisposed();

    if (!Number.isSafeInteger(index) || index < 0) {
      return undefined;
    }

    const count = this.signatureCount;
    if (index >= count) {
      return undefined;
    }

    const fn = this.#module._FPDF_GetSignatureObject;
    if (typeof fn !== 'function') {
      return undefined;
    }

    const handle = fn(this.#documentHandle, index);
    if (handle === NULL_SIGNATURE) {
      return undefined;
    }

    // Note: Signature handles don't need to be closed in PDFium
    return this.#readSignature(handle, index);
  }

  /**
   * Iterate over digital signatures lazily.
   *
   * Use this for memory-efficient iteration over signatures.
   *
   * @example
   * ```typescript
   * for (const signature of document.signatures()) {
   *   console.log(signature.subFilter);
   * }
   * ```
   */
  *signatures(): Generator<PDFSignature> {
    this.ensureNotDisposed();
    const count = this.signatureCount;
    for (let i = 0; i < count; i++) {
      const sig = this.getSignature(i);
      if (sig !== undefined) {
        yield sig;
      }
    }
  }

  /**
   * Get all digital signatures in this document.
   *
   * Returns metadata only (reason, time, sub-filter, contents).
   * Signature verification is not supported by PDFium.
   *
   * For documents with many signatures, prefer using the `signatures()` generator.
   */
  getSignatures(): PDFSignature[] {
    return [...this.signatures()];
  }

  #readSignature(handle: SignatureHandle, index: number): PDFSignature {
    const contents = this.#getSignatureContents(handle);
    const byteRange = this.#getSignatureByteRange(handle);
    const subFilter = this.#getSignatureSubFilter(handle);
    const reason = this.#getSignatureReason(handle);
    const time = this.#getSignatureTime(handle);
    const docMDPPermission = this.#getSignatureDocMDPPermission(handle);

    return {
      index,
      docMDPPermission,
      ...(contents !== undefined ? { contents } : {}),
      ...(byteRange !== undefined ? { byteRange } : {}),
      ...(subFilter !== undefined ? { subFilter } : {}),
      ...(reason !== undefined ? { reason } : {}),
      ...(time !== undefined ? { time } : {}),
    };
  }

  #getSignatureContents(handle: SignatureHandle): Uint8Array | undefined {
    const fn = this.#module._FPDFSignatureObj_GetContents;
    if (typeof fn !== 'function') {
      return undefined;
    }

    // First call to get required size
    const requiredSize = fn(handle, NULL_PTR, 0);
    if (requiredSize <= 0) {
      return undefined;
    }

    using buffer = this.#memory.alloc(requiredSize);
    const written = fn(handle, buffer.ptr, requiredSize);
    if (written <= 0) {
      return undefined;
    }

    // Copy the contents
    return this.#memory.heapU8.slice(buffer.ptr, buffer.ptr + written);
  }

  #getSignatureByteRange(handle: SignatureHandle): number[] | undefined {
    const fn = this.#module._FPDFSignatureObj_GetByteRange;
    if (typeof fn !== 'function') {
      return undefined;
    }

    // First call to get count (returns number of elements, not bytes)
    const count = fn(handle, NULL_PTR, 0);
    if (count <= 0) {
      return undefined;
    }

    // Allocate buffer for int32 array
    using buffer = this.#memory.alloc(count * 4);
    const written = fn(handle, buffer.ptr, count);
    if (written <= 0) {
      return undefined;
    }

    // Read the integers
    const intView = new Int32Array(this.#memory.heapU8.buffer, buffer.ptr, written);
    return Array.from(intView);
  }

  #getSignatureSubFilter(handle: SignatureHandle): string | undefined {
    const fn = this.#module._FPDFSignatureObj_GetSubFilter;
    if (typeof fn !== 'function') {
      return undefined;
    }

    // First call to get required size
    const requiredSize = fn(handle, NULL_PTR, 0);
    if (requiredSize <= 0) {
      return undefined;
    }

    using buffer = this.#memory.alloc(requiredSize);
    const written = fn(handle, buffer.ptr, requiredSize);
    if (written <= 0) {
      return undefined;
    }

    // ASCII string, null-terminated
    const dataView = this.#memory.heapU8.subarray(buffer.ptr, buffer.ptr + written - 1);
    return asciiDecoder.decode(dataView);
  }

  #getSignatureReason(handle: SignatureHandle): string | undefined {
    const fn = this.#module._FPDFSignatureObj_GetReason;
    if (typeof fn !== 'function') {
      return undefined;
    }

    // First call to get required size
    const requiredSize = fn(handle, NULL_PTR, 0);
    if (requiredSize <= UTF16LE_NULL_TERMINATOR_BYTES) {
      return undefined;
    }

    using buffer = this.#memory.alloc(requiredSize);
    const written = fn(handle, buffer.ptr, requiredSize);
    if (written <= UTF16LE_NULL_TERMINATOR_BYTES) {
      return undefined;
    }

    // UTF-16LE string
    const dataView = this.#memory.heapU8.subarray(buffer.ptr, buffer.ptr + written - UTF16LE_NULL_TERMINATOR_BYTES);
    return utf16leDecoder.decode(dataView);
  }

  #getSignatureTime(handle: SignatureHandle): string | undefined {
    const fn = this.#module._FPDFSignatureObj_GetTime;
    if (typeof fn !== 'function') {
      return undefined;
    }

    // First call to get required size
    const requiredSize = fn(handle, NULL_PTR, 0);
    if (requiredSize <= 0) {
      return undefined;
    }

    using buffer = this.#memory.alloc(requiredSize);
    const written = fn(handle, buffer.ptr, requiredSize);
    if (written <= 0) {
      return undefined;
    }

    // ASCII string, null-terminated
    const dataView = this.#memory.heapU8.subarray(buffer.ptr, buffer.ptr + written - 1);
    return asciiDecoder.decode(dataView);
  }

  #getSignatureDocMDPPermission(handle: SignatureHandle): DocMDPPermission {
    const fn = this.#module._FPDFSignatureObj_GetDocMDPPermission;
    if (typeof fn !== 'function') {
      return DocMDPPermission.None;
    }
    const perm = fn(handle);
    if (perm >= 0 && perm <= 3) {
      return perm as DocMDPPermission;
    }
    return DocMDPPermission.None;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Form Methods
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Get the form type of this document.
   *
   * Returns what type of interactive form (if any) the document contains.
   */
  get formType(): FormType {
    this.ensureNotDisposed();
    const fn = this.#module._FPDF_GetFormType;
    if (typeof fn !== 'function') {
      return FormType.None;
    }
    const type = fn(this.#documentHandle);
    if (type >= 0 && type <= 3) {
      return type as FormType;
    }
    return FormType.None;
  }

  /**
   * Check if this document has an interactive form.
   */
  hasForm(): boolean {
    return this.formType !== FormType.None;
  }

  /**
   * Check if this document uses AcroForm (standard PDF forms).
   */
  hasAcroForm(): boolean {
    return this.formType === FormType.AcroForm;
  }

  /**
   * Check if this document uses XFA forms.
   *
   * Note: XFA forms have limited support in PDFium.
   */
  hasXFAForm(): boolean {
    const type = this.formType;
    return type === FormType.XFAFull || type === FormType.XFAForeground;
  }

  /**
   * Force release of keyboard focus from any form field.
   *
   * @returns True if focus was successfully released
   */
  killFormFocus(): boolean {
    this.ensureNotDisposed();
    if (this.#formHandle === NULL_FORM) {
      return false;
    }
    const fn = this.#module._FORM_ForceToKillFocus;
    if (typeof fn !== 'function') {
      return false;
    }
    return fn(this.#formHandle) !== 0;
  }

  /**
   * Set the highlight colour for form fields.
   *
   * @param fieldType - Form field type to highlight (0 for all)
   * @param colour - ARGB colour value
   */
  setFormFieldHighlightColour(fieldType: number, colour: number): void {
    this.ensureNotDisposed();
    if (this.#formHandle === NULL_FORM) {
      return;
    }
    const fn = this.#module._FPDF_SetFormFieldHighlightColor;
    if (typeof fn !== 'function') {
      return;
    }
    fn(this.#formHandle, fieldType, colour);
  }

  /**
   * Set the highlight alpha for form fields.
   *
   * @param alpha - Alpha value (0-255)
   */
  setFormFieldHighlightAlpha(alpha: number): void {
    this.ensureNotDisposed();
    if (this.#formHandle === NULL_FORM) {
      return;
    }
    const fn = this.#module._FPDF_SetFormFieldHighlightAlpha;
    if (typeof fn !== 'function') {
      return;
    }
    fn(this.#formHandle, alpha);
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
   * Internal access for testing and advanced usage.
   *
   * @internal
   */
  get [INTERNAL](): { handle: DocumentHandle; formHandle: FormHandle } {
    this.ensureNotDisposed();
    return { handle: this.#documentHandle, formHandle: this.#formHandle };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Page Import/Merge Methods
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Import pages from another document.
   *
   * @param source - The source document to import pages from
   * @param options - Import options (page range, insert position)
   * @throws {DocumentError} If page import fails or the function is unavailable
   *
   * @example
   * ```typescript
   * // Import all pages from source
   * document.importPages(sourceDoc);
   *
   * // Import specific pages
   * document.importPages(sourceDoc, { pageRange: '1-3,5' });
   *
   * // Insert pages at beginning
   * document.importPages(sourceDoc, { pageRange: '1', insertIndex: 0 });
   * ```
   */
  importPages(source: PDFiumDocument, options: ImportPagesOptions = {}): void {
    this.ensureNotDisposed();
    source.ensureNotDisposed();

    const fn = this.#module._FPDF_ImportPages;
    if (typeof fn !== 'function') {
      throw new DocumentError(PDFiumErrorCode.DOC_LOAD_UNKNOWN, 'FPDF_ImportPages is not available in this WASM build');
    }

    const insertIndex = options.insertIndex ?? this.pageCount;
    const sourceHandle = source[INTERNAL].handle;

    let result: number;
    if (options.pageRange !== undefined && options.pageRange !== '') {
      // Import specific pages by range string
      using rangeBuffer = this.#memory.allocString(options.pageRange);
      result = fn(this.#documentHandle, sourceHandle, rangeBuffer.ptr, insertIndex);
    } else {
      // Import all pages (null page range)
      result = fn(this.#documentHandle, sourceHandle, NULL_PTR, insertIndex);
    }

    if (result === 0) {
      throw new DocumentError(
        PDFiumErrorCode.DOC_FORMAT_INVALID,
        `Failed to import pages${options.pageRange ? ` (range: ${options.pageRange})` : ''}`,
      );
    }
  }

  /**
   * Import pages by their indices.
   *
   * @param source - The source document to import pages from
   * @param pageIndices - Zero-based page indices to import
   * @param insertIndex - Zero-based index where pages should be inserted (default: end)
   * @throws {DocumentError} If page import fails or the function is unavailable
   *
   * @example
   * ```typescript
   * // Import pages 0, 2, and 4 from source
   * document.importPagesByIndex(sourceDoc, [0, 2, 4]);
   *
   * // Insert at beginning
   * document.importPagesByIndex(sourceDoc, [0, 1], 0);
   * ```
   */
  importPagesByIndex(source: PDFiumDocument, pageIndices: number[], insertIndex?: number): void {
    this.ensureNotDisposed();
    source.ensureNotDisposed();

    const fn = this.#module._FPDF_ImportPagesByIndex;
    if (typeof fn !== 'function') {
      throw new DocumentError(
        PDFiumErrorCode.DOC_LOAD_UNKNOWN,
        'FPDF_ImportPagesByIndex is not available in this WASM build',
      );
    }

    if (pageIndices.length === 0) {
      return; // Nothing to import
    }

    const targetInsertIndex = insertIndex ?? this.pageCount;
    const sourceHandle = source[INTERNAL].handle;

    // Allocate array for page indices
    using indicesBuffer = this.#memory.alloc(pageIndices.length * 4);
    const intView = new Int32Array(this.#memory.heapU8.buffer, indicesBuffer.ptr, pageIndices.length);
    for (let i = 0; i < pageIndices.length; i++) {
      intView[i] = pageIndices[i] ?? 0;
    }

    const result = fn(this.#documentHandle, sourceHandle, indicesBuffer.ptr, pageIndices.length, targetInsertIndex);
    if (result === 0) {
      throw new DocumentError(
        PDFiumErrorCode.DOC_FORMAT_INVALID,
        `Failed to import pages by index (indices: [${pageIndices.join(', ')}])`,
      );
    }
  }

  /**
   * Copy viewer preferences from another document.
   *
   * Copies settings like print scaling, duplex mode, and display preferences.
   *
   * @param source - The source document to copy preferences from
   * @returns True if preferences were successfully copied
   */
  copyViewerPreferences(source: PDFiumDocument): boolean {
    this.ensureNotDisposed();
    source.ensureNotDisposed();

    const fn = this.#module._FPDF_CopyViewerPreferences;
    if (typeof fn !== 'function') {
      return false;
    }

    const sourceHandle = source[INTERNAL].handle;
    return fn(this.#documentHandle, sourceHandle) !== 0;
  }

  /**
   * Create a new document with N-up layout (multiple source pages per output page).
   *
   * This is useful for creating print layouts where multiple pages appear
   * on each sheet (e.g., 2-up, 4-up, 9-up layouts).
   *
   * Note: The caller is responsible for disposing the returned document.
   *
   * @param options - N-up layout configuration
   * @returns A new document with the N-up layout, or undefined if failed
   *
   * @example
   * ```typescript
   * // Create 2-up layout (2 pages side by side)
   * using nupDoc = document.createNUpDocument({
   *   outputWidth: 842,  // A4 landscape width
   *   outputHeight: 595, // A4 landscape height
   *   pagesPerRow: 2,
   *   pagesPerColumn: 1,
   * });
   * ```
   */
  createNUpDocument(options: NUpLayoutOptions): PDFiumDocument | undefined {
    this.ensureNotDisposed();

    const fn = this.#module._FPDF_ImportNPagesToOne;
    if (typeof fn !== 'function') {
      return undefined;
    }

    const newDocHandle = fn(
      this.#documentHandle,
      options.outputWidth,
      options.outputHeight,
      options.pagesPerRow,
      options.pagesPerColumn,
    );

    if (newDocHandle === asHandle<DocumentHandle>(0)) {
      return undefined;
    }

    // The N-up document doesn't need the original data buffer
    // Create with NULL_PTR for dataPtr since it has no associated buffer
    return new PDFiumDocument(this.#module, this.#memory, newDocHandle, NULL_PTR, this.#limits);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Form Action Methods
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Execute a document-level action.
   *
   * This triggers JavaScript or other actions associated with document lifecycle events.
   *
   * @param actionType - The document action type to execute
   *
   * @example
   * ```typescript
   * // Execute before-save actions
   * document.executeDocumentAction(DocumentActionType.WillSave);
   * ```
   */
  executeDocumentAction(actionType: DocumentActionType): void {
    this.ensureNotDisposed();
    if (this.#formHandle === NULL_FORM) {
      return;
    }

    const fn = this.#module._FORM_DoDocumentAAction;
    if (typeof fn === 'function') {
      fn(this.#formHandle, actionType);
    }
  }

  /**
   * Execute document-level JavaScript actions.
   *
   * This triggers any JavaScript actions that are set to run at document level.
   */
  executeDocumentJSAction(): void {
    this.ensureNotDisposed();
    if (this.#formHandle === NULL_FORM) {
      return;
    }

    const fn = this.#module._FORM_DoDocumentJSAction;
    if (typeof fn === 'function') {
      fn(this.#formHandle);
    }
  }

  /**
   * Execute the document open action.
   *
   * This triggers any action set to run when the document is opened.
   * Should be called after the document is fully loaded.
   */
  executeDocumentOpenAction(): void {
    this.ensureNotDisposed();
    if (this.#formHandle === NULL_FORM) {
      return;
    }

    const fn = this.#module._FORM_DoDocumentOpenAction;
    if (typeof fn === 'function') {
      fn(this.#formHandle);
    }
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
