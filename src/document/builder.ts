/**
 * PDF document creation from scratch.
 *
 * @module document/builder
 */

import { Disposable } from '../core/disposable.js';
import { DocumentError, PDFiumErrorCode } from '../core/errors.js';
import type { SaveOptions, ShapeStyle } from '../core/types.js';
import type { DocumentHandle, FontHandle, PageHandle, PageObjectHandle } from '../internal/handles.js';
import { INTERNAL } from '../internal/symbols.js';
import type { PDFiumWASM } from '../wasm/bindings/index.js';
import { asHandle, encodeUTF16LE, type WASMMemoryManager } from '../wasm/memory.js';
import { PDFiumBuilderFont } from './builder-font.js';
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
  readonly #fonts: PDFiumBuilderFont[] = [];
  readonly #pageBuilders: PDFiumPageBuilder[] = [];

  /** @internal */
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
      for (const builder of this.#pageBuilders) {
        if (!builder.disposed) builder.dispose();
      }
      for (const page of this.#pages) {
        this.#module._FPDF_ClosePage(page);
      }
      for (const font of this.#fonts) {
        this.#module._FPDFFont_Close(font[INTERNAL].handle);
      }
      this.#module._FPDF_CloseDocument(this.#documentHandle);
    });
  }

  /**
   * Internal access for testing and advanced usage.
   *
   * @internal
   */
  get [INTERNAL](): { handle: DocumentHandle } {
    this.ensureNotDisposed();
    return { handle: this.#documentHandle };
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

    if (!Number.isFinite(width) || width <= 0) {
      throw new DocumentError(PDFiumErrorCode.DOC_CREATE_FAILED, 'Page width must be a positive finite number');
    }
    if (!Number.isFinite(height) || height <= 0) {
      throw new DocumentError(PDFiumErrorCode.DOC_CREATE_FAILED, 'Page height must be a positive finite number');
    }

    const pageIndex = this.pageCount;

    const pageHandle = this.#module._FPDFPage_New(this.#documentHandle, pageIndex, width, height);
    if (pageHandle === asHandle<PageHandle>(0)) {
      throw new DocumentError(PDFiumErrorCode.DOC_CREATE_FAILED, 'Failed to create new page');
    }

    this.#pages.push(pageHandle);
    const builder = new PDFiumPageBuilder(this.#module, this.#memory, pageHandle, this.#documentHandle);
    this.#pageBuilders.push(builder);
    return builder;
  }

  /**
   * Delete a page by index.
   *
   * @param pageIndex - Zero-based page index to delete
   */
  deletePage(pageIndex: number): void {
    this.ensureNotDisposed();

    if (!Number.isSafeInteger(pageIndex)) {
      throw new DocumentError(
        PDFiumErrorCode.DOC_FORMAT_INVALID,
        `Page index must be a safe integer, got ${pageIndex}`,
      );
    }

    const count = this.pageCount;
    if (pageIndex < 0 || pageIndex >= count) {
      throw new DocumentError(PDFiumErrorCode.DOC_FORMAT_INVALID, `Page index ${pageIndex} out of range [0, ${count})`);
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
  loadStandardFont(fontName: string): PDFiumBuilderFont {
    this.ensureNotDisposed();

    if (!fontName) {
      throw new DocumentError(PDFiumErrorCode.DOC_FORMAT_INVALID, 'Font name must not be empty');
    }

    using nameAlloc = this.#memory.allocString(fontName);
    const handle = this.#module._FPDFText_LoadStandardFont(this.#documentHandle, nameAlloc.ptr);
    if (handle === asHandle<FontHandle>(0)) {
      throw new DocumentError(PDFiumErrorCode.DOC_FORMAT_INVALID, `Failed to load standard font: ${fontName}`);
    }

    const font = new PDFiumBuilderFont(handle, fontName);
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
    // Dispose page builders first, then close pages, fonts, document
    for (const builder of this.#pageBuilders) {
      if (!builder.disposed) builder.dispose();
    }
    this.#pageBuilders.length = 0;

    for (const page of this.#pages) {
      this.#module._FPDF_ClosePage(page);
    }
    this.#pages.length = 0;

    for (const font of this.#fonts) {
      this.#module._FPDFFont_Close(font[INTERNAL].handle);
    }
    this.#fonts.length = 0;

    this.#module._FPDF_CloseDocument(this.#documentHandle);
  }
}

/**
 * Builder for adding content to a PDF page.
 *
 * Obtained from {@link PDFiumDocumentBuilder.addPage}. Use method chaining
 * to add shapes, text, and other page objects.
 *
 * Content is generated automatically when the document is saved — there is
 * no need to call `generateContent()` on builder pages.
 *
 * @example
 * ```typescript
 * using builder = pdfium.createDocument();
 * const page = builder.addPage({ width: 595, height: 842 });
 * const font = builder.loadStandardFont('Helvetica');
 * page
 *   .addRectangle(50, 700, 200, 100, { fill: { r: 200, g: 220, b: 255, a: 255 } })
 *   .addText('Hello, PDF!', 60, 750, font, 24);
 * const bytes = builder.save();
 * ```
 */
export class PDFiumPageBuilder extends Disposable {
  readonly #module: PDFiumWASM;
  readonly #memory: WASMMemoryManager;
  readonly #pageHandle: PageHandle;
  readonly #documentHandle: DocumentHandle;

  /** @internal */
  constructor(module: PDFiumWASM, memory: WASMMemoryManager, pageHandle: PageHandle, documentHandle: DocumentHandle) {
    super('PDFiumPageBuilder');
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
   * @returns this for method chaining
   */
  addRectangle(x: number, y: number, w: number, h: number, style?: ShapeStyle): this {
    this.ensureNotDisposed();
    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
      throw new DocumentError(
        PDFiumErrorCode.DOC_CREATE_FAILED,
        'Rectangle width and height must be positive finite numbers',
      );
    }

    const obj = this.#module._FPDFPageObj_CreateNewRect(x, y, w, h);
    if (obj === asHandle<PageObjectHandle>(0)) {
      throw new DocumentError(PDFiumErrorCode.DOC_CREATE_FAILED, 'Failed to create rectangle');
    }

    this.#applyShapeStyle(obj, style);
    this.#module._FPDFPage_InsertObject(this.#pageHandle, obj);
    return this;
  }

  /**
   * Add a text object to the page.
   *
   * @param text - The text content
   * @param x - X position in points
   * @param y - Y position in points
   * @param font - Font from builder.loadStandardFont()
   * @param fontSize - Font size in points
   * @returns this for method chaining
   */
  addText(text: string, x: number, y: number, font: PDFiumBuilderFont, fontSize: number): this {
    this.ensureNotDisposed();
    if (!Number.isFinite(fontSize) || fontSize <= 0) {
      throw new DocumentError(PDFiumErrorCode.DOC_CREATE_FAILED, 'Font size must be a positive finite number');
    }

    const textObj = this.#module._FPDFPageObj_CreateTextObj(this.#documentHandle, font[INTERNAL].handle, fontSize);
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
    return this;
  }

  /**
   * No-op: the page handle is owned by {@link PDFiumDocumentBuilder}.
   * Disposing the page builder only prevents further modifications.
   */
  protected disposeInternal(): void {
    // Page handle lifetime is managed by PDFiumDocumentBuilder
  }

  #applyShapeStyle(obj: PageObjectHandle, style?: ShapeStyle): void {
    let fillMode = 0; // None
    let strokeMode = 0; // No stroke

    if (style?.fill) {
      fillMode = 1; // Alternate (default)
      const c = style.fill;
      if (!this.#module._FPDFPageObj_SetFillColor(obj, c.r, c.g, c.b, c.a)) {
        throw new DocumentError(PDFiumErrorCode.DOC_CREATE_FAILED, 'Failed to set fill colour');
      }
    }

    if (style?.stroke) {
      strokeMode = 1;
      const c = style.stroke;
      if (!this.#module._FPDFPageObj_SetStrokeColor(obj, c.r, c.g, c.b, c.a)) {
        throw new DocumentError(PDFiumErrorCode.DOC_CREATE_FAILED, 'Failed to set stroke colour');
      }
    }

    if (style?.strokeWidth !== undefined) {
      this.#module._FPDFPageObj_SetStrokeWidth(obj, style.strokeWidth);
    }

    // Apply draw mode if there is any style
    if (fillMode !== 0 || strokeMode !== 0) {
      if (!this.#module._FPDFPath_SetDrawMode(obj, fillMode, strokeMode)) {
        throw new DocumentError(PDFiumErrorCode.DOC_CREATE_FAILED, 'Failed to set path draw mode');
      }
    }
  }
}
