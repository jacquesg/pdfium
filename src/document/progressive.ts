/**
 * Progressive PDF loading and linearisation detection.
 *
 * Uses PDFium's FPDFAvail API to support incremental loading of
 * linearised PDFs and to detect linearisation status.
 *
 * @module document/progressive
 */

import { Disposable } from '../core/disposable.js';
import { DocumentError, PDFiumErrorCode } from '../core/errors.js';
import {
  type AvailabilityHandle,
  DEFAULT_LIMITS,
  DocumentAvailability,
  type DocumentHandle,
  LinearisationStatus,
  type PDFiumLimits,
  type WASMPointer,
} from '../core/types.js';
import type { PDFiumWASM } from '../wasm/bindings.js';
import { asHandle, asPointer, NULL_PTR, type WASMMemoryManager } from '../wasm/memory.js';
import { PDFiumDocument } from './document.js';

/** Null availability handle constant. */
const NULL_AVAIL: AvailabilityHandle = asHandle<AvailabilityHandle>(0);

/**
 * Size of the FX_FILEAVAIL struct: version (4) + IsDataAvail function pointer (4).
 */
const FILE_AVAIL_SIZE = 8;

/**
 * Size of the FPDF_FILEACCESS struct: m_FileLen (4) + m_GetBlock (4) + m_Param (4).
 */
const FILE_ACCESS_SIZE = 12;

/**
 * Size of the FX_DOWNLOADHINTS struct: version (4) + AddSegment function pointer (4).
 */
const DOWNLOAD_HINTS_SIZE = 8;

/**
 * Progressive PDF loader for linearised documents.
 *
 * Allows checking linearisation status and loading documents
 * using PDFium's availability API. Supports both complete buffers
 * and incremental data feeds.
 *
 * @example
 * ```typescript
 * using loader = ProgressivePDFLoader.fromBuffer(pdfBytes, module, memory);
 * if (loader.isLinearised) {
 *   console.log('Document is linearised');
 * }
 * using document = loader.getDocument();
 * ```
 */
export class ProgressivePDFLoader extends Disposable {
  readonly #module: PDFiumWASM;
  readonly #memory: WASMMemoryManager;
  readonly #limits: Readonly<Required<PDFiumLimits>>;

  /** The accumulated PDF data buffer. */
  #data: Uint8Array;
  /** How many bytes are currently available (may be less than #data.length if pre-allocated). */
  #availableBytes: number;
  /** Total expected file size (set when known). */
  #totalSize: number;

  /** WASM pointer to the data buffer. */
  #dataPtr: WASMPointer = NULL_PTR;
  /** WASM pointer to FX_FILEAVAIL struct. */
  #fileAvailPtr: WASMPointer = NULL_PTR;
  /** WASM pointer to FPDF_FILEACCESS struct. */
  #fileAccessPtr: WASMPointer = NULL_PTR;
  /** WASM pointer to FX_DOWNLOADHINTS struct. */
  #hintsPtr: WASMPointer = NULL_PTR;

  /** Registered WASM function pointers. */
  #isDataAvailFuncPtr = 0;
  #getBlockFuncPtr = 0;
  #addSegmentFuncPtr = 0;

  /** The availability handle from FPDFAvail_Create. */
  #availHandle: AvailabilityHandle = NULL_AVAIL;

  /** Whether we've already extracted a document. */
  #documentExtracted = false;

  private constructor(
    module: PDFiumWASM,
    memory: WASMMemoryManager,
    data: Uint8Array,
    availableBytes: number,
    totalSize: number,
    limits?: Readonly<Required<PDFiumLimits>>,
  ) {
    super('ProgressivePDFLoader');
    this.#module = module;
    this.#memory = memory;
    this.#data = data;
    this.#availableBytes = availableBytes;
    this.#totalSize = totalSize;
    this.#limits = limits ?? DEFAULT_LIMITS;

    this.#initialise();

    this.setFinalizerCleanup(() => {
      this.#cleanup();
    });
  }

  /**
   * Create a progressive loader from a complete buffer.
   *
   * Even for complete buffers, this is useful for checking linearisation status.
   */
  static fromBuffer(
    data: Uint8Array,
    module: PDFiumWASM,
    memory: WASMMemoryManager,
    limits?: Readonly<Required<PDFiumLimits>>,
  ): ProgressivePDFLoader {
    const effectiveLimits = limits ?? DEFAULT_LIMITS;
    if (data.length > effectiveLimits.maxDocumentSize) {
      throw new DocumentError(
        PDFiumErrorCode.DOC_FORMAT_INVALID,
        `Document size ${data.length} exceeds maximum allowed size of ${effectiveLimits.maxDocumentSize} bytes`,
        { documentSize: data.length, maxDocumentSize: effectiveLimits.maxDocumentSize },
      );
    }
    return new ProgressivePDFLoader(module, memory, data, data.length, data.length, limits);
  }

