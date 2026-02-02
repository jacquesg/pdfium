/**
 * PDF page handling with automatic resource management.
 *
 * @module document/page
 */

import { Disposable } from '../core/disposable.js';
import { PageError, PDFiumErrorCode, RenderError, TextError } from '../core/errors.js';
import {
  AnnotationType,
  DEFAULT_LIMITS,
  PageRotation,
  TextSearchFlags,
  type Annotation,
  type AnnotationHandle,
  type BitmapHandle,
  type FormHandle,
  type PDFiumLimits,
  type PageHandle,
  type PageSize,
  type RenderOptions,
  type RenderResult,
  type SearchHandle,
  type StructElementHandle,
  type StructTreeHandle,
  type StructureElement,
  type TextPageHandle,
  type TextRect,
  type TextSearchResult,
  type WASMPointer,
} from '../core/types.js';
import { NativeHandle, WASMAllocation } from '../wasm/allocation.js';
import { BitmapFormat, type PDFiumWASM, RenderFlags } from '../wasm/bindings.js';
import { asHandle, encodeUTF16LE, NULL_PTR, ptrOffset, type WASMMemoryManager } from '../wasm/memory.js';

/**
 * Default background colour (white with full opacity).
 */
const DEFAULT_BACKGROUND_COLOUR = 0xffffffff;

/** Set of valid AnnotationType values for runtime validation. */
const VALID_ANNOTATION_TYPES = new Set<number>(Object.values(AnnotationType).filter((v): v is number => typeof v === 'number'));

/** Maximum recursion depth for structure tree traversal. */
const MAX_STRUCT_TREE_DEPTH = 100;

