/**
 * Main PDFium library class.
 *
 * @module pdfium
 */

import { Disposable } from './core/disposable.js';
import { DocumentError, InitialisationError, PDFiumErrorCode } from './core/errors.js';
import { DEFAULT_LIMITS, type DocumentHandle, type PDFiumInitOptions, type PDFiumLimits } from './core/types.js';
import { WASMAllocation } from './wasm/allocation.js';
import { loadWASM, type PDFiumWASM, PDFiumNativeErrorCode, type WASMLoadOptions } from './wasm/index.js';
import { asHandle, NULL_PTR, WASMMemoryManager } from './wasm/memory.js';
import { PDFiumDocumentBuilder } from './document/builder.js';
import { PDFiumDocument } from './document/document.js';
import { ProgressivePDFLoader } from './document/progressive.js';

/**
 * Main PDFium library class.
 *
 * Use `PDFium.init()` to create an instance. Resources are automatically
 * cleaned up when disposed.
 *
 * @example
 * ```typescript
 * using pdfium = await PDFium.init();
 * using document = await pdfium.openDocument(pdfBytes);
 * console.log(`Document has ${document.pageCount} pages`);
 * ```
 */
export class PDFium extends Disposable {
  readonly #module: PDFiumWASM;
  readonly #memory: WASMMemoryManager;
  readonly #limits: Readonly<Required<PDFiumLimits>>;
  #libraryInitialised = false;

