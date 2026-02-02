/**
 * PDF page handling with automatic resource management.
 *
 * @module document/page
 */

import { Disposable } from '../core/disposable.js';
import { PageError, PDFiumErrorCode, RenderError, TextError } from '../core/errors.js';
import {
  ActionType,
  type Annotation,
  type AnnotationBorder,
  AnnotationFlags,
  AnnotationType,
  type BlendMode,
  type CharacterInfo,
  type CharBox,
  type Colour,
  type CoordinateTransformContext,
  type DashPattern,
  DEFAULT_LIMITS,
  DestinationFitType,
  type DeviceCoordinate,
  type ExtendedAnnotation,
  FlattenFlags,
  FlattenResult,
  FormFieldFlags,
  FormFieldType,
  ImageColourSpace,
  ImageMarkedContentType,
  type ImageMetadata,
  LineCapStyle,
  LineJoinStyle,
  type LinePoints,
  type PageActionType,
  type PageBox,
  PageBoxType,
  type PageCoordinate,
  type PageObject,
  type PageObjectMark,
  PageObjectMarkValueType,
  PageObjectType,
  PageRotation,
  type PageSize,
  type PathFillMode,
  PathSegmentType,
  type PDFAction,
  type PDFDestination,
  type PDFiumLimits,
  type PDFLink,
  type Point,
  type ProgressiveRenderStatus,
  type QuadPoints,
  type RenderOptions,
  type RenderResult,
  type StructureElement,
  type TextRect,
  TextRenderMode,
  TextSearchFlags,
  type TextSearchResult,
  type TransformMatrix,
  type WebLink,
  type WidgetAnnotation,
  type WidgetOption,
} from '../core/types.js';
import {
  NULL_ACTION,
  NULL_ANNOT,
  NULL_CLIP_PATH,
  NULL_DEST,
  NULL_FONT,
  NULL_FORM,
  NULL_LINK,
  NULL_MARK,
  NULL_PAGE_LINK,
  NULL_PAGE_OBJECT,
  NULL_PATH_SEGMENT,
  NULL_SEARCH,
  NULL_STRUCT_ELEMENT,
  NULL_STRUCT_TREE,
  NULL_TEXT_PAGE,
  UTF16LE_BYTES_PER_CHAR,
  UTF16LE_NULL_TERMINATOR_BYTES,
} from '../internal/constants.js';
import type {
  ActionHandle,
  AnnotationHandle,
  BitmapHandle,
  ClipPathHandle,
  DestinationHandle,
  DocumentHandle,
  FormHandle,
  LinkHandle,
  PageHandle,
  PageLinkHandle,
  PageObjectHandle,
  PageObjectMarkHandle,
  PathSegmentHandle,
  StructElementHandle,
  StructTreeHandle,
  TextPageHandle,
  WASMPointer,
} from '../internal/handles.js';
import { convertBgraToRgba } from '../internal/pixel-conversion.js';
import { INTERNAL } from '../internal/symbols.js';
import { NativeHandle, type WASMAllocation } from '../wasm/allocation.js';
import { BitmapFormat, PageObjectTypeNative, type PDFiumWASM, RenderFlags } from '../wasm/bindings/index.js';
import {
  asHandle,
  encodeUTF16LE,
  NULL_PTR,
  ptrOffset,
  textDecoder,
  textEncoder,
  utf16leDecoder,
  type WASMMemoryManager,
} from '../wasm/memory.js';
import { PDFiumFont } from './font.js';
import { createProgressiveRenderContext, type ProgressiveRenderContext } from './progressive-render.js';

/**
 * Default background colour (white with full opacity).
 */
const DEFAULT_BACKGROUND_COLOUR = 0xffffffff;

/** Set of valid AnnotationType values for runtime validation. */
const VALID_ANNOTATION_TYPES = new Set<number>(
  Object.values(AnnotationType).filter((v): v is number => typeof v === 'number'),
);

/** Set of valid FormFieldType values for runtime validation. */
const VALID_FORM_FIELD_TYPES = new Set<number>(
  Object.values(FormFieldType).filter((v): v is number => typeof v === 'number'),
);

/** Maximum recursion depth for structure tree traversal. */
const MAX_STRUCT_TREE_DEPTH = 100;

