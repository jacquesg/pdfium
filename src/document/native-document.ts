/**
 * Native PDFium document backed by the native backend.
 *
 * Provides the core document operations (page count, page access, text, render)
 * without requiring the WASM module.
 *
 * @module document/native-document
 */

import type { BackendBookmark, PDFiumBackend } from '../backend/types.js';
import { Disposable } from '../core/disposable.js';
import { DocumentError, PDFiumErrorCode } from '../core/errors.js';
import {
  type Bookmark,
  DEFAULT_LIMITS,
  DocMDPPermission,
  type DocumentMetadata,
  type ImportPagesOptions,
  type NUpLayoutOptions,
  PageMode,
  type PDFAttachment,
  type PDFiumLimits,
  type PDFSignature,
  SaveFlags,
  type SaveOptions,
} from '../core/types.js';
import { NativePDFiumPage } from './native-page.js';

/**
 * A PDF document backed by the native PDFium addon.
 *
 * Supports core operations: page count, page access, text extraction,
 * rendering, bookmarks, signatures, attachments, and import/export.
 */
export class NativePDFiumDocument extends Disposable {
  readonly #backend: PDFiumBackend;
  readonly #docHandle: number;
  readonly #limits: Readonly<Required<PDFiumLimits>>;
  readonly #pages = new Set<NativePDFiumPage>();

  readonly #deregister: ((doc: NativePDFiumDocument) => void) | undefined;

  /** @internal */
  constructor(
    backend: PDFiumBackend,
    docHandle: number,
    limits?: PDFiumLimits,
    deregister?: (doc: NativePDFiumDocument) => void,
  ) {
    super('NativePDFiumDocument', PDFiumErrorCode.DOC_ALREADY_CLOSED);
    this.#backend = backend;
    this.#docHandle = docHandle;
    this.#deregister = deregister;
    this.#limits = {
      maxDocumentSize: limits?.maxDocumentSize ?? DEFAULT_LIMITS.maxDocumentSize,
      maxRenderDimension: limits?.maxRenderDimension ?? DEFAULT_LIMITS.maxRenderDimension,
      maxTextCharCount: limits?.maxTextCharCount ?? DEFAULT_LIMITS.maxTextCharCount,
    };

