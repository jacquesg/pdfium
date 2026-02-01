/**
 * PDF page handling with automatic resource management.
 *
 * @module document/page
 */

import { Disposable } from '../core/disposable.js';
import { PDFiumErrorCode, RenderError, TextError } from '../core/errors.js';
import type { PageSize, RenderOptions, RenderResult, WASMPointer } from '../core/types.js';
import { BitmapFormat, type PDFiumWASM, RenderFlags } from '../wasm/bindings.js';
import type { WASMMemoryManager } from '../wasm/memory.js';

/**
 * Default background colour (white with full opacity).
 */
const DEFAULT_BACKGROUND_COLOUR = 0xffffffff;

/**
 * Represents a single page in a PDF document.
 *
 * Pages are loaded lazily and must be disposed when no longer needed.
 * Use the `using` keyword for automatic disposal.
 *
 * @example
 * ```typescript
 * using page = document.getPage(0);
 * const size = page.size;
 * console.log(`Page size: ${size.width}x${size.height}`);
 * ```
 */
export class PDFiumPage extends Disposable {
  readonly #module: PDFiumWASM;
  readonly #memory: WASMMemoryManager;
  readonly #pageHandle: number;
  readonly #pageIndex: number;
  readonly #formHandle: number;
  #textPageHandle: number = 0;

  constructor(
    module: PDFiumWASM,
    memory: WASMMemoryManager,
    _documentHandle: number,
    pageHandle: number,
    pageIndex: number,
    formHandle: number,
  ) {
    super('PDFiumPage');
    this.#module = module;
    this.#memory = memory;
    this.#pageHandle = pageHandle;
    this.#pageIndex = pageIndex;
    this.#formHandle = formHandle;
  }

  /**
   * The zero-based index of this page.
   */
  get index(): number {
    return this.#pageIndex;
  }

  /**
   * Get the page dimensions in points (1/72 inch).
   */
  get size(): PageSize {
    this.ensureNotDisposed();
    return {
      width: this.#module._FPDF_GetPageWidth(this.#pageHandle),
      height: this.#module._FPDF_GetPageHeight(this.#pageHandle),
    };
  }

  /**
   * Get the width of the page in points.
   */
  get width(): number {
    this.ensureNotDisposed();
    return this.#module._FPDF_GetPageWidth(this.#pageHandle);
  }

  /**
   * Get the height of the page in points.
   */
  get height(): number {
    this.ensureNotDisposed();
    return this.#module._FPDF_GetPageHeight(this.#pageHandle);
  }

  /**
   * Render the page to a bitmap.
   *
   * @param options - Rendering options
   * @returns The rendered bitmap data
   * @throws {RenderError} If rendering fails
   */
  render(options: RenderOptions = {}): RenderResult {
    this.ensureNotDisposed();

    const pageWidth = this.#module._FPDF_GetPageWidth(this.#pageHandle);
    const pageHeight = this.#module._FPDF_GetPageHeight(this.#pageHandle);

    // Calculate render dimensions
    let renderWidth: number;
    let renderHeight: number;

    if (options.width !== undefined && options.height !== undefined) {
      renderWidth = options.width;
      renderHeight = options.height;
    } else if (options.width !== undefined) {
      renderWidth = options.width;
      renderHeight = Math.round((options.width / pageWidth) * pageHeight);
    } else if (options.height !== undefined) {
      renderHeight = options.height;
      renderWidth = Math.round((options.height / pageHeight) * pageWidth);
    } else {
      const scale = options.scale ?? 1;
      renderWidth = Math.round(pageWidth * scale);
      renderHeight = Math.round(pageHeight * scale);
    }

    // Allocate bitmap buffer (BGRA format = 4 bytes per pixel)
    const stride = renderWidth * 4;
    const bufferSize = stride * renderHeight;

    let bufferPtr: WASMPointer;
    try {
      bufferPtr = this.#memory.malloc(bufferSize);
    } catch (error) {
      throw new RenderError(PDFiumErrorCode.RENDER_BITMAP_FAILED, 'Failed to allocate bitmap buffer', {
        width: renderWidth,
        height: renderHeight,
        cause: error,
      });
    }

    try {
      // Create bitmap
      const bitmapHandle = this.#module._FPDFBitmap_CreateEx(
        renderWidth,
        renderHeight,
        BitmapFormat.BGRA,
        bufferPtr,
        stride,
      );

      if (bitmapHandle === 0) {
        this.#memory.free(bufferPtr);
        throw new RenderError(PDFiumErrorCode.RENDER_BITMAP_FAILED, 'Failed to create bitmap', {
          width: renderWidth,
          height: renderHeight,
        });
      }

      try {
        // Fill with background colour
        const bgColour = options.backgroundColour ?? DEFAULT_BACKGROUND_COLOUR;
        this.#module._FPDFBitmap_FillRect(bitmapHandle, 0, 0, renderWidth, renderHeight, bgColour);

        // Render page
        const flags = RenderFlags.ANNOT;
        this.#module._FPDF_RenderPageBitmap(
          bitmapHandle,
          this.#pageHandle,
          0,
          0,
          renderWidth,
          renderHeight,
          0,
          flags,
        );

        // Render form fields if requested
        if (options.renderFormFields && this.#formHandle !== 0) {
          this.#module._FPDF_FFLDraw(
            this.#formHandle,
            bitmapHandle,
            this.#pageHandle,
            0,
            0,
            renderWidth,
            renderHeight,
            0,
            flags,
          );
        }