/** Default tolerance for character position lookups (in points). */
const DEFAULT_CHAR_POSITION_TOLERANCE = 10;

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
  readonly #documentHandle: DocumentHandle;
  readonly #pageIndex: number;
  readonly #formHandle: FormHandle;
  readonly #limits: Readonly<Required<PDFiumLimits>>;
  readonly #width: number;
  readonly #height: number;
  readonly #deregister: ((page: PDFiumPage) => void) | undefined;
  #textPageHandle: TextPageHandle = NULL_TEXT_PAGE;
  #borrowCount = 0;
  #nativeReleased = false;

  /** @internal */
  constructor(
    module: PDFiumWASM,
    memory: WASMMemoryManager,
    pageHandle: PageHandle,
    documentHandle: DocumentHandle,
    pageIndex: number,
    formHandle: FormHandle,
    limits?: Readonly<Required<PDFiumLimits>>,
    deregister?: (page: PDFiumPage) => void,
  ) {
    super('PDFiumPage', PDFiumErrorCode.PAGE_ALREADY_CLOSED);
    this.#module = module;
    this.#memory = memory;
    this.#pageHandle = pageHandle;
    this.#documentHandle = documentHandle;
    this.#pageIndex = pageIndex;
    this.#formHandle = formHandle;
    this.#limits = limits ?? DEFAULT_LIMITS;
    this.#deregister = deregister;
    this.#width = this.#module._FPDF_GetPageWidth(this.#pageHandle);
    this.#height = this.#module._FPDF_GetPageHeight(this.#pageHandle);

    // Register finalizer cleanup for safety-net GC disposal
    this.setFinalizerCleanup(() => {
      this.#releaseNative();
    });
  }

  /**
   * Increment the borrow count, preventing native resources from being freed.
   *
   * Called by borrowed views (e.g. PDFiumFont) that need the page's native
   * handle to remain valid beyond the page's own disposal.
   *
   * @internal
   */
  retain(): void {
    this.#borrowCount++;
  }

  /**
   * Decrement the borrow count. If the page has already been disposed and
   * this was the last borrow, release native resources.
   *
   * @internal
   */
  release(): void {
    this.#borrowCount--;
    if (this.#borrowCount === 0 && this.disposed && !this.#nativeReleased) {
      this.#releaseNative();
    }
  }

  #releaseNative(): void {
    if (this.#nativeReleased) {
      return;
    }
    this.#nativeReleased = true;

    if (this.#textPageHandle !== NULL_TEXT_PAGE) {
      this.#module._FPDFText_ClosePage(this.#textPageHandle);
      this.#textPageHandle = NULL_TEXT_PAGE;
    }

    if (this.#formHandle !== NULL_FORM) {
      this.#module._FORM_OnBeforeClosePage(this.#pageHandle, this.#formHandle);
    }

    this.#module._FPDF_ClosePage(this.#pageHandle);
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
   * Set the page rotation.
   *
   * @param rotation - The rotation value to set
   */
  set rotation(rotation: PageRotation) {
    this.ensureNotDisposed();
    this.#module._FPDFPage_SetRotation(this.#pageHandle, rotation);
  }

  /**
   * Get a specific page box.
   *
   * PDF pages can have multiple box definitions:
   * - MediaBox: Physical page boundaries (required)
   * - CropBox: Visible region (defaults to MediaBox)
   * - BleedBox: Bleed area for printing (defaults to CropBox)
   * - TrimBox: Final trimmed page dimensions (defaults to CropBox)
   * - ArtBox: Meaningful content boundaries (defaults to CropBox)
   *
   * @param boxType - The type of box to retrieve
   * @returns The page box or undefined if not explicitly set
   */
  getPageBox(boxType: PageBoxType): PageBox | undefined {
    this.ensureNotDisposed();

    // Single 16-byte allocation for 4 floats: [left, bottom, right, top]
    using buf = this.#memory.alloc(16);
    const leftPtr = buf.ptr;
    const bottomPtr = ptrOffset(buf.ptr, 4);
    const rightPtr = ptrOffset(buf.ptr, 8);
    const topPtr = ptrOffset(buf.ptr, 12);

    let success: number;
    switch (boxType) {
      case PageBoxType.MediaBox:
        success = this.#module._FPDFPage_GetMediaBox(this.#pageHandle, leftPtr, bottomPtr, rightPtr, topPtr);
        break;
      case PageBoxType.CropBox:
        success = this.#module._FPDFPage_GetCropBox(this.#pageHandle, leftPtr, bottomPtr, rightPtr, topPtr);
        break;
      case PageBoxType.BleedBox:
        success = this.#module._FPDFPage_GetBleedBox(this.#pageHandle, leftPtr, bottomPtr, rightPtr, topPtr);
        break;
      case PageBoxType.TrimBox:
        success = this.#module._FPDFPage_GetTrimBox(this.#pageHandle, leftPtr, bottomPtr, rightPtr, topPtr);
        break;
      case PageBoxType.ArtBox:
        success = this.#module._FPDFPage_GetArtBox(this.#pageHandle, leftPtr, bottomPtr, rightPtr, topPtr);
        break;
      default:
        return undefined;
    }

    if (!success) {
      return undefined;
    }

    const floats = new Float32Array(this.#memory.heapU8.buffer, buf.ptr, 4);
    return {
      left: floats[0] ?? 0,
      bottom: floats[1] ?? 0,
      right: floats[2] ?? 0,
      top: floats[3] ?? 0,
    };
  }

  /**
   * Set a specific page box.
   *
   * @param boxType - The type of box to set
   * @param box - The box coordinates in points
   */
  setPageBox(boxType: PageBoxType, box: PageBox): void {
    this.ensureNotDisposed();

    switch (boxType) {
      case PageBoxType.MediaBox:
        this.#module._FPDFPage_SetMediaBox(this.#pageHandle, box.left, box.bottom, box.right, box.top);
        break;
      case PageBoxType.CropBox:
        this.#module._FPDFPage_SetCropBox(this.#pageHandle, box.left, box.bottom, box.right, box.top);
        break;
      case PageBoxType.BleedBox:
        this.#module._FPDFPage_SetBleedBox(this.#pageHandle, box.left, box.bottom, box.right, box.top);
        break;
      case PageBoxType.TrimBox:
        this.#module._FPDFPage_SetTrimBox(this.#pageHandle, box.left, box.bottom, box.right, box.top);
        break;
      case PageBoxType.ArtBox:
        this.#module._FPDFPage_SetArtBox(this.#pageHandle, box.left, box.bottom, box.right, box.top);
        break;
    }
  }

  /**
   * Get the media box (physical page boundaries).
   *
   * This is a convenience method equivalent to getPageBox(PageBoxType.MediaBox).
   *
   * @returns The media box or undefined if not set
   */
  get mediaBox(): PageBox | undefined {
    return this.getPageBox(PageBoxType.MediaBox);
  }

  /**
   * Get the crop box (visible region).
   *
   * This is a convenience method equivalent to getPageBox(PageBoxType.CropBox).
   *
   * @returns The crop box or undefined if not explicitly set
   */
  get cropBox(): PageBox | undefined {
    return this.getPageBox(PageBoxType.CropBox);
  }

  /**
   * Get the bleed box (printing bleed area).
   *
   * This is a convenience method equivalent to getPageBox(PageBoxType.BleedBox).
   *
   * @returns The bleed box or undefined if not explicitly set
   */
  get bleedBox(): PageBox | undefined {
    return this.getPageBox(PageBoxType.BleedBox);
  }

  /**
   * Get the trim box (final trimmed dimensions).
   *
   * This is a convenience method equivalent to getPageBox(PageBoxType.TrimBox).
   *
   * @returns The trim box or undefined if not explicitly set
   */
  get trimBox(): PageBox | undefined {
    return this.getPageBox(PageBoxType.TrimBox);
  }

  /**
   * Get the art box (content boundaries).
   *
   * This is a convenience method equivalent to getPageBox(PageBoxType.ArtBox).
   *
   * @returns The art box or undefined if not explicitly set
   */
  get artBox(): PageBox | undefined {
    return this.getPageBox(PageBoxType.ArtBox);
  }

  /**
   * Get the effective bounding box of the page.
   *
   * This returns the bounding box that encompasses all page content,
   * considering all page transformations.
   *
   * @returns The page bounding box
   */
  get boundingBox(): PageBox {
    this.ensureNotDisposed();

    // FPDFPage_GetPageBoundingBox may not be available in all WASM builds
    const fn = this.#module._FPDFPage_GetPageBoundingBox;
    if (typeof fn !== 'function') {
      // Fall back to page dimensions
      return {
        left: 0,
        bottom: 0,
        right: this.#width,
        top: this.#height,
      };
    }

    using rect = this.#memory.alloc(16); // 4 floats * 4 bytes
    const success = fn(this.#pageHandle, rect.ptr);

    if (!success) {
      // Fall back to page dimensions
      return {
        left: 0,
        bottom: 0,
        right: this.#width,
        top: this.#height,
      };
    }

    const floatView = new Float32Array(this.#memory.heapU8.buffer, rect.ptr, 4);
    return {
      left: floatView[0] ?? 0,
      bottom: floatView[1] ?? 0,
      right: floatView[2] ?? 0,
      top: floatView[3] ?? 0,
    };
  }

  /**
   * Transform all annotations on the page.
   *
   * Applies an affine transformation matrix to all annotations.
   * The transformation matrix is:
   * | a  b  0 |
   * | c  d  0 |
   * | e  f  1 |
   *
   * @param a - Scale X
   * @param b - Skew Y
   * @param c - Skew X
   * @param d - Scale Y
   * @param e - Translate X
   * @param f - Translate Y
   */
  transformAnnotations(a: number, b: number, c: number, d: number, e: number, f: number): void {
    this.ensureNotDisposed();
    this.#module._FPDFPage_TransformAnnots(this.#pageHandle, a, b, c, d, e, f);
  }

  /**
   * Check if the page has an embedded thumbnail image.
   *
   * @returns True if a thumbnail exists, false otherwise
   */
  hasThumbnail(): boolean {
    this.ensureNotDisposed();

    // Check if we can get thumbnail data
    const fn = this.#module._FPDFPage_GetDecodedThumbnailData;
    if (typeof fn !== 'function') {
      return false;
    }

    const size = fn(this.#pageHandle, NULL_PTR, 0);
    return size > 0;
  }

  /**
   * Get the embedded thumbnail image as a bitmap.
   *
   * Returns the thumbnail in PDFium's bitmap format. The caller should
   * use the bitmap handle to extract pixel data.
   *
   * @returns The thumbnail bitmap handle, or undefined if not available
   */
  getThumbnailAsBitmap(): BitmapHandle | undefined {
    this.ensureNotDisposed();

    const fn = this.#module._FPDFPage_GetThumbnailAsBitmap;
    if (typeof fn !== 'function') {
      return undefined;
    }

    const handle = fn(this.#pageHandle);
    if (handle === 0) {
      return undefined;
    }

    return handle;
  }

  /**
   * Get the decoded thumbnail image data.
   *
   * This returns the raw pixel data of the embedded thumbnail image,
   * decoded from whatever format it was stored in (typically JPEG).
   *
   * @returns The decoded thumbnail pixel data, or undefined if not available
   */
  getDecodedThumbnailData(): Uint8Array | undefined {
    this.ensureNotDisposed();

    const fn = this.#module._FPDFPage_GetDecodedThumbnailData;
    if (typeof fn !== 'function') {
      return undefined;
    }

    // First call to get required buffer size
    const requiredSize = fn(this.#pageHandle, NULL_PTR, 0);
    if (requiredSize <= 0) {
      return undefined;
    }

    // Allocate buffer and get data
    using buffer = this.#memory.alloc(requiredSize);
    const actualSize = fn(this.#pageHandle, buffer.ptr, requiredSize);

    if (actualSize <= 0) {
      return undefined;
    }

    // Copy data from WASM memory
    const result = new Uint8Array(actualSize);
    result.set(this.#memory.heapU8.subarray(buffer.ptr, buffer.ptr + actualSize));
    return result;
  }

  /**
   * Get the raw thumbnail image data.
   *
   * This returns the thumbnail data in its original encoded format
   * (e.g., JPEG, PNG). The format can be determined from the data header.
   *
   * @returns The raw thumbnail data, or undefined if not available
   */
  getRawThumbnailData(): Uint8Array | undefined {
    this.ensureNotDisposed();

    const fn = this.#module._FPDFPage_GetRawThumbnailData;
    if (typeof fn !== 'function') {
      return undefined;
    }

    // First call to get required buffer size
    const requiredSize = fn(this.#pageHandle, NULL_PTR, 0);
    if (requiredSize <= 0) {
      return undefined;
    }

    // Allocate buffer and get data
    using buffer = this.#memory.alloc(requiredSize);
    const actualSize = fn(this.#pageHandle, buffer.ptr, requiredSize);

    if (actualSize <= 0) {
      return undefined;
    }

    // Copy data from WASM memory
    const result = new Uint8Array(actualSize);
    result.set(this.#memory.heapU8.subarray(buffer.ptr, buffer.ptr + actualSize));
    return result;
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
    const { onProgress } = options;

    onProgress?.(0);

    const { width: renderWidth, height: renderHeight } = this.#calculateRenderDimensions(options);
    this.#validateRenderDimensions(renderWidth, renderHeight);

    onProgress?.(0.1);

    const bgColour = options.backgroundColour ?? DEFAULT_BACKGROUND_COLOUR;
    const { bufferAlloc, bitmapHandle } = this.#createRenderBitmap(renderWidth, renderHeight, bgColour);
    using _buffer = bufferAlloc;
    using _bitmap = new NativeHandle<BitmapHandle>(bitmapHandle, (h) => this.#module._FPDFBitmap_Destroy(h));

    onProgress?.(0.3);

    // Render page
    const flags = RenderFlags.ANNOT;
    const rotation = options.rotation ?? PageRotation.None;

    if (options.clipRect !== undefined) {
      this.#renderWithClipRect(bitmapHandle, renderWidth, renderHeight, rotation, flags, options.clipRect);
    } else {
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
    }

    onProgress?.(0.7);

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

    onProgress?.(0.8);

    // Convert BGRA to RGBA and copy to JavaScript
    const bufferSize = renderWidth * 4 * renderHeight;
    const source = this.#memory.heapU8.subarray(bufferAlloc.ptr, bufferAlloc.ptr + bufferSize);
    const data = convertBgraToRgba(source, bufferSize);

    onProgress?.(1.0);

    return {
      width: renderWidth,
      height: renderHeight,
      originalWidth: this.#width,
      originalHeight: this.#height,
      data,
    };
    // _bitmap destroyed first (LIFO), then _buffer freed
  }

  /**
   * Start progressive rendering of the page.
   *
   * Returns a `ProgressiveRenderContext` that owns the render resources.
   * Use `continue()` to advance the render, and dispose when done.
   *
   * @param options - Render options (same as render())
   * @returns A disposable render context
   * @throws {RenderError} If progressive rendering is unavailable or setup fails
   *
   * @example
   * ```typescript
   * using render = page.startProgressiveRender({ scale: 2 });
   *
   * while (render.status === ProgressiveRenderStatus.ToBeContinued) {
   *   render.continue();
   * }
   *
   * if (render.status === ProgressiveRenderStatus.Done) {
   *   const result = render.getResult();
   * }
   * ```
   */
  startProgressiveRender(options: RenderOptions = {}): ProgressiveRenderContext {
    this.ensureNotDisposed();

    if (options.clipRect !== undefined) {
      throw new RenderError(
        PDFiumErrorCode.RENDER_FAILED,
        'clipRect is not supported with progressive rendering; use render() instead',
      );
    }

    const fn = this.#module._FPDF_RenderPageBitmap_Start;
    if (typeof fn !== 'function') {
      throw new RenderError(PDFiumErrorCode.RENDER_FAILED, 'Progressive rendering is not available in this WASM build');
    }

    const { width: renderWidth, height: renderHeight } = this.#calculateRenderDimensions(options);
    this.#validateRenderDimensions(renderWidth, renderHeight);

    const bgColour = options.backgroundColour ?? DEFAULT_BACKGROUND_COLOUR;
    const { bufferAlloc, bitmapHandle } = this.#createRenderBitmap(renderWidth, renderHeight, bgColour);

    // Start progressive render with no pause callback (NULL)
    const rotation = options.rotation ?? PageRotation.None;
    const flags = RenderFlags.ANNOT;
    let status: ProgressiveRenderStatus;
    try {
      status = fn(
        bitmapHandle,
        this.#pageHandle,
        0,
        0,
        renderWidth,
        renderHeight,
        rotation,
        flags,
        NULL_PTR,
      ) as ProgressiveRenderStatus;
    } catch (error) {
      this.#module._FPDFBitmap_Destroy(bitmapHandle);
      bufferAlloc[Symbol.dispose]();
      throw new RenderError(PDFiumErrorCode.RENDER_FAILED, 'Failed to start progressive render', {
        cause: error,
      });
    }

    // Transfer ownership to the context; retain page for borrowed pageHandle
    return createProgressiveRenderContext(
      this.#module,
      this.#memory,
      this.#pageHandle,
      bufferAlloc,
      bitmapHandle,
      () => this.retain(),
      () => this.release(),
      renderWidth,
      renderHeight,
      this.#width,
      this.#height,
      status,
    );
  }

  /**
   * Allocate a bitmap buffer and create a bitmap handle with background fill.
   *
   * Caller is responsible for disposing both the returned allocation and bitmap handle.
   *
   * @param renderWidth - Target bitmap width in pixels
   * @param renderHeight - Target bitmap height in pixels
   * @param backgroundColour - ARGB background fill colour
   * @returns The WASM buffer allocation and PDFium bitmap handle
   * @throws {RenderError} If allocation or bitmap creation fails
   */
  #createRenderBitmap(
    renderWidth: number,
    renderHeight: number,
    backgroundColour: number,
  ): { bufferAlloc: WASMAllocation; bitmapHandle: BitmapHandle } {
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

    let bitmapHandle: BitmapHandle;
    try {
      bitmapHandle = this.#module._FPDFBitmap_CreateEx(
        renderWidth,
        renderHeight,
        BitmapFormat.BGRA,
        bufferAlloc.ptr,
        stride,
      );
    } catch (error) {
      bufferAlloc[Symbol.dispose]();
      throw new RenderError(PDFiumErrorCode.RENDER_BITMAP_FAILED, 'Failed to create bitmap', {
        width: renderWidth,
        height: renderHeight,
        cause: error,
      });
    }

    if (bitmapHandle === asHandle<BitmapHandle>(0)) {
      bufferAlloc[Symbol.dispose]();
      throw new RenderError(PDFiumErrorCode.RENDER_BITMAP_FAILED, 'Failed to create bitmap', {
        width: renderWidth,
        height: renderHeight,
      });
    }

    this.#module._FPDFBitmap_FillRect(bitmapHandle, 0, 0, renderWidth, renderHeight, backgroundColour);

    return { bufferAlloc, bitmapHandle };
  }

  /**
   * Render the page using a transformation matrix and clip rectangle.
   *
   * Uses `FPDF_RenderPageBitmapWithMatrix` to render only the portion
   * of the page within the specified clip rectangle.
   *
   * @param bitmapHandle - Target bitmap to render into
   * @param renderWidth - Bitmap width in pixels
   * @param renderHeight - Bitmap height in pixels
   * @param rotation - Page rotation to apply
   * @param flags - PDFium render flags
   * @param clipRect - Clipping rectangle in device (bitmap) coordinates
   * @throws {RenderError} If the matrix render function is unavailable
   */
  #renderWithClipRect(
    bitmapHandle: BitmapHandle,
    renderWidth: number,
    renderHeight: number,
    rotation: PageRotation,
    flags: number,
    clipRect: { left: number; top: number; right: number; bottom: number },
  ): void {
    const fn = this.#module._FPDF_RenderPageBitmapWithMatrix;
    if (typeof fn !== 'function') {
      throw new RenderError(
        PDFiumErrorCode.RENDER_FAILED,
        'Clip rect rendering requires FPDF_RenderPageBitmapWithMatrix which is not available in this WASM build',
      );
    }

    // Build FS_MATRIX: maps page coordinates to device (bitmap) coordinates.
    // For a standard render: scaleX = renderWidth / pageWidth, scaleY = renderHeight / pageHeight
    // The matrix is: [a, b, c, d, e, f] where the transform is:
    //   deviceX = a * pageX + c * pageY + e
    //   deviceY = b * pageX + d * pageY + f
    // For scale + flip Y (PDF origin is bottom-left, bitmap is top-left):
    //   a = scaleX, b = 0, c = 0, d = -scaleY, e = 0, f = renderHeight

    const scaleX = renderWidth / this.#width;
    const scaleY = renderHeight / this.#height;

    // Apply rotation to the matrix
    let a: number, b: number, c: number, d: number, e: number, f: number;
    switch (rotation) {
      case PageRotation.Clockwise90:
        a = 0;
        b = scaleX;
        c = scaleY;
        d = 0;
        e = 0;
        f = 0;
        break;
      case PageRotation.Rotate180:
        a = -scaleX;
        b = 0;
        c = 0;
        d = scaleY;
        e = renderWidth;
        f = 0;
        break;
      case PageRotation.CounterClockwise90:
        a = 0;
        b = -scaleX;
        c = -scaleY;
        d = 0;
        e = renderWidth;
        f = renderHeight;
        break;
      default:
        // No rotation
        a = scaleX;
        b = 0;
        c = 0;
        d = -scaleY;
        e = 0;
        f = renderHeight;
        break;
    }

    // Allocate FS_MATRIX (6 floats = 24 bytes) + FS_RECTF (4 floats = 16 bytes) = 40 bytes
    using structs = this.#memory.alloc(40);
    const matrixPtr = structs.ptr;
    const clipPtr = ptrOffset(structs.ptr, 24);

    // Write FS_MATRIX
    const matrixView = new Float32Array(this.#memory.heapU8.buffer, matrixPtr, 6);
    matrixView[0] = a;
    matrixView[1] = b;
    matrixView[2] = c;
    matrixView[3] = d;
    matrixView[4] = e;
    matrixView[5] = f;

    // Write FS_RECTF (left, bottom, right, top) — note FS_RECTF field order
    const clipView = new Float32Array(this.#memory.heapU8.buffer, clipPtr, 4);
    clipView[0] = clipRect.left;
    clipView[1] = clipRect.bottom;
    clipView[2] = clipRect.right;
    clipView[3] = clipRect.top;

    fn(bitmapHandle, this.#pageHandle, matrixPtr, clipPtr, flags);
  }

  #calculateRenderDimensions(options: RenderOptions): { width: number; height: number } {
    if (options.width !== undefined && options.height !== undefined) {
      return { width: options.width, height: options.height };
    }
    if (options.width !== undefined) {
      return { width: options.width, height: Math.round((options.width / this.#width) * this.#height) };
    }
    if (options.height !== undefined) {
      return { width: Math.round((options.height / this.#height) * this.#width), height: options.height };
    }
    const scale = options.scale ?? 1;
    if (!Number.isFinite(scale) || scale <= 0) {
      throw new RenderError(
        PDFiumErrorCode.RENDER_INVALID_DIMENSIONS,
        `Scale must be a positive finite number, got ${scale}`,
      );
    }
    return { width: Math.round(this.#width * scale), height: Math.round(this.#height * scale) };
  }

  #validateRenderDimensions(renderWidth: number, renderHeight: number): void {
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
    if (renderWidth > Number.MAX_SAFE_INTEGER / (renderHeight * 4)) {
      throw new RenderError(
        PDFiumErrorCode.RENDER_INVALID_DIMENSIONS,
        'Render dimensions would cause integer overflow',
        {
          width: renderWidth,
          height: renderHeight,
        },
      );
    }
  }

  /**
   * Extract text content from the page.
   *
   * Returns the full text of the page as a single string. The text preserves
   * the logical reading order determined by PDFium, including whitespace and
   * line breaks embedded in the PDF content stream. No trimming is applied.
   *
   * @returns The extracted text
   * @throws {TextError} If text extraction fails
   *
   * @see {@link getTextInRect} for extracting text within a bounding rectangle
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
   * Iterate over page objects lazily.
   *
   * Use this for memory-efficient iteration over many page objects.
   *
   * @example
   * ```typescript
   * for (const obj of page.pageObjects()) {
   *   console.log(obj.type);
   * }
   * ```
   */
  pageObjects(): Generator<PageObject> {
    this.ensureNotDisposed();
    const module = this.#module;
    const pageHandle = this.#pageHandle;
    const readPageObject = this.#readPageObject.bind(this);
    return (function* () {
      const count = module._FPDFPage_CountObjects(pageHandle);
      for (let i = 0; i < count; i++) {
        const handle = module._FPDFPage_GetObject(pageHandle, i);
        if (handle === NULL_PAGE_OBJECT) {
          continue;
        }
        yield readPageObject(handle);
      }
    })();
  }

  /**
   * Get all page objects (text, images, paths, etc.).
   *
   * For large pages, prefer using the `pageObjects()` generator.
   *
   * @returns An array of page objects with type and bounding box information
   */
  getObjects(): PageObject[] {
    return [...this.pageObjects()];
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
      throw new PageError(
        PDFiumErrorCode.PAGE_INDEX_OUT_OF_RANGE,
        `Annotation index must be a safe integer, got ${index}`,
      );
    }

    const count = this.#module._FPDFPage_GetAnnotCount(this.#pageHandle);
    if (index < 0 || index >= count) {
      throw new PageError(
        PDFiumErrorCode.ANNOT_INDEX_OUT_OF_RANGE,
        `Annotation index ${index} out of range [0, ${count})`,
      );
    }

    const handle = this.#module._FPDFPage_GetAnnot(this.#pageHandle, index);
    if (handle === NULL_ANNOT) {
      throw new PageError(PDFiumErrorCode.ANNOT_LOAD_FAILED, `Failed to load annotation ${index}`);
    }

    using _annot = new NativeHandle<AnnotationHandle>(handle, (h) => this.#module._FPDFPage_CloseAnnot(h));
    return this.#readAnnotation(handle, index);
  }

  /**
   * Iterate over annotations lazily.
   *
   * Use this for memory-efficient iteration over many annotations.
   *
   * @example
   * ```typescript
   * for (const annotation of page.annotations()) {
   *   console.log(annotation.type);
   * }
   * ```
   */
  annotations(): Generator<Annotation> {
    this.ensureNotDisposed();
    const module = this.#module;
    const pageHandle = this.#pageHandle;
    const readAnnotation = this.#readAnnotation.bind(this);
    return (function* () {
      const count = module._FPDFPage_GetAnnotCount(pageHandle);
      for (let i = 0; i < count; i++) {
        const handle = module._FPDFPage_GetAnnot(pageHandle, i);
        if (handle === NULL_ANNOT) {
          continue;
        }
        {
          using _annot = new NativeHandle<AnnotationHandle>(handle, (h) => module._FPDFPage_CloseAnnot(h));
          yield readAnnotation(handle, i);
        }
      }
    })();
  }

  /**
   * Get all annotations on this page.
   *
   * For large pages, prefer using the `annotations()` generator.
   */
  getAnnotations(): Annotation[] {
    return [...this.annotations()];
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
   * Get extended annotation information including flags.
   *
   * @param index - Zero-based annotation index
   * @returns Extended annotation data with flags
   */
  getExtendedAnnotation(index: number): ExtendedAnnotation {
    this.ensureNotDisposed();

    if (!Number.isSafeInteger(index)) {
      throw new PageError(
        PDFiumErrorCode.PAGE_INDEX_OUT_OF_RANGE,
        `Annotation index must be a safe integer, got ${index}`,
      );
    }

    const count = this.#module._FPDFPage_GetAnnotCount(this.#pageHandle);
    if (index < 0 || index >= count) {
      throw new PageError(
        PDFiumErrorCode.ANNOT_INDEX_OUT_OF_RANGE,
        `Annotation index ${index} out of range [0, ${count})`,
      );
    }

    const handle = this.#module._FPDFPage_GetAnnot(this.#pageHandle, index);
    if (handle === NULL_ANNOT) {
      throw new PageError(PDFiumErrorCode.ANNOT_LOAD_FAILED, `Failed to load annotation ${index}`);
    }

    using _annot = new NativeHandle<AnnotationHandle>(handle, (h) => this.#module._FPDFPage_CloseAnnot(h));
    return this.#readExtendedAnnotation(handle, index);
  }

  /**
   * Get all extended annotations on this page.
   */
  getExtendedAnnotations(): ExtendedAnnotation[] {
    this.ensureNotDisposed();

    const count = this.#module._FPDFPage_GetAnnotCount(this.#pageHandle);
    const annotations: ExtendedAnnotation[] = [];

    for (let i = 0; i < count; i++) {
      const handle = this.#module._FPDFPage_GetAnnot(this.#pageHandle, i);
      if (handle === NULL_ANNOT) {
        continue;
      }
      {
        using _annot = new NativeHandle<AnnotationHandle>(handle, (h) => this.#module._FPDFPage_CloseAnnot(h));
        annotations.push(this.#readExtendedAnnotation(handle, i));
      }
    }

    return annotations;
  }

  #readExtendedAnnotation(handle: AnnotationHandle, index: number): ExtendedAnnotation {
    const base = this.#readAnnotation(handle, index);
    const flags = this.#getAnnotationFlags(handle);
    const contents = this.#getAnnotationStringValue(handle, 'Contents');
    const author = this.#getAnnotationStringValue(handle, 'T');
    const modificationDate = this.#getAnnotationStringValue(handle, 'M');
    const creationDate = this.#getAnnotationStringValue(handle, 'CreationDate');

    return {
      ...base,
      flags,
      ...(contents !== undefined ? { contents } : {}),
      ...(author !== undefined ? { author } : {}),
      ...(modificationDate !== undefined ? { modificationDate } : {}),
      ...(creationDate !== undefined ? { creationDate } : {}),
    };
  }

  #getAnnotationFlags(handle: AnnotationHandle): AnnotationFlags {
    const fn = this.#module._FPDFAnnot_GetFlags;
    if (typeof fn !== 'function') {
      return AnnotationFlags.None;
    }
    return fn(handle) as AnnotationFlags;
  }

  #getAnnotationStringValue(handle: AnnotationHandle, key: string): string | undefined {
    const fn = this.#module._FPDFAnnot_GetStringValue;
    if (typeof fn !== 'function') {
      return undefined;
    }

    // Encode key as ASCII
    const keyBytes = textEncoder.encode(`${key}\0`);
    using keyBuffer = this.#memory.alloc(keyBytes.length);
    this.#memory.heapU8.set(keyBytes, keyBuffer.ptr);

    // First call to get required buffer size (returns bytes, including null terminator)
    const requiredSize = fn(handle, keyBuffer.ptr, NULL_PTR, 0);
    if (requiredSize <= UTF16LE_NULL_TERMINATOR_BYTES) {
      return undefined;
    }

    using buffer = this.#memory.alloc(requiredSize);
    const written = fn(handle, keyBuffer.ptr, buffer.ptr, requiredSize);
    if (written <= UTF16LE_NULL_TERMINATOR_BYTES) {
      return undefined;
    }

    // Decode UTF-16LE
    const dataView = this.#memory.heapU8.subarray(buffer.ptr, buffer.ptr + written - UTF16LE_NULL_TERMINATOR_BYTES);
    return utf16leDecoder.decode(dataView);
  }

  /**
   * Get widget annotation with form field information.
   *
   * Only works for widget (form field) annotations.
   *
   * @param index - Zero-based annotation index
   * @returns Widget annotation data, or undefined if not a widget
   */
  getWidgetAnnotation(index: number): WidgetAnnotation | undefined {
    this.ensureNotDisposed();

    if (!Number.isSafeInteger(index)) {
      throw new PageError(
        PDFiumErrorCode.PAGE_INDEX_OUT_OF_RANGE,
        `Annotation index must be a safe integer, got ${index}`,
      );
    }

    const count = this.#module._FPDFPage_GetAnnotCount(this.#pageHandle);
    if (index < 0 || index >= count) {
      throw new PageError(
        PDFiumErrorCode.ANNOT_INDEX_OUT_OF_RANGE,
        `Annotation index ${index} out of range [0, ${count})`,
      );
    }

    const handle = this.#module._FPDFPage_GetAnnot(this.#pageHandle, index);
    if (handle === NULL_ANNOT) {
      throw new PageError(PDFiumErrorCode.ANNOT_LOAD_FAILED, `Failed to load annotation ${index}`);
    }

    using _annot = new NativeHandle<AnnotationHandle>(handle, (h) => this.#module._FPDFPage_CloseAnnot(h));

    // Check if it's a widget annotation
    const rawType = this.#module._FPDFAnnot_GetSubtype(handle);
    if (rawType !== AnnotationType.Widget) {
      return undefined;
    }

    return this.#readWidgetAnnotation(handle, index);
  }

  /**
   * Get all widget (form field) annotations on this page.
   */
  getWidgetAnnotations(): WidgetAnnotation[] {
    this.ensureNotDisposed();

    const count = this.#module._FPDFPage_GetAnnotCount(this.#pageHandle);
    const widgets: WidgetAnnotation[] = [];

    for (let i = 0; i < count; i++) {
      const handle = this.#module._FPDFPage_GetAnnot(this.#pageHandle, i);
      if (handle === NULL_ANNOT) {
        continue;
      }
      {
        using _annot = new NativeHandle<AnnotationHandle>(handle, (h) => this.#module._FPDFPage_CloseAnnot(h));
        const rawType = this.#module._FPDFAnnot_GetSubtype(handle);
        if (rawType === AnnotationType.Widget) {
          widgets.push(this.#readWidgetAnnotation(handle, i));
        }
      }
    }

    return widgets;
  }

  #readWidgetAnnotation(handle: AnnotationHandle, index: number): WidgetAnnotation {
    const extended = this.#readExtendedAnnotation(handle, index);
    const fieldType = this.#getFormFieldType(handle);
    const fieldName = this.#getFormFieldName(handle);
    const alternateName = this.#getFormFieldAlternateName(handle);
    const fieldValue = this.#getFormFieldValue(handle);
    const fieldFlags = this.#getFormFieldFlags(handle);
    const options = this.#getFormFieldOptions(handle, fieldType);

    return {
      ...extended,
      fieldType,
      fieldFlags,
      ...(fieldName !== undefined ? { fieldName } : {}),
      ...(alternateName !== undefined ? { alternateName } : {}),
      ...(fieldValue !== undefined ? { fieldValue } : {}),
      ...(options !== undefined && options.length > 0 ? { options } : {}),
    };
  }

  #getFormFieldType(handle: AnnotationHandle): FormFieldType {
    const fn = this.#module._FPDFAnnot_GetFormFieldType;
    if (typeof fn !== 'function') {
      return FormFieldType.Unknown;
    }
    const raw = fn(this.#formHandle, handle);
    return VALID_FORM_FIELD_TYPES.has(raw) ? (raw as FormFieldType) : FormFieldType.Unknown;
  }

  #getFormFieldFlags(handle: AnnotationHandle): FormFieldFlags {
    const fn = this.#module._FPDFAnnot_GetFormFieldFlags;
    if (typeof fn !== 'function') {
      return FormFieldFlags.None;
    }
    return fn(this.#formHandle, handle) as FormFieldFlags;
  }

  #getFormFieldName(handle: AnnotationHandle): string | undefined {
    const fn = this.#module._FPDFAnnot_GetFormFieldName;
    if (typeof fn !== 'function') {
      return undefined;
    }

    const requiredSize = fn(this.#formHandle, handle, NULL_PTR, 0);
    if (requiredSize <= UTF16LE_NULL_TERMINATOR_BYTES) {
      return undefined;
    }

    using buffer = this.#memory.alloc(requiredSize);
    const written = fn(this.#formHandle, handle, buffer.ptr, requiredSize);
    if (written <= UTF16LE_NULL_TERMINATOR_BYTES) {
      return undefined;
    }

    const dataView = this.#memory.heapU8.subarray(buffer.ptr, buffer.ptr + written - UTF16LE_NULL_TERMINATOR_BYTES);
    return utf16leDecoder.decode(dataView);
  }

  #getFormFieldAlternateName(handle: AnnotationHandle): string | undefined {
    const fn = this.#module._FPDFAnnot_GetFormFieldAlternateName;
    if (typeof fn !== 'function') {
      return undefined;
    }

    const requiredSize = fn(this.#formHandle, handle, NULL_PTR, 0);
    if (requiredSize <= UTF16LE_NULL_TERMINATOR_BYTES) {
      return undefined;
    }

    using buffer = this.#memory.alloc(requiredSize);
    const written = fn(this.#formHandle, handle, buffer.ptr, requiredSize);
    if (written <= UTF16LE_NULL_TERMINATOR_BYTES) {
      return undefined;
    }

    const dataView = this.#memory.heapU8.subarray(buffer.ptr, buffer.ptr + written - UTF16LE_NULL_TERMINATOR_BYTES);
    return utf16leDecoder.decode(dataView);
  }

  #getFormFieldValue(handle: AnnotationHandle): string | undefined {
    const fn = this.#module._FPDFAnnot_GetFormFieldValue;
    if (typeof fn !== 'function') {
      return undefined;
    }

    const requiredSize = fn(this.#formHandle, handle, NULL_PTR, 0);
    if (requiredSize <= UTF16LE_NULL_TERMINATOR_BYTES) {
      return undefined;
    }

    using buffer = this.#memory.alloc(requiredSize);
    const written = fn(this.#formHandle, handle, buffer.ptr, requiredSize);
    if (written <= UTF16LE_NULL_TERMINATOR_BYTES) {
      return undefined;
    }

    const dataView = this.#memory.heapU8.subarray(buffer.ptr, buffer.ptr + written - UTF16LE_NULL_TERMINATOR_BYTES);
    return utf16leDecoder.decode(dataView);
  }

  #getFormFieldOptions(handle: AnnotationHandle, fieldType: FormFieldType): WidgetOption[] | undefined {
    // Options are only valid for combo and list boxes
    if (fieldType !== FormFieldType.ComboBox && fieldType !== FormFieldType.ListBox) {
      return undefined;
    }

    const countFn = this.#module._FPDFAnnot_GetOptionCount;
    const labelFn = this.#module._FPDFAnnot_GetOptionLabel;
    const selectedFn = this.#module._FPDFAnnot_IsOptionSelected;

    if (typeof countFn !== 'function' || typeof labelFn !== 'function') {
      return undefined;
    }

    const count = countFn(this.#formHandle, handle);
    if (count <= 0) {
      return undefined;
    }

    const options: WidgetOption[] = [];
    for (let i = 0; i < count; i++) {
      const label = this.#getOptionLabel(handle, i, labelFn);
      const selected = typeof selectedFn === 'function' ? selectedFn(this.#formHandle, handle, i) !== 0 : false;
      options.push({ index: i, label: label ?? '', selected });
    }

    return options;
  }

  #getOptionLabel(
    handle: AnnotationHandle,
    optionIndex: number,
    fn: (form: FormHandle, annot: AnnotationHandle, index: number, buffer: WASMPointer, buflen: number) => number,
  ): string | undefined {
    const requiredSize = fn(this.#formHandle, handle, optionIndex, NULL_PTR, 0);
    if (requiredSize <= UTF16LE_NULL_TERMINATOR_BYTES) {
      return undefined;
    }

    using buffer = this.#memory.alloc(requiredSize);
    const written = fn(this.#formHandle, handle, optionIndex, buffer.ptr, requiredSize);
    if (written <= UTF16LE_NULL_TERMINATOR_BYTES) {
      return undefined;
    }

    const dataView = this.#memory.heapU8.subarray(buffer.ptr, buffer.ptr + written - UTF16LE_NULL_TERMINATOR_BYTES);
    return utf16leDecoder.decode(dataView);
  }

  /**
   * Get the number of path objects in an annotation.
   *
   * @param index - Zero-based annotation index
   * @returns Number of path objects
   */
  getAnnotationObjectCount(index: number): number {
    this.ensureNotDisposed();

    const fn = this.#module._FPDFAnnot_GetObjectCount;
    if (typeof fn !== 'function') {
      return 0;
    }

    const handle = this.#module._FPDFPage_GetAnnot(this.#pageHandle, index);
    if (handle === NULL_ANNOT) {
      return 0;
    }

    using _annot = new NativeHandle<AnnotationHandle>(handle, (h) => this.#module._FPDFPage_CloseAnnot(h));
    return fn(handle);
  }

  /**
   * Get the border properties of an annotation.
   *
   * @param index - Zero-based annotation index
   * @returns Border properties, or undefined if not available
   */
  getAnnotationBorder(index: number): AnnotationBorder | undefined {
    this.ensureNotDisposed();

    const fn = this.#module._FPDFAnnot_GetBorder;
    if (typeof fn !== 'function') {
      return undefined;
    }

    const handle = this.#module._FPDFPage_GetAnnot(this.#pageHandle, index);
    if (handle === NULL_ANNOT) {
      return undefined;
    }

    using _annot = new NativeHandle<AnnotationHandle>(handle, (h) => this.#module._FPDFPage_CloseAnnot(h));

    // Allocate 3 floats for horizontal radius, vertical radius, border width
    using borderBuf = this.#memory.alloc(12);
    const hRadiusPtr = borderBuf.ptr;
    const vRadiusPtr = ptrOffset(borderBuf.ptr, 4);
    const widthPtr = ptrOffset(borderBuf.ptr, 8);

    const success = fn(handle, hRadiusPtr, vRadiusPtr, widthPtr);
    if (!success) {
      return undefined;
    }

    const floatView = new Float32Array(this.#memory.heapU8.buffer, borderBuf.ptr, 3);
    return {
      horizontalRadius: floatView[0] ?? 0,
      verticalRadius: floatView[1] ?? 0,
      borderWidth: floatView[2] ?? 0,
    };
  }

  /**
   * Get the line endpoints for a line annotation.
   *
   * @param index - Zero-based annotation index
   * @returns Line endpoints, or undefined if not a line annotation
   */
  getAnnotationLine(index: number): LinePoints | undefined {
    this.ensureNotDisposed();

    const fn = this.#module._FPDFAnnot_GetLine;
    if (typeof fn !== 'function') {
      return undefined;
    }

    const handle = this.#module._FPDFPage_GetAnnot(this.#pageHandle, index);
    if (handle === NULL_ANNOT) {
      return undefined;
    }

    using _annot = new NativeHandle<AnnotationHandle>(handle, (h) => this.#module._FPDFPage_CloseAnnot(h));

    // Check if it's a line annotation
    const rawType = this.#module._FPDFAnnot_GetSubtype(handle);
    if (rawType !== AnnotationType.Line) {
      return undefined;
    }

    // Allocate 4 floats for start x, start y, end x, end y
    using lineBuf = this.#memory.alloc(16);
    const startXPtr = lineBuf.ptr;
    const startYPtr = ptrOffset(lineBuf.ptr, 4);
    const endXPtr = ptrOffset(lineBuf.ptr, 8);
    const endYPtr = ptrOffset(lineBuf.ptr, 12);

    const success = fn(handle, startXPtr, startYPtr, endXPtr, endYPtr);
    if (!success) {
      return undefined;
    }

    const floatView = new Float32Array(this.#memory.heapU8.buffer, lineBuf.ptr, 4);
    return {
      startX: floatView[0] ?? 0,
      startY: floatView[1] ?? 0,
      endX: floatView[2] ?? 0,
      endY: floatView[3] ?? 0,
    };
  }

  /**
   * Get the vertices of a polygon or polyline annotation.
   *
   * @param index - Zero-based annotation index
   * @returns Array of points, or undefined if not a polygon/polyline annotation
   */
  getAnnotationVertices(index: number): Point[] | undefined {
    this.ensureNotDisposed();

    const fn = this.#module._FPDFAnnot_GetVertices;
    if (typeof fn !== 'function') {
      return undefined;
    }

    const handle = this.#module._FPDFPage_GetAnnot(this.#pageHandle, index);
    if (handle === NULL_ANNOT) {
      return undefined;
    }

    using _annot = new NativeHandle<AnnotationHandle>(handle, (h) => this.#module._FPDFPage_CloseAnnot(h));

    // First call to get the count
    const count = fn(handle, NULL_PTR, 0);
    if (count <= 0) {
      return undefined;
    }

    // Allocate buffer for FS_POINTF array (2 floats per point)
    using vertexBuf = this.#memory.alloc(count * 8);
    const written = fn(handle, vertexBuf.ptr, count);
    if (written <= 0) {
      return undefined;
    }

    const floatView = new Float32Array(this.#memory.heapU8.buffer, vertexBuf.ptr, written * 2);
    const points: Point[] = [];
    for (let i = 0; i < written; i++) {
      points.push({
        x: floatView[i * 2] ?? 0,
        y: floatView[i * 2 + 1] ?? 0,
      });
    }

    return points;
  }

  /**
   * Get the number of ink paths in an ink annotation.
   *
   * @param index - Zero-based annotation index
   * @returns Number of ink paths
   */
  getAnnotationInkPathCount(index: number): number {
    this.ensureNotDisposed();

    const fn = this.#module._FPDFAnnot_GetInkListCount;
    if (typeof fn !== 'function') {
      return 0;
    }

    const handle = this.#module._FPDFPage_GetAnnot(this.#pageHandle, index);
    if (handle === NULL_ANNOT) {
      return 0;
    }

    using _annot = new NativeHandle<AnnotationHandle>(handle, (h) => this.#module._FPDFPage_CloseAnnot(h));
    return fn(handle);
  }

  /**
   * Get the points in an ink path.
   *
   * @param annotIndex - Zero-based annotation index
   * @param pathIndex - Zero-based path index
   * @returns Array of points, or undefined if not available
   */
  getAnnotationInkPath(annotIndex: number, pathIndex: number): Point[] | undefined {
    this.ensureNotDisposed();

    const fn = this.#module._FPDFAnnot_GetInkListPath;
    if (typeof fn !== 'function') {
      return undefined;
    }

    const handle = this.#module._FPDFPage_GetAnnot(this.#pageHandle, annotIndex);
    if (handle === NULL_ANNOT) {
      return undefined;
    }

    using _annot = new NativeHandle<AnnotationHandle>(handle, (h) => this.#module._FPDFPage_CloseAnnot(h));

    // First call to get the count
    const count = fn(handle, pathIndex, NULL_PTR, 0);
    if (count <= 0) {
      return undefined;
    }

    // Allocate buffer for FS_POINTF array (2 floats per point)
    using pointBuf = this.#memory.alloc(count * 8);
    const written = fn(handle, pathIndex, pointBuf.ptr, count);
    if (written <= 0) {
      return undefined;
    }

    const floatView = new Float32Array(this.#memory.heapU8.buffer, pointBuf.ptr, written * 2);
    const points: Point[] = [];
    for (let i = 0; i < written; i++) {
      points.push({
        x: floatView[i * 2] ?? 0,
        y: floatView[i * 2 + 1] ?? 0,
      });
    }

    return points;
  }

  /**
   * Get the number of attachment points for a markup annotation.
   *
   * @param index - Zero-based annotation index
   * @returns Number of attachment point sets (quad points)
   */
  getAnnotationAttachmentPointCount(index: number): number {
    this.ensureNotDisposed();

    const fn = this.#module._FPDFAnnot_CountAttachmentPoints;
    if (typeof fn !== 'function') {
      return 0;
    }

    const handle = this.#module._FPDFPage_GetAnnot(this.#pageHandle, index);
    if (handle === NULL_ANNOT) {
      return 0;
    }

    using _annot = new NativeHandle<AnnotationHandle>(handle, (h) => this.#module._FPDFPage_CloseAnnot(h));
    return fn(handle);
  }

  /**
   * Get attachment points (quad points) for a markup annotation.
   *
   * @param annotIndex - Zero-based annotation index
   * @param quadIndex - Zero-based quad points index
   * @returns Quad points, or undefined if not available
   */
  getAnnotationAttachmentPoints(annotIndex: number, quadIndex: number): QuadPoints | undefined {
    this.ensureNotDisposed();

    const fn = this.#module._FPDFAnnot_GetAttachmentPoints;
    if (typeof fn !== 'function') {
      return undefined;
    }

    const handle = this.#module._FPDFPage_GetAnnot(this.#pageHandle, annotIndex);
    if (handle === NULL_ANNOT) {
      return undefined;
    }

    using _annot = new NativeHandle<AnnotationHandle>(handle, (h) => this.#module._FPDFPage_CloseAnnot(h));

    // FS_QUADPOINTSF has 8 floats (4 points with x,y each)
    using quadBuf = this.#memory.alloc(32);
    const success = fn(handle, quadIndex, quadBuf.ptr);
    if (!success) {
      return undefined;
    }

    const floatView = new Float32Array(this.#memory.heapU8.buffer, quadBuf.ptr, 8);
    return {
      x1: floatView[0] ?? 0,
      y1: floatView[1] ?? 0,
      x2: floatView[2] ?? 0,
      y2: floatView[3] ?? 0,
      x3: floatView[4] ?? 0,
      y3: floatView[5] ?? 0,
      x4: floatView[6] ?? 0,
      y4: floatView[7] ?? 0,
    };
  }

  /**
   * Check if an annotation has a specific key in its dictionary.
   *
   * @param index - Zero-based annotation index
   * @param key - Key name to check
   * @returns True if the key exists
   */
  annotationHasKey(index: number, key: string): boolean {
    this.ensureNotDisposed();

    const fn = this.#module._FPDFAnnot_HasKey;
    if (typeof fn !== 'function') {
      return false;
    }

    const handle = this.#module._FPDFPage_GetAnnot(this.#pageHandle, index);
    if (handle === NULL_ANNOT) {
      return false;
    }

    using _annot = new NativeHandle<AnnotationHandle>(handle, (h) => this.#module._FPDFPage_CloseAnnot(h));

    const keyBytes = textEncoder.encode(`${key}\0`);
    using keyBuffer = this.#memory.alloc(keyBytes.length);
    this.#memory.heapU8.set(keyBytes, keyBuffer.ptr);

    return fn(handle, keyBuffer.ptr) !== 0;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Form Field Methods
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Check if there is a form field at the specified point.
   *
   * @param x - X coordinate in page coordinates
   * @param y - Y coordinate in page coordinates
   * @returns The form field type at the point, or -1 if none
   */
  hasFormFieldAtPoint(x: number, y: number): number {
    this.ensureNotDisposed();
    if (this.#formHandle === NULL_FORM) {
      return -1;
    }
    const fn = this.#module._FPDFPage_HasFormFieldAtPoint;
    if (typeof fn !== 'function') {
      return -1;
    }
    return fn(this.#formHandle, this.#pageHandle, x, y);
  }

  /**
   * Get the Z-order of a form field at the specified point.
   *
   * @param x - X coordinate in page coordinates
   * @param y - Y coordinate in page coordinates
   * @returns The Z-order of the form field at the point, or -1 if none
   */
  getFormFieldZOrderAtPoint(x: number, y: number): number {
    this.ensureNotDisposed();
    if (this.#formHandle === NULL_FORM) {
      return -1;
    }
    const fn = this.#module._FPDFPage_FormFieldZOrderAtPoint;
    if (typeof fn !== 'function') {
      return -1;
    }
    return fn(this.#formHandle, this.#pageHandle, x, y);
  }

  /**
   * Get the currently selected text in a form field on this page.
   *
   * @returns The selected text, or undefined if no selection
   */
  getFormSelectedText(): string | undefined {
    this.ensureNotDisposed();
    if (this.#formHandle === NULL_FORM) {
      return undefined;
    }
    const fn = this.#module._FORM_GetSelectedText;
    if (typeof fn !== 'function') {
      return undefined;
    }

    // First call to get required size
    const requiredSize = fn(this.#formHandle, this.#pageHandle, NULL_PTR, 0);
    if (requiredSize <= UTF16LE_NULL_TERMINATOR_BYTES) {
      return undefined;
    }

    using buffer = this.#memory.alloc(requiredSize);
    const written = fn(this.#formHandle, this.#pageHandle, buffer.ptr, requiredSize);
    if (written <= UTF16LE_NULL_TERMINATOR_BYTES) {
      return undefined;
    }

    // UTF-16LE string
    const dataView = this.#memory.heapU8.subarray(buffer.ptr, buffer.ptr + written - UTF16LE_NULL_TERMINATOR_BYTES);
    return utf16leDecoder.decode(dataView);
  }

  /**
   * Replace the currently selected text in a form field.
   *
   * @param text - The text to replace the selection with
   */
  replaceFormSelection(text: string): void {
    this.ensureNotDisposed();
    if (this.#formHandle === NULL_FORM) {
      return;
    }
    const fn = this.#module._FORM_ReplaceSelection;
    if (typeof fn !== 'function') {
      return;
    }

    const textBytes = encodeUTF16LE(text);
    using textBuffer = this.#memory.allocFrom(textBytes);
    fn(this.#formHandle, this.#pageHandle, textBuffer.ptr);
  }

  /**
   * Check if undo is available for form field editing on this page.
   */
  canFormUndo(): boolean {
    this.ensureNotDisposed();
    if (this.#formHandle === NULL_FORM) {
      return false;
    }
    const fn = this.#module._FORM_CanUndo;
    if (typeof fn !== 'function') {
      return false;
    }
    return fn(this.#formHandle, this.#pageHandle) !== 0;
  }

  /**
   * Check if redo is available for form field editing on this page.
   */
  canFormRedo(): boolean {
    this.ensureNotDisposed();
    if (this.#formHandle === NULL_FORM) {
      return false;
    }
    const fn = this.#module._FORM_CanRedo;
    if (typeof fn !== 'function') {
      return false;
    }
    return fn(this.#formHandle, this.#pageHandle) !== 0;
  }

  /**
   * Undo the last form field editing operation on this page.
   *
   * @returns True if undo was successful
   */
  formUndo(): boolean {
    this.ensureNotDisposed();
    if (this.#formHandle === NULL_FORM) {
      return false;
    }
    const fn = this.#module._FORM_Undo;
    if (typeof fn !== 'function') {
      return false;
    }
    return fn(this.#formHandle, this.#pageHandle) !== 0;
  }

  /**
   * Redo the last undone form field editing operation on this page.
   *
   * @returns True if redo was successful
   */
  formRedo(): boolean {
    this.ensureNotDisposed();
    if (this.#formHandle === NULL_FORM) {
      return false;
    }
    const fn = this.#module._FORM_Redo;
    if (typeof fn !== 'function') {
      return false;
    }
    return fn(this.#formHandle, this.#pageHandle) !== 0;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Form Modification Methods
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Notify form fill environment of mouse movement.
   *
   * @param modifier - Keyboard modifier flags (shift, ctrl, alt)
   * @param x - X coordinate in page space
   * @param y - Y coordinate in page space
   * @returns True if the event was handled
   */
  formOnMouseMove(modifier: number, x: number, y: number): boolean {
    this.ensureNotDisposed();
    if (this.#formHandle === NULL_FORM) {
      return false;
    }
    const fn = this.#module._FORM_OnMouseMove;
    if (typeof fn !== 'function') {
      return false;
    }
    return fn(this.#formHandle, this.#pageHandle, modifier, x, y) !== 0;
  }

  /**
   * Notify form fill environment of mouse wheel scroll.
   *
   * @param modifier - Keyboard modifier flags
   * @param x - X coordinate in page space
   * @param y - Y coordinate in page space
   * @param deltaX - Horizontal scroll delta
   * @param deltaY - Vertical scroll delta
   * @returns True if the event was handled
   */
  formOnMouseWheel(modifier: number, x: number, y: number, deltaX: number, deltaY: number): boolean {
    this.ensureNotDisposed();
    if (this.#formHandle === NULL_FORM) {
      return false;
    }
    const fn = this.#module._FORM_OnMouseWheel;
    if (typeof fn !== 'function') {
      return false;
    }

    // Allocate FS_POINTF struct (two floats: x, y)
    using coord = this.#memory.alloc(8); // 2 * sizeof(float)
    const floatView = new Float32Array(this.#memory.heapU8.buffer, coord.ptr, 2);
    floatView[0] = x;
    floatView[1] = y;

    return fn(this.#formHandle, this.#pageHandle, modifier, coord.ptr, deltaX, deltaY) !== 0;
  }

  /**
   * Notify form fill environment of focus at a point.
   *
   * @param modifier - Keyboard modifier flags
   * @param x - X coordinate in page space
   * @param y - Y coordinate in page space
   * @returns True if the event was handled
   */
  formOnFocus(modifier: number, x: number, y: number): boolean {
    this.ensureNotDisposed();
    if (this.#formHandle === NULL_FORM) {
      return false;
    }
    const fn = this.#module._FORM_OnFocus;
    if (typeof fn !== 'function') {
      return false;
    }
    return fn(this.#formHandle, this.#pageHandle, modifier, x, y) !== 0;
  }

  /**
   * Notify form fill environment of left mouse button down.
   *
   * @param modifier - Keyboard modifier flags
   * @param x - X coordinate in page space
   * @param y - Y coordinate in page space
   * @returns True if the event was handled
   */
  formOnLButtonDown(modifier: number, x: number, y: number): boolean {
    this.ensureNotDisposed();
    if (this.#formHandle === NULL_FORM) {
      return false;
    }
    const fn = this.#module._FORM_OnLButtonDown;
    if (typeof fn !== 'function') {
      return false;
    }
    return fn(this.#formHandle, this.#pageHandle, modifier, x, y) !== 0;
  }

  /**
   * Notify form fill environment of right mouse button down.
   *
   * @param modifier - Keyboard modifier flags
   * @param x - X coordinate in page space
   * @param y - Y coordinate in page space
   * @returns True if the event was handled
   */
  formOnRButtonDown(modifier: number, x: number, y: number): boolean {
    this.ensureNotDisposed();
    if (this.#formHandle === NULL_FORM) {
      return false;
    }
    const fn = this.#module._FORM_OnRButtonDown;
    if (typeof fn !== 'function') {
      return false;
    }
    return fn(this.#formHandle, this.#pageHandle, modifier, x, y) !== 0;
  }

  /**
   * Notify form fill environment of left mouse button up.
   *
   * @param modifier - Keyboard modifier flags
   * @param x - X coordinate in page space
   * @param y - Y coordinate in page space
   * @returns True if the event was handled
   */
  formOnLButtonUp(modifier: number, x: number, y: number): boolean {
    this.ensureNotDisposed();
    if (this.#formHandle === NULL_FORM) {
      return false;
    }
    const fn = this.#module._FORM_OnLButtonUp;
    if (typeof fn !== 'function') {
      return false;
    }
    return fn(this.#formHandle, this.#pageHandle, modifier, x, y) !== 0;
  }

  /**
   * Notify form fill environment of right mouse button up.
   *
   * @param modifier - Keyboard modifier flags
   * @param x - X coordinate in page space
   * @param y - Y coordinate in page space
   * @returns True if the event was handled
   */
  formOnRButtonUp(modifier: number, x: number, y: number): boolean {
    this.ensureNotDisposed();
    if (this.#formHandle === NULL_FORM) {
      return false;
    }
    const fn = this.#module._FORM_OnRButtonUp;
    if (typeof fn !== 'function') {
      return false;
    }
    return fn(this.#formHandle, this.#pageHandle, modifier, x, y) !== 0;
  }

  /**
   * Notify form fill environment of left mouse button double-click.
   *
   * @param modifier - Keyboard modifier flags
   * @param x - X coordinate in page space
   * @param y - Y coordinate in page space
   * @returns True if the event was handled
   */
  formOnLButtonDoubleClick(modifier: number, x: number, y: number): boolean {
    this.ensureNotDisposed();
    if (this.#formHandle === NULL_FORM) {
      return false;
    }
    const fn = this.#module._FORM_OnLButtonDoubleClick;
    if (typeof fn !== 'function') {
      return false;
    }
    return fn(this.#formHandle, this.#pageHandle, modifier, x, y) !== 0;
  }

  /**
   * Notify form fill environment of a key down event.
   *
   * @param keyCode - Virtual key code
   * @param modifier - Keyboard modifier flags
   * @returns True if the event was handled
   */
  formOnKeyDown(keyCode: number, modifier: number): boolean {
    this.ensureNotDisposed();
    if (this.#formHandle === NULL_FORM) {
      return false;
    }
    const fn = this.#module._FORM_OnKeyDown;
    if (typeof fn !== 'function') {
      return false;
    }
    return fn(this.#formHandle, this.#pageHandle, keyCode, modifier) !== 0;
  }

  /**
   * Notify form fill environment of a key up event.
   *
   * @param keyCode - Virtual key code
   * @param modifier - Keyboard modifier flags
   * @returns True if the event was handled
   */
  formOnKeyUp(keyCode: number, modifier: number): boolean {
    this.ensureNotDisposed();
    if (this.#formHandle === NULL_FORM) {
      return false;
    }
    const fn = this.#module._FORM_OnKeyUp;
    if (typeof fn !== 'function') {
      return false;
    }
    return fn(this.#formHandle, this.#pageHandle, keyCode, modifier) !== 0;
  }

  /**
   * Notify form fill environment of a character input event.
   *
   * @param charCode - Character code
   * @param modifier - Keyboard modifier flags
   * @returns True if the event was handled
   */
  formOnChar(charCode: number, modifier: number): boolean {
    this.ensureNotDisposed();
    if (this.#formHandle === NULL_FORM) {
      return false;
    }
    const fn = this.#module._FORM_OnChar;
    if (typeof fn !== 'function') {
      return false;
    }
    return fn(this.#formHandle, this.#pageHandle, charCode, modifier) !== 0;
  }

  /**
   * Get the text in the currently focused form field.
   *
   * @returns The focused text, or undefined if no focused field
   */
  getFormFocusedText(): string | undefined {
    this.ensureNotDisposed();
    if (this.#formHandle === NULL_FORM) {
      return undefined;
    }
    const fn = this.#module._FORM_GetFocusedText;
    if (typeof fn !== 'function') {
      return undefined;
    }

    // First call to get required size
    const requiredSize = fn(this.#formHandle, this.#pageHandle, NULL_PTR, 0);
    if (requiredSize <= UTF16LE_NULL_TERMINATOR_BYTES) {
      return undefined;
    }

    using buffer = this.#memory.alloc(requiredSize);
    const written = fn(this.#formHandle, this.#pageHandle, buffer.ptr, requiredSize);
    if (written <= UTF16LE_NULL_TERMINATOR_BYTES) {
      return undefined;
    }

    // UTF-16LE string
    const dataView = this.#memory.heapU8.subarray(buffer.ptr, buffer.ptr + written - UTF16LE_NULL_TERMINATOR_BYTES);
    return utf16leDecoder.decode(dataView);
  }

  /**
   * Replace the selected text in a form field and keep the selection.
   *
   * @param text - The text to replace the selection with
   */
  replaceFormSelectionAndKeep(text: string): void {
    this.ensureNotDisposed();
    if (this.#formHandle === NULL_FORM) {
      return;
    }
    const fn = this.#module._FORM_ReplaceAndKeepSelection;
    if (typeof fn !== 'function') {
      return;
    }

    const textBytes = encodeUTF16LE(text);
    using textBuffer = this.#memory.allocFrom(textBytes);
    fn(this.#formHandle, this.#pageHandle, textBuffer.ptr);
  }

  /**
   * Select all text in the currently focused form field.
   *
   * @returns True if successful
   */
  formSelectAllText(): boolean {
    this.ensureNotDisposed();
    if (this.#formHandle === NULL_FORM) {
      return false;
    }
    const fn = this.#module._FORM_SelectAllText;
    if (typeof fn !== 'function') {
      return false;
    }
    return fn(this.#formHandle, this.#pageHandle) !== 0;
  }

  /**
   * Set the focused annotation.
   *
   * @param handle - The annotation handle to focus
   * @returns True if successful
   */
  setFormFocusedAnnotation(handle: AnnotationHandle): boolean {
    this.ensureNotDisposed();
    if (this.#formHandle === NULL_FORM) {
      return false;
    }
    const fn = this.#module._FORM_SetFocusedAnnot;
    if (typeof fn !== 'function') {
      return false;
    }
    return fn(this.#formHandle, handle) !== 0;
  }

  /**
   * Set the selection state of an index in a listbox or combobox.
   *
   * @param index - The option index to select/deselect
   * @param selected - True to select, false to deselect
   * @returns True if successful
   */
  setFormIndexSelected(index: number, selected: boolean): boolean {
    this.ensureNotDisposed();
    if (this.#formHandle === NULL_FORM) {
      return false;
    }
    const fn = this.#module._FORM_SetIndexSelected;
    if (typeof fn !== 'function') {
      return false;
    }
    return fn(this.#formHandle, this.#pageHandle, index, selected ? 1 : 0) !== 0;
  }

  /**
   * Check if an index is selected in a listbox or combobox.
   *
   * @param index - The option index to check
   * @returns True if the index is selected
   */
  isFormIndexSelected(index: number): boolean {
    this.ensureNotDisposed();
    if (this.#formHandle === NULL_FORM) {
      return false;
    }
    const fn = this.#module._FORM_IsIndexSelected;
    if (typeof fn !== 'function') {
      return false;
    }
    return fn(this.#formHandle, this.#pageHandle, index) !== 0;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Page Manipulation Methods
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Set the rotation of this page.
   *
   * @param rotation - The rotation value (0, 1, 2, or 3 for 0°, 90°, 180°, 270°)
   */
  setRotation(rotation: PageRotation): void {
    this.ensureNotDisposed();
    const fn = this.#module._FPDFPage_SetRotation;
    if (typeof fn !== 'function') {
      return;
    }
    fn(this.#pageHandle, rotation);
  }

  /**
   * Flatten annotations and form fields into page content.
   *
   * After flattening, annotations and form fields become part of the page
   * content and can no longer be edited separately.
   *
   * @param flags - Flatten flags (0 for normal display, 1 for print)
   * @returns The flatten result
   */
  flatten(flags: FlattenFlags = FlattenFlags.NormalDisplay): FlattenResult {
    this.ensureNotDisposed();
    const fn = this.#module._FPDFPage_Flatten;
    if (typeof fn !== 'function') {
      return FlattenResult.Fail;
    }
    return fn(this.#pageHandle, flags) as FlattenResult;
  }

  /**
   * Check if this page contains transparency.
   *
   * @returns True if the page contains transparency
   */
  hasTransparency(): boolean {
    this.ensureNotDisposed();
    const fn = this.#module._FPDFPage_HasTransparency;
    if (typeof fn !== 'function') {
      return false;
    }
    return fn(this.#pageHandle) !== 0;
  }

  /**
   * Remove a page object from this page.
   *
   * After removal, call generateContent() to update the page content stream.
   *
   * @param object - The page object handle to remove
   * @returns True if successful
   */
  removePageObject(object: PageObjectHandle): boolean {
    this.ensureNotDisposed();
    const fn = this.#module._FPDFPage_RemoveObject;
    if (typeof fn !== 'function') {
      return false;
    }
    return fn(this.#pageHandle, object) !== 0;
  }

  /**
   * Generate the page content stream.
   *
   * Call this after modifying page objects to persist changes.
   *
   * @returns True if successful
   */
  generateContent(): boolean {
    this.ensureNotDisposed();
    const fn = this.#module._FPDFPage_GenerateContent;
    if (typeof fn !== 'function') {
      return false;
    }
    return fn(this.#pageHandle) !== 0;
  }

  /**
   * Set the media box of this page.
   *
   * @param left - Left coordinate
   * @param bottom - Bottom coordinate
   * @param right - Right coordinate
   * @param top - Top coordinate
   */
  setMediaBox(left: number, bottom: number, right: number, top: number): void {
    this.ensureNotDisposed();
    const fn = this.#module._FPDFPage_SetMediaBox;
    if (typeof fn !== 'function') {
      return;
    }
    fn(this.#pageHandle, left, bottom, right, top);
  }

  /**
   * Set the crop box of this page.
   *
   * @param left - Left coordinate
   * @param bottom - Bottom coordinate
   * @param right - Right coordinate
   * @param top - Top coordinate
   */
  setCropBox(left: number, bottom: number, right: number, top: number): void {
    this.ensureNotDisposed();
    const fn = this.#module._FPDFPage_SetCropBox;
    if (typeof fn !== 'function') {
      return;
    }
    fn(this.#pageHandle, left, bottom, right, top);
  }

  /**
   * Set the bleed box of this page.
   *
   * @param left - Left coordinate
   * @param bottom - Bottom coordinate
   * @param right - Right coordinate
   * @param top - Top coordinate
   */
  setBleedBox(left: number, bottom: number, right: number, top: number): void {
    this.ensureNotDisposed();
    const fn = this.#module._FPDFPage_SetBleedBox;
    if (typeof fn !== 'function') {
      return;
    }
    fn(this.#pageHandle, left, bottom, right, top);
  }

  /**
   * Set the trim box of this page.
   *
   * @param left - Left coordinate
   * @param bottom - Bottom coordinate
   * @param right - Right coordinate
   * @param top - Top coordinate
   */
  setTrimBox(left: number, bottom: number, right: number, top: number): void {
    this.ensureNotDisposed();
    const fn = this.#module._FPDFPage_SetTrimBox;
    if (typeof fn !== 'function') {
      return;
    }
    fn(this.#pageHandle, left, bottom, right, top);
  }

  /**
   * Set the art box of this page.
   *
   * @param left - Left coordinate
   * @param bottom - Bottom coordinate
   * @param right - Right coordinate
   * @param top - Top coordinate
   */
  setArtBox(left: number, bottom: number, right: number, top: number): void {
    this.ensureNotDisposed();
    const fn = this.#module._FPDFPage_SetArtBox;
    if (typeof fn !== 'function') {
      return;
    }
    fn(this.#pageHandle, left, bottom, right, top);
  }

  /**
   * Transform this page with a matrix and optional clip rectangle.
   *
   * @param matrix - 6-element transformation matrix [a, b, c, d, e, f]
   * @param clipRect - Optional clip rectangle [left, bottom, right, top]
   * @returns True if successful
   */
  transformWithClip(
    matrix: [number, number, number, number, number, number],
    clipRect?: [number, number, number, number],
  ): boolean {
    this.ensureNotDisposed();
    const fn = this.#module._FPDFPage_TransFormWithClip;
    if (typeof fn !== 'function') {
      return false;
    }

    // Allocate matrix struct (FS_MATRIX: 6 floats)
    using matrixBuffer = this.#memory.alloc(24); // 6 * sizeof(float)
    const matrixView = new Float32Array(this.#memory.heapU8.buffer, matrixBuffer.ptr, 6);
    matrixView[0] = matrix[0];
    matrixView[1] = matrix[1];
    matrixView[2] = matrix[2];
    matrixView[3] = matrix[3];
    matrixView[4] = matrix[4];
    matrixView[5] = matrix[5];

    if (clipRect) {
      using clipBuffer = this.#memory.alloc(16); // 4 * sizeof(float)
      const clipView = new Float32Array(this.#memory.heapU8.buffer, clipBuffer.ptr, 4);
      clipView[0] = clipRect[0];
      clipView[1] = clipRect[1];
      clipView[2] = clipRect[2];
      clipView[3] = clipRect[3];
      return fn(this.#pageHandle, matrixBuffer.ptr, clipBuffer.ptr) !== 0;
    }

    return fn(this.#pageHandle, matrixBuffer.ptr, NULL_PTR) !== 0;
  }

  /**
   * Create a clip path and insert it into this page.
   *
   * @param left - Left coordinate
   * @param bottom - Bottom coordinate
   * @param right - Right coordinate
   * @param top - Top coordinate
   * @returns The clip path handle, or null if creation failed
   */
  createClipPath(left: number, bottom: number, right: number, top: number): ClipPathHandle | null {
    this.ensureNotDisposed();
    const fn = this.#module._FPDF_CreateClipPath;
    if (typeof fn !== 'function') {
      return null;
    }
    const handle = fn(left, bottom, right, top);
    if (handle === NULL_CLIP_PATH) {
      return null;
    }
    return handle;
  }

  /**
   * Insert a clip path into this page.
   *
   * @param clipPath - The clip path handle
   */
  insertClipPath(clipPath: ClipPathHandle): void {
    this.ensureNotDisposed();
    const fn = this.#module._FPDFPage_InsertClipPath;
    if (typeof fn !== 'function') {
      return;
    }
    fn(this.#pageHandle, clipPath);
  }

  /**
   * Destroy a clip path handle.
   *
   * @param clipPath - The clip path handle to destroy
   */
  destroyClipPath(clipPath: ClipPathHandle): void {
    const fn = this.#module._FPDF_DestroyClipPath;
    if (typeof fn !== 'function') {
      return;
    }
    fn(clipPath);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Path Operations
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Move the path's current point to the specified coordinates.
   *
   * @param path - The path object handle
   * @param x - The x coordinate
   * @param y - The y coordinate
   * @returns True if successful
   */
  pathMoveTo(path: PageObjectHandle, x: number, y: number): boolean {
    this.ensureNotDisposed();
    const fn = this.#module._FPDFPath_MoveTo;
    if (typeof fn !== 'function') {
      return false;
    }
    return fn(path, x, y) !== 0;
  }

  /**
   * Add a line segment from the current point to the specified coordinates.
   *
   * @param path - The path object handle
   * @param x - The x coordinate
   * @param y - The y coordinate
   * @returns True if successful
   */
  pathLineTo(path: PageObjectHandle, x: number, y: number): boolean {
    this.ensureNotDisposed();
    const fn = this.#module._FPDFPath_LineTo;
    if (typeof fn !== 'function') {
      return false;
    }
    return fn(path, x, y) !== 0;
  }

  /**
   * Add a cubic Bezier curve to the path.
   *
   * @param path - The path object handle
   * @param x1 - First control point x
   * @param y1 - First control point y
   * @param x2 - Second control point x
   * @param y2 - Second control point y
   * @param x3 - End point x
   * @param y3 - End point y
   * @returns True if successful
   */
  pathBezierTo(
    path: PageObjectHandle,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number,
  ): boolean {
    this.ensureNotDisposed();
    const fn = this.#module._FPDFPath_BezierTo;
    if (typeof fn !== 'function') {
      return false;
    }
    return fn(path, x1, y1, x2, y2, x3, y3) !== 0;
  }

  /**
   * Close the current subpath by connecting the current point to the start point.
   *
   * @param path - The path object handle
   * @returns True if successful
   */
  pathClose(path: PageObjectHandle): boolean {
    this.ensureNotDisposed();
    const fn = this.#module._FPDFPath_Close;
    if (typeof fn !== 'function') {
      return false;
    }
    return fn(path) !== 0;
  }

  /**
   * Set the draw mode for a path object.
   *
   * @param path - The path object handle
   * @param fillMode - The fill mode (0=none, 1=alternate, 2=winding)
   * @param stroke - Whether to stroke the path
   * @returns True if successful
   */
  pathSetDrawMode(path: PageObjectHandle, fillMode: PathFillMode, stroke: boolean): boolean {
    this.ensureNotDisposed();
    const fn = this.#module._FPDFPath_SetDrawMode;
    if (typeof fn !== 'function') {
      return false;
    }
    return fn(path, fillMode, stroke ? 1 : 0) !== 0;
  }

  /**
   * Get the draw mode for a path object.
   *
   * @param path - The path object handle
   * @returns The draw mode { fillMode, stroke } or null on failure
   */
  pathGetDrawMode(path: PageObjectHandle): { fillMode: PathFillMode; stroke: boolean } | null {
    this.ensureNotDisposed();
    const fn = this.#module._FPDFPath_GetDrawMode;
    if (typeof fn !== 'function') {
      return null;
    }

    using fillModePtr = this.#memory.alloc(4);
    using strokePtr = this.#memory.alloc(4);

    if (fn(path, fillModePtr.ptr, strokePtr.ptr) === 0) {
      return null;
    }

    const fillMode = new Int32Array(this.#memory.heapU8.buffer, fillModePtr.ptr, 1)[0] as PathFillMode;
    const strokeVal = new Int32Array(this.#memory.heapU8.buffer, strokePtr.ptr, 1)[0];

    return {
      fillMode,
      stroke: strokeVal !== 0,
    };
  }

  /**
   * Get the number of segments in a path.
   *
   * @param path - The path object handle
   * @returns The number of segments, or -1 on failure
   */
  pathCountSegments(path: PageObjectHandle): number {
    this.ensureNotDisposed();
    const fn = this.#module._FPDFPath_CountSegments;
    if (typeof fn !== 'function') {
      return -1;
    }
    return fn(path);
  }

  /**
   * Get a segment from a path at the specified index.
   *
   * @param path - The path object handle
   * @param index - The segment index
   * @returns The segment handle, or null on failure
   */
  pathGetSegment(path: PageObjectHandle, index: number): PathSegmentHandle | null {
    this.ensureNotDisposed();
    const fn = this.#module._FPDFPath_GetPathSegment;
    if (typeof fn !== 'function') {
      return null;
    }
    const handle = fn(path, index);
    if (handle === NULL_PATH_SEGMENT) {
      return null;
    }
    return handle;
  }

  /**
   * Get the point coordinates of a path segment.
   *
   * @param segment - The segment handle
   * @returns The point coordinates { x, y } or null on failure
   */
  pathSegmentGetPoint(segment: PathSegmentHandle): Point | null {
    this.ensureNotDisposed();
    const fn = this.#module._FPDFPathSegment_GetPoint;
    if (typeof fn !== 'function') {
      return null;
    }

    using xPtr = this.#memory.alloc(4);
    using yPtr = this.#memory.alloc(4);

    if (fn(segment, xPtr.ptr, yPtr.ptr) === 0) {
      return null;
    }

    const xArr = new Float32Array(this.#memory.heapU8.buffer, xPtr.ptr, 1);
    const yArr = new Float32Array(this.#memory.heapU8.buffer, yPtr.ptr, 1);
    const x = xArr[0];
    const y = yArr[0];

    if (x === undefined || y === undefined) {
      return null;
    }

    return { x, y };
  }

  /**
   * Get the type of a path segment.
   *
   * @param segment - The segment handle
   * @returns The segment type
   */
  pathSegmentGetType(segment: PathSegmentHandle): PathSegmentType {
    this.ensureNotDisposed();
    const fn = this.#module._FPDFPathSegment_GetType;
    if (typeof fn !== 'function') {
      return PathSegmentType.Unknown;
    }
    return fn(segment) as PathSegmentType;
  }

  /**
   * Check if a path segment closes the current subpath.
   *
   * @param segment - The segment handle
   * @returns True if the segment closes the subpath
   */
  pathSegmentGetClose(segment: PathSegmentHandle): boolean {
    this.ensureNotDisposed();
    const fn = this.#module._FPDFPathSegment_GetClose;
    if (typeof fn !== 'function') {
      return false;
    }
    return fn(segment) !== 0;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Extended Page Object Methods
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Get the fill colour of a page object.
   *
   * @param obj - The page object handle
   * @returns The fill colour or null if not available
   */
  pageObjGetFillColour(obj: PageObjectHandle): Colour | null {
    this.ensureNotDisposed();
    const fn = this.#module._FPDFPageObj_GetFillColor;
    if (typeof fn !== 'function') {
      return null;
    }

    using rBuf = this.#memory.alloc(4);
    using gBuf = this.#memory.alloc(4);
    using bBuf = this.#memory.alloc(4);
    using aBuf = this.#memory.alloc(4);

    const result = fn(obj, rBuf.ptr, gBuf.ptr, bBuf.ptr, aBuf.ptr);
    if (result === 0) {
      return null;
    }

    const view = new Uint32Array(this.#memory.heapU8.buffer);
    const rVal = view[rBuf.ptr / 4];
    const gVal = view[gBuf.ptr / 4];
    const bVal = view[bBuf.ptr / 4];
    const aVal = view[aBuf.ptr / 4];
    if (rVal === undefined || gVal === undefined || bVal === undefined || aVal === undefined) {
      return null;
    }

    return { r: rVal, g: gVal, b: bVal, a: aVal };
  }

  /**
   * Get the stroke colour of a page object.
   *
   * @param obj - The page object handle
   * @returns The stroke colour or null if not available
   */
  pageObjGetStrokeColour(obj: PageObjectHandle): Colour | null {
    this.ensureNotDisposed();
    const fn = this.#module._FPDFPageObj_GetStrokeColor;
    if (typeof fn !== 'function') {
      return null;
    }

    using rBuf = this.#memory.alloc(4);
    using gBuf = this.#memory.alloc(4);
    using bBuf = this.#memory.alloc(4);
    using aBuf = this.#memory.alloc(4);

    const result = fn(obj, rBuf.ptr, gBuf.ptr, bBuf.ptr, aBuf.ptr);
    if (result === 0) {
      return null;
    }

    const view = new Uint32Array(this.#memory.heapU8.buffer);
    const rVal = view[rBuf.ptr / 4];
    const gVal = view[gBuf.ptr / 4];
    const bVal = view[bBuf.ptr / 4];
    const aVal = view[aBuf.ptr / 4];
    if (rVal === undefined || gVal === undefined || bVal === undefined || aVal === undefined) {
      return null;
    }

    return { r: rVal, g: gVal, b: bVal, a: aVal };
  }

  /**
   * Get the stroke width of a page object.
   *
   * @param obj - The page object handle
   * @returns The stroke width or null if not available
   */
  pageObjGetStrokeWidth(obj: PageObjectHandle): number | null {
    this.ensureNotDisposed();
    const fn = this.#module._FPDFPageObj_GetStrokeWidth;
    if (typeof fn !== 'function') {
      return null;
    }

    using widthBuf = this.#memory.alloc(4);
    const result = fn(obj, widthBuf.ptr);
    if (result === 0) {
      return null;
    }

    const floatView = new Float32Array(this.#memory.heapU8.buffer, widthBuf.ptr, 1);
    const width = floatView[0];
    return width !== undefined ? width : null;
  }

  /**
   * Get the transformation matrix of a page object.
   *
   * @param obj - The page object handle
   * @returns The transformation matrix or null if not available
   */
  pageObjGetMatrix(obj: PageObjectHandle): TransformMatrix | null {
    this.ensureNotDisposed();
    const fn = this.#module._FPDFPageObj_GetMatrix;
    if (typeof fn !== 'function') {
      return null;
    }

    // FS_MATRIX struct: 6 floats (a, b, c, d, e, f)
    using matrixBuf = this.#memory.alloc(24);
    const result = fn(obj, matrixBuf.ptr);
    if (result === 0) {
      return null;
    }

    const floatView = new Float32Array(this.#memory.heapU8.buffer, matrixBuf.ptr, 6);
    const a = floatView[0];
    const b = floatView[1];
    const c = floatView[2];
    const d = floatView[3];
    const e = floatView[4];
    const f = floatView[5];
    if (
      a === undefined ||
      b === undefined ||
      c === undefined ||
      d === undefined ||
      e === undefined ||
      f === undefined
    ) {
      return null;
    }

    return { a, b, c, d, e, f };
  }

  /**
   * Set the transformation matrix of a page object.
   *
   * @param obj - The page object handle
   * @param matrix - The transformation matrix
   * @returns True if successful
   */
  pageObjSetMatrix(obj: PageObjectHandle, matrix: TransformMatrix): boolean {
    this.ensureNotDisposed();
    const fn = this.#module._FPDFPageObj_SetMatrix;
    if (typeof fn !== 'function') {
      return false;
    }

    // FS_MATRIX struct: 6 floats (a, b, c, d, e, f)
    using matrixBuf = this.#memory.alloc(24);
    const floatView = new Float32Array(this.#memory.heapU8.buffer, matrixBuf.ptr, 6);
    floatView[0] = matrix.a;
    floatView[1] = matrix.b;
    floatView[2] = matrix.c;
    floatView[3] = matrix.d;
    floatView[4] = matrix.e;
    floatView[5] = matrix.f;

    return fn(obj, matrixBuf.ptr) !== 0;
  }

  /**
   * Get the line cap style of a page object.
   *
   * @param obj - The page object handle
   * @returns The line cap style
   */
  pageObjGetLineCap(obj: PageObjectHandle): LineCapStyle {
    this.ensureNotDisposed();
    const fn = this.#module._FPDFPageObj_GetLineCap;
    if (typeof fn !== 'function') {
      return LineCapStyle.Butt;
    }
    const result = fn(obj);
    if (result < 0 || result > 2) {
      return LineCapStyle.Butt;
    }
    return result as LineCapStyle;
  }

  /**
   * Set the line cap style of a page object.
   *
   * @param obj - The page object handle
   * @param lineCap - The line cap style
   * @returns True if successful
   */
  pageObjSetLineCap(obj: PageObjectHandle, lineCap: LineCapStyle): boolean {
    this.ensureNotDisposed();
    const fn = this.#module._FPDFPageObj_SetLineCap;
    if (typeof fn !== 'function') {
      return false;
    }
    return fn(obj, lineCap) !== 0;
  }

  /**
   * Get the line join style of a page object.
   *
   * @param obj - The page object handle
   * @returns The line join style
   */
  pageObjGetLineJoin(obj: PageObjectHandle): LineJoinStyle {
    this.ensureNotDisposed();
    const fn = this.#module._FPDFPageObj_GetLineJoin;
    if (typeof fn !== 'function') {
      return LineJoinStyle.Miter;
    }
    const result = fn(obj);
    if (result < 0 || result > 2) {
      return LineJoinStyle.Miter;
    }
    return result as LineJoinStyle;
  }

  /**
   * Set the line join style of a page object.
   *
   * @param obj - The page object handle
   * @param lineJoin - The line join style
   * @returns True if successful
   */
  pageObjSetLineJoin(obj: PageObjectHandle, lineJoin: LineJoinStyle): boolean {
    this.ensureNotDisposed();
    const fn = this.#module._FPDFPageObj_SetLineJoin;
    if (typeof fn !== 'function') {
      return false;
    }
    return fn(obj, lineJoin) !== 0;
  }

  /**
   * Get the dash pattern of a page object.
   *
   * @param obj - The page object handle
   * @returns The dash pattern or null if not available
   */
  pageObjGetDashPattern(obj: PageObjectHandle): DashPattern | null {
    this.ensureNotDisposed();
    const countFn = this.#module._FPDFPageObj_GetDashCount;
    const arrayFn = this.#module._FPDFPageObj_GetDashArray;
    const phaseFn = this.#module._FPDFPageObj_GetDashPhase;
    if (typeof countFn !== 'function' || typeof arrayFn !== 'function' || typeof phaseFn !== 'function') {
      return null;
    }

    const count = countFn(obj);
    if (count < 0) {
      return null;
    }

    // Get dash array
    const dashArray: number[] = [];
    if (count > 0) {
      using dashBuf = this.#memory.alloc(count * 4);
      const result = arrayFn(obj, dashBuf.ptr, count);
      if (result === 0) {
        return null;
      }
      const floatView = new Float32Array(this.#memory.heapU8.buffer, dashBuf.ptr, count);
      for (let i = 0; i < count; i++) {
        const val = floatView[i];
        if (val !== undefined) {
          dashArray.push(val);
        }
      }
    }

    // Get phase
    using phaseBuf = this.#memory.alloc(4);
    const phaseResult = phaseFn(obj, phaseBuf.ptr);
    if (phaseResult === 0) {
      return null;
    }
    const phaseView = new Float32Array(this.#memory.heapU8.buffer, phaseBuf.ptr, 1);
    const phase = phaseView[0];
    if (phase === undefined) {
      return null;
    }

    return { dashArray, phase };
  }

  /**
   * Set the dash pattern of a page object.
   *
   * @param obj - The page object handle
   * @param pattern - The dash pattern
   * @returns True if successful
   */
  pageObjSetDashPattern(obj: PageObjectHandle, pattern: DashPattern): boolean {
    this.ensureNotDisposed();
    const fn = this.#module._FPDFPageObj_SetDashArray;
    if (typeof fn !== 'function') {
      return false;
    }

    const count = pattern.dashArray.length;
    if (count === 0) {
      // Clear the dash pattern
      return fn(obj, NULL_PTR, 0, pattern.phase) !== 0;
    }

    using dashBuf = this.#memory.alloc(count * 4);
    const floatView = new Float32Array(this.#memory.heapU8.buffer, dashBuf.ptr, count);
    for (let i = 0; i < count; i++) {
      const val = pattern.dashArray[i];
      if (val !== undefined) {
        floatView[i] = val;
      }
    }

    return fn(obj, dashBuf.ptr, count, pattern.phase) !== 0;
  }

  /**
   * Set the dash phase of a page object.
   *
   * @param obj - The page object handle
   * @param phase - The dash phase
   * @returns True if successful
   */
  pageObjSetDashPhase(obj: PageObjectHandle, phase: number): boolean {
    this.ensureNotDisposed();
    const fn = this.#module._FPDFPageObj_SetDashPhase;
    if (typeof fn !== 'function') {
      return false;
    }
    return fn(obj, phase) !== 0;
  }

  /**
   * Destroy a page object.
   *
   * This should only be called for page objects that have not been inserted
   * into a page. Once an object is inserted, it is owned by the page.
   *
   * @param obj - The page object handle
   */
  pageObjDestroy(obj: PageObjectHandle): void {
    this.ensureNotDisposed();
    const fn = this.#module._FPDFPageObj_Destroy;
    if (typeof fn === 'function') {
      fn(obj);
    }
  }

  /**
   * Check if a page object has transparency.
   *
   * @param obj - The page object handle
   * @returns True if the object has transparency
   */
  pageObjHasTransparency(obj: PageObjectHandle): boolean {
    this.ensureNotDisposed();
    const fn = this.#module._FPDFPageObj_HasTransparency;
    if (typeof fn !== 'function') {
      return false;
    }
    return fn(obj) !== 0;
  }

  /**
   * Set the blend mode of a page object.
   *
   * @param obj - The page object handle
   * @param blendMode - The blend mode
   */
  pageObjSetBlendMode(obj: PageObjectHandle, blendMode: BlendMode): void {
    this.ensureNotDisposed();
    const fn = this.#module._FPDFPageObj_SetBlendMode;
    if (typeof fn !== 'function') {
      return;
    }

    using blendBuf = this.#memory.allocString(blendMode);
    fn(obj, blendBuf.ptr);
  }

  /**
   * Create a new image page object.
   *
   * The returned object must be inserted into a page or destroyed.
   *
   * @returns A new image page object handle or null if failed
   */
  pageObjNewImage(): PageObjectHandle | null {
    this.ensureNotDisposed();
    const fn = this.#module._FPDFPageObj_NewImageObj;
    if (typeof fn !== 'function') {
      return null;
    }

    const handle = fn(this.#documentHandle);
    return handle === NULL_PAGE_OBJECT ? null : handle;
  }

  /**
   * Get the clip path of a page object.
   *
   * @param obj - The page object handle
   * @returns The clip path handle or null if none
   */
  pageObjGetClipPath(obj: PageObjectHandle): ClipPathHandle | null {
    this.ensureNotDisposed();
    const fn = this.#module._FPDFPageObj_GetClipPath;
    if (typeof fn !== 'function') {
      return null;
    }

    const handle = fn(obj);
    return handle === NULL_CLIP_PATH ? null : handle;
  }

  /**
   * Transform the clip path of a page object.
   *
   * @param obj - The page object handle
   * @param matrix - The transformation matrix components (a, b, c, d, e, f)
   */
  pageObjTransformClipPath(
    obj: PageObjectHandle,
    a: number,
    b: number,
    c: number,
    d: number,
    e: number,
    f: number,
  ): void {
    this.ensureNotDisposed();
    const fn = this.#module._FPDFPageObj_TransformClipPath;
    if (typeof fn === 'function') {
      fn(obj, a, b, c, d, e, f);
    }
  }

  /**
   * Get the rotated bounding box of a page object as quad points.
   *
   * @param obj - The page object handle
   * @returns The quad points or null if not available
   */
  pageObjGetRotatedBounds(obj: PageObjectHandle): QuadPoints | null {
    this.ensureNotDisposed();
    const fn = this.#module._FPDFPageObj_GetRotatedBounds;
    if (typeof fn !== 'function') {
      return null;
    }

    // FS_QUADPOINTSF struct: 8 floats
    using quadBuf = this.#memory.alloc(32);
    const result = fn(obj, quadBuf.ptr);
    if (result === 0) {
      return null;
    }

    const floatView = new Float32Array(this.#memory.heapU8.buffer, quadBuf.ptr, 8);
    const x1 = floatView[0];
    const y1 = floatView[1];
    const x2 = floatView[2];
    const y2 = floatView[3];
    const x3 = floatView[4];
    const y3 = floatView[5];
    const x4 = floatView[6];
    const y4 = floatView[7];
    if (
      x1 === undefined ||
      y1 === undefined ||
      x2 === undefined ||
      y2 === undefined ||
      x3 === undefined ||
      y3 === undefined ||
      x4 === undefined ||
      y4 === undefined
    ) {
      return null;
    }

    return { x1, y1, x2, y2, x3, y3, x4, y4 };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Text Object Methods
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Get the text render mode of a text page object.
   *
   * The render mode determines how text is painted (fill, stroke, both, or invisible).
   *
   * @param textObj - The text page object handle
   * @returns The text render mode, or null if not available
   */
  textObjGetRenderMode(textObj: PageObjectHandle): TextRenderMode | null {
    this.ensureNotDisposed();
    const fn = this.#module._FPDFTextObj_GetTextRenderMode;
    if (typeof fn !== 'function') {
      return null;
    }

    const mode = fn(textObj);
    // TextRenderMode values are 0-7
    if (mode >= 0 && mode <= 7) {
      return mode as TextRenderMode;
    }
    return null;
  }

  /**
   * Set the text render mode of a text page object.
   *
   * The render mode determines how text is painted:
   * - Fill: Text is filled (default)
   * - Stroke: Text outline only
   * - FillStroke: Both fill and stroke
   * - Invisible: Text is invisible but selectable
   * - Clip modes: Text is added to the clipping path
   *
   * @param textObj - The text page object handle
   * @param mode - The text render mode to set
   * @returns True if successful
   */
  textObjSetRenderMode(textObj: PageObjectHandle, mode: TextRenderMode): boolean {
    this.ensureNotDisposed();
    const fn = this.#module._FPDFTextObj_SetTextRenderMode;
    if (typeof fn !== 'function') {
      return false;
    }

    return fn(textObj, mode) !== 0;
  }

  /**
   * Get the font of a text page object.
   *
   * Returns a PDFiumFont instance that provides access to font metadata
   * (family name, weight, flags) and metrics (ascent, descent).
   *
   * Note: The returned font is borrowed from the text object and should
   * not be disposed independently.
   *
   * @param textObj - The text page object handle
   * @returns A PDFiumFont instance, or null if not available
   *
   * @example
   * ```typescript
   * const objects = page.getObjects();
   * for (const obj of objects) {
   *   if (obj.type === PageObjectType.Text) {
   *     const font = page.getTextObjectFont(obj.handle);
   *     if (font) {
   *       console.log('Font:', font.familyName);
   *       console.log('Weight:', font.weight);
   *       console.log('Is embedded:', font.isEmbedded);
   *     }
   *   }
   * }
   * ```
   */
  getTextObjectFont(textObj: PageObjectHandle): PDFiumFont | null {
    this.ensureNotDisposed();
    const fn = this.#module._FPDFTextObj_GetFont;
    if (typeof fn !== 'function') {
      return null;
    }

    const fontHandle = fn(textObj);
    if (fontHandle === NULL_FONT) {
      return null;
    }

    // The font borrows the page's native resources via retain/release
    return new PDFiumFont(
      this.#module,
      this.#memory,
      fontHandle,
      () => this.retain(),
      () => this.release(),
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Page Object Mark Methods
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Get the number of content marks on a page object.
   *
   * Marks are used in tagged PDFs to identify content (e.g., /Artifact for
   * decorative content, /Span for text spans with attributes).
   *
   * @param obj - The page object handle
   * @returns The number of marks
   */
  pageObjCountMarks(obj: PageObjectHandle): number {
    this.ensureNotDisposed();
    const fn = this.#module._FPDFPageObj_CountMarks;
    if (typeof fn !== 'function') {
      return 0;
    }
    return fn(obj);
  }

  /**
   * Get a content mark from a page object by index.
   *
   * @param obj - The page object handle
   * @param index - Zero-based mark index
   * @returns The mark information, or null if not found
   */
  pageObjGetMark(obj: PageObjectHandle, index: number): PageObjectMark | null {
    this.ensureNotDisposed();

    const getMark = this.#module._FPDFPageObj_GetMark;
    const getName = this.#module._FPDFPageObjMark_GetName;
    if (typeof getMark !== 'function' || typeof getName !== 'function') {
      return null;
    }

    const markHandle = getMark(obj, index);
    if (markHandle === NULL_MARK) {
      return null;
    }

    // Get mark name
    using outLenPtr = this.#memory.alloc(4);
    let name = '';

    const nameLen = getName(markHandle, NULL_PTR, 0, outLenPtr.ptr);
    if (nameLen > 0) {
      using nameBuffer = this.#memory.alloc(nameLen);
      getName(markHandle, nameBuffer.ptr, nameLen, outLenPtr.ptr);
      name = this.#memory.readUtf8String(nameBuffer.ptr, nameLen - 1);
    }

    // Get mark parameters
    const params = this.#getMarkParams(markHandle);

    return { name, params };
  }

  /**
   * Get all content marks from a page object.
   *
   * @param obj - The page object handle
   * @returns Array of mark information
   */
  pageObjGetMarks(obj: PageObjectHandle): PageObjectMark[] {
    this.ensureNotDisposed();

    const count = this.pageObjCountMarks(obj);
    const marks: PageObjectMark[] = [];

    for (let i = 0; i < count; i++) {
      const mark = this.pageObjGetMark(obj, i);
      if (mark !== null) {
        marks.push(mark);
      }
    }

    return marks;
  }

  /**
   * Add a content mark to a page object.
   *
   * @param obj - The page object handle
   * @param name - The mark name (e.g., 'Artifact', 'Span')
   * @returns The mark handle, or null if failed
   */
  pageObjAddMark(obj: PageObjectHandle, name: string): PageObjectMarkHandle | null {
    this.ensureNotDisposed();

    const fn = this.#module._FPDFPageObj_AddMark;
    if (typeof fn !== 'function') {
      return null;
    }

    using nameAlloc = this.#memory.allocString(name);
    const markHandle = fn(obj, nameAlloc.ptr);

    if (markHandle === NULL_MARK) {
      return null;
    }

    return markHandle;
  }

  /**
   * Remove a content mark from a page object.
   *
   * @param obj - The page object handle
   * @param mark - The mark handle to remove
   * @returns True if successful
   */
  pageObjRemoveMark(obj: PageObjectHandle, mark: PageObjectMarkHandle): boolean {
    this.ensureNotDisposed();

    const fn = this.#module._FPDFPageObj_RemoveMark;
    if (typeof fn !== 'function') {
      return false;
    }

    return fn(obj, mark) !== 0;
  }

  #getMarkParams(mark: PageObjectMarkHandle): PageObjectMark['params'] {
    const countParams = this.#module._FPDFPageObjMark_CountParams;
    const getParamKey = this.#module._FPDFPageObjMark_GetParamKey;
    const getParamValueType = this.#module._FPDFPageObjMark_GetParamValueType;
    const getParamIntValue = this.#module._FPDFPageObjMark_GetParamIntValue;
    const getParamStringValue = this.#module._FPDFPageObjMark_GetParamStringValue;

    if (typeof countParams !== 'function' || typeof getParamKey !== 'function') {
      return [];
    }

    const params: PageObjectMark['params'] = [];
    const paramCount = countParams(mark);

    using outLenPtr = this.#memory.alloc(4);
    using valuePtr = this.#memory.alloc(4);

    for (let i = 0; i < paramCount; i++) {
      // Get param key
      const keyLen = getParamKey(mark, i, NULL_PTR, 0, outLenPtr.ptr);
      if (keyLen <= 0) continue;

      using keyBuffer = this.#memory.alloc(keyLen);
      getParamKey(mark, i, keyBuffer.ptr, keyLen, outLenPtr.ptr);
      const key = this.#memory.readUtf8String(keyBuffer.ptr, keyLen - 1);

      // Get value type
      using keyAlloc = this.#memory.allocString(key);
      const valueType = (
        typeof getParamValueType === 'function' ? getParamValueType(mark, keyAlloc.ptr) : PageObjectMarkValueType.Int
      ) as PageObjectMarkValueType;

      // Get value based on type
      const param: PageObjectMark['params'][0] = { key, valueType };

      if (valueType === PageObjectMarkValueType.Int && typeof getParamIntValue === 'function') {
        if (getParamIntValue(mark, keyAlloc.ptr, valuePtr.ptr)) {
          param.intValue = this.#memory.readInt32(valuePtr.ptr);
        }
      } else if (
        (valueType === PageObjectMarkValueType.String || valueType === PageObjectMarkValueType.Name) &&
        typeof getParamStringValue === 'function'
      ) {
        const strLen = getParamStringValue(mark, keyAlloc.ptr, NULL_PTR, 0, outLenPtr.ptr);
        if (strLen > 0) {
          using strBuffer = this.#memory.alloc(strLen);
          getParamStringValue(mark, keyAlloc.ptr, strBuffer.ptr, strLen, outLenPtr.ptr);
          param.stringValue = this.#memory.readUtf8String(strBuffer.ptr, strLen - 1);
        }
      }

      params.push(param);
    }

    return params;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Image Object Methods
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Set the bitmap of an image object.
   *
   * @param imageObj - The image page object handle
   * @param bitmap - The bitmap handle to set
   * @returns True if successful
   */
  imageObjSetBitmap(imageObj: PageObjectHandle, bitmap: BitmapHandle): boolean {
    this.ensureNotDisposed();
    const fn = this.#module._FPDFImageObj_SetBitmap;
    if (typeof fn !== 'function') {
      return false;
    }
    // Pass NULL for pages array and 0 for count - use current page
    return fn(NULL_PTR, 0, imageObj, bitmap) !== 0;
  }

  /**
   * Set the transformation matrix of an image object.
   *
   * @param imageObj - The image page object handle
   * @param a - Scale X
   * @param b - Shear Y
   * @param c - Shear X
   * @param d - Scale Y
   * @param e - Translate X
   * @param f - Translate Y
   * @returns True if successful
   */
  imageObjSetMatrix(
    imageObj: PageObjectHandle,
    a: number,
    b: number,
    c: number,
    d: number,
    e: number,
    f: number,
  ): boolean {
    this.ensureNotDisposed();
    const fn = this.#module._FPDFImageObj_SetMatrix;
    if (typeof fn !== 'function') {
      return false;
    }
    return fn(imageObj, a, b, c, d, e, f) !== 0;
  }

  /**
   * Get the decoded image data from an image object.
   *
   * @param imageObj - The image page object handle
   * @returns The decoded image data or null if not available
   */
  imageObjGetDecodedData(imageObj: PageObjectHandle): Uint8Array | null {
    this.ensureNotDisposed();
    const fn = this.#module._FPDFImageObj_GetImageDataDecoded;
    if (typeof fn !== 'function') {
      return null;
    }

    // First call to get required buffer size
    const size = fn(imageObj, NULL_PTR, 0);
    if (size <= 0) {
      return null;
    }

    // Allocate buffer and get data
    using buffer = this.#memory.alloc(size);
    const bytesWritten = fn(imageObj, buffer.ptr, size);
    if (bytesWritten <= 0) {
      return null;
    }

    // Copy to result array
    return new Uint8Array(this.#memory.heapU8.slice(buffer.ptr, buffer.ptr + bytesWritten));
  }

  /**
   * Get metadata for an image object.
   *
   * @param imageObj - The image page object handle
   * @returns Image metadata or null if not available
   */
  imageObjGetMetadata(imageObj: PageObjectHandle): ImageMetadata | null {
    this.ensureNotDisposed();
    const fn = this.#module._FPDFImageObj_GetImageMetadata;
    if (typeof fn !== 'function') {
      return null;
    }

    // FPDF_IMAGEOBJ_METADATA struct layout:
    // width: uint32 (4 bytes)
    // height: uint32 (4 bytes)
    // horizontal_dpi: float (4 bytes)
    // vertical_dpi: float (4 bytes)
    // bits_per_pixel: uint32 (4 bytes)
    // colorspace: int32 (4 bytes)
    // marked_content_id: int32 (4 bytes)
    // Total: 28 bytes
    using metadataBuf = this.#memory.alloc(28);
    const result = fn(imageObj, this.#pageHandle, metadataBuf.ptr);
    if (result === 0) {
      return null;
    }

    const uint32View = new Uint32Array(this.#memory.heapU8.buffer, metadataBuf.ptr, 2);
    const floatView = new Float32Array(this.#memory.heapU8.buffer, metadataBuf.ptr + 8, 2);
    const int32View = new Int32Array(this.#memory.heapU8.buffer, metadataBuf.ptr + 16, 3);

    const width = uint32View[0];
    const height = uint32View[1];
    const horizontalDpi = floatView[0];
    const verticalDpi = floatView[1];
    const bitsPerPixel = int32View[0];
    const colourSpaceRaw = int32View[1];
    const markedContentRaw = int32View[2];

    if (
      width === undefined ||
      height === undefined ||
      horizontalDpi === undefined ||
      verticalDpi === undefined ||
      bitsPerPixel === undefined ||
      colourSpaceRaw === undefined ||
      markedContentRaw === undefined
    ) {
      return null;
    }

    // Map colour space value
    let colourSpace: ImageColourSpace = ImageColourSpace.Unknown;
    if (colourSpaceRaw >= 0 && colourSpaceRaw <= 11) {
      colourSpace = colourSpaceRaw as ImageColourSpace;
    }

    // Map marked content type
    let markedContent: ImageMarkedContentType = ImageMarkedContentType.None;
    if (markedContentRaw >= 0 && markedContentRaw <= 2) {
      markedContent = markedContentRaw as ImageMarkedContentType;
    }

    return {
      width,
      height,
      horizontalDpi,
      verticalDpi,
      bitsPerPixel,
      colourSpace,
      markedContent,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Annotation Modification Methods
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Set the colour of an annotation.
   *
   * @param index - Zero-based annotation index
   * @param colour - The colour to set
   * @param colourType - 0 for fill/stroke colour, 1 for interior colour
   * @returns True if successful
   */
  setAnnotationColour(index: number, colour: Colour, colourType: number = 0): boolean {
    this.ensureNotDisposed();

    const fn = this.#module._FPDFAnnot_SetColor;
    if (typeof fn !== 'function') {
      return false;
    }

    const handle = this.#module._FPDFPage_GetAnnot(this.#pageHandle, index);
    if (handle === NULL_ANNOT) {
      return false;
    }

    using _annot = new NativeHandle<AnnotationHandle>(handle, (h) => this.#module._FPDFPage_CloseAnnot(h));
    return fn(handle, colourType, colour.r, colour.g, colour.b, colour.a) !== 0;
  }

  /**
   * Set the bounding rectangle of an annotation.
   *
   * @param index - Zero-based annotation index
   * @param bounds - The new bounding rectangle
   * @returns True if successful
   */
  setAnnotationRect(index: number, bounds: AnnotationBorder): boolean {
    this.ensureNotDisposed();

    const fn = this.#module._FPDFAnnot_SetRect;
    if (typeof fn !== 'function') {
      return false;
    }

    const handle = this.#module._FPDFPage_GetAnnot(this.#pageHandle, index);
    if (handle === NULL_ANNOT) {
      return false;
    }

    using _annot = new NativeHandle<AnnotationHandle>(handle, (h) => this.#module._FPDFPage_CloseAnnot(h));

    // FS_RECTF struct: 4 floats (left, bottom, right, top)
    using rectBuf = this.#memory.alloc(16);
    const floatView = new Float32Array(this.#memory.heapU8.buffer, rectBuf.ptr, 4);
    floatView[0] = bounds.horizontalRadius; // left (reusing border struct for rect)
    floatView[1] = bounds.verticalRadius; // bottom
    floatView[2] = bounds.borderWidth; // right
    floatView[3] = 0; // top

    return fn(handle, rectBuf.ptr) !== 0;
  }

  /**
   * Set the flags of an annotation.
   *
   * @param index - Zero-based annotation index
   * @param flags - The annotation flags to set
   * @returns True if successful
   */
  setAnnotationFlags(index: number, flags: AnnotationFlags): boolean {
    this.ensureNotDisposed();

    const fn = this.#module._FPDFAnnot_SetFlags;
    if (typeof fn !== 'function') {
      return false;
    }

    const handle = this.#module._FPDFPage_GetAnnot(this.#pageHandle, index);
    if (handle === NULL_ANNOT) {
      return false;
    }

    using _annot = new NativeHandle<AnnotationHandle>(handle, (h) => this.#module._FPDFPage_CloseAnnot(h));
    return fn(handle, flags) !== 0;
  }

  /**
   * Set a string value in an annotation's dictionary.
   *
   * @param index - Zero-based annotation index
   * @param key - The dictionary key
   * @param value - The string value to set
   * @returns True if successful
   */
  setAnnotationStringValue(index: number, key: string, value: string): boolean {
    this.ensureNotDisposed();

    const fn = this.#module._FPDFAnnot_SetStringValue;
    if (typeof fn !== 'function') {
      return false;
    }

    const handle = this.#module._FPDFPage_GetAnnot(this.#pageHandle, index);
    if (handle === NULL_ANNOT) {
      return false;
    }

    using _annot = new NativeHandle<AnnotationHandle>(handle, (h) => this.#module._FPDFPage_CloseAnnot(h));

    // Encode key as ASCII
    const keyBytes = textEncoder.encode(`${key}\0`);
    using keyBuffer = this.#memory.alloc(keyBytes.length);
    this.#memory.heapU8.set(keyBytes, keyBuffer.ptr);

    // Encode value as UTF-16LE
    const valueBytes = encodeUTF16LE(value);
    using valueBuffer = this.#memory.allocFrom(valueBytes);

    return fn(handle, keyBuffer.ptr, valueBuffer.ptr) !== 0;
  }

  /**
   * Set the border of an annotation.
   *
   * @param index - Zero-based annotation index
   * @param border - The border properties
   * @returns True if successful
   */
  setAnnotationBorder(index: number, border: AnnotationBorder): boolean {
    this.ensureNotDisposed();

    const fn = this.#module._FPDFAnnot_SetBorder;
    if (typeof fn !== 'function') {
      return false;
    }

    const handle = this.#module._FPDFPage_GetAnnot(this.#pageHandle, index);
    if (handle === NULL_ANNOT) {
      return false;
    }

    using _annot = new NativeHandle<AnnotationHandle>(handle, (h) => this.#module._FPDFPage_CloseAnnot(h));
    return fn(handle, border.horizontalRadius, border.verticalRadius, border.borderWidth) !== 0;
  }

  /**
   * Remove an annotation from this page.
   *
   * @param index - Zero-based annotation index
   * @returns True if successful
   */
  removeAnnotation(index: number): boolean {
    this.ensureNotDisposed();

    const fn = this.#module._FPDFPage_RemoveAnnot;
    if (typeof fn !== 'function') {
      return false;
    }

    return fn(this.#pageHandle, index) !== 0;
  }

  /**
   * Create a new annotation on this page.
   *
   * @param type - The annotation type to create
   * @returns The handle to the new annotation, or null if creation failed
   */
  createAnnotation(type: AnnotationType): AnnotationHandle | null {
    this.ensureNotDisposed();

    const fn = this.#module._FPDFPage_CreateAnnot;
    if (typeof fn !== 'function') {
      return null;
    }

    const handle = fn(this.#pageHandle, type);
    if (handle === NULL_ANNOT) {
      return null;
    }

    return handle;
  }

  /**
   * Close an annotation handle obtained from createAnnotation.
   *
   * @param handle - The annotation handle to close
   */
  closeAnnotation(handle: AnnotationHandle): void {
    this.ensureNotDisposed();
    if (handle !== NULL_ANNOT) {
      this.#module._FPDFPage_CloseAnnot(handle);
    }
  }

  /**
   * Set attachment points (quad points) for a markup annotation.
   *
   * @param index - Zero-based annotation index
   * @param quadIndex - Zero-based quad points index
   * @param quadPoints - The quad points to set
   * @returns True if successful
   */
  setAnnotationAttachmentPoints(index: number, quadIndex: number, quadPoints: QuadPoints): boolean {
    this.ensureNotDisposed();

    const fn = this.#module._FPDFAnnot_SetAttachmentPoints;
    if (typeof fn !== 'function') {
      return false;
    }

    const handle = this.#module._FPDFPage_GetAnnot(this.#pageHandle, index);
    if (handle === NULL_ANNOT) {
      return false;
    }

    using _annot = new NativeHandle<AnnotationHandle>(handle, (h) => this.#module._FPDFPage_CloseAnnot(h));

    // FS_QUADPOINTSF has 8 floats
    using quadBuf = this.#memory.alloc(32);
    const floatView = new Float32Array(this.#memory.heapU8.buffer, quadBuf.ptr, 8);
    floatView[0] = quadPoints.x1;
    floatView[1] = quadPoints.y1;
    floatView[2] = quadPoints.x2;
    floatView[3] = quadPoints.y2;
    floatView[4] = quadPoints.x3;
    floatView[5] = quadPoints.y3;
    floatView[6] = quadPoints.x4;
    floatView[7] = quadPoints.y4;

    return fn(handle, quadIndex, quadBuf.ptr) !== 0;
  }

  /**
   * Append attachment points (quad points) to a markup annotation.
   *
   * @param index - Zero-based annotation index
   * @param quadPoints - The quad points to append
   * @returns True if successful
   */
  appendAnnotationAttachmentPoints(index: number, quadPoints: QuadPoints): boolean {
    this.ensureNotDisposed();

    const fn = this.#module._FPDFAnnot_AppendAttachmentPoints;
    if (typeof fn !== 'function') {
      return false;
    }

    const handle = this.#module._FPDFPage_GetAnnot(this.#pageHandle, index);
    if (handle === NULL_ANNOT) {
      return false;
    }

    using _annot = new NativeHandle<AnnotationHandle>(handle, (h) => this.#module._FPDFPage_CloseAnnot(h));

    // FS_QUADPOINTSF has 8 floats
    using quadBuf = this.#memory.alloc(32);
    const floatView = new Float32Array(this.#memory.heapU8.buffer, quadBuf.ptr, 8);
    floatView[0] = quadPoints.x1;
    floatView[1] = quadPoints.y1;
    floatView[2] = quadPoints.x2;
    floatView[3] = quadPoints.y2;
    floatView[4] = quadPoints.x3;
    floatView[5] = quadPoints.y3;
    floatView[6] = quadPoints.x4;
    floatView[7] = quadPoints.y4;

    return fn(handle, quadBuf.ptr) !== 0;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Annotation Creation Methods (Handle-Based)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Check if an annotation subtype is supported for object extraction.
   *
   * @param subtype - The annotation subtype to check
   * @returns True if the subtype supports object operations
   */
  isAnnotationSubtypeSupported(subtype: AnnotationType): boolean {
    this.ensureNotDisposed();

    const fn = this.#module._FPDFAnnot_IsSupportedSubtype;
    if (typeof fn !== 'function') {
      return false;
    }

    return fn(subtype) !== 0;
  }

  /**
   * Check if an annotation subtype supports adding/updating/removing objects.
   *
   * Currently supported subtypes are ink and stamp.
   *
   * @param subtype - The annotation subtype to check
   * @returns True if the subtype supports object operations
   */
  isAnnotationObjectSubtypeSupported(subtype: AnnotationType): boolean {
    this.ensureNotDisposed();

    const fn = this.#module._FPDFAnnot_IsObjectSupportedSubtype;
    if (typeof fn !== 'function') {
      return false;
    }

    return fn(subtype) !== 0;
  }

  /**
   * Add an ink stroke to an ink annotation.
   *
   * @param handle - The annotation handle
   * @param points - Array of points defining the ink stroke
   * @returns The index of the added stroke, or -1 on failure
   */
  annotationAddInkStroke(handle: AnnotationHandle, points: Point[]): number {
    this.ensureNotDisposed();

    const fn = this.#module._FPDFAnnot_AddInkStroke;
    if (typeof fn !== 'function') {
      return -1;
    }

    if (points.length === 0) {
      return -1;
    }

    // FS_POINTF array: 2 floats per point = 8 bytes per point
    const bufSize = points.length * 8;
    using pointsBuf = this.#memory.alloc(bufSize);
    const floatView = new Float32Array(this.#memory.heapU8.buffer, pointsBuf.ptr, points.length * 2);

    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      if (point !== undefined) {
        floatView[i * 2] = point.x;
        floatView[i * 2 + 1] = point.y;
      }
    }

    return fn(handle, pointsBuf.ptr, points.length);
  }

  /**
   * Set the vertices of a polygon or polyline annotation.
   *
   * @param handle - The annotation handle
   * @param vertices - Array of points defining the vertices
   * @returns True if successful
   */
  annotationSetVertices(handle: AnnotationHandle, vertices: Point[]): boolean {
    this.ensureNotDisposed();

    const fn = this.#module._FPDFAnnot_SetVertices;
    if (typeof fn !== 'function') {
      return false;
    }

    if (vertices.length === 0) {
      return false;
    }

    // FS_POINTF array: 2 floats per point = 8 bytes per point
    const bufSize = vertices.length * 8;
    using verticesBuf = this.#memory.alloc(bufSize);
    const floatView = new Float32Array(this.#memory.heapU8.buffer, verticesBuf.ptr, vertices.length * 2);

    for (let i = 0; i < vertices.length; i++) {
      const vertex = vertices[i];
      if (vertex !== undefined) {
        floatView[i * 2] = vertex.x;
        floatView[i * 2 + 1] = vertex.y;
      }
    }

    return fn(handle, verticesBuf.ptr, vertices.length) !== 0;
  }

  /**
   * Get the link object associated with a link annotation.
   *
   * @param handle - The annotation handle
   * @returns The link handle, or null if not found
   */
  annotationGetLink(handle: AnnotationHandle): LinkHandle | null {
    this.ensureNotDisposed();

    const fn = this.#module._FPDFAnnot_GetLink;
    if (typeof fn !== 'function') {
      return null;
    }

    const link = fn(handle);
    if (link === NULL_LINK) {
      return null;
    }

    return link;
  }

  /**
   * Set the URI for a link annotation.
   *
   * @param handle - The annotation handle
   * @param uri - The URI to set
   * @returns True if successful
   */
  annotationSetURI(handle: AnnotationHandle, uri: string): boolean {
    this.ensureNotDisposed();

    const fn = this.#module._FPDFAnnot_SetURI;
    if (typeof fn !== 'function') {
      return false;
    }

    // Encode URI as ASCII (null-terminated)
    const uriBytes = textEncoder.encode(`${uri}\0`);
    using uriBuf = this.#memory.alloc(uriBytes.length);
    this.#memory.heapU8.set(uriBytes, uriBuf.ptr);

    return fn(handle, uriBuf.ptr) !== 0;
  }

  /**
   * Get the font size for a free text annotation.
   *
   * @param handle - The annotation handle
   * @returns The font size, or undefined if not available
   */
  annotationGetFontSize(handle: AnnotationHandle): number | undefined {
    this.ensureNotDisposed();

    const fn = this.#module._FPDFAnnot_GetFontSize;
    if (typeof fn !== 'function') {
      return undefined;
    }

    if (this.#formHandle === NULL_FORM) {
      return undefined;
    }

    using valueBuf = this.#memory.alloc(4);
    const success = fn(this.#formHandle, handle, valueBuf.ptr);
    if (!success) {
      return undefined;
    }

    const floatView = new Float32Array(this.#memory.heapU8.buffer, valueBuf.ptr, 1);
    return floatView[0];
  }

  /**
   * Get the count of focusable annotation subtypes.
   *
   * @returns The number of focusable subtypes
   */
  getFocusableSubtypesCount(): number {
    this.ensureNotDisposed();

    const fn = this.#module._FPDFAnnot_GetFocusableSubtypesCount;
    if (typeof fn !== 'function') {
      return 0;
    }

    if (this.#formHandle === NULL_FORM) {
      return 0;
    }

    return fn(this.#formHandle);
  }

  /**
   * Get the focusable annotation subtypes.
   *
   * @returns Array of focusable annotation types
   */
  getFocusableSubtypes(): AnnotationType[] {
    this.ensureNotDisposed();

    const fn = this.#module._FPDFAnnot_GetFocusableSubtypes;
    if (typeof fn !== 'function') {
      return [];
    }

    if (this.#formHandle === NULL_FORM) {
      return [];
    }

    const count = this.getFocusableSubtypesCount();
    if (count === 0) {
      return [];
    }

    // Each subtype is an int32 (4 bytes)
    using subtypesBuf = this.#memory.alloc(count * 4);
    const success = fn(this.#formHandle, subtypesBuf.ptr, count);
    if (!success) {
      return [];
    }

    const int32View = new Int32Array(this.#memory.heapU8.buffer, subtypesBuf.ptr, count);
    const result: AnnotationType[] = [];
    for (let i = 0; i < count; i++) {
      const subtype = int32View[i];
      if (subtype !== undefined && VALID_ANNOTATION_TYPES.has(subtype)) {
        result.push(subtype as AnnotationType);
      }
    }

    return result;
  }

  /**
   * Set the focusable annotation subtypes.
   *
   * @param subtypes - Array of annotation types that should be focusable
   * @returns True if successful
   */
  setFocusableSubtypes(subtypes: AnnotationType[]): boolean {
    this.ensureNotDisposed();

    const fn = this.#module._FPDFAnnot_SetFocusableSubtypes;
    if (typeof fn !== 'function') {
      return false;
    }

    if (this.#formHandle === NULL_FORM) {
      return false;
    }

    if (subtypes.length === 0) {
      return false;
    }

    // Each subtype is an int32 (4 bytes)
    using subtypesBuf = this.#memory.alloc(subtypes.length * 4);
    const int32View = new Int32Array(this.#memory.heapU8.buffer, subtypesBuf.ptr, subtypes.length);
    for (let i = 0; i < subtypes.length; i++) {
      const subtype = subtypes[i];
      if (subtype !== undefined) {
        int32View[i] = subtype;
      }
    }

    return fn(this.#formHandle, subtypesBuf.ptr, subtypes.length) !== 0;
  }

  /**
   * Get the number of form controls for a form field annotation.
   *
   * @param handle - The annotation handle
   * @returns The number of form controls
   */
  annotationGetFormControlCount(handle: AnnotationHandle): number {
    this.ensureNotDisposed();

    const fn = this.#module._FPDFAnnot_GetFormControlCount;
    if (typeof fn !== 'function') {
      return 0;
    }

    if (this.#formHandle === NULL_FORM) {
      return 0;
    }

    return fn(this.#formHandle, handle);
  }

  /**
   * Get the form control index for a form field annotation.
   *
   * @param handle - The annotation handle
   * @returns The form control index, or -1 if not found
   */
  annotationGetFormControlIndex(handle: AnnotationHandle): number {
    this.ensureNotDisposed();

    const fn = this.#module._FPDFAnnot_GetFormControlIndex;
    if (typeof fn !== 'function') {
      return -1;
    }

    if (this.#formHandle === NULL_FORM) {
      return -1;
    }

    return fn(this.#formHandle, handle);
  }

  /**
   * Get the export value of a form field annotation.
   *
   * @param handle - The annotation handle
   * @returns The export value, or undefined if not available
   */
  annotationGetFormFieldExportValue(handle: AnnotationHandle): string | undefined {
    this.ensureNotDisposed();

    const fn = this.#module._FPDFAnnot_GetFormFieldExportValue;
    if (typeof fn !== 'function') {
      return undefined;
    }

    if (this.#formHandle === NULL_FORM) {
      return undefined;
    }

    // First call to get required buffer size
    const requiredChars = fn(this.#formHandle, handle, NULL_PTR, 0);
    if (requiredChars <= 0) {
      return undefined;
    }

    // Allocate buffer and get the value (UTF-16LE)
    const bufSize = requiredChars * 2;
    using valueBuf = this.#memory.alloc(bufSize);
    const actualChars = fn(this.#formHandle, handle, valueBuf.ptr, requiredChars);
    if (actualChars <= 0) {
      return undefined;
    }

    // Decode UTF-16LE (excluding null terminator)
    const uint16View = new Uint16Array(this.#memory.heapU8.buffer, valueBuf.ptr, actualChars - 1);
    return String.fromCharCode(...uint16View);
  }

  /**
   * Get the index of an annotation on this page.
   *
   * @param handle - The annotation handle
   * @returns The zero-based index, or -1 if not found
   */
  getAnnotationIndex(handle: AnnotationHandle): number {
    this.ensureNotDisposed();

    const fn = this.#module._FPDFPage_GetAnnotIndex;
    if (typeof fn !== 'function') {
      return -1;
    }

    return fn(this.#pageHandle, handle);
  }

  /**
   * Set the colour of an annotation by handle.
   *
   * Use this with annotations obtained from createAnnotation().
   *
   * @param handle - The annotation handle
   * @param colour - The colour to set
   * @param colourType - 0 for fill/stroke colour, 1 for interior colour
   * @returns True if successful
   */
  annotationSetColour(handle: AnnotationHandle, colour: Colour, colourType: number = 0): boolean {
    this.ensureNotDisposed();

    const fn = this.#module._FPDFAnnot_SetColor;
    if (typeof fn !== 'function') {
      return false;
    }

    return fn(handle, colourType, colour.r, colour.g, colour.b, colour.a) !== 0;
  }

  /**
   * Set the bounding rectangle of an annotation by handle.
   *
   * Use this with annotations obtained from createAnnotation().
   *
   * @param handle - The annotation handle
   * @param bounds - The new bounding rectangle
   * @returns True if successful
   */
  annotationSetRect(handle: AnnotationHandle, bounds: TextRect): boolean {
    this.ensureNotDisposed();

    const fn = this.#module._FPDFAnnot_SetRect;
    if (typeof fn !== 'function') {
      return false;
    }

    // FS_RECTF struct: 4 floats (left, bottom, right, top)
    using rectBuf = this.#memory.alloc(16);
    const floatView = new Float32Array(this.#memory.heapU8.buffer, rectBuf.ptr, 4);
    floatView[0] = bounds.left;
    floatView[1] = bounds.bottom;
    floatView[2] = bounds.right;
    floatView[3] = bounds.top;

    return fn(handle, rectBuf.ptr) !== 0;
  }

  /**
   * Set the flags of an annotation by handle.
   *
   * Use this with annotations obtained from createAnnotation().
   *
   * @param handle - The annotation handle
   * @param flags - The annotation flags to set
   * @returns True if successful
   */
  annotationSetFlags(handle: AnnotationHandle, flags: AnnotationFlags): boolean {
    this.ensureNotDisposed();

    const fn = this.#module._FPDFAnnot_SetFlags;
    if (typeof fn !== 'function') {
      return false;
    }

    return fn(handle, flags) !== 0;
  }

  /**
   * Set a string value in an annotation's dictionary by handle.
   *
   * Use this with annotations obtained from createAnnotation().
   *
   * @param handle - The annotation handle
   * @param key - The dictionary key
   * @param value - The string value to set
   * @returns True if successful
   */
  annotationSetStringValue(handle: AnnotationHandle, key: string, value: string): boolean {
    this.ensureNotDisposed();

    const fn = this.#module._FPDFAnnot_SetStringValue;
    if (typeof fn !== 'function') {
      return false;
    }

    // Encode key as ASCII
    const keyBytes = textEncoder.encode(`${key}\0`);
    using keyBuffer = this.#memory.alloc(keyBytes.length);
    this.#memory.heapU8.set(keyBytes, keyBuffer.ptr);

    // Encode value as UTF-16LE
    const valueBytes = encodeUTF16LE(value);
    using valueBuffer = this.#memory.allocFrom(valueBytes);

    return fn(handle, keyBuffer.ptr, valueBuffer.ptr) !== 0;
  }

  /**
   * Set the border of an annotation by handle.
   *
   * Use this with annotations obtained from createAnnotation().
   *
   * @param handle - The annotation handle
   * @param border - The border properties
   * @returns True if successful
   */
  annotationSetBorder(handle: AnnotationHandle, border: AnnotationBorder): boolean {
    this.ensureNotDisposed();

    const fn = this.#module._FPDFAnnot_SetBorder;
    if (typeof fn !== 'function') {
      return false;
    }

    return fn(handle, border.horizontalRadius, border.verticalRadius, border.borderWidth) !== 0;
  }

  /**
   * Set the appearance stream of an annotation by handle.
   *
   * Use this with annotations obtained from createAnnotation().
   *
   * @param handle - The annotation handle
   * @param appearanceMode - The appearance mode (Normal, Rollover, Down)
   * @param value - The appearance stream value, or undefined to remove
   * @returns True if successful
   */
  annotationSetAppearance(handle: AnnotationHandle, appearanceMode: number, value: string | undefined): boolean {
    this.ensureNotDisposed();

    const fn = this.#module._FPDFAnnot_SetAP;
    if (typeof fn !== 'function') {
      return false;
    }

    if (value === undefined) {
      // Pass null to remove appearance
      return fn(handle, appearanceMode, NULL_PTR) !== 0;
    }

    // Encode value as UTF-16LE
    const valueBytes = encodeUTF16LE(value);
    using valueBuffer = this.#memory.allocFrom(valueBytes);

    return fn(handle, appearanceMode, valueBuffer.ptr) !== 0;
  }

  /**
   * Set attachment points (quad points) for a markup annotation by handle.
   *
   * Use this with annotations obtained from createAnnotation().
   *
   * @param handle - The annotation handle
   * @param quadIndex - Zero-based quad points index
   * @param quadPoints - The quad points to set
   * @returns True if successful
   */
  annotationSetAttachmentPoints(handle: AnnotationHandle, quadIndex: number, quadPoints: QuadPoints): boolean {
    this.ensureNotDisposed();

    const fn = this.#module._FPDFAnnot_SetAttachmentPoints;
    if (typeof fn !== 'function') {
      return false;
    }

    // FS_QUADPOINTSF has 8 floats
    using quadBuf = this.#memory.alloc(32);
    const floatView = new Float32Array(this.#memory.heapU8.buffer, quadBuf.ptr, 8);
    floatView[0] = quadPoints.x1;
    floatView[1] = quadPoints.y1;
    floatView[2] = quadPoints.x2;
    floatView[3] = quadPoints.y2;
    floatView[4] = quadPoints.x3;
    floatView[5] = quadPoints.y3;
    floatView[6] = quadPoints.x4;
    floatView[7] = quadPoints.y4;

    return fn(handle, quadIndex, quadBuf.ptr) !== 0;
  }

  /**
   * Append attachment points (quad points) to a markup annotation by handle.
   *
   * Use this with annotations obtained from createAnnotation().
   *
   * @param handle - The annotation handle
   * @param quadPoints - The quad points to append
   * @returns True if successful
   */
  annotationAppendAttachmentPoints(handle: AnnotationHandle, quadPoints: QuadPoints): boolean {
    this.ensureNotDisposed();

    const fn = this.#module._FPDFAnnot_AppendAttachmentPoints;
    if (typeof fn !== 'function') {
      return false;
    }

    // FS_QUADPOINTSF has 8 floats
    using quadBuf = this.#memory.alloc(32);
    const floatView = new Float32Array(this.#memory.heapU8.buffer, quadBuf.ptr, 8);
    floatView[0] = quadPoints.x1;
    floatView[1] = quadPoints.y1;
    floatView[2] = quadPoints.x2;
    floatView[3] = quadPoints.y2;
    floatView[4] = quadPoints.x3;
    floatView[5] = quadPoints.y3;
    floatView[6] = quadPoints.x4;
    floatView[7] = quadPoints.y4;

    return fn(handle, quadBuf.ptr) !== 0;
  }

  /**
   * Append a page object to an annotation by handle.
   *
   * Only ink and stamp annotations support object manipulation.
   * Use this with annotations obtained from createAnnotation().
   *
   * @param handle - The annotation handle
   * @param object - The page object to append
   * @returns True if successful
   */
  annotationAppendObject(handle: AnnotationHandle, object: PageObjectHandle): boolean {
    this.ensureNotDisposed();

    const fn = this.#module._FPDFAnnot_AppendObject;
    if (typeof fn !== 'function') {
      return false;
    }

    return fn(handle, object) !== 0;
  }

  /**
   * Update a page object in an annotation by handle.
   *
   * The object must already be in the annotation. Only ink and stamp
   * annotations support object manipulation.
   * Use this with annotations obtained from createAnnotation().
   *
   * @param handle - The annotation handle
   * @param object - The page object to update
   * @returns True if successful
   */
  annotationUpdateObject(handle: AnnotationHandle, object: PageObjectHandle): boolean {
    this.ensureNotDisposed();

    const fn = this.#module._FPDFAnnot_UpdateObject;
    if (typeof fn !== 'function') {
      return false;
    }

    return fn(handle, object) !== 0;
  }

  /**
   * Remove a page object from an annotation by handle.
   *
   * Only ink and stamp annotations support object manipulation.
   * Use this with annotations obtained from createAnnotation().
   *
   * @param handle - The annotation handle
   * @param objectIndex - The zero-based index of the object to remove
   * @returns True if successful
   */
  annotationRemoveObject(handle: AnnotationHandle, objectIndex: number): boolean {
    this.ensureNotDisposed();

    const fn = this.#module._FPDFAnnot_RemoveObject;
    if (typeof fn !== 'function') {
      return false;
    }

    return fn(handle, objectIndex) !== 0;
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
    if (query.length === 0) {
      return;
    }
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

  /**
   * Get the bounding box of a character by its index.
   *
   * @param charIndex - Zero-based character index
   * @returns The character bounding box, or undefined if the index is invalid
   */
  getCharBox(charIndex: number): CharBox | undefined {
    this.ensureNotDisposed();
    this.#ensureTextPage();

    // 4 doubles: left, right, bottom, top = 32 bytes
    using buf = this.#memory.alloc(32);
    const leftPtr = buf.ptr;
    const rightPtr = ptrOffset(buf.ptr, 8);
    const bottomPtr = ptrOffset(buf.ptr, 16);
    const topPtr = ptrOffset(buf.ptr, 24);

    const success = this.#module._FPDFText_GetCharBox(
      this.#textPageHandle,
      charIndex,
      leftPtr,
      rightPtr,
      bottomPtr,
      topPtr,
    );
    if (!success) {
      return undefined;
    }

    const floatView = new Float64Array(this.#memory.heapU8.buffer, buf.ptr, 4);
    return {
      left: floatView[0]!,
      right: floatView[1]!,
      bottom: floatView[2]!,
      top: floatView[3]!,
    };
  }

  /**
   * Get the character index at a given position in page coordinates.
   *
   * @param x - X position in page coordinates
   * @param y - Y position in page coordinates
   * @param xTolerance - Horizontal tolerance in points (default: 10)
   * @param yTolerance - Vertical tolerance in points (default: 10)
   * @returns The zero-based character index, or -1 if no character is at the position,
   *          or -3 if the position is outside the page
   */
  getCharIndexAtPos(
    x: number,
    y: number,
    xTolerance = DEFAULT_CHAR_POSITION_TOLERANCE,
    yTolerance = DEFAULT_CHAR_POSITION_TOLERANCE,
  ): number {
    this.ensureNotDisposed();
    this.#ensureTextPage();

    return this.#module._FPDFText_GetCharIndexAtPos(this.#textPageHandle, x, y, xTolerance, yTolerance);
  }

  /**
   * Get the text within a rectangular region of the page.
   *
   * @param left - Left edge of the rectangle in page coordinates
   * @param top - Top edge of the rectangle in page coordinates
   * @param right - Right edge of the rectangle in page coordinates
   * @param bottom - Bottom edge of the rectangle in page coordinates
   * @returns The text within the rectangle (no trimming is applied)
   *
   * @see {@link getText} for extracting all text on the page
   */
  getTextInRect(left: number, top: number, right: number, bottom: number): string {
    this.ensureNotDisposed();
    this.#ensureTextPage();

    // First call with no buffer to get required length (in UTF-16 chars including null terminator)
    const requiredChars = this.#module._FPDFText_GetBoundedText(
      this.#textPageHandle,
      left,
      top,
      right,
      bottom,
      NULL_PTR,
      0,
    );
    if (requiredChars <= 0) {
      return '';
    }

    // Allocate buffer for UTF-16LE text (2 bytes per char)
    const bufferSize = requiredChars * 2;
    using bufferAlloc = this.#memory.alloc(bufferSize);

    const extractedChars = this.#module._FPDFText_GetBoundedText(
      this.#textPageHandle,
      left,
      top,
      right,
      bottom,
      bufferAlloc.ptr,
      requiredChars,
    );
    if (extractedChars <= 0) {
      return '';
    }

    // Subtract 1 for the null terminator (extractedChars is guaranteed > 0 here)
    const charCount = extractedChars - 1;
    return this.#memory.readUTF16LE(bufferAlloc.ptr, charCount);
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

    const floatView = new Float64Array(this.#memory.heapU8.buffer, buf.ptr, 4);
    for (let i = 0; i < rectCount; i++) {
      const success = this.#module._FPDFText_GetRect(this.#textPageHandle, i, leftPtr, topPtr, rightPtr, bottomPtr);
      if (success) {
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

  // ============================================================================
  // Extended Text Operations
  // ============================================================================

  /**
   * Get the total number of characters on this page.
   *
   * This includes all text characters that can be extracted.
   */
  get charCount(): number {
    this.ensureNotDisposed();
    this.#ensureTextPage();
    return this.#module._FPDFText_CountChars(this.#textPageHandle);
  }

  /**
   * Get the Unicode code point of a character at the specified index.
   *
   * @param charIndex - Zero-based character index
   * @returns Unicode code point, or 0 if invalid
   */
  getCharUnicode(charIndex: number): number {
    this.ensureNotDisposed();
    this.#ensureTextPage();

    const count = this.#module._FPDFText_CountChars(this.#textPageHandle);
    if (charIndex < 0 || charIndex >= count) {
      return 0;
    }

    return this.#module._FPDFText_GetUnicode(this.#textPageHandle, charIndex);
  }

  /**
   * Get the font size of a character at the specified index.
   *
   * @param charIndex - Zero-based character index
   * @returns Font size in points, or 0 if invalid
   */
  getCharFontSize(charIndex: number): number {
    this.ensureNotDisposed();
    this.#ensureTextPage();

    const count = this.#module._FPDFText_CountChars(this.#textPageHandle);
    if (charIndex < 0 || charIndex >= count) {
      return 0;
    }

    return this.#module._FPDFText_GetFontSize(this.#textPageHandle, charIndex);
  }

  /**
   * Get the font weight of a character at the specified index.
   *
   * @param charIndex - Zero-based character index
   * @returns Font weight (100-900), or -1 if invalid/unavailable
   */
  getCharFontWeight(charIndex: number): number {
    this.ensureNotDisposed();
    this.#ensureTextPage();

    const count = this.#module._FPDFText_CountChars(this.#textPageHandle);
    if (charIndex < 0 || charIndex >= count) {
      return -1;
    }

    return this.#module._FPDFText_GetFontWeight(this.#textPageHandle, charIndex);
  }

  /**
   * Get the font name of a character at the specified index.
   *
   * @param charIndex - Zero-based character index
   * @returns Font name, or undefined if unavailable
   */
  getCharFontName(charIndex: number): string | undefined {
    this.ensureNotDisposed();
    this.#ensureTextPage();

    const count = this.#module._FPDFText_CountChars(this.#textPageHandle);
    if (charIndex < 0 || charIndex >= count) {
      return undefined;
    }

    using flags = this.#memory.alloc(4);

    // First call to get buffer size
    const requiredBytes = this.#module._FPDFText_GetFontInfo(this.#textPageHandle, charIndex, NULL_PTR, 0, flags.ptr);

    if (requiredBytes <= 0) {
      return undefined;
    }

    using buffer = this.#memory.alloc(requiredBytes);
    this.#module._FPDFText_GetFontInfo(this.#textPageHandle, charIndex, buffer.ptr, requiredBytes, flags.ptr);

    // Font name is UTF-8 null-terminated
    const bytes = this.#memory.heapU8.subarray(buffer.ptr, buffer.ptr + requiredBytes - 1);
    return textDecoder.decode(bytes);
  }

  /**
   * Get the text render mode of a character at the specified index.
   *
   * @param charIndex - Zero-based character index
   * @returns Text render mode
   */
  getCharRenderMode(charIndex: number): TextRenderMode {
    this.ensureNotDisposed();
    this.#ensureTextPage();

    const count = this.#module._FPDFText_CountChars(this.#textPageHandle);
    if (charIndex < 0 || charIndex >= count) {
      return TextRenderMode.Fill;
    }

    // FPDFText_GetTextRenderMode may not be available in all WASM builds
    const fn = this.#module._FPDFText_GetTextRenderMode;
    if (typeof fn !== 'function') {
      return TextRenderMode.Fill;
    }

    const mode = fn(this.#textPageHandle, charIndex);
    return mode >= 0 && mode <= 7 ? (mode as TextRenderMode) : TextRenderMode.Fill;
  }

  /**
   * Get the rotation angle of a character at the specified index.
   *
   * @param charIndex - Zero-based character index
   * @returns Rotation angle in radians
   */
  getCharAngle(charIndex: number): number {
    this.ensureNotDisposed();
    this.#ensureTextPage();

    const count = this.#module._FPDFText_CountChars(this.#textPageHandle);
    if (charIndex < 0 || charIndex >= count) {
      return 0;
    }

    return this.#module._FPDFText_GetCharAngle(this.#textPageHandle, charIndex);
  }

  /**
   * Get the origin point of a character at the specified index.
   *
   * The origin is typically at the baseline of the character.
   *
   * @param charIndex - Zero-based character index
   * @returns Origin point {x, y} or undefined if invalid
   */
  getCharOrigin(charIndex: number): { x: number; y: number } | undefined {
    this.ensureNotDisposed();
    this.#ensureTextPage();

    const count = this.#module._FPDFText_CountChars(this.#textPageHandle);
    if (charIndex < 0 || charIndex >= count) {
      return undefined;
    }

    using xPtr = this.#memory.alloc(8);
    using yPtr = this.#memory.alloc(8);

    const success = this.#module._FPDFText_GetCharOrigin(this.#textPageHandle, charIndex, xPtr.ptr, yPtr.ptr);
    if (!success) {
      return undefined;
    }

    const xView = new Float64Array(this.#memory.heapU8.buffer, xPtr.ptr, 1);
    const yView = new Float64Array(this.#memory.heapU8.buffer, yPtr.ptr, 1);

    const x = xView[0];
    const y = yView[0];

    if (x === undefined || y === undefined) {
      return undefined;
    }

    return { x, y };
  }

  /**
   * Check if a character at the specified index was generated.
   *
   * Generated characters are not from the original PDF content stream,
   * but were synthesised during text extraction.
   *
   * @param charIndex - Zero-based character index
   */
  isCharGenerated(charIndex: number): boolean {
    this.ensureNotDisposed();
    this.#ensureTextPage();

    const count = this.#module._FPDFText_CountChars(this.#textPageHandle);
    if (charIndex < 0 || charIndex >= count) {
      return false;
    }

    return this.#module._FPDFText_IsGenerated(this.#textPageHandle, charIndex) !== 0;
  }

  /**
   * Check if a character at the specified index is a hyphen.
   *
   * This can be used to detect soft hyphens that may indicate word breaks
   * across lines.
   *
   * @param charIndex - Zero-based character index
   */
  isCharHyphen(charIndex: number): boolean {
    this.ensureNotDisposed();
    this.#ensureTextPage();

    const count = this.#module._FPDFText_CountChars(this.#textPageHandle);
    if (charIndex < 0 || charIndex >= count) {
      return false;
    }

    return this.#module._FPDFText_IsHyphen(this.#textPageHandle, charIndex) !== 0;
  }

  /**
   * Check if a character at the specified index has a Unicode mapping error.
   *
   * This indicates the character could not be properly mapped to Unicode
   * during text extraction.
   *
   * @param charIndex - Zero-based character index
   */
  hasCharUnicodeMapError(charIndex: number): boolean {
    this.ensureNotDisposed();
    this.#ensureTextPage();

    const count = this.#module._FPDFText_CountChars(this.#textPageHandle);
    if (charIndex < 0 || charIndex >= count) {
      return false;
    }

    return this.#module._FPDFText_HasUnicodeMapError(this.#textPageHandle, charIndex) !== 0;
  }

  /**
   * Get the fill colour of a character at the specified index.
   *
   * @param charIndex - Zero-based character index
   * @returns Fill colour or undefined if unavailable
   */
  getCharFillColour(charIndex: number): Colour | undefined {
    this.ensureNotDisposed();
    this.#ensureTextPage();

    const count = this.#module._FPDFText_CountChars(this.#textPageHandle);
    if (charIndex < 0 || charIndex >= count) {
      return undefined;
    }

    using rPtr = this.#memory.alloc(4);
    using gPtr = this.#memory.alloc(4);
    using bPtr = this.#memory.alloc(4);
    using aPtr = this.#memory.alloc(4);

    const success = this.#module._FPDFText_GetFillColor(
      this.#textPageHandle,
      charIndex,
      rPtr.ptr,
      gPtr.ptr,
      bPtr.ptr,
      aPtr.ptr,
    );

    if (!success) {
      return undefined;
    }

    return {
      r: this.#memory.readInt32(rPtr.ptr) & 0xff,
      g: this.#memory.readInt32(gPtr.ptr) & 0xff,
      b: this.#memory.readInt32(bPtr.ptr) & 0xff,
      a: this.#memory.readInt32(aPtr.ptr) & 0xff,
    };
  }

  /**
   * Get the stroke colour of a character at the specified index.
   *
   * @param charIndex - Zero-based character index
   * @returns Stroke colour or undefined if unavailable
   */
  getCharStrokeColour(charIndex: number): Colour | undefined {
    this.ensureNotDisposed();
    this.#ensureTextPage();

    const count = this.#module._FPDFText_CountChars(this.#textPageHandle);
    if (charIndex < 0 || charIndex >= count) {
      return undefined;
    }

    using rPtr = this.#memory.alloc(4);
    using gPtr = this.#memory.alloc(4);
    using bPtr = this.#memory.alloc(4);
    using aPtr = this.#memory.alloc(4);

    const success = this.#module._FPDFText_GetStrokeColor(
      this.#textPageHandle,
      charIndex,
      rPtr.ptr,
      gPtr.ptr,
      bPtr.ptr,
      aPtr.ptr,
    );

    if (!success) {
      return undefined;
    }

    return {
      r: this.#memory.readInt32(rPtr.ptr) & 0xff,
      g: this.#memory.readInt32(gPtr.ptr) & 0xff,
      b: this.#memory.readInt32(bPtr.ptr) & 0xff,
      a: this.#memory.readInt32(aPtr.ptr) & 0xff,
    };
  }

  /**
   * Get extended information about a character at the specified index.
   *
   * This combines multiple character properties into a single object for
   * convenience when you need comprehensive character information.
   *
   * @param charIndex - Zero-based character index
   * @returns Character info or undefined if invalid index
   */
  getCharacterInfo(charIndex: number): CharacterInfo | undefined {
    this.ensureNotDisposed();
    this.#ensureTextPage();

    const count = this.#module._FPDFText_CountChars(this.#textPageHandle);
    if (charIndex < 0 || charIndex >= count) {
      return undefined;
    }

    const unicode = this.#module._FPDFText_GetUnicode(this.#textPageHandle, charIndex);
    const fontSize = this.#module._FPDFText_GetFontSize(this.#textPageHandle, charIndex);
    const fontWeight = this.#module._FPDFText_GetFontWeight(this.#textPageHandle, charIndex);

    // FPDFText_GetTextRenderMode may not be available in all WASM builds
    const renderModeFn = this.#module._FPDFText_GetTextRenderMode;
    const renderModeValue = typeof renderModeFn === 'function' ? renderModeFn(this.#textPageHandle, charIndex) : 0;
    const angle = this.#module._FPDFText_GetCharAngle(this.#textPageHandle, charIndex);
    const isGenerated = this.#module._FPDFText_IsGenerated(this.#textPageHandle, charIndex) !== 0;
    const isHyphen = this.#module._FPDFText_IsHyphen(this.#textPageHandle, charIndex) !== 0;
    const hasUnicodeMapError = this.#module._FPDFText_HasUnicodeMapError(this.#textPageHandle, charIndex) !== 0;

    // Get origin
    using xPtr = this.#memory.alloc(8);
    using yPtr = this.#memory.alloc(8);
    this.#module._FPDFText_GetCharOrigin(this.#textPageHandle, charIndex, xPtr.ptr, yPtr.ptr);
    const xView = new Float64Array(this.#memory.heapU8.buffer, xPtr.ptr, 1);
    const yView = new Float64Array(this.#memory.heapU8.buffer, yPtr.ptr, 1);

    const info: CharacterInfo = {
      index: charIndex,
      unicode,
      char: String.fromCodePoint(unicode),
      fontSize,
      fontWeight,
      renderMode:
        renderModeValue >= 0 && renderModeValue <= 7 ? (renderModeValue as TextRenderMode) : TextRenderMode.Fill,
      angle,
      originX: xView[0] ?? 0,
      originY: yView[0] ?? 0,
      isGenerated,
      isHyphen,
      hasUnicodeMapError,
    };

    // Add optional font name
    const fontName = this.getCharFontName(charIndex);
    if (fontName !== undefined) {
      info.fontName = fontName;
    }

    // Add optional colours
    const fillColour = this.getCharFillColour(charIndex);
    if (fillColour !== undefined) {
      info.fillColour = fillColour;
    }

    const strokeColour = this.getCharStrokeColour(charIndex);
    if (strokeColour !== undefined) {
      info.strokeColour = strokeColour;
    }

    return info;
  }

  /**
   * Get the structure tree for this page (tagged PDF accessibility info).
   *
   * Returns an array of root structure elements, or undefined if the page
   * has no structure tree (i.e. the PDF is not tagged).
   *
   * For large structure trees, prefer the lazy {@link structureElements} generator.
   */
  getStructureTree(): StructureElement[] | undefined {
    this.ensureNotDisposed();

    const tree = this.#module._FPDF_StructTree_GetForPage(this.#pageHandle);
    if (tree === NULL_STRUCT_TREE) {
      return undefined;
    }

    using _tree = new NativeHandle<StructTreeHandle>(tree, (h) => this.#module._FPDF_StructTree_Close(h));

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
  }

  /**
   * Iterate over root structure elements lazily.
   *
   * Each yielded element includes its full subtree of children (eagerly loaded).
   * Returns `undefined` if the page has no structure tree.
   *
   * The structure tree handle is kept open for the lifetime of the generator.
   * Dispose or exhaust the generator to release it.
   *
   * @returns A generator yielding root-level structure elements, or `undefined` if the page is not tagged
   * @throws {PageError} If the structure tree depth exceeds the maximum
   *
   * @example
   * ```typescript
   * const elements = page.structureElements();
   * if (elements) {
   *   for (const element of elements) {
   *     console.log(element.type);
   *   }
   * }
   * ```
   */
  structureElements(): Generator<StructureElement> | undefined {
    this.ensureNotDisposed();

    const tree = this.#module._FPDF_StructTree_GetForPage(this.#pageHandle);
    if (tree === NULL_STRUCT_TREE) {
      return undefined;
    }

    const module = this.#module;
    const readStructElement = this.#readStructElement.bind(this);
    return (function* () {
      using _tree = new NativeHandle<StructTreeHandle>(tree, (h) => module._FPDF_StructTree_Close(h));

      const childCount = module._FPDF_StructTree_CountChildren(tree);
      for (let i = 0; i < childCount; i++) {
        const child = module._FPDF_StructTree_GetChildAtIndex(tree, i);
        if (child !== NULL_STRUCT_ELEMENT) {
          yield readStructElement(child);
        }
      }
    })();
  }

  #readStructElement(element: StructElementHandle, depth = 0): StructureElement {
    if (depth > MAX_STRUCT_TREE_DEPTH) {
      throw new PageError(
        PDFiumErrorCode.PAGE_LOAD_FAILED,
        `Structure tree depth exceeds maximum of ${MAX_STRUCT_TREE_DEPTH}`,
      );
    }

    const type = this.#readStructString((buf, len) => this.#module._FPDF_StructElement_GetType(element, buf, len));
    const altText = this.#readStructString((buf, len) =>
      this.#module._FPDF_StructElement_GetAltText(element, buf, len),
    );
    const lang = this.#readStructString((buf, len) => this.#module._FPDF_StructElement_GetLang(element, buf, len));

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
    if (requiredBytes <= UTF16LE_NULL_TERMINATOR_BYTES) {
      return '';
    }

    using buffer = this.#memory.alloc(requiredBytes);
    getter(buffer.ptr, requiredBytes);

    // UTF-16LE: 2 bytes per char, subtract null terminator bytes
    const charCount = (requiredBytes - UTF16LE_NULL_TERMINATOR_BYTES) / UTF16LE_BYTES_PER_CHAR;
    return this.#memory.readUTF16LE(buffer.ptr, charCount);
  }

  #readPageObject(handle: PageObjectHandle): PageObject {
    const rawType = this.#module._FPDFPageObj_GetType(handle);
    const bounds = this.#readObjectBounds(handle);

    switch (rawType) {
      case PageObjectTypeNative.TEXT:
        return { type: PageObjectType.Text, handle, bounds, ...this.#readTextObjectDetails(handle) };
      case PageObjectTypeNative.IMAGE:
        return { type: PageObjectType.Image, handle, bounds, ...this.#readImageObjectDetails(handle) };
      case PageObjectTypeNative.PATH:
        return { type: PageObjectType.Path, handle, bounds };
      case PageObjectTypeNative.SHADING:
        return { type: PageObjectType.Shading, handle, bounds };
      case PageObjectTypeNative.FORM:
        return { type: PageObjectType.Form, handle, bounds };
      default:
        return { type: PageObjectType.Unknown, handle, bounds };
    }
  }

  #readObjectBounds(handle: PageObjectHandle): { left: number; top: number; right: number; bottom: number } {
    // 4 floats: left, bottom, right, top = 16 bytes
    using buf = this.#memory.alloc(16);
    const leftPtr = buf.ptr;
    const bottomPtr = ptrOffset(buf.ptr, 4);
    const rightPtr = ptrOffset(buf.ptr, 8);
    const topPtr = ptrOffset(buf.ptr, 12);

    const success = this.#module._FPDFPageObj_GetBounds(handle, leftPtr, bottomPtr, rightPtr, topPtr);
    if (!success) {
      return { left: 0, top: 0, right: 0, bottom: 0 };
    }

    const floatView = new Float32Array(this.#memory.heapU8.buffer, buf.ptr, 4);
    return {
      left: floatView[0]!,
      bottom: floatView[1]!,
      right: floatView[2]!,
      top: floatView[3]!,
    };
  }

  #readTextObjectDetails(handle: PageObjectHandle): { text: string; fontSize: number } {
    // Read font size
    using sizeBuf = this.#memory.alloc(4);
    let fontSize = 0;
    if (this.#module._FPDFTextObj_GetFontSize(handle, sizeBuf.ptr)) {
      const floatView = new Float32Array(this.#memory.heapU8.buffer, sizeBuf.ptr, 1);
      fontSize = floatView[0]!;
    }

    // Read text content (requires a text page handle)
    this.#ensureTextPage();
    const requiredBytes = this.#module._FPDFTextObj_GetText(handle, this.#textPageHandle, NULL_PTR, 0);
    if (requiredBytes <= UTF16LE_NULL_TERMINATOR_BYTES) {
      return { text: '', fontSize };
    }

    using textBuf = this.#memory.alloc(requiredBytes);
    this.#module._FPDFTextObj_GetText(handle, this.#textPageHandle, textBuf.ptr, requiredBytes);

    // UTF-16LE: 2 bytes per char, subtract null terminator bytes
    const charCount = (requiredBytes - UTF16LE_NULL_TERMINATOR_BYTES) / UTF16LE_BYTES_PER_CHAR;
    const text = this.#memory.readUTF16LE(textBuf.ptr, charCount);
    return { text, fontSize };
  }

  #readImageObjectDetails(handle: PageObjectHandle): { width: number; height: number } {
    using buf = this.#memory.alloc(8);
    const widthPtr = buf.ptr;
    const heightPtr = ptrOffset(buf.ptr, 4);

    const success = this.#module._FPDFImageObj_GetImagePixelSize(handle, widthPtr, heightPtr);
    if (!success) {
      return { width: 0, height: 0 };
    }

    return {
      width: this.#memory.readInt32(widthPtr),
      height: this.#memory.readInt32(heightPtr),
    };
  }

  /**
   * Internal access for testing and advanced usage.
   *
   * @internal
   */
  get [INTERNAL](): { handle: PageHandle; textPageHandle: TextPageHandle } {
    this.ensureNotDisposed();
    return { handle: this.#pageHandle, textPageHandle: this.#textPageHandle };
  }

  // ============================================================================
  // Link Operations
  // ============================================================================

  /**
   * Get the link at a specific point on the page.
   *
   * @param x - X coordinate in page units
   * @param y - Y coordinate in page units
   * @returns The link at the point, or undefined if none
   */
  getLinkAtPoint(x: number, y: number): PDFLink | undefined {
    this.ensureNotDisposed();

    const linkHandle = this.#module._FPDFLink_GetLinkAtPoint(this.#pageHandle, x, y);
    if (linkHandle === NULL_LINK) {
      return undefined;
    }

    return this.#buildLinkFromHandle(linkHandle, -1);
  }

  /**
   * Get the z-order of the link at a specific point.
   *
   * Returns the z-order index (0-based, where 0 is bottom) of the link at the
   * specified point, or -1 if no link is found.
   *
   * @param x - X coordinate in page units
   * @param y - Y coordinate in page units
   */
  getLinkZOrderAtPoint(x: number, y: number): number {
    this.ensureNotDisposed();
    return this.#module._FPDFLink_GetLinkZOrderAtPoint(this.#pageHandle, x, y);
  }

  /**
   * Iterate over links lazily.
   *
   * Use this for memory-efficient iteration over many links.
   *
   * @example
   * ```typescript
   * for (const link of page.links()) {
   *   console.log(link.actionType);
   * }
   * ```
   */
  links(): Generator<PDFLink> {
    this.ensureNotDisposed();
    const module = this.#module;
    const memory = this.#memory;
    const pageHandle = this.#pageHandle;
    const buildLinkFromHandle = this.#buildLinkFromHandle.bind(this);
    return (function* () {
      using startPos = memory.alloc(4);
      using linkAnnotPtr = memory.alloc(4);

      // Initialise start position to 0
      memory.writeInt32(startPos.ptr, 0);

      let index = 0;
      while (module._FPDFLink_Enumerate(pageHandle, startPos.ptr, linkAnnotPtr.ptr)) {
        const linkHandle = memory.readInt32(linkAnnotPtr.ptr) as LinkHandle;
        if (linkHandle !== NULL_LINK) {
          const link = buildLinkFromHandle(linkHandle, index);
          if (link !== undefined) {
            yield link;
          }
        }
        index++;
      }
    })();
  }

  /**
   * Enumerate all links on the page.
   *
   * For pages with many links, prefer using the `links()` generator.
   *
   * @returns Array of links found on the page
   */
  getLinks(): PDFLink[] {
    return [...this.links()];
  }

  /**
   * Count the number of web links detected in the page text.
   *
   * Web links are URLs automatically detected in the page text content,
   * not interactive link annotations.
   */
  get webLinkCount(): number {
    this.ensureNotDisposed();
    this.#ensureTextPage();

    const linkPage = this.#loadWebLinks();
    if (linkPage === NULL_PAGE_LINK) {
      return 0;
    }

    const count = this.#module._FPDFLink_CountWebLinks(linkPage);
    this.#module._FPDFLink_CloseWebLinks(linkPage);
    return count;
  }

  /**
   * Get automatically detected web links from the page text.
   *
   * These are URLs found in the text content, not interactive link annotations.
   *
   * @returns Array of detected web links with their URLs and positions
   */
  getWebLinks(): WebLink[] {
    this.ensureNotDisposed();
    this.#ensureTextPage();

    const linkPage = this.#loadWebLinks();
    if (linkPage === NULL_PAGE_LINK) {
      return [];
    }

    try {
      const webLinks: WebLink[] = [];
      const count = this.#module._FPDFLink_CountWebLinks(linkPage);

      for (let i = 0; i < count; i++) {
        const url = this.#getWebLinkURL(linkPage, i);
        const rects = this.#getWebLinkRects(linkPage, i);
        const textRange = this.#getWebLinkTextRange(linkPage, i);

        if (url !== undefined) {
          webLinks.push({
            index: i,
            url,
            rects,
            ...(textRange !== undefined ? { textRange } : {}),
          });
        }
      }

      return webLinks;
    } finally {
      this.#module._FPDFLink_CloseWebLinks(linkPage);
    }
  }

  /**
   * Load web links container from the text page.
   */
  #loadWebLinks(): PageLinkHandle {
    const fn = this.#module._FPDFLink_LoadWebLinks;
    if (typeof fn !== 'function') {
      return NULL_PAGE_LINK;
    }
    return fn(this.#textPageHandle);
  }

  /**
   * Get the URL for a detected web link.
   *
   * @param linkPage - Web links container handle
   * @param linkIndex - Zero-based index of the web link
   */
  #getWebLinkURL(linkPage: PageLinkHandle, linkIndex: number): string | undefined {
    // First call to get required buffer size
    const requiredChars = this.#module._FPDFLink_GetURL(linkPage, linkIndex, NULL_PTR, 0);
    if (requiredChars <= 0) {
      return undefined;
    }

    // UTF-16LE: 2 bytes per char
    const bufferSize = requiredChars * 2;
    using buffer = this.#memory.alloc(bufferSize);
    this.#module._FPDFLink_GetURL(linkPage, linkIndex, buffer.ptr, requiredChars);

    // Subtract 1 for null terminator
    return this.#memory.readUTF16LE(buffer.ptr, requiredChars - 1);
  }

  /**
   * Get the bounding rectangles for a detected web link.
   *
   * @param linkPage - Web links container handle
   * @param linkIndex - Zero-based index of the web link
   */
  #getWebLinkRects(linkPage: PageLinkHandle, linkIndex: number): TextRect[] {
    const rectCount = this.#module._FPDFLink_CountRects(linkPage, linkIndex);
    const rects: TextRect[] = [];

    using left = this.#memory.alloc(8);
    using top = this.#memory.alloc(8);
    using right = this.#memory.alloc(8);
    using bottom = this.#memory.alloc(8);

    for (let i = 0; i < rectCount; i++) {
      const success = this.#module._FPDFLink_GetRect(linkPage, linkIndex, i, left.ptr, top.ptr, right.ptr, bottom.ptr);

      if (success) {
        const leftView = new Float64Array(this.#memory.heapU8.buffer, left.ptr, 1);
        const topView = new Float64Array(this.#memory.heapU8.buffer, top.ptr, 1);
        const rightView = new Float64Array(this.#memory.heapU8.buffer, right.ptr, 1);
        const bottomView = new Float64Array(this.#memory.heapU8.buffer, bottom.ptr, 1);

        rects.push({
          left: leftView[0] ?? 0,
          top: topView[0] ?? 0,
          right: rightView[0] ?? 0,
          bottom: bottomView[0] ?? 0,
        });
      }
    }

    return rects;
  }

  /**
   * Get the text range for a detected web link.
   *
   * @param linkPage - Web links container handle
   * @param linkIndex - Zero-based index of the web link
   */
  #getWebLinkTextRange(
    linkPage: PageLinkHandle,
    linkIndex: number,
  ): { startCharIndex: number; charCount: number } | undefined {
    const fn = this.#module._FPDFLink_GetTextRange;
    if (typeof fn !== 'function') {
      return undefined;
    }

    using startCharPtr = this.#memory.alloc(4);
    using charCountPtr = this.#memory.alloc(4);

    const success = fn(linkPage, linkIndex, startCharPtr.ptr, charCountPtr.ptr);
    if (!success) {
      return undefined;
    }

    return {
      startCharIndex: this.#memory.readInt32(startCharPtr.ptr),
      charCount: this.#memory.readInt32(charCountPtr.ptr),
    };
  }

  /**
   * Build a PDFLink object from a link handle.
   */
  #buildLinkFromHandle(linkHandle: LinkHandle, index: number): PDFLink | undefined {
    // Get link bounds
    using rect = this.#memory.alloc(16); // 4 floats
    const hasRect = this.#module._FPDFLink_GetAnnotRect(linkHandle, rect.ptr);

    let bounds: TextRect;
    if (hasRect) {
      const floatView = new Float32Array(this.#memory.heapU8.buffer, rect.ptr, 4);
      bounds = {
        left: floatView[0] ?? 0,
        bottom: floatView[1] ?? 0,
        right: floatView[2] ?? 0,
        top: floatView[3] ?? 0,
      };
    } else {
      bounds = { left: 0, top: 0, right: 0, bottom: 0 };
    }

    // Build the link object
    const link: PDFLink = {
      index,
      bounds,
    };

    // Get action
    const actionHandle = this.#module._FPDFLink_GetAction(linkHandle);
    if (actionHandle !== NULL_ACTION) {
      link.action = this.#buildActionFromHandle(actionHandle);
    }

    // Get destination (for GoTo actions or direct destinations)
    const destHandle = this.#module._FPDFLink_GetDest(this.#documentHandle, linkHandle);
    if (destHandle !== NULL_DEST) {
      link.destination = this.#buildDestinationFromHandle(destHandle);
    }

    return link;
  }

  /**
   * Build a PDFAction object from an action handle.
   */
  #buildActionFromHandle(actionHandle: ActionHandle): PDFAction {
    const typeValue = this.#module._FPDFAction_GetType(actionHandle);
    const type = typeValue >= 0 && typeValue <= 5 ? (typeValue as ActionType) : ActionType.Unsupported;

    const action: PDFAction = { type };

    // Get URI for URI actions
    if (type === ActionType.URI) {
      const uri = this.#getActionURI(actionHandle);
      if (uri !== undefined) {
        action.uri = uri;
      }
    }

    // Get file path for Launch/RemoteGoTo actions
    if (type === ActionType.Launch || type === ActionType.RemoteGoTo) {
      const filePath = this.#getActionFilePath(actionHandle);
      if (filePath !== undefined) {
        action.filePath = filePath;
      }
    }

    return action;
  }

  /**
   * Get the URI from a URI action.
   */
  #getActionURI(actionHandle: ActionHandle): string | undefined {
    // First call to get buffer size
    const requiredBytes = this.#module._FPDFAction_GetURIPath(this.#documentHandle, actionHandle, NULL_PTR, 0);
    if (requiredBytes <= 0) {
      return undefined;
    }

    using buffer = this.#memory.alloc(requiredBytes);
    this.#module._FPDFAction_GetURIPath(this.#documentHandle, actionHandle, buffer.ptr, requiredBytes);

    // URI is UTF-8, not UTF-16LE
    const bytes = this.#memory.heapU8.subarray(buffer.ptr, buffer.ptr + requiredBytes - 1);
    return textDecoder.decode(bytes);
  }

  /**
   * Get the file path from a Launch or RemoteGoTo action.
   */
  #getActionFilePath(actionHandle: ActionHandle): string | undefined {
    // First call to get buffer size
    const requiredBytes = this.#module._FPDFAction_GetFilePath(actionHandle, NULL_PTR, 0);
    if (requiredBytes <= 0) {
      return undefined;
    }

    using buffer = this.#memory.alloc(requiredBytes);
    this.#module._FPDFAction_GetFilePath(actionHandle, buffer.ptr, requiredBytes);

    // File path is UTF-8
    const bytes = this.#memory.heapU8.subarray(buffer.ptr, buffer.ptr + requiredBytes - 1);
    return textDecoder.decode(bytes);
  }

  /**
   * Build a PDFDestination object from a destination handle.
   */
  #buildDestinationFromHandle(destHandle: DestinationHandle): PDFDestination {
    const pageIndex = this.#module._FPDFDest_GetDestPageIndex(this.#documentHandle, destHandle);

    // Get view type and parameters
    using numParamsPtr = this.#memory.alloc(4);
    using paramsPtr = this.#memory.alloc(32); // Up to 4 floats (16 bytes) + padding
    const fitTypeValue = this.#module._FPDFDest_GetView(destHandle, numParamsPtr.ptr, paramsPtr.ptr);
    const fitType =
      fitTypeValue >= 0 && fitTypeValue <= 8 ? (fitTypeValue as DestinationFitType) : DestinationFitType.Unknown;

    // Get location details
    using hasXPtr = this.#memory.alloc(4);
    using hasYPtr = this.#memory.alloc(4);
    using hasZoomPtr = this.#memory.alloc(4);
    using xPtr = this.#memory.alloc(4);
    using yPtr = this.#memory.alloc(4);
    using zoomPtr = this.#memory.alloc(4);

    this.#module._FPDFDest_GetLocationInPage(
      destHandle,
      hasXPtr.ptr,
      hasYPtr.ptr,
      hasZoomPtr.ptr,
      xPtr.ptr,
      yPtr.ptr,
      zoomPtr.ptr,
    );

    const hasX = this.#memory.readInt32(hasXPtr.ptr) !== 0;
    const hasY = this.#memory.readInt32(hasYPtr.ptr) !== 0;
    const hasZoom = this.#memory.readInt32(hasZoomPtr.ptr) !== 0;

    const destination: PDFDestination = {
      pageIndex,
      fitType,
    };

    if (hasX) {
      const xView = new Float32Array(this.#memory.heapU8.buffer, xPtr.ptr, 1);
      const xVal = xView[0];
      if (xVal !== undefined) {
        destination.x = xVal;
      }
    }
    if (hasY) {
      const yView = new Float32Array(this.#memory.heapU8.buffer, yPtr.ptr, 1);
      const yVal = yView[0];
      if (yVal !== undefined) {
        destination.y = yVal;
      }
    }
    if (hasZoom) {
      const zoomView = new Float32Array(this.#memory.heapU8.buffer, zoomPtr.ptr, 1);
      const zoomVal = zoomView[0];
      if (zoomVal !== undefined) {
        destination.zoom = zoomVal;
      }
    }

    return destination;
  }

  // ============================================================================
  // Coordinate Conversion
  // ============================================================================

  /**
   * Convert device coordinates (pixels) to page coordinates (points).
   *
   * This is useful for translating mouse click positions into page space
   * for operations like text selection or hit testing.
   *
   * @param context - The coordinate transform context defining the viewport
   * @param deviceX - X coordinate in device space (pixels)
   * @param deviceY - Y coordinate in device space (pixels)
   * @returns The corresponding point in page coordinate space
   *
   * @example
   * ```typescript
   * const context = {
   *   startX: 0,
   *   startY: 0,
   *   sizeX: 800,
   *   sizeY: 600,
   *   rotate: PageRotation.None,
   * };
   * const pageCoord = page.deviceToPage(context, mouseX, mouseY);
   * ```
   */
  deviceToPage(context: CoordinateTransformContext, deviceX: number, deviceY: number): PageCoordinate {
    this.ensureNotDisposed();

    if (!Number.isFinite(deviceX) || !Number.isFinite(deviceY)) {
      throw new PageError(PDFiumErrorCode.PAGE_LOAD_FAILED, 'Device coordinates must be finite numbers');
    }

    using pageXPtr = this.#memory.alloc(8);
    using pageYPtr = this.#memory.alloc(8);

    this.#module._FPDF_DeviceToPage(
      this.#pageHandle,
      context.startX,
      context.startY,
      context.sizeX,
      context.sizeY,
      context.rotate,
      deviceX,
      deviceY,
      pageXPtr.ptr,
      pageYPtr.ptr,
    );

    const xView = new Float64Array(this.#memory.heapU8.buffer, pageXPtr.ptr, 1);
    const yView = new Float64Array(this.#memory.heapU8.buffer, pageYPtr.ptr, 1);

    return {
      x: xView[0] ?? 0,
      y: yView[0] ?? 0,
    };
  }

  /**
   * Convert page coordinates (points) to device coordinates (pixels).
   *
   * This is useful for positioning UI elements over specific page content
   * or for drawing annotations at precise locations.
   *
   * @param context - The coordinate transform context defining the viewport
   * @param pageX - X coordinate in page space (points)
   * @param pageY - Y coordinate in page space (points)
   * @returns The corresponding point in device coordinate space
   *
   * @example
   * ```typescript
   * const context = {
   *   startX: 0,
   *   startY: 0,
   *   sizeX: 800,
   *   sizeY: 600,
   *   rotate: PageRotation.None,
   * };
   * const deviceCoord = page.pageToDevice(context, textBounds.left, textBounds.top);
   * ```
   */
  pageToDevice(context: CoordinateTransformContext, pageX: number, pageY: number): DeviceCoordinate {
    this.ensureNotDisposed();

    if (!Number.isFinite(pageX) || !Number.isFinite(pageY)) {
      throw new PageError(PDFiumErrorCode.PAGE_LOAD_FAILED, 'Page coordinates must be finite numbers');
    }

    using deviceXPtr = this.#memory.alloc(4);
    using deviceYPtr = this.#memory.alloc(4);

    this.#module._FPDF_PageToDevice(
      this.#pageHandle,
      context.startX,
      context.startY,
      context.sizeX,
      context.sizeY,
      context.rotate,
      pageX,
      pageY,
      deviceXPtr.ptr,
      deviceYPtr.ptr,
    );

    return {
      x: this.#memory.readInt32(deviceXPtr.ptr),
      y: this.#memory.readInt32(deviceYPtr.ptr),
    };
  }

  // ===== Form Actions =====

  /**
   * Executes a page action for forms.
   *
   * Triggers JavaScript actions associated with page events (open/close).
   * This is used to run any scripts that are attached to page lifecycle events
   * in interactive PDF forms.
   *
   * @param actionType - The type of page action to execute
   *
   * @example
   * ```typescript
   * // Trigger page open action
   * page.executePageAction(PageActionType.Open);
   *
   * // Before closing, trigger close action
   * page.executePageAction(PageActionType.Close);
   * ```
   */
  executePageAction(actionType: PageActionType): void {
    this.ensureNotDisposed();

    if (this.#formHandle === NULL_FORM) {
      return;
    }

    this.#module._FORM_DoPageAAction(this.#pageHandle, this.#formHandle, actionType);
  }

  protected disposeInternal(): void {
    // Deregister from parent document
    this.#deregister?.(this);

    // Defer native cleanup if borrowed views are still alive
    if (this.#borrowCount > 0) {
      return;
    }

    this.#releaseNative();
  }
}
