/**
 * Main PDFium library class.
 *
 * @module pdfium
 */

import { Disposable } from './core/disposable.js';
import { DocumentError, InitialisationError, PDFiumErrorCode } from './core/errors.js';
import { DEFAULT_LIMITS, type OpenDocumentOptions, type PDFiumInitOptions, type PDFiumLimits } from './core/types.js';
import { PDFiumDocumentBuilder } from './document/builder.js';
import { PDFiumDocument } from './document/document.js';
import { NativePDFiumInstance } from './document/native-instance.js';
import { ProgressivePDFLoader } from './document/progressive.js';
import type { DocumentHandle } from './internal/handles.js';
import { INTERNAL } from './internal/symbols.js';
import type { WASMAllocation } from './wasm/allocation.js';
import { loadWASM, PDFiumNativeErrorCode, type PDFiumWASM, type WASMLoadOptions } from './wasm/index.js';
import { asHandle, NULL_PTR, WASMMemoryManager } from './wasm/memory.js';

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

    if (limits !== undefined) {
      if (
        limits.maxDocumentSize !== undefined &&
        (!Number.isSafeInteger(limits.maxDocumentSize) || limits.maxDocumentSize <= 0)
      ) {
        throw new InitialisationError(
          PDFiumErrorCode.INIT_INVALID_OPTIONS,
          'maxDocumentSize must be a positive integer',
        );
      }
      if (
        limits.maxRenderDimension !== undefined &&
        (!Number.isSafeInteger(limits.maxRenderDimension) || limits.maxRenderDimension <= 0)
      ) {
        throw new InitialisationError(
          PDFiumErrorCode.INIT_INVALID_OPTIONS,
          'maxRenderDimension must be a positive integer',
        );
      }
      if (
        limits.maxTextCharCount !== undefined &&
        (!Number.isSafeInteger(limits.maxTextCharCount) || limits.maxTextCharCount <= 0)
      ) {
        throw new InitialisationError(
          PDFiumErrorCode.INIT_INVALID_OPTIONS,
          'maxTextCharCount must be a positive integer',
        );
      }
    }

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
   * When `useNative` is true, attempts to load the native addon first.
   * Falls back to WASM if native is unavailable.
   *
   * When `forceWasm` is true, always uses WASM backend regardless of native availability.
   *
   * @param options - Initialisation options
   * @returns The PDFium or NativePDFiumInstance
   * @throws {InitialisationError} If initialisation fails or options conflict
   */
  static async init(options: PDFiumInitOptions & { forceWasm: true }): Promise<PDFium>;
  static async init(options: PDFiumInitOptions & { useNative: true }): Promise<PDFium | NativePDFiumInstance>;
  static async init(options?: PDFiumInitOptions): Promise<PDFium>;
  static async init(options: PDFiumInitOptions = {}): Promise<PDFium | NativePDFiumInstance> {
    // Validate conflicting options
    if (options.forceWasm && options.useNative) {
      throw new InitialisationError(
        PDFiumErrorCode.INIT_INVALID_OPTIONS,
        'Cannot use forceWasm and useNative together.',
      );
    }

    if (options.useNative && !options.forceWasm) {
      const nativeOptions = options.limits !== undefined ? { limits: options.limits } : {};
      const native = await PDFium.initNative(nativeOptions);
      if (native) {
        return native;
      }
      // Fall through to WASM
    }

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
        { cause: error },
      );
    }
  }

  /**
   * Initialise a native PDFium instance (Node.js only).
   *
   * Returns a `NativePDFiumInstance` backed by the platform-specific native addon.
   * The instance provides core document operations (page count, text extraction,
   * rendering) without WASM.
   *
   * Returns `null` if the native addon is not available for the current platform.
   *
   * @param options - Optional resource limits
   * @returns The native instance, or null if unavailable
   */
  static async initNative(options: { limits?: PDFiumLimits } = {}): Promise<NativePDFiumInstance | null> {
    try {
      const { loadNativeBinding } = await import('./native/loader.js');
      const binding = loadNativeBinding();
      if (!binding) {
        return null;
      }
      return NativePDFiumInstance.fromBinding(binding, options.limits);
    } catch {
      return null;
    }
  }

  /**
   * Initialise the PDFium library with configuration.
   */
  #initialiseLibrary(): void {
    const FPDF_CONFIG_VERSION = 2;
    // FPDF_LIBRARY_CONFIG struct: version (4) + 4 pointer/int fields (4 bytes each in WASM32)
    const CONFIG_STRUCT_SIZE = 4 + 4 * 4;
    using config = this.#memory.alloc(CONFIG_STRUCT_SIZE);
    // Zero-fill the struct, then set version. The rest stays zero (NULL pointers, default values).
    this.#module.HEAPU8.fill(0, config.ptr, config.ptr + CONFIG_STRUCT_SIZE);
    this.#memory.writeInt32(config.ptr, FPDF_CONFIG_VERSION);
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
   * @param options - Document options (e.g., password, onProgress)
   * @returns The loaded document
   * @throws {DocumentError} If the document cannot be opened
   */
  // Async for API consistency and future extensibility (e.g., async validation)
  async openDocument(data: Uint8Array | ArrayBuffer, options: OpenDocumentOptions = {}): Promise<PDFiumDocument> {
    this.ensureNotDisposed();
    const { onProgress } = options;

    onProgress?.(0);

    const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : data;

    if (bytes.length > this.#limits.maxDocumentSize) {
      throw new DocumentError(
        PDFiumErrorCode.DOC_FORMAT_INVALID,
        `Document size ${bytes.length} exceeds maximum allowed size of ${this.#limits.maxDocumentSize} bytes`,
        { documentSize: bytes.length, maxDocumentSize: this.#limits.maxDocumentSize },
      );
    }

    onProgress?.(0.1);

    using dataAlloc = this.#allocDocumentData(bytes);
    using passwordAlloc = options.password !== undefined ? this.#allocPassword(options.password) : undefined;

    onProgress?.(0.3);

    const passwordPtr = passwordAlloc !== undefined ? passwordAlloc.ptr : NULL_PTR;
    const documentHandle = this.#module._FPDF_LoadMemDocument(dataAlloc.ptr, bytes.length, passwordPtr);

    onProgress?.(0.8);

    if (documentHandle === asHandle<DocumentHandle>(0)) {
      throw this.#getDocumentError();
    }

    // Transfer data ownership to PDFiumDocument; password auto-freed at scope exit
    const dataPtr = dataAlloc.take();

    onProgress?.(1.0);

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
   * Get the configured resource limits.
   */
  get limits(): Readonly<Required<PDFiumLimits>> {
    return this.#limits;
  }

  /**
   * Internal access for testing and advanced usage.
   *
   * @internal
   */
  get [INTERNAL](): { module: PDFiumWASM; memory: WASMMemoryManager } {
    this.ensureNotDisposed();
    return { module: this.#module, memory: this.#memory };
  }

  protected disposeInternal(): void {
    if (this.#libraryInitialised) {
      this.#module._FPDF_DestroyLibrary();
      this.#libraryInitialised = false;
    }
    this.#memory.freeAll();
  }
}