  /**
   * Check if the document is linearised.
   *
   * @returns The linearisation status
   */
  get linearisationStatus(): LinearisationStatus {
    this.ensureNotDisposed();
    const result = this.#module._FPDFAvail_IsLinearized(this.#availHandle);
    if (result === 1) return LinearisationStatus.Linearised;
    if (result === 0) return LinearisationStatus.NotLinearised;
    return LinearisationStatus.Unknown;
  }

  /**
   * @deprecated Use {@link linearisationStatus} instead.
   */
  get linearizationStatus(): LinearisationStatus {
    return this.linearisationStatus;
  }

  /**
   * Convenience check for whether the document is linearised.
   */
  get isLinearised(): boolean {
    return this.linearisationStatus === LinearisationStatus.Linearised;
  }

  /**
   * Check whether the full document data is available.
   */
  get isDocumentAvailable(): boolean {
    this.ensureNotDisposed();
    const result = this.#module._FPDFAvail_IsDocAvail(this.#availHandle, this.#hintsPtr);
    return result === DocumentAvailability.DataAvailable;
  }

  /**
   * Check whether a specific page is available.
   *
   * @param pageIndex - Zero-based page index
   */
  isPageAvailable(pageIndex: number): boolean {
    this.ensureNotDisposed();
    const result = this.#module._FPDFAvail_IsPageAvail(this.#availHandle, pageIndex, this.#hintsPtr);
    return result === DocumentAvailability.DataAvailable;
  }

  /**
   * Get the first available page number (useful for linearised documents).
   * Returns -1 if no document is available yet.
   */
  get firstPageNumber(): number {
    this.ensureNotDisposed();

    if (!this.isDocumentAvailable) {
      return -1;
    }

    // Need a temporary document handle to get first page
    using tempDoc = this.#getTemporaryDocument();
    if (tempDoc === undefined) {
      return -1;
    }

    return this.#module._FPDFAvail_GetFirstPageNum(tempDoc.handle);
  }

  /**
   * Get the document once enough data is available.
   *
   * @param password - Optional password for encrypted documents
   * @returns The loaded document
   * @throws {DocumentError} If the document is not yet available or cannot be loaded
   */
  getDocument(password?: string): PDFiumDocument {
    this.ensureNotDisposed();

    if (this.#documentExtracted) {
      throw new DocumentError(PDFiumErrorCode.DOC_ALREADY_CLOSED, 'Document already extracted from this loader');
    }

    using passwordAlloc = password !== undefined ? this.#memory.allocString(password) : undefined;
    const passwordPtr = passwordAlloc !== undefined ? passwordAlloc.ptr : NULL_PTR;

    const docHandle = this.#module._FPDFAvail_GetDocument(this.#availHandle, passwordPtr);
    if (docHandle === asHandle<DocumentHandle>(0)) {
      throw new DocumentError(PDFiumErrorCode.DOC_LOAD_UNKNOWN, 'Failed to get document from availability provider');
    }

    this.#documentExtracted = true;

    // Create document first; only transfer data pointer ownership on success
    const dataPtr = this.#dataPtr;
    const document = new PDFiumDocument(this.#module, this.#memory, docHandle, dataPtr, this.#limits);
    // Transfer succeeded — stop our cleanup from freeing the data pointer
    this.#dataPtr = NULL_PTR;

    return document;
  }

  #getTemporaryDocument(): { handle: DocumentHandle; [Symbol.dispose](): void } | undefined {
    const docHandle = this.#module._FPDFAvail_GetDocument(this.#availHandle, NULL_PTR);
    if (docHandle === asHandle<DocumentHandle>(0)) {
      return undefined;
    }
    const module = this.#module;
    return {
      handle: docHandle,
      [Symbol.dispose]() {
        module._FPDF_CloseDocument(docHandle);
      },
    };
  }

  #initialise(): void {
    // Copy data to WASM memory
    this.#dataPtr = this.#memory.copyToWASM(this.#data);

