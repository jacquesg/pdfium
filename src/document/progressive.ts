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
import { DEFAULT_LIMITS, DocumentAvailability, LinearisationStatus, type PDFiumLimits } from '../core/types.js';
import { documentAvailabilityMap, fromNative } from '../internal/enum-maps.js';
import type { AvailabilityHandle, DocumentHandle, WASMPointer } from '../internal/handles.js';
import type { WASMAllocation } from '../wasm/allocation.js';
import type { PDFiumWASM } from '../wasm/bindings/index.js';
import { asHandle, NULL_PTR, ptrOffset, type WASMMemoryManager } from '../wasm/memory.js';
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
  /** RAII allocation for data buffer. */
  #dataAlloc: WASMAllocation | undefined;

  /** RAII wrapper for FX_FILEAVAIL struct. */
  #fileAvail: FSFileAvail | undefined;
  /** RAII wrapper for FPDF_FILEACCESS struct. */
  #fileAccess: FSFileAccess | undefined;
  /** RAII wrapper for FX_DOWNLOADHINTS struct. */
  #hints: FSDownloadHints | undefined;

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
   *
   * @internal
   */
  static fromBuffer(
    data: Uint8Array | ArrayBuffer,
    module: PDFiumWASM,
    memory: WASMMemoryManager,
    limits?: Readonly<Required<PDFiumLimits>>,
  ): ProgressivePDFLoader {
    const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
    const effectiveLimits = limits ?? DEFAULT_LIMITS;
    if (bytes.length > effectiveLimits.maxDocumentSize) {
      throw new DocumentError(
        PDFiumErrorCode.DOC_FORMAT_INVALID,
        `Document size ${bytes.length} exceeds maximum allowed size of ${effectiveLimits.maxDocumentSize} bytes`,
        { documentSize: bytes.length, maxDocumentSize: effectiveLimits.maxDocumentSize },
      );
    }
    return new ProgressivePDFLoader(module, memory, bytes, bytes.length, bytes.length, limits);
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
    const result = this.#module._FPDFAvail_IsDocAvail(this.#availHandle, this.#hints?.ptr ?? NULL_PTR);
    return (
      fromNative(documentAvailabilityMap.fromNative, result, DocumentAvailability.DataNotAvailable) ===
      DocumentAvailability.DataAvailable
    );
  }

  /**
   * Check whether a specific page is available.
   *
   * @param pageIndex - Zero-based page index
   */
  isPageAvailable(pageIndex: number): boolean {
    this.ensureNotDisposed();
    const result = this.#module._FPDFAvail_IsPageAvail(this.#availHandle, pageIndex, this.#hints?.ptr ?? NULL_PTR);
    return (
      fromNative(documentAvailabilityMap.fromNative, result, DocumentAvailability.DataNotAvailable) ===
      DocumentAvailability.DataAvailable
    );
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
    const dataSize = this.#dataAlloc?.size ?? 0;

    let document: PDFiumDocument;
    try {
      document = new PDFiumDocument(this.#module, this.#memory, docHandle, dataPtr, dataSize, this.#limits);
    } catch (error) {
      this.#module._FPDF_CloseDocument(docHandle);
      this.#documentExtracted = false;
      throw error;
    }

    // Transfer succeeded — stop our cleanup from freeing the data pointer
    this.#dataAlloc = undefined;
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
    // Allocate data buffer and keep ownership
    this.#dataAlloc = this.#memory.allocFrom(this.#data);
    this.#dataPtr = this.#dataAlloc.ptr;

    // Create the IsDataAvail callback: (pThis, offset, size) => int
    const availableBytes = () => this.#availableBytes;
    const isDataAvail = (_pThis: number, offset: number, size: number): number => {
      return offset + size <= availableBytes() ? 1 : 0;
    };

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

    // Create the AddSegment callback: (pThis, offset, size) => void
    const addSegment = (_pThis: number, _offset: number, _size: number): number => {
      return 0;
    };

    try {
      // Create RAII wrappers
      this.#fileAvail = new FSFileAvail(this.#memory, this.#module, isDataAvail);
      this.#fileAccess = new FSFileAccess(this.#memory, this.#module, this.#totalSize, getBlock);
      this.#hints = new FSDownloadHints(this.#memory, this.#module, addSegment);

      // Create the availability provider
      const availHandle = this.#module._FPDFAvail_Create(this.#fileAvail.ptr, this.#fileAccess.ptr);
      if (availHandle === NULL_AVAIL) {
        throw new DocumentError(PDFiumErrorCode.DOC_LOAD_UNKNOWN, 'Failed to create availability provider');
      }

      this.#availHandle = availHandle;
    } catch (error) {
      this.#cleanup();
      throw error;
    }
  }

  #cleanup(): void {
    if (this.#availHandle !== NULL_AVAIL) {
      this.#module._FPDFAvail_Destroy(this.#availHandle);
      this.#availHandle = NULL_AVAIL;
    }

    if (this.#fileAvail) {
      this.#fileAvail[Symbol.dispose]();
      this.#fileAvail = undefined;
    }
    if (this.#fileAccess) {
      this.#fileAccess[Symbol.dispose]();
      this.#fileAccess = undefined;
    }
    if (this.#hints) {
      this.#hints[Symbol.dispose]();
      this.#hints = undefined;
    }

    if (this.#dataAlloc) {
      this.#dataAlloc[Symbol.dispose]();
      this.#dataAlloc = undefined;
    }
    this.#dataPtr = NULL_PTR;
  }

  protected disposeInternal(): void {
    this.#cleanup();
  }
}

