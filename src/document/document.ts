/**
 * PDF document handling with automatic resource management.
 *
 * @module document/document
 */

import { Disposable } from '../core/disposable.js';
import { MemoryError, PageError, PDFiumErrorCode } from '../core/errors.js';
import type { WASMPointer } from '../core/types.js';
import type { PDFiumWASM } from '../wasm/bindings.js';
import { NULL_PTR, type WASMMemoryManager } from '../wasm/memory.js';
import { PDFiumPage } from './page.js';

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
  readonly #documentHandle: number;
  readonly #dataPtr: WASMPointer;
  #formHandle: number = 0;
  #formInfoPtr: WASMPointer = NULL_PTR;

  constructor(module: PDFiumWASM, memory: WASMMemoryManager, documentHandle: number, dataPtr: WASMPointer) {
    super('PDFiumDocument');
    this.#module = module;
    this.#memory = memory;
    this.#documentHandle = documentHandle;
    this.#dataPtr = dataPtr;

    // Initialise form fill environment
    this.#initFormFillEnvironment();
  }

  /**
   * Initialise the form fill environment for rendering interactive form fields.
   */
  #initFormFillEnvironment(): void {
    // Allocate FPDF_FORMFILLINFO structure
    let formInfoPtr: WASMPointer;
    try {
      formInfoPtr = this.#memory.malloc(FORM_FILL_INFO_SIZE);
    } catch (error) {
      // Form fill is optional - continue without it if allocation fails
      if (error instanceof MemoryError) {
        return;
      }
      throw error;
    }
    this.#formInfoPtr = formInfoPtr;

    // Zero out the structure (required - callback pointers must be null)
    this.#memory.heapU8.fill(0, this.#formInfoPtr, this.#formInfoPtr + FORM_FILL_INFO_SIZE);

    // Set version to 2 (supports XFA and other features)
    this.#memory.writeInt32(this.#formInfoPtr, 2);

    // Initialise form fill environment
    this.#formHandle = this.#module._FPDFDOC_InitFormFillEnvironment(this.#documentHandle, this.#formInfoPtr);

    // If initialisation failed, clean up and continue without form support
    if (this.#formHandle === 0) {
      this.#memory.free(this.#formInfoPtr);
      this.#formInfoPtr = NULL_PTR;
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

    const pageCount = this.#module._FPDF_GetPageCount(this.#documentHandle);

    if (pageIndex < 0 || pageIndex >= pageCount) {
      throw new PageError(PDFiumErrorCode.PAGE_INDEX_OUT_OF_RANGE, `Page index ${pageIndex} out of range [0, ${pageCount})`, {
        requestedIndex: pageIndex,
        pageCount,
      });
    }

    const pageHandle = this.#module._FPDF_LoadPage(this.#documentHandle, pageIndex);
    if (pageHandle === 0) {
      throw new PageError(PDFiumErrorCode.PAGE_LOAD_FAILED, `Failed to load page ${pageIndex}`, {
        requestedIndex: pageIndex,
      });
    }

    // Notify form system after loading page
    if (this.#formHandle !== 0) {
      this.#module._FORM_OnAfterLoadPage(pageHandle, this.#formHandle);
    }

    return new PDFiumPage(this.#module, this.#memory, this.#documentHandle, pageHandle, pageIndex, this.#formHandle);
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
   * Get the internal document handle for advanced usage.
   *
   * @internal
   */
  get handle(): number {
    this.ensureNotDisposed();
    return this.#documentHandle;
  }

  /**
   * Get the form handle for advanced usage.
   *
   * @internal
   */
  get formHandle(): number {
    this.ensureNotDisposed();
    return this.#formHandle;
  }

  protected disposeInternal(): void {
    // Exit form fill environment
    if (this.#formHandle !== 0) {
      this.#module._FPDFDOC_ExitFormFillEnvironment(this.#formHandle);
      this.#formHandle = 0;
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