    // Create the IsDataAvail callback: (pThis, offset, size) => int
    const availableBytes = () => this.#availableBytes;
    const isDataAvail = (_pThis: number, offset: number, size: number): number => {
      return (offset + size <= availableBytes()) ? 1 : 0;
    };
    this.#isDataAvailFuncPtr = this.#module.addFunction(isDataAvail, 'iiii');

    // Create the GetBlock callback: (param, position, pBuf, size) => int
    const dataPtr = () => this.#dataPtr;
    const module = this.#module;
    const getBlock = (_param: number, position: number, pBuf: number, size: number): number => {
      if (position + size > availableBytes()) {
        return 0; // Not enough data
      }
      // Copy from our WASM data buffer to the requested buffer
      const srcStart = dataPtr() + position;
      module.HEAPU8.copyWithin(pBuf, srcStart, srcStart + size);
      return 1;
    };
    this.#getBlockFuncPtr = this.#module.addFunction(getBlock, 'iiiii');

    // Create the AddSegment callback: (pThis, offset, size) => void
    // We don't need to track hints for complete buffers, just provide a no-op
    const addSegment = (_pThis: number, _offset: number, _size: number): number => {
      return 0; // void return, but addFunction needs a return type
    };
    this.#addSegmentFuncPtr = this.#module.addFunction(addSegment, 'iiii');

    // Allocate FX_FILEAVAIL struct
    this.#fileAvailPtr = this.#memory.malloc(FILE_AVAIL_SIZE);
    this.#memory.writeInt32(this.#fileAvailPtr, 1); // version = 1
    this.#memory.writeInt32(asPointer(this.#fileAvailPtr + 4), this.#isDataAvailFuncPtr);

    // Allocate FPDF_FILEACCESS struct
    this.#fileAccessPtr = this.#memory.malloc(FILE_ACCESS_SIZE);
    this.#memory.writeInt32(this.#fileAccessPtr, this.#totalSize); // m_FileLen
    this.#memory.writeInt32(asPointer(this.#fileAccessPtr + 4), this.#getBlockFuncPtr); // m_GetBlock
    this.#memory.writeInt32(asPointer(this.#fileAccessPtr + 8), 0); // m_Param (not used)

    // Allocate FX_DOWNLOADHINTS struct
    this.#hintsPtr = this.#memory.malloc(DOWNLOAD_HINTS_SIZE);
    this.#memory.writeInt32(this.#hintsPtr, 1); // version = 1
    this.#memory.writeInt32(asPointer(this.#hintsPtr + 4), this.#addSegmentFuncPtr);

    // Create the availability provider
    this.#availHandle = this.#module._FPDFAvail_Create(this.#fileAvailPtr, this.#fileAccessPtr);
    if (this.#availHandle === NULL_AVAIL) {
      this.#cleanup();
      throw new DocumentError(PDFiumErrorCode.DOC_LOAD_UNKNOWN, 'Failed to create availability provider');
    }
  }

  #cleanup(): void {
    if (this.#availHandle !== NULL_AVAIL) {
      this.#module._FPDFAvail_Destroy(this.#availHandle);
      this.#availHandle = NULL_AVAIL;
    }

    if (this.#isDataAvailFuncPtr !== 0) {
      this.#module.removeFunction(this.#isDataAvailFuncPtr);
      this.#isDataAvailFuncPtr = 0;
    }
    if (this.#getBlockFuncPtr !== 0) {
      this.#module.removeFunction(this.#getBlockFuncPtr);
      this.#getBlockFuncPtr = 0;
    }
    if (this.#addSegmentFuncPtr !== 0) {
      this.#module.removeFunction(this.#addSegmentFuncPtr);
      this.#addSegmentFuncPtr = 0;
    }

    if (this.#fileAvailPtr !== NULL_PTR) {
      this.#memory.free(this.#fileAvailPtr);
      this.#fileAvailPtr = NULL_PTR;
    }
    if (this.#fileAccessPtr !== NULL_PTR) {
      this.#memory.free(this.#fileAccessPtr);
      this.#fileAccessPtr = NULL_PTR;
    }
    if (this.#hintsPtr !== NULL_PTR) {
      this.#memory.free(this.#hintsPtr);
      this.#hintsPtr = NULL_PTR;
    }
    if (this.#dataPtr !== NULL_PTR) {
      this.#memory.free(this.#dataPtr);
      this.#dataPtr = NULL_PTR;
    }
  }

  protected disposeInternal(): void {
    this.#cleanup();
  }
}