  private constructor(module: PDFiumWASM, limits?: PDFiumLimits) {
    super('PDFium');
    this.#module = module;
    this.#memory = new WASMMemoryManager(module);
    this.#limits = {
      maxDocumentSize: limits?.maxDocumentSize ?? DEFAULT_LIMITS.maxDocumentSize,
      maxRenderDimension: limits?.maxRenderDimension ?? DEFAULT_LIMITS.maxRenderDimension,
      maxTextCharCount: limits?.maxTextCharCount ?? DEFAULT_LIMITS.maxTextCharCount,
    };
    this.setFinalizerCleanup(() => {
      if (this.#libraryInitialised) {
        this.#module._FPDF_DestroyLibrary();
      }
      this.#memory.freeAll();
    });
  }

  /**
   * Initialise the PDFium library.
   *
   * @param options - Initialisation options
   * @returns The PDFium instance
   * @throws {InitialisationError} If initialisation fails
   */
  static async init(options: PDFiumInitOptions = {}): Promise<PDFium> {
    const loadOptions: WASMLoadOptions = {};
    if (options.wasmBinary !== undefined) {
      loadOptions.wasmBinary = options.wasmBinary;
    }

    const module = await loadWASM(loadOptions);
    const pdfium = new PDFium(module, options.limits);

    try {
      pdfium.#initialiseLibrary();
      return pdfium;
    } catch (error) {
      pdfium.dispose();
      if (error instanceof InitialisationError) {
        throw error;
      }
      throw new InitialisationError(
        PDFiumErrorCode.INIT_LIBRARY_FAILED,
        `Failed to initialise PDFium: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Initialise the PDFium library with configuration.
   */
  #initialiseLibrary(): void {
    using config = this.#memory.alloc(4);
    this.#memory.writeInt32(config.ptr, 2);
    this.#module._FPDF_InitLibraryWithConfig(config.ptr);
    this.#libraryInitialised = true;
  }

  /**
   * Open a PDF document from binary data.
   *
   * Note: The `password` option accepts a JavaScript string. JS strings cannot
   * be securely zeroed after use — they are immutable and garbage collected at
   * an unpredictable time. For highly sensitive passwords, consider the trade-offs.
   *
   * @param data - PDF file data
   * @param options - Document options (e.g., password)
   * @returns The loaded document
   * @throws {DocumentError} If the document cannot be opened
   */
  async openDocument(
    data: Uint8Array | ArrayBuffer,
    options: { password?: string } = {},
  ): Promise<PDFiumDocument> {
    this.ensureNotDisposed();

    const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : data;

    if (bytes.length > this.#limits.maxDocumentSize) {
      throw new DocumentError(
        PDFiumErrorCode.DOC_FORMAT_INVALID,
        `Document size ${bytes.length} exceeds maximum allowed size of ${this.#limits.maxDocumentSize} bytes`,
        { documentSize: bytes.length, maxDocumentSize: this.#limits.maxDocumentSize },
      );
    }

    using dataAlloc = this.#allocDocumentData(bytes);
    using passwordAlloc = options.password !== undefined
      ? this.#allocPassword(options.password)
      : undefined;

    const passwordPtr = passwordAlloc !== undefined ? passwordAlloc.ptr : NULL_PTR;
    const documentHandle = this.#module._FPDF_LoadMemDocument(dataAlloc.ptr, bytes.length, passwordPtr);

    if (documentHandle === asHandle<DocumentHandle>(0)) {
      throw this.#getDocumentError();
    }

    // Transfer data ownership to PDFiumDocument; password auto-freed at scope exit
    const dataPtr = dataAlloc.take();
    return new PDFiumDocument(this.#module, this.#memory, documentHandle, dataPtr, this.#limits);
  }

  #allocDocumentData(bytes: Uint8Array): WASMAllocation {
    try {
      return this.#memory.allocFrom(bytes);
    } catch (error) {
      throw new DocumentError(PDFiumErrorCode.DOC_LOAD_UNKNOWN, 'Failed to allocate memory for document', {
        cause: error,
      });
    }
  }

  #allocPassword(password: string): WASMAllocation {
    try {
      return this.#memory.allocString(password);
    } catch (error) {
      throw new DocumentError(PDFiumErrorCode.DOC_LOAD_UNKNOWN, 'Failed to allocate memory for password', {
        cause: error,
      });
    }
  }

  /**
   * Get the appropriate document error from PDFium.
   */
  #getDocumentError(): DocumentError {
    const errorCode = this.#module._FPDF_GetLastError();

    switch (errorCode) {
      case PDFiumNativeErrorCode.FILE:
        return new DocumentError(PDFiumErrorCode.DOC_FILE_NOT_FOUND);
      case PDFiumNativeErrorCode.FORMAT:
        return new DocumentError(PDFiumErrorCode.DOC_FORMAT_INVALID);
      case PDFiumNativeErrorCode.PASSWORD:
        return new DocumentError(PDFiumErrorCode.DOC_PASSWORD_REQUIRED);
      case PDFiumNativeErrorCode.SECURITY:
        return new DocumentError(PDFiumErrorCode.DOC_SECURITY_UNSUPPORTED);
      case PDFiumNativeErrorCode.PAGE:
        return new DocumentError(PDFiumErrorCode.DOC_FORMAT_INVALID, 'Invalid page');
      default:
        return new DocumentError(PDFiumErrorCode.DOC_LOAD_UNKNOWN, `Unknown error code: ${errorCode}`);
    }
  }

  /**
   * Create a new empty PDF document.
   *
   * @returns A document builder for adding pages and content
   */
  createDocument(): PDFiumDocumentBuilder {
    this.ensureNotDisposed();
    return new PDFiumDocumentBuilder(this.#module, this.#memory);
  }

  /**
   * Create a progressive loader for linearisation detection and incremental loading.
   *
   * @param data - PDF file data
   * @returns A progressive loader instance
   */
  createProgressiveLoader(data: Uint8Array | ArrayBuffer): ProgressivePDFLoader {
    this.ensureNotDisposed();
    const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
    return ProgressivePDFLoader.fromBuffer(bytes, this.#module, this.#memory, this.#limits);
  }

  /**
   * Get the WASM module for advanced usage.
   */
  get module(): PDFiumWASM {
    this.ensureNotDisposed();
    return this.#module;
  }

  /**
   * Get the configured resource limits.
   */
  get limits(): Readonly<Required<PDFiumLimits>> {
    return this.#limits;
  }

  /**
   * Get the memory manager for advanced usage.
   */
  get memory(): WASMMemoryManager {
    this.ensureNotDisposed();
    return this.#memory;
  }

  protected disposeInternal(): void {
    if (this.#libraryInitialised) {
      this.#module._FPDF_DestroyLibrary();
      this.#libraryInitialised = false;
    }
    this.#memory.freeAll();
  }
}
