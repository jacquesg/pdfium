/**
 * Main PDFium library class.
 *
 * @module pdfium
 */

import { Disposable } from './core/disposable.js';
import { DocumentError, InitialisationError, PDFiumErrorCode } from './core/errors.js';
import type { PDFiumInitOptions, WASMPointer } from './core/types.js';
import { loadWASM, type PDFiumWASM, PDFiumNativeErrorCode, type WASMLoadOptions } from './wasm/index.js';
import { NULL_PTR, WASMMemoryManager } from './wasm/memory.js';
import { PDFiumDocument } from './document/document.js';

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
  #libraryInitialised = false;

  private constructor(module: PDFiumWASM) {
    super('PDFium');
    this.#module = module;
    this.#memory = new WASMMemoryManager(module);
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
    const pdfium = new PDFium(module);

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
    // Allocate config structure (just version field for now)
    const configPtr = this.#memory.malloc(4);

    try {
      // Set version to 2
      this.#memory.writeInt32(configPtr, 2);
      this.#module._FPDF_InitLibraryWithConfig(configPtr);
      this.#libraryInitialised = true;
    } finally {
      this.#memory.free(configPtr);
    }
  }

  /**
   * Open a PDF document from binary data.
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

    // Copy document data to WASM memory
    let dataPtr: WASMPointer;
    try {
      dataPtr = this.#memory.copyToWASM(bytes);
    } catch (error) {
      throw new DocumentError(PDFiumErrorCode.DOC_LOAD_UNKNOWN, 'Failed to allocate memory for document', {
        cause: error,
      });
    }

    // Copy password if provided
    let passwordPtr = NULL_PTR;
    if (options.password !== undefined) {
      try {
        passwordPtr = this.#memory.copyStringToWASM(options.password);
      } catch (error) {
        this.#memory.free(dataPtr);
        throw new DocumentError(PDFiumErrorCode.DOC_LOAD_UNKNOWN, 'Failed to allocate memory for password', {
          cause: error,
        });
      }
    }

    // Load the document
    const documentHandle = this.#module._FPDF_LoadMemDocument(dataPtr, bytes.length, passwordPtr);

    // Clean up password memory (document data is still needed)
    if (passwordPtr !== NULL_PTR) {
      this.#memory.free(passwordPtr);
    }

    if (documentHandle === 0) {
      this.#memory.free(dataPtr);
      throw this.#getDocumentError();
    }

    return new PDFiumDocument(this.#module, this.#memory, documentHandle, dataPtr);
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
   * Get the WASM module for advanced usage.
   */
  get module(): PDFiumWASM {
    this.ensureNotDisposed();
    return this.#module;
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