        // Convert BGRA to RGBA and copy to JavaScript
        const data = this.#convertBGRAtoRGBA(bufferPtr, bufferSize);

        return {
          width: renderWidth,
          height: renderHeight,
          originalWidth: pageWidth,
          originalHeight: pageHeight,
          data,
        };
      } finally {
        this.#module._FPDFBitmap_Destroy(bitmapHandle);
      }
    } finally {
      this.#memory.free(bufferPtr);
    }
  }

  /**
   * Convert BGRA buffer to RGBA.
   */
  #convertBGRAtoRGBA(ptr: WASMPointer, size: number): Uint8Array {
    const source = this.#memory.copyFromWASM(ptr, size);
    const result = new Uint8Array(size);

    // Swap B and R channels
    for (let i = 0; i < size; i += 4) {
      result[i] = source[i + 2] ?? 0; // R <- B
      result[i + 1] = source[i + 1] ?? 0; // G <- G
      result[i + 2] = source[i] ?? 0; // B <- R
      result[i + 3] = source[i + 3] ?? 0; // A <- A
    }

    return result;
  }

  /**
   * Extract text content from the page.
   *
   * @returns The extracted text
   * @throws {TextError} If text extraction fails
   */
  getText(): string {
    this.ensureNotDisposed();

    // Load text page if not already loaded
    if (this.#textPageHandle === 0) {
      this.#textPageHandle = this.#module._FPDFText_LoadPage(this.#pageHandle);
      if (this.#textPageHandle === 0) {
        throw new TextError(PDFiumErrorCode.TEXT_LOAD_FAILED, 'Failed to load text page');
      }
    }

    const charCount = this.#module._FPDFText_CountChars(this.#textPageHandle);
    if (charCount <= 0) {
      return '';
    }

    // Allocate buffer for UTF-16LE text (2 bytes per char + null terminator)
    const bufferSize = (charCount + 1) * 2;
    let bufferPtr: WASMPointer;
    try {
      bufferPtr = this.#memory.malloc(bufferSize);
    } catch (error) {
      throw new TextError(PDFiumErrorCode.TEXT_EXTRACTION_FAILED, 'Failed to allocate text buffer', {
        cause: error,
      });
    }

    try {
      const extractedCount = this.#module._FPDFText_GetText(this.#textPageHandle, 0, charCount, bufferPtr);
      if (extractedCount <= 0) {
        return '';
      }

      // Read UTF-16LE text (-1 to exclude null terminator)
      return this.#memory.readUTF16LE(bufferPtr, extractedCount - 1);
    } finally {
      this.#memory.free(bufferPtr);
    }
  }

  /**
   * Get the number of objects on this page.
   */
  get objectCount(): number {
    this.ensureNotDisposed();
    return this.#module._FPDFPage_CountObjects(this.#pageHandle);
  }

  /**
   * Get the internal page handle for advanced usage.
   *
   * @internal
   */
  get handle(): number {
    this.ensureNotDisposed();
    return this.#pageHandle;
  }

  protected disposeInternal(): void {
    // Close text page if loaded
    if (this.#textPageHandle !== 0) {
      this.#module._FPDFText_ClosePage(this.#textPageHandle);
      this.#textPageHandle = 0;
    }

    // Notify form system before closing page
    if (this.#formHandle !== 0) {
      this.#module._FORM_OnBeforeClosePage(this.#pageHandle, this.#formHandle);
    }

    // Close the page
    this.#module._FPDF_ClosePage(this.#pageHandle);
  }
}