    this.setFinalizerCleanup(() => {
      this.#releaseNative();
    });
  }

  /** Get the number of pages in this document. */
  get pageCount(): number {
    this.ensureNotDisposed();
    return this.#backend.getPageCount(this.#docHandle);
  }

  /**
   * Load a specific page from the document.
   *
   * @param pageIndex - Zero-based page index
   * @returns The loaded page
   */
  getPage(pageIndex: number): NativePDFiumPage {
    this.ensureNotDisposed();

    const count = this.#backend.getPageCount(this.#docHandle);
    if (pageIndex < 0 || pageIndex >= count) {
      throw new DocumentError(
        PDFiumErrorCode.PAGE_INDEX_OUT_OF_RANGE,
        `Page index ${pageIndex} is out of range (0-${count - 1})`,
      );
    }

    const pageHandle = this.#backend.loadPage(this.#docHandle, pageIndex);
    if (pageHandle === 0) {
      throw new DocumentError(PDFiumErrorCode.PAGE_LOAD_FAILED, `Failed to load page ${pageIndex}`);
    }

    const page = new NativePDFiumPage(this.#backend, pageHandle, this.#docHandle, pageIndex, this.#limits, (p) =>
      this.#pages.delete(p),
    );
    this.#pages.add(page);
    return page;
  }

  /**
   * Iterate over all pages in the document.
   *
   * Each page is yielded and must be disposed by the caller.
   */
  *pages(): Generator<NativePDFiumPage> {
    const count = this.pageCount;
    for (let i = 0; i < count; i++) {
      yield this.getPage(i);
    }
  }

  // ── Metadata ──────────────────────────────────────────────────────────

  /** Get all standard metadata fields. */
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

  /** Get a specific metadata field by tag name. */
  getMetaText(tag: string): string | undefined {
    this.ensureNotDisposed();
    return this.#backend.getMetaText(this.#docHandle, tag) ?? undefined;
  }

  /** Get the PDF file version (e.g. 14 for PDF 1.4). */
  get fileVersion(): number | undefined {
    this.ensureNotDisposed();
    return this.#backend.getFileVersion(this.#docHandle) ?? undefined;
  }

  /** Get the document permissions bitmask. */
  get permissions(): number {
    this.ensureNotDisposed();
    return this.#backend.getDocPermissions(this.#docHandle);
  }

  /** Get the document user permissions bitmask. */
  get userPermissions(): number {
    this.ensureNotDisposed();
    return this.#backend.getDocUserPermissions(this.#docHandle);
  }

  /** Get the document's initial page mode. */
  get pageMode(): PageMode {
    this.ensureNotDisposed();
    const mode = this.#backend.getPageMode(this.#docHandle);
    return mode >= 0 && mode <= 5 ? mode : PageMode.UseNone;
  }

  /** Get the security handler revision, or -1 if unencrypted. */
  get securityHandlerRevision(): number {
    this.ensureNotDisposed();
    return this.#backend.getSecurityHandlerRevision(this.#docHandle);
  }

  /** Check if the document is tagged (accessible). */
  isTagged(): boolean {
    this.ensureNotDisposed();
    return this.#backend.isTagged(this.#docHandle);
  }

  /** Get the label for a specific page. */
  getPageLabel(pageIndex: number): string | undefined {
    this.ensureNotDisposed();
    return this.#backend.getPageLabel(this.#docHandle, pageIndex) ?? undefined;
  }

  // ── Bookmarks ──────────────────────────────────────────────────────────

  /**
   * Get the bookmark (outline) tree for this document.
   *
   * Returns an array of top-level bookmarks, each with nested children.
   * Returns an empty array if the document has no bookmarks.
   *
   * For large bookmark trees, prefer the lazy {@link bookmarks} generator.
   */
  getBookmarks(): Bookmark[] {
    this.ensureNotDisposed();
    const raw = this.#backend.getBookmarks(this.#docHandle);
    return raw.map((b) => this.#toBookmark(b));
  }

  /**
   * Iterate over top-level bookmarks lazily.
   *
   * Each yielded bookmark includes its full subtree of children (eagerly loaded).
   * Use this to avoid building the entire bookmark array up-front.
   */
  *bookmarks(): Generator<Bookmark> {
    this.ensureNotDisposed();
    const raw = this.#backend.getBookmarks(this.#docHandle);
    for (const b of raw) {
      yield this.#toBookmark(b);
    }
  }

  #toBookmark(raw: BackendBookmark): Bookmark {
    return {
      title: raw.title,
      pageIndex: raw.pageIndex === -1 ? undefined : raw.pageIndex,
      children: raw.children.map((c) => this.#toBookmark(c)),
    };
  }

  // ── Signatures ────────────────────────────────────────────────────────

  /** Get the number of digital signatures in this document. */
  get signatureCount(): number {
    this.ensureNotDisposed();
    return this.#backend.getSignatureCount(this.#docHandle);
  }

  /** Check if this document has digital signatures. */
  hasSignatures(): boolean {
    return this.signatureCount > 0;
  }

  /** Get a digital signature by index. */
  getSignature(index: number): PDFSignature | undefined {
    this.ensureNotDisposed();

    if (!Number.isSafeInteger(index) || index < 0 || index >= this.signatureCount) {
      return undefined;
    }

    const raw = this.#backend.getSignature(this.#docHandle, index);
    if (raw === null) {
      return undefined;
    }

    const perm = raw.docMDPPermission;
    const docMDPPermission = perm >= 0 && perm <= 3 ? (perm as DocMDPPermission) : DocMDPPermission.None;

    return {
      index,
      docMDPPermission,
      ...(raw.contents !== undefined ? { contents: raw.contents } : {}),
      ...(raw.byteRange !== undefined ? { byteRange: raw.byteRange } : {}),
      ...(raw.subFilter !== undefined ? { subFilter: raw.subFilter } : {}),
      ...(raw.reason !== undefined ? { reason: raw.reason } : {}),
      ...(raw.time !== undefined ? { time: raw.time } : {}),
    };
  }

  /** Get all digital signatures. */
  getSignatures(): PDFSignature[] {
    const count = this.signatureCount;
    const result: PDFSignature[] = [];
    for (let i = 0; i < count; i++) {
      const sig = this.getSignature(i);
      if (sig !== undefined) {
        result.push(sig);
      }
    }
    return result;
  }

  // ── Save / Export ───────────────────────────────────────────────────

  /**
   * Save the document to a byte array.
   *
   * @param options - Save options (flags, version).
   * @returns The serialised PDF bytes.
   */
  save(options: SaveOptions = {}): Uint8Array {
    this.ensureNotDisposed();

    const flags = options.flags ?? SaveFlags.None;
    const version = options.version ?? null;

    return this.#backend.saveDocument(this.#docHandle, flags, version);
  }

  // ── Attachments ─────────────────────────────────────────────────────

  /** Get the number of attachments in this document. */
  get attachmentCount(): number {
    this.ensureNotDisposed();
    return this.#backend.getAttachmentCount(this.#docHandle);
  }

  /** Get an attachment by index. */
  getAttachment(index: number): PDFAttachment | undefined {
    this.ensureNotDisposed();

    if (!Number.isSafeInteger(index) || index < 0 || index >= this.attachmentCount) {
      return undefined;
    }

    const raw = this.#backend.getAttachment(this.#docHandle, index);
    if (raw === null) {
      return undefined;
    }

    return { index, name: raw.name, data: raw.data };
  }

  /** Get all attachments. */
  getAttachments(): PDFAttachment[] {
    const count = this.attachmentCount;
    const result: PDFAttachment[] = [];
    for (let i = 0; i < count; i++) {
      const att = this.getAttachment(i);
      if (att !== undefined) {
        result.push(att);
      }
    }
    return result;
  }

  // ── Page Import ──────────────────────────────────────────────────────

  /**
   * Import pages from a source document.
   *
   * @param source - Source document to import from
   * @param options - Import options (pageRange, insertIndex)
   */
  importPages(source: NativePDFiumDocument, options: ImportPagesOptions = {}): void {
    this.ensureNotDisposed();
    source.ensureNotDisposed();

    const insertIndex = options.insertIndex ?? this.pageCount;
    const pageRange = options.pageRange ?? null;

    this.#backend.importPages(this.#docHandle, source.#docHandle, pageRange, insertIndex);
  }

  /**
   * Import pages by index array.
   *
   * @param source - Source document to import from
   * @param pageIndices - Zero-based page indices
   * @param insertIndex - Insertion point (default: end)
   */
  importPagesByIndex(source: NativePDFiumDocument, pageIndices: number[], insertIndex?: number): void {
    this.ensureNotDisposed();
    source.ensureNotDisposed();

    if (pageIndices.length === 0) {
      return;
    }

    const targetIndex = insertIndex ?? this.pageCount;
    this.#backend.importPagesByIndex(this.#docHandle, source.#docHandle, pageIndices, targetIndex);
  }

  /**
   * Copy viewer preferences from another document.
   *
   * @param source - Source document to copy preferences from
   * @returns `true` if preferences were copied
   */
  copyViewerPreferences(source: NativePDFiumDocument): boolean {
    this.ensureNotDisposed();
    source.ensureNotDisposed();
    return this.#backend.copyViewerPreferences(this.#docHandle, source.#docHandle);
  }

  /**
   * Create a new document with N-up layout.
   *
   * The caller must manage the returned document's lifecycle.
   *
   * @returns A new document handle, or `undefined` on failure.
   */
  createNUpDocument(options: NUpLayoutOptions): NativePDFiumDocument | undefined {
    this.ensureNotDisposed();

    const newDocHandle = this.#backend.importNPagesToOne(
      this.#docHandle,
      options.outputWidth,
      options.outputHeight,
      options.pagesPerRow,
      options.pagesPerColumn,
    );

    if (newDocHandle === 0) {
      return undefined;
    }

    return new NativePDFiumDocument(this.#backend, newDocHandle, this.#limits);
  }

  #releaseNative(): void {
    for (const page of this.#pages) {
      page.dispose();
    }
    this.#pages.clear();
    this.#backend.closeDocument(this.#docHandle);
    this.#deregister?.(this);
  }

  protected disposeInternal(): void {
    this.#releaseNative();
  }
}
