/**
 * PDF document creation from scratch.
 *
 * @module document/builder
 */

import { Disposable } from '../core/disposable.js';
import { DocumentError, PDFiumErrorCode } from '../core/errors.js';
import {
  type DocumentHandle,
  type FontHandle,
  type PageHandle,
  type PageObjectHandle,
  type SaveOptions,
  type ShapeStyle,
} from '../core/types.js';
import type { PDFiumWASM } from '../wasm/bindings.js';
import { asHandle, encodeUTF16LE, type WASMMemoryManager } from '../wasm/memory.js';
import { saveDocument } from './save-utils.js';

/** Default page dimensions (US Letter in points). */
const DEFAULT_PAGE_WIDTH = 612;
const DEFAULT_PAGE_HEIGHT = 792;

/**
 * Builder for creating new PDF documents from scratch.
 *
 * @example
 * ```typescript
 * using builder = pdfium.createDocument();
 * builder.addPage();
 * const bytes = builder.save();
 * ```
 */
export class PDFiumDocumentBuilder extends Disposable {
  readonly #module: PDFiumWASM;
  readonly #memory: WASMMemoryManager;
  readonly #documentHandle: DocumentHandle;
  readonly #pages: PageHandle[] = [];
  readonly #fonts: FontHandle[] = [];

  constructor(module: PDFiumWASM, memory: WASMMemoryManager) {
    super('PDFiumDocumentBuilder');

    this.#module = module;
    this.#memory = memory;

    const handle = module._FPDF_CreateNewDocument();
    if (handle === asHandle<DocumentHandle>(0)) {
      throw new DocumentError(PDFiumErrorCode.DOC_CREATE_FAILED, 'Failed to create new document');
    }
    this.#documentHandle = handle;

    this.setFinalizerCleanup(() => {
      for (const page of this.#pages) {
        this.#module._FPDF_ClosePage(page);
      }
      for (const font of this.#fonts) {
        this.#module._FPDFFont_Close(font);
      }
      this.#module._FPDF_CloseDocument(this.#documentHandle);
    });
  }

  /**
   * Get the internal document handle.
   *
   * @internal
   */
  get handle(): DocumentHandle {
    this.ensureNotDisposed();
    return this.#documentHandle;
  }

  /**
   * Get the number of pages in the document.
   */
  get pageCount(): number {
    this.ensureNotDisposed();
    return this.#module._FPDF_GetPageCount(this.#documentHandle);
  }