/**
 * RAII wrapper for FX_FILEAVAIL struct.
 * Handles allocation and callback registration.
 */
class FSFileAvail {
  readonly #allocation: WASMAllocation;
  readonly #module: PDFiumWASM;
  readonly #callbackPtr: number;

  constructor(
    memory: WASMMemoryManager,
    module: PDFiumWASM,
    callback: (pThis: number, offset: number, size: number) => number,
  ) {
    this.#module = module;
    this.#allocation = memory.alloc(FILE_AVAIL_SIZE);

    // Register callback: int (*IsDataAvail)(FX_FILEAVAIL* pThis, size_t offset, size_t size);
    this.#callbackPtr = module.addFunction(callback, 'iiii');

    memory.writeInt32(this.#allocation.ptr, 1); // version = 1
    memory.writeInt32(ptrOffset(this.#allocation.ptr, 4), this.#callbackPtr); // IsDataAvail
  }

  get ptr(): WASMPointer {
    return this.#allocation.ptr;
  }

  [Symbol.dispose](): void {
    if (this.#callbackPtr !== 0) {
      this.#module.removeFunction(this.#callbackPtr);
    }
    this.#allocation[Symbol.dispose]();
  }
}

/**
 * RAII wrapper for FPDF_FILEACCESS struct.
 * Handles allocation and callback registration.
 */
class FSFileAccess {
  readonly #allocation: WASMAllocation;
  readonly #module: PDFiumWASM;
  readonly #callbackPtr: number;

  constructor(
    memory: WASMMemoryManager,
    module: PDFiumWASM,
    fileLength: number,
    callback: (param: number, position: number, pBuf: number, size: number) => number,
  ) {
    this.#module = module;
    this.#allocation = memory.alloc(FILE_ACCESS_SIZE);

    // Register callback: int (*m_GetBlock)(void* param, unsigned long position, unsigned char* pBuf, unsigned long size);
    this.#callbackPtr = module.addFunction(callback, 'iiiii');

    memory.writeInt32(this.#allocation.ptr, fileLength); // m_FileLen
    memory.writeInt32(ptrOffset(this.#allocation.ptr, 4), this.#callbackPtr); // m_GetBlock
    memory.writeInt32(ptrOffset(this.#allocation.ptr, 8), 0); // m_Param
  }

  get ptr(): WASMPointer {
    return this.#allocation.ptr;
  }

  [Symbol.dispose](): void {
    if (this.#callbackPtr !== 0) {
      this.#module.removeFunction(this.#callbackPtr);
    }
    this.#allocation[Symbol.dispose]();
  }
}

/**
 * RAII wrapper for FX_DOWNLOADHINTS struct.
 * Handles allocation and callback registration.
 */
class FSDownloadHints {
  readonly #allocation: WASMAllocation;
  readonly #module: PDFiumWASM;
  readonly #callbackPtr: number;

  constructor(
    memory: WASMMemoryManager,
    module: PDFiumWASM,
    callback: (pThis: number, offset: number, size: number) => number,
  ) {
    this.#module = module;
    this.#allocation = memory.alloc(DOWNLOAD_HINTS_SIZE);

    // Register callback: void (*AddSegment)(FX_DOWNLOADHINTS* pThis, size_t offset, size_t size);
    this.#callbackPtr = module.addFunction(callback, 'iiii');

    memory.writeInt32(this.#allocation.ptr, 1); // version = 1
    memory.writeInt32(ptrOffset(this.#allocation.ptr, 4), this.#callbackPtr); // AddSegment
  }

  get ptr(): WASMPointer {
    return this.#allocation.ptr;
  }

  [Symbol.dispose](): void {
    if (this.#callbackPtr !== 0) {
      this.#module.removeFunction(this.#callbackPtr);
    }
    this.#allocation[Symbol.dispose]();
  }
}