/** Null handle constants. */
const NULL_FORM: FormHandle = asHandle<FormHandle>(0);
const NULL_TEXT_PAGE: TextPageHandle = asHandle<TextPageHandle>(0);
const NULL_ANNOT: AnnotationHandle = asHandle<AnnotationHandle>(0);
const NULL_SEARCH: SearchHandle = asHandle<SearchHandle>(0);
const NULL_STRUCT_TREE: StructTreeHandle = asHandle<StructTreeHandle>(0);
const NULL_STRUCT_ELEMENT: StructElementHandle = asHandle<StructElementHandle>(0);

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
  readonly #pageHandle: PageHandle;
  readonly #pageIndex: number;
  readonly #formHandle: FormHandle;
  readonly #limits: Readonly<Required<PDFiumLimits>>;
  readonly #width: number;
  readonly #height: number;
  readonly #deregister: ((page: PDFiumPage) => void) | undefined;
  #textPageHandle: TextPageHandle = NULL_TEXT_PAGE;

  /** @internal */
  constructor(
    module: PDFiumWASM,
    memory: WASMMemoryManager,
    pageHandle: PageHandle,
    pageIndex: number,
    formHandle: FormHandle,
    limits?: Readonly<Required<PDFiumLimits>>,
    deregister?: (page: PDFiumPage) => void,
  ) {
    super('PDFiumPage', PDFiumErrorCode.PAGE_ALREADY_CLOSED);
    this.#module = module;
    this.#memory = memory;
    this.#pageHandle = pageHandle;
    this.#pageIndex = pageIndex;
    this.#formHandle = formHandle;
    this.#limits = limits ?? DEFAULT_LIMITS;
    this.#deregister = deregister;
    this.#width = this.#module._FPDF_GetPageWidth(this.#pageHandle);
    this.#height = this.#module._FPDF_GetPageHeight(this.#pageHandle);

    // Register finalizer cleanup for safety-net GC disposal
    this.setFinalizerCleanup(() => {
      if (this.#textPageHandle !== NULL_TEXT_PAGE) {
        this.#module._FPDFText_ClosePage(this.#textPageHandle);
      }
      if (this.#formHandle !== NULL_FORM) {
        this.#module._FORM_OnBeforeClosePage(this.#pageHandle, this.#formHandle);
      }
      this.#module._FPDF_ClosePage(this.#pageHandle);
    });
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
    return { width: this.#width, height: this.#height };
  }

  /**
   * Get the width of the page in points.
   */
  get width(): number {
    this.ensureNotDisposed();
    return this.#width;
  }

  /**
   * Get the height of the page in points.
   */
  get height(): number {
    this.ensureNotDisposed();
    return this.#height;
  }

  /**
   * Get the page rotation as stored in the PDF.
   */
  get rotation(): PageRotation {
    this.ensureNotDisposed();
    const raw = this.#module._FPDFPage_GetRotation(this.#pageHandle);
    if (raw >= 0 && raw <= 3) {
      return raw as PageRotation;
    }
    return PageRotation.None;
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

    const pageWidth = this.#width;
    const pageHeight = this.#height;

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

    // Validate render dimensions (NaN, Infinity, non-positive)
    if (!Number.isFinite(renderWidth) || !Number.isFinite(renderHeight)) {
      throw new RenderError(PDFiumErrorCode.RENDER_INVALID_DIMENSIONS, 'Render dimensions must be finite numbers', {
        width: renderWidth,
        height: renderHeight,
      });
    }
    if (renderWidth <= 0 || renderHeight <= 0) {
      throw new RenderError(PDFiumErrorCode.RENDER_INVALID_DIMENSIONS, 'Render dimensions must be positive', {
        width: renderWidth,
        height: renderHeight,
      });
    }
    if (renderWidth > this.#limits.maxRenderDimension || renderHeight > this.#limits.maxRenderDimension) {
      throw new RenderError(
        PDFiumErrorCode.RENDER_INVALID_DIMENSIONS,
        `Render dimensions ${renderWidth}x${renderHeight} exceed maximum of ${this.#limits.maxRenderDimension}`,
        { width: renderWidth, height: renderHeight, maxDimension: this.#limits.maxRenderDimension },
      );
    }

    // Guard against integer overflow in buffer size calculation
    if (renderWidth > Number.MAX_SAFE_INTEGER / (renderHeight * 4)) {
      throw new RenderError(PDFiumErrorCode.RENDER_INVALID_DIMENSIONS, 'Render dimensions would cause integer overflow', {
        width: renderWidth,
        height: renderHeight,
      });
    }

    // Allocate bitmap buffer (BGRA format = 4 bytes per pixel)
    const stride = renderWidth * 4;
    const bufferSize = stride * renderHeight;

    let bufferAlloc: WASMAllocation;
    try {
      bufferAlloc = this.#memory.alloc(bufferSize);
    } catch (error) {
      throw new RenderError(PDFiumErrorCode.RENDER_BITMAP_FAILED, 'Failed to allocate bitmap buffer', {
        width: renderWidth,
        height: renderHeight,
        cause: error,
      });
    }
    using _buffer = bufferAlloc;

    // Create bitmap
    const bitmapHandle = this.#module._FPDFBitmap_CreateEx(
      renderWidth,
      renderHeight,
      BitmapFormat.BGRA,
      bufferAlloc.ptr,
      stride,
    );

    if (bitmapHandle === asHandle<BitmapHandle>(0)) {
      throw new RenderError(PDFiumErrorCode.RENDER_BITMAP_FAILED, 'Failed to create bitmap', {
        width: renderWidth,
        height: renderHeight,
      });
    }

    using _bitmap = new NativeHandle<BitmapHandle>(bitmapHandle, (h) => this.#module._FPDFBitmap_Destroy(h));

    // Fill with background colour
    const bgColour = options.backgroundColour ?? DEFAULT_BACKGROUND_COLOUR;
    this.#module._FPDFBitmap_FillRect(bitmapHandle, 0, 0, renderWidth, renderHeight, bgColour);

    // Render page
    const flags = RenderFlags.ANNOT;
    const rotation = options.rotation ?? PageRotation.None;
    this.#module._FPDF_RenderPageBitmap(
      bitmapHandle,
      this.#pageHandle,
      0,
      0,
      renderWidth,
      renderHeight,
      rotation,
      flags,
    );

    // Render form fields if requested
    if (options.renderFormFields && this.#formHandle !== NULL_FORM) {
      this.#module._FPDF_FFLDraw(
        this.#formHandle,
        bitmapHandle,
        this.#pageHandle,
        0,
        0,
        renderWidth,
        renderHeight,
        rotation,
        flags,
      );
    }

    // Convert BGRA to RGBA and copy to JavaScript
    const data = this.#convertBGRAtoRGBA(bufferAlloc.ptr, bufferSize);

    return {
      width: renderWidth,
      height: renderHeight,
      originalWidth: pageWidth,
      originalHeight: pageHeight,
      data,
    };
    // _bitmap destroyed first (LIFO), then _buffer freed
  }

  /**
   * Convert BGRA buffer to RGBA using a single-pass zero-copy approach.
   *
   * Reads directly from the WASM heap (via subarray) and writes into a
   * single output buffer, avoiding the double-copy of copyFromWASM + loop.
   */
  #convertBGRAtoRGBA(ptr: WASMPointer, size: number): Uint8Array {
    const source = this.#memory.heapU8.subarray(ptr, ptr + size);
    const result = new Uint8Array(size);

    // Swap B and R channels in a single pass
    for (let i = 0; i < size; i += 4) {
      result[i] = source[i + 2]!; // R <- B
      result[i + 1] = source[i + 1]!; // G <- G
      result[i + 2] = source[i]!; // B <- R
      result[i + 3] = source[i + 3]!; // A <- A
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
    this.#ensureTextPage();

    const charCount = this.#module._FPDFText_CountChars(this.#textPageHandle);
    if (charCount <= 0) {
      return '';
    }

    if (charCount > this.#limits.maxTextCharCount) {
      throw new TextError(
        PDFiumErrorCode.TEXT_EXTRACTION_FAILED,
        `Text character count ${charCount} exceeds maximum of ${this.#limits.maxTextCharCount}`,
        { charCount, maxTextCharCount: this.#limits.maxTextCharCount },
      );
    }

    // Allocate buffer for UTF-16LE text (2 bytes per char + null terminator)
    const bufferSize = (charCount + 1) * 2;

    let bufferAlloc: WASMAllocation;
    try {
      bufferAlloc = this.#memory.alloc(bufferSize);
    } catch (error) {
      throw new TextError(PDFiumErrorCode.TEXT_EXTRACTION_FAILED, 'Failed to allocate text buffer', {
        cause: error,
      });
    }
    using _buffer = bufferAlloc;

    const extractedCount = this.#module._FPDFText_GetText(this.#textPageHandle, 0, charCount, bufferAlloc.ptr);
    if (extractedCount <= 0) {
      return '';
    }

    // Read UTF-16LE text (-1 to exclude null terminator)
    return this.#memory.readUTF16LE(bufferAlloc.ptr, extractedCount - 1);
  }

  /**
   * Get the number of objects on this page.
   */
  get objectCount(): number {
    this.ensureNotDisposed();
    return this.#module._FPDFPage_CountObjects(this.#pageHandle);
  }

  /**
   * Get the number of annotations on this page.
   */
  get annotationCount(): number {
    this.ensureNotDisposed();
    return this.#module._FPDFPage_GetAnnotCount(this.#pageHandle);
  }

  /**
   * Get an annotation by index.
   *
   * @param index - Zero-based annotation index
   * @returns The annotation metadata
   */
  getAnnotation(index: number): Annotation {
    this.ensureNotDisposed();

    if (!Number.isSafeInteger(index)) {
      throw new PageError(PDFiumErrorCode.PAGE_INDEX_OUT_OF_RANGE, `Annotation index must be a safe integer, got ${index}`);
    }

    const count = this.#module._FPDFPage_GetAnnotCount(this.#pageHandle);
    if (index < 0 || index >= count) {
      throw new PageError(PDFiumErrorCode.ANNOT_INDEX_OUT_OF_RANGE, `Annotation index ${index} out of range [0, ${count})`);
    }

    const handle = this.#module._FPDFPage_GetAnnot(this.#pageHandle, index);
    if (handle === NULL_ANNOT) {
      throw new PageError(PDFiumErrorCode.ANNOT_LOAD_FAILED, `Failed to load annotation ${index}`);
    }

    try {
      return this.#readAnnotation(handle, index);
    } finally {
      this.#module._FPDFPage_CloseAnnot(handle);
    }
  }

  /**
   * Get all annotations on this page.
   */
  getAnnotations(): Annotation[] {
    this.ensureNotDisposed();

    const count = this.#module._FPDFPage_GetAnnotCount(this.#pageHandle);
    const annotations: Annotation[] = [];

    for (let i = 0; i < count; i++) {
      const handle = this.#module._FPDFPage_GetAnnot(this.#pageHandle, i);
      if (handle === NULL_ANNOT) {
        continue;
      }
      try {
        annotations.push(this.#readAnnotation(handle, i));
      } finally {
        this.#module._FPDFPage_CloseAnnot(handle);
      }
    }

    return annotations;
  }

  #readAnnotation(handle: AnnotationHandle, index: number): Annotation {
    const rawType = this.#module._FPDFAnnot_GetSubtype(handle);
    const type: AnnotationType = VALID_ANNOTATION_TYPES.has(rawType) ? rawType : AnnotationType.Unknown;
    const bounds = this.#readAnnotationRect(handle);
    const colour = this.#readAnnotationColour(handle);

    return { index, type, bounds, ...(colour !== undefined ? { colour } : {}) };
  }

  #readAnnotationRect(handle: AnnotationHandle): { left: number; top: number; right: number; bottom: number } {
    // FS_RECTF struct: 4 floats (left, bottom, right, top) = 16 bytes
    using rect = this.#memory.alloc(16);
    const success = this.#module._FPDFAnnot_GetRect(handle, rect.ptr);
    if (!success) {
      return { left: 0, top: 0, right: 0, bottom: 0 };
    }

    // Read as float32 values
    const floatView = new Float32Array(this.#memory.heapU8.buffer, rect.ptr, 4);
    return {
      left: floatView[0]!,
      top: floatView[3]!, // FS_RECTF stores top as 4th element
      right: floatView[2]!,
      bottom: floatView[1]!, // FS_RECTF stores bottom as 2nd element
    };
  }

  #readAnnotationColour(handle: AnnotationHandle): { r: number; g: number; b: number; a: number } | undefined {
    // Allocate 4 unsigned ints for RGBA
    using colourBuf = this.#memory.alloc(16);
    const rPtr = colourBuf.ptr;
    const gPtr = ptrOffset(colourBuf.ptr, 4);
    const bPtr = ptrOffset(colourBuf.ptr, 8);
    const aPtr = ptrOffset(colourBuf.ptr, 12);

    // colour type 0 = FPDFANNOT_COLORTYPE_Color (fill/stroke colour)
    const success = this.#module._FPDFAnnot_GetColor(handle, 0, rPtr, gPtr, bPtr, aPtr);
    if (!success) {
      return undefined;
    }

    return {
      r: this.#memory.readInt32(rPtr),
      g: this.#memory.readInt32(gPtr),
      b: this.#memory.readInt32(bPtr),
      a: this.#memory.readInt32(aPtr),
    };
  }

  /**
   * Search for text on this page.
   *
   * Returns a generator yielding search results with position information.
   * The search handle is cleaned up when the generator finishes or is closed.
   *
   * @param query - The text to search for
   * @param flags - Search flags (case sensitivity, whole word, etc.)
   */
  *findText(query: string, flags: TextSearchFlags = TextSearchFlags.None): Generator<TextSearchResult> {
    this.ensureNotDisposed();
    this.#ensureTextPage();

    // Encode query as UTF-16LE (PDFium expects this)
    const queryBytes = encodeUTF16LE(query);
    using queryAlloc = this.#memory.allocFrom(queryBytes);

    const searchHandle = this.#module._FPDFText_FindStart(this.#textPageHandle, queryAlloc.ptr, flags, 0);
    if (searchHandle === NULL_SEARCH) {
      return;
    }

    try {
      while (this.#module._FPDFText_FindNext(searchHandle)) {
        const charIndex = this.#module._FPDFText_GetSchResultIndex(searchHandle);
        const charCount = this.#module._FPDFText_GetSchCount(searchHandle);
        const rects = this.#getTextRects(charIndex, charCount);
        yield { charIndex, charCount, rects };
      }
    } finally {
      this.#module._FPDFText_FindClose(searchHandle);
    }
  }

  #ensureTextPage(): void {
    if (this.#textPageHandle === NULL_TEXT_PAGE) {
      this.#textPageHandle = this.#module._FPDFText_LoadPage(this.#pageHandle);
      if (this.#textPageHandle === NULL_TEXT_PAGE) {
        throw new TextError(PDFiumErrorCode.TEXT_LOAD_FAILED, 'Failed to load text page');
      }
    }
  }

  #getTextRects(charIndex: number, charCount: number): TextRect[] {
    const rectCount = this.#module._FPDFText_CountRects(this.#textPageHandle, charIndex, charCount);
    if (rectCount <= 0) {
      return [];
    }

    const rects: TextRect[] = [];
    // 4 doubles: left, top, right, bottom = 32 bytes
    using buf = this.#memory.alloc(32);
    const leftPtr = buf.ptr;
    const topPtr = ptrOffset(buf.ptr, 8);
    const rightPtr = ptrOffset(buf.ptr, 16);
    const bottomPtr = ptrOffset(buf.ptr, 24);

    for (let i = 0; i < rectCount; i++) {
      const success = this.#module._FPDFText_GetRect(this.#textPageHandle, i, leftPtr, topPtr, rightPtr, bottomPtr);
      if (success) {
        const floatView = new Float64Array(this.#memory.heapU8.buffer, buf.ptr, 4);
        rects.push({
          left: floatView[0]!,
          top: floatView[1]!,
          right: floatView[2]!,
          bottom: floatView[3]!,
        });
      }
    }

    return rects;
  }

  /**
   * Get the structure tree for this page (tagged PDF accessibility info).
   *
   * Returns an array of root structure elements, or undefined if the page
   * has no structure tree (i.e. the PDF is not tagged).
   */
  getStructureTree(): StructureElement[] | undefined {
    this.ensureNotDisposed();

    const tree = this.#module._FPDF_StructTree_GetForPage(this.#pageHandle);
    if (tree === NULL_STRUCT_TREE) {
      return undefined;
    }

    try {
      const childCount = this.#module._FPDF_StructTree_CountChildren(tree);
      if (childCount <= 0) {
        return [];
      }

      const elements: StructureElement[] = [];
      for (let i = 0; i < childCount; i++) {
        const child = this.#module._FPDF_StructTree_GetChildAtIndex(tree, i);
        if (child !== NULL_STRUCT_ELEMENT) {
          elements.push(this.#readStructElement(child));
        }
      }
      return elements;
    } finally {
      this.#module._FPDF_StructTree_Close(tree);
    }
  }

  #readStructElement(element: StructElementHandle, depth = 0): StructureElement {
    if (depth > MAX_STRUCT_TREE_DEPTH) {
      throw new PageError(
        PDFiumErrorCode.PAGE_LOAD_FAILED,
        `Structure tree depth exceeds maximum of ${MAX_STRUCT_TREE_DEPTH}`,
      );
    }

    const type = this.#readStructString(
      (buf, len) => this.#module._FPDF_StructElement_GetType(element, buf, len),
    );
    const altText = this.#readStructString(
      (buf, len) => this.#module._FPDF_StructElement_GetAltText(element, buf, len),
    );
    const lang = this.#readStructString(
      (buf, len) => this.#module._FPDF_StructElement_GetLang(element, buf, len),
    );

    const childCount = this.#module._FPDF_StructElement_CountChildren(element);
    const children: StructureElement[] = [];
    for (let i = 0; i < childCount; i++) {
      const child = this.#module._FPDF_StructElement_GetChildAtIndex(element, i);
      if (child !== NULL_STRUCT_ELEMENT) {
        children.push(this.#readStructElement(child, depth + 1));
      }
    }

    const result: StructureElement = { type, children };
    if (altText) {
      result.altText = altText;
    }
    if (lang) {
      result.lang = lang;
    }
    return result;
  }

  #readStructString(getter: (buf: WASMPointer, len: number) => number): string {
    const requiredBytes = getter(NULL_PTR, 0);
    if (requiredBytes <= 2) {
      return '';
    }

    using buffer = this.#memory.alloc(requiredBytes);
    getter(buffer.ptr, requiredBytes);

    // UTF-16LE: 2 bytes per char, subtract 2 for null terminator
    const charCount = (requiredBytes - 2) / 2;
    return this.#memory.readUTF16LE(buffer.ptr, charCount);
  }

  /**
   * Get the internal page handle for advanced usage.
   *
   * @internal
   */
  get handle(): PageHandle {
    this.ensureNotDisposed();
    return this.#pageHandle;
  }

  protected disposeInternal(): void {
    // Deregister from parent document
    this.#deregister?.(this);

    // Close text page if loaded
    if (this.#textPageHandle !== NULL_TEXT_PAGE) {
      this.#module._FPDFText_ClosePage(this.#textPageHandle);
      this.#textPageHandle = NULL_TEXT_PAGE;
    }

    // Notify form system before closing page
    if (this.#formHandle !== NULL_FORM) {
      this.#module._FORM_OnBeforeClosePage(this.#pageHandle, this.#formHandle);
    }

    // Close the page
    this.#module._FPDF_ClosePage(this.#pageHandle);
  }
}