  /**
   * Add a new page to the document.
   *
   * @param options - Page dimensions (default: US Letter 612x792 points)
   * @returns A page builder for adding content
   */
  addPage(options?: { width?: number; height?: number }): PDFiumPageBuilder {
    this.ensureNotDisposed();

    const width = options?.width ?? DEFAULT_PAGE_WIDTH;
    const height = options?.height ?? DEFAULT_PAGE_HEIGHT;
    const pageIndex = this.pageCount;

    const pageHandle = this.#module._FPDFPage_New(this.#documentHandle, pageIndex, width, height);
    if (pageHandle === asHandle<PageHandle>(0)) {
      throw new DocumentError(PDFiumErrorCode.DOC_CREATE_FAILED, 'Failed to create new page');
    }

    this.#pages.push(pageHandle);
    return new PDFiumPageBuilder(this.#module, this.#memory, pageHandle, this.#documentHandle);
  }

  /**
   * Delete a page by index.
   *
   * @param pageIndex - Zero-based page index to delete
   */
  deletePage(pageIndex: number): void {
    this.ensureNotDisposed();

    const count = this.pageCount;
    if (pageIndex < 0 || pageIndex >= count) {
      throw new DocumentError(
        PDFiumErrorCode.DOC_FORMAT_INVALID,
        `Page index ${pageIndex} out of range [0, ${count})`,
      );
    }

    // Close the page handle if we have it
    const removed = this.#pages.splice(pageIndex, 1);
    for (const page of removed) {
      this.#module._FPDF_ClosePage(page);
    }

    this.#module._FPDFPage_Delete(this.#documentHandle, pageIndex);
  }

  /**
   * Load a standard PDF font (e.g., "Helvetica", "Times-Roman", "Courier").
   *
   * @param fontName - Standard font name
   * @returns A font handle for use with page builder's addText method
   */
  loadStandardFont(fontName: string): FontHandle {
    this.ensureNotDisposed();

    using nameAlloc = this.#memory.allocString(fontName);
    const font = this.#module._FPDFText_LoadStandardFont(this.#documentHandle, nameAlloc.ptr);
    if (font === asHandle<FontHandle>(0)) {
      throw new DocumentError(PDFiumErrorCode.DOC_FORMAT_INVALID, `Failed to load standard font: ${fontName}`);
    }

    this.#fonts.push(font);
    return font;
  }

  /**
   * Save the document to a byte array.
   *
   * @param options - Save options
   * @returns The serialised PDF bytes
   */
  save(options: SaveOptions = {}): Uint8Array {
    this.ensureNotDisposed();

    // Generate content for all pages that haven't been finalised
    for (const page of this.#pages) {
      this.#module._FPDFPage_GenerateContent(page);
    }

    return saveDocument(this.#module, this.#memory, this.#documentHandle, options);
  }

  protected disposeInternal(): void {
    // Close pages first, then fonts, then the document
    for (const page of this.#pages) {
      this.#module._FPDF_ClosePage(page);
    }
    this.#pages.length = 0;

    for (const font of this.#fonts) {
      this.#module._FPDFFont_Close(font);
    }
    this.#fonts.length = 0;

    this.#module._FPDF_CloseDocument(this.#documentHandle);
  }
}

/**
 * Builder for adding content to a PDF page.
 */
export class PDFiumPageBuilder {
  readonly #module: PDFiumWASM;
  readonly #memory: WASMMemoryManager;
  readonly #pageHandle: PageHandle;
  readonly #documentHandle: DocumentHandle;

  constructor(
    module: PDFiumWASM,
    memory: WASMMemoryManager,
    pageHandle: PageHandle,
    documentHandle: DocumentHandle,
  ) {
    this.#module = module;
    this.#memory = memory;
    this.#pageHandle = pageHandle;
    this.#documentHandle = documentHandle;
  }

  /**
   * Add a rectangle to the page.
   *
   * @param x - Left position in points
   * @param y - Bottom position in points
   * @param w - Width in points
   * @param h - Height in points
   * @param style - Fill and stroke style options
   */
  addRectangle(x: number, y: number, w: number, h: number, style?: ShapeStyle): void {
    const obj = this.#module._FPDFPageObj_CreateNewRect(x, y, w, h);
    if (obj === asHandle<PageObjectHandle>(0)) {
      throw new DocumentError(PDFiumErrorCode.DOC_CREATE_FAILED, 'Failed to create rectangle');
    }

    this.#applyShapeStyle(obj, style);
    this.#module._FPDFPage_InsertObject(this.#pageHandle, obj);
  }

  /**
   * Add a text object to the page.
   *
   * @param text - The text content
   * @param x - X position in points
   * @param y - Y position in points
   * @param font - Font handle from builder.loadStandardFont()
   * @param fontSize - Font size in points
   */
  addText(text: string, x: number, y: number, font: FontHandle, fontSize: number): void {
    const textObj = this.#module._FPDFPageObj_CreateTextObj(this.#documentHandle, font, fontSize);
    if (textObj === asHandle<PageObjectHandle>(0)) {
      throw new DocumentError(PDFiumErrorCode.DOC_CREATE_FAILED, 'Failed to create text object');
    }

    // Encode text as UTF-16LE for PDFium
    const encoded = encodeUTF16LE(text);
    using textBuf = this.#memory.allocFrom(encoded);
    this.#module._FPDFText_SetText(textObj, textBuf.ptr);

    // Position the text object using a translation transform
    this.#module._FPDFPageObj_Transform(textObj, 1, 0, 0, 1, x, y);

    this.#module._FPDFPage_InsertObject(this.#pageHandle, textObj);
  }

  /**
   * Generate the page content stream. Call after adding all objects.
   */
  generateContent(): void {
    this.#module._FPDFPage_GenerateContent(this.#pageHandle);
  }

  #applyShapeStyle(obj: PageObjectHandle, style?: ShapeStyle): void {
    if (style?.fill) {
      const c = style.fill;
      if (!this.#module._FPDFPageObj_SetFillColor(obj, c.r, c.g, c.b, c.a)) {
        throw new DocumentError(PDFiumErrorCode.DOC_CREATE_FAILED, 'Failed to set fill colour');
      }
    }
    if (style?.stroke) {
      const c = style.stroke;
      if (!this.#module._FPDFPageObj_SetStrokeColor(obj, c.r, c.g, c.b, c.a)) {
        throw new DocumentError(PDFiumErrorCode.DOC_CREATE_FAILED, 'Failed to set stroke colour');
      }
    }
    if (style?.strokeWidth !== undefined) {
      this.#module._FPDFPageObj_SetStrokeWidth(obj, style.strokeWidth);
    }
  }
}
