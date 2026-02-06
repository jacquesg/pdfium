/**
 * PDF page handling with automatic resource management.
 *
 * @module document/page
 */

import { Disposable } from '../core/disposable.js';
import { PageError, PDFiumErrorCode, RenderError, TextError } from '../core/errors.js';
import type { IPageReader } from '../core/interfaces.js';
import {
  ActionType,
  AnnotationType,
  type CharacterInfo,
  type CharBox,
  type Colour,
  type CoordinateTransformContext,
  DEFAULT_LIMITS,
  DestinationFitType,
  type DeviceCoordinate,
  FlattenFlags,
  FlattenResult,
  type FormFieldType,
  type FormModifierFlags,
  type FormMouseButton,
  type PageActionType,
  type PageBox,
  PageBoxType,
  type PageCoordinate,
  type PageObjectMark,
  PageObjectMarkValueType,
  PageObjectType,
  PageRotation,
  type PageSize,
  type PDFAction,
  type PDFDestination,
  type PDFiumLimits,
  type PDFLink,
  ProgressiveRenderStatus,
  type Rect,
  type RenderOptions,
  type RenderResult,
  type StructureElement,
  TextRenderMode,
  TextSearchFlags,
  type TextSearchResult,
  type TransformMatrix,
  type WebLink,
} from '../core/types.js';
import {
  NULL_ACTION,
  NULL_ANNOT,
  NULL_CLIP_PATH,
  NULL_DEST,
  NULL_FONT,
  NULL_FORM,
  NULL_LINK,
  NULL_PAGE_LINK,
  NULL_PAGE_OBJECT,
  NULL_STRUCT_ELEMENT,
  NULL_STRUCT_TREE,
  NULL_TEXT_PAGE,
  SIZEOF_FLOAT,
  SIZEOF_FS_MATRIX,
  SIZEOF_FS_RECTF,
  SIZEOF_INT,
  UTF16LE_BYTES_PER_CHAR,
  UTF16LE_NULL_TERMINATOR_BYTES,
} from '../internal/constants.js';
import {
  actionTypeMap,
  annotationTypeMap,
  destinationFitTypeMap,
  flattenFlagsMap,
  flattenResultMap,
  formFieldTypeMap,
  fromNative,
  pageActionTypeMap,
  pageRotationMap,
  progressiveRenderStatusMap,
  toNative,
} from '../internal/enum-maps.js';
import type {
  ActionHandle,
  AnnotationHandle,
  BitmapHandle,
  DestinationHandle,
  DocumentHandle,
  FormHandle,
  LinkHandle,
  PageHandle,
  PageLinkHandle,
  PageObjectHandle,
  PageObjectMarkHandle,
  StructElementHandle,
  StructTreeHandle,
  TextPageHandle,
  WASMPointer,
} from '../internal/handles.js';
import { convertBgraToRgba } from '../internal/pixel-conversion.js';
import { INTERNAL } from '../internal/symbols.js';
import type { Mutable } from '../internal/utility-types.js';
import { NativeHandle, type WASMAllocation } from '../wasm/allocation.js';
import { BitmapFormat, PageObjectTypeNative, type PDFiumWASM, RenderFlags } from '../wasm/bindings/index.js';
import {
  asHandle,
  encodeUTF16LE,
  NULL_PTR,
  ptrOffset,
  utf16leDecoder,
  type WASMMemoryManager,
} from '../wasm/memory.js';
import { FSMatrix, FSRectF } from '../wasm/structs.js';
import { getWasmBytes, getWasmStringUTF8, getWasmStringUTF16LE } from '../wasm/utils.js';
import { type AnnotationContext, PDFiumAnnotation } from './annotation.js';
import { PDFiumFont } from './font.js';
import * as Annotations from './page_impl/annotations.js';
import * as Images from './page_impl/images.js';
import * as Objects from './page_impl/objects.js';
import * as Text from './page_impl/text.js';
import {
  type PageObjectContext,
  PDFiumImageObject,
  PDFiumPageObject,
  PDFiumPathObject,
  PDFiumTextObject,
} from './page-object.js';
import { createProgressiveRenderContext, type ProgressiveRenderContext } from './progressive-render.js';

/**
 * Default background colour (white with full opacity).
 */
const DEFAULT_BACKGROUND_COLOUR = 0xffffffff;

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
export class PDFiumPage extends Disposable implements IPageReader {
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
  #rendering = false;

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
      Text.closeTextPage(this.#module, this.#textPageHandle);
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
    return fromNative(pageRotationMap.fromNative, raw, PageRotation.None);
  }

  /**
   * Set the page rotation.
   *
   * @param rotation - The rotation value to set
   */
  set rotation(rotation: PageRotation) {
    this.ensureNotDisposed();
    this.#module._FPDFPage_SetRotation(this.#pageHandle, toNative(pageRotationMap.toNative, rotation));
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
    using buf = this.#memory.alloc(SIZEOF_FS_RECTF);
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

    return {
      left: this.#memory.readFloat32(leftPtr),
      bottom: this.#memory.readFloat32(bottomPtr),
      right: this.#memory.readFloat32(rightPtr),
      top: this.#memory.readFloat32(topPtr),
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
    using rect = this.#memory.alloc(SIZEOF_FS_RECTF); // 4 floats * 4 bytes
    const success = this.#module._FPDF_GetPageBoundingBox(this.#pageHandle, rect.ptr);

    if (!success) {
      // Fall back to page dimensions
      return {
        left: 0,
        bottom: 0,
        right: this.#width,
        top: this.#height,
      };
    }

    return {
      left: this.#memory.readFloat32(rect.ptr),
      top: this.#memory.readFloat32(ptrOffset(rect.ptr, 4)),
      right: this.#memory.readFloat32(ptrOffset(rect.ptr, 8)),
      bottom: this.#memory.readFloat32(ptrOffset(rect.ptr, 12)),
    };
  }

  /**
   * Transform all annotations on the page.
   *
   * Applies an affine transformation matrix to all annotations.
   *
   * @param matrix - The transformation matrix to apply
   */
  transformAnnotations(matrix: TransformMatrix): void {
    this.ensureNotDisposed();
    this.#module._FPDFPage_TransformAnnots(
      this.#pageHandle,
      matrix.a,
      matrix.b,
      matrix.c,
      matrix.d,
      matrix.e,
      matrix.f,
    );
  }

  /**
   * Check if the page has an embedded thumbnail image.
   *
   * @returns True if a thumbnail exists, false otherwise
   */
  hasThumbnail(): boolean {
    this.ensureNotDisposed();

    // Check if we can get thumbnail data
    const size = this.#module._FPDFPage_GetDecodedThumbnailData(this.#pageHandle, NULL_PTR, 0);
    return size > 0;
  }

  /**
   * Get the embedded thumbnail image as a rendered result.
   *
   * Returns the thumbnail as RGBA pixel data in a {@link RenderResult},
   * matching the format returned by {@link render}.
   *
   * @returns The thumbnail as a render result, or undefined if not available
   */
  getThumbnailAsBitmap(): RenderResult | undefined {
    this.ensureNotDisposed();

    const bitmapHandle = this.#module._FPDFPage_GetThumbnailAsBitmap(this.#pageHandle);
    if (bitmapHandle === 0) {
      return undefined;
    }

    try {
      const width = this.#module._FPDFBitmap_GetWidth(bitmapHandle);
      const height = this.#module._FPDFBitmap_GetHeight(bitmapHandle);
      const stride = this.#module._FPDFBitmap_GetStride(bitmapHandle);
      const bufferPtr = this.#module._FPDFBitmap_GetBuffer(bitmapHandle);

      if (width <= 0 || height <= 0 || bufferPtr === 0) {
        return undefined;
      }

      // Copy and convert BGRA to RGBA, stripping stride padding if present
      const rowBytes = width * 4;
      let data: Uint8Array;

      if (stride === rowBytes) {
        // No padding — fast path
        const source = this.#memory.heapU8.subarray(bufferPtr, bufferPtr + rowBytes * height);
        data = convertBgraToRgba(source, rowBytes * height);
      } else {
        // Stride has padding — strip it row by row
        const stripped = new Uint8Array(rowBytes * height);
        for (let row = 0; row < height; row++) {
          const srcOffset = bufferPtr + row * stride;
          stripped.set(this.#memory.heapU8.subarray(srcOffset, srcOffset + rowBytes), row * rowBytes);
        }
        data = convertBgraToRgba(stripped, rowBytes * height);
      }

      return {
        width,
        height,
        originalWidth: this.#width,
        originalHeight: this.#height,
        data,
      };
    } finally {
      this.#module._FPDFBitmap_Destroy(bitmapHandle);
    }
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
    return getWasmBytes(this.#memory, (ptr, size) => fn(this.#pageHandle, ptr, size));
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
    return getWasmBytes(this.#memory, (ptr, size) => fn(this.#pageHandle, ptr, size));
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
    if (this.#rendering) {
      throw new RenderError(PDFiumErrorCode.RENDER_FAILED, 'Re-entrant render call detected');
    }

    const markName = __DEV__ ? `PDFiumPage.render:${this.index}` : '';
    if (__DEV__) {
      performance.mark(`${markName}:start`);
    }

    try {
      this.#rendering = true;
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
      const nativeRotation = toNative(pageRotationMap.toNative, rotation);

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
          nativeRotation,
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
          nativeRotation,
          flags,
        );
      }

      onProgress?.(0.8);

      // Convert BGRA to RGBA and copy to JavaScript
      const bufferSize = renderWidth * 4 * renderHeight;
      const source = this.#memory.heapU8.subarray(bufferAlloc.ptr, bufferAlloc.ptr + bufferSize);
      const data = convertBgraToRgba(source, bufferSize);

      onProgress?.(1.0);

      if (__DEV__) {
        performance.mark(`${markName}:end`);
        performance.measure(markName, `${markName}:start`, `${markName}:end`);
      }

      return {
        width: renderWidth,
        height: renderHeight,
        originalWidth: this.#width,
        originalHeight: this.#height,
        data,
      };
      // _bitmap destroyed first (LIFO), then _buffer freed
    } finally {
      this.#rendering = false;
      if (__DEV__) {
        performance.clearMarks(`${markName}:start`);
        performance.clearMarks(`${markName}:end`);
        performance.clearMeasures(markName);
      }
    }
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

    const { width: renderWidth, height: renderHeight } = this.#calculateRenderDimensions(options);
    this.#validateRenderDimensions(renderWidth, renderHeight);

    const bgColour = options.backgroundColour ?? DEFAULT_BACKGROUND_COLOUR;
    const { bufferAlloc, bitmapHandle } = this.#createRenderBitmap(renderWidth, renderHeight, bgColour);

    // Start progressive render with no pause callback (NULL)
    const rotation = options.rotation ?? PageRotation.None;
    const nativeRotation = toNative(pageRotationMap.toNative, rotation);
    const flags = RenderFlags.ANNOT;
    let status: ProgressiveRenderStatus;
    try {
      const rawStatus = this.#module._FPDF_RenderPageBitmap_Start(
        bitmapHandle,
        this.#pageHandle,
        0,
        0,
        renderWidth,
        renderHeight,
        nativeRotation,
        flags,
        NULL_PTR,
      );
      status = fromNative(progressiveRenderStatusMap.fromNative, rawStatus, ProgressiveRenderStatus.Failed);
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
    using structs = this.#memory.alloc(SIZEOF_FS_MATRIX + SIZEOF_FS_RECTF);
    const matrixPtr = structs.ptr;
    const clipPtr = ptrOffset(structs.ptr, SIZEOF_FS_MATRIX);

    // Write FS_MATRIX
    this.#memory.writeFloat32(matrixPtr, a);
    this.#memory.writeFloat32(ptrOffset(matrixPtr, 4), b);
    this.#memory.writeFloat32(ptrOffset(matrixPtr, 8), c);
    this.#memory.writeFloat32(ptrOffset(matrixPtr, 12), d);
    this.#memory.writeFloat32(ptrOffset(matrixPtr, 16), e);
    this.#memory.writeFloat32(ptrOffset(matrixPtr, 20), f);

    // Write FS_RECTF { left, top, right, bottom } at offsets [0, 4, 8, 12]
    this.#memory.writeFloat32(clipPtr, clipRect.left);
    this.#memory.writeFloat32(ptrOffset(clipPtr, 4), clipRect.top);
    this.#memory.writeFloat32(ptrOffset(clipPtr, 8), clipRect.right);
    this.#memory.writeFloat32(ptrOffset(clipPtr, 12), clipRect.bottom);

    this.#module._FPDF_RenderPageBitmapWithMatrix(bitmapHandle, this.#pageHandle, matrixPtr, clipPtr, flags);
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

    const charCount = Text.countChars(this.#module, this.#textPageHandle);
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

    return Text.getText(this.#module, this.#memory, this.#textPageHandle, 0, charCount);
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
   * for (const obj of page.objects()) {
   *   console.log(obj.type);
   * }
   * ```
   */
  objects(): IterableIterator<PDFiumPageObject> {
    this.ensureNotDisposed();
    const module = this.#module;
    const pageHandle = this.#pageHandle;
    const createPageObject = this.#createPageObject.bind(this);
    return (function* () {
      const count = module._FPDFPage_CountObjects(pageHandle);
      for (let i = 0; i < count; i++) {
        const handle = module._FPDFPage_GetObject(pageHandle, i);
        if (handle === NULL_PAGE_OBJECT) {
          continue;
        }
        yield createPageObject(handle);
      }
    })();
  }

  /**
   * Get all page objects (text, images, paths, etc.).
   *
   * For large pages, prefer using the `objects()` generator.
   *
   * @returns An array of page objects with type and bounding box information
   */
  getObjects(): PDFiumPageObject[] {
    return [...this.objects()];
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
   * The returned annotation holds an open native handle and a borrow on this
   * page's resources. Dispose the annotation when done.
   *
   * @param index - Zero-based annotation index
   * @returns The annotation wrapper
   * @throws {PageError} If the index is out of range or the annotation cannot be loaded
   */
  getAnnotation(index: number): PDFiumAnnotation {
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

    return this.#openAnnotation(handle);
  }

  /**
   * Get all annotations on this page.
   *
   * **Important:** Each annotation holds an open native handle that retains the
   * page's native resources. You **must** dispose every annotation when done,
   * otherwise native memory will not be freed.
   *
   * For memory-efficient iteration, prefer the `annotations()` generator which
   * yields one annotation at a time with `using` support.
   *
   * @example
   * ```typescript
   * // Array pattern — caller must dispose each annotation
   * const annots = page.getAnnotations();
   * try {
   *   for (const annot of annots) { console.log(annot.type); }
   * } finally {
   *   for (const annot of annots) { annot.dispose(); }
   * }
   *
   * // Generator pattern (preferred) — automatic disposal
   * for (using annot of page.annotations()) {
   *   console.log(annot.type);
   * }
   * ```
   */
  getAnnotations(): PDFiumAnnotation[] {
    this.ensureNotDisposed();
    const count = this.#module._FPDFPage_GetAnnotCount(this.#pageHandle);
    const annotations: PDFiumAnnotation[] = [];

    for (let i = 0; i < count; i++) {
      const handle = this.#module._FPDFPage_GetAnnot(this.#pageHandle, i);
      if (handle === NULL_ANNOT) {
        continue;
      }
      annotations.push(this.#openAnnotation(handle));
    }

    return annotations;
  }

  /**
   * Iterate annotations on this page lazily.
   *
   * Each yielded annotation holds an open native handle — use `using` or
   * call `dispose()` when done. Annotations are opened one at a time,
   * making this more memory-efficient than `getAnnotations()` for large
   * annotation sets.
   */
  *annotations(): IterableIterator<PDFiumAnnotation> {
    this.ensureNotDisposed();
    const count = this.#module._FPDFPage_GetAnnotCount(this.#pageHandle);
    for (let i = 0; i < count; i++) {
      const handle = this.#module._FPDFPage_GetAnnot(this.#pageHandle, i);
      if (handle === NULL_ANNOT) continue;
      yield this.#openAnnotation(handle);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Form Field Methods
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Get the form field type at the specified point.
   *
   * @param x - X coordinate in page coordinates
   * @param y - Y coordinate in page coordinates
   * @returns The form field type at the point, or null if none
   */
  getFormFieldTypeAtPoint(x: number, y: number): FormFieldType | null {
    this.ensureNotDisposed();
    if (this.#formHandle === NULL_FORM) {
      return null;
    }
    const result = this.#module._FPDFPage_HasFormFieldAtPoint(this.#formHandle, this.#pageHandle, x, y);
    if (result < 0) {
      return null;
    }
    return fromNative(formFieldTypeMap.fromNative, result, null);
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
    return this.#module._FPDFPage_FormFieldZOrderAtPoint(this.#formHandle, this.#pageHandle, x, y);
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

    // First call to get required size
    const requiredSize = this.#module._FORM_GetSelectedText(this.#formHandle, this.#pageHandle, NULL_PTR, 0);
    if (requiredSize <= UTF16LE_NULL_TERMINATOR_BYTES) {
      return undefined;
    }

    using buffer = this.#memory.alloc(requiredSize);
    const written = this.#module._FORM_GetSelectedText(this.#formHandle, this.#pageHandle, buffer.ptr, requiredSize);
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

    const textBytes = encodeUTF16LE(text);
    using textBuffer = this.#memory.allocFrom(textBytes);
    this.#module._FORM_ReplaceSelection(this.#formHandle, this.#pageHandle, textBuffer.ptr);
  }

  /**
   * Check if undo is available for form field editing on this page.
   */
  canFormUndo(): boolean {
    this.ensureNotDisposed();
    if (this.#formHandle === NULL_FORM) {
      return false;
    }
    return this.#module._FORM_CanUndo(this.#formHandle, this.#pageHandle) !== 0;
  }

  /**
   * Check if redo is available for form field editing on this page.
   */
  canFormRedo(): boolean {
    this.ensureNotDisposed();
    if (this.#formHandle === NULL_FORM) {
      return false;
    }
    return this.#module._FORM_CanRedo(this.#formHandle, this.#pageHandle) !== 0;
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
    return this.#module._FORM_Undo(this.#formHandle, this.#pageHandle) !== 0;
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
    return this.#module._FORM_Redo(this.#formHandle, this.#pageHandle) !== 0;
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
  formMouseMove(modifier: FormModifierFlags, x: number, y: number): boolean {
    this.ensureNotDisposed();
    if (this.#formHandle === NULL_FORM) {
      return false;
    }
    return this.#module._FORM_OnMouseMove(this.#formHandle, this.#pageHandle, modifier, x, y) !== 0;
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
  formMouseWheel(modifier: FormModifierFlags, x: number, y: number, deltaX: number, deltaY: number): boolean {
    this.ensureNotDisposed();
    if (this.#formHandle === NULL_FORM) {
      return false;
    }

    // Allocate FS_POINTF struct (two floats: x, y)
    using coord = this.#memory.alloc(2 * SIZEOF_FLOAT);
    this.#memory.writeFloat32(coord.ptr, x);
    this.#memory.writeFloat32(ptrOffset(coord.ptr, SIZEOF_FLOAT), y);

    return (
      this.#module._FORM_OnMouseWheel(this.#formHandle, this.#pageHandle, modifier, coord.ptr, deltaX, deltaY) !== 0
    );
  }

  /**
   * Notify form fill environment of focus at a point.
   *
   * @param modifier - Keyboard modifier flags
   * @param x - X coordinate in page space
   * @param y - Y coordinate in page space
   * @returns True if the event was handled
   */
  formFocus(modifier: FormModifierFlags, x: number, y: number): boolean {
    this.ensureNotDisposed();
    if (this.#formHandle === NULL_FORM) {
      return false;
    }
    return this.#module._FORM_OnFocus(this.#formHandle, this.#pageHandle, modifier, x, y) !== 0;
  }

  /**
   * Notify form fill environment of a mouse button down event.
   *
   * @param button - Which mouse button ('left' or 'right')
   * @param modifier - Keyboard modifier flags
   * @param x - X coordinate in page space
   * @param y - Y coordinate in page space
   * @returns True if the event was handled
   */
  formMouseDown(button: FormMouseButton, modifier: FormModifierFlags, x: number, y: number): boolean {
    this.ensureNotDisposed();
    if (this.#formHandle === NULL_FORM) {
      return false;
    }
    const fn = button === 'left' ? this.#module._FORM_OnLButtonDown : this.#module._FORM_OnRButtonDown;
    return fn(this.#formHandle, this.#pageHandle, modifier, x, y) !== 0;
  }

  /**
   * Notify form fill environment of a mouse button up event.
   *
   * @param button - Which mouse button ('left' or 'right')
   * @param modifier - Keyboard modifier flags
   * @param x - X coordinate in page space
   * @param y - Y coordinate in page space
   * @returns True if the event was handled
   */
  formMouseUp(button: FormMouseButton, modifier: FormModifierFlags, x: number, y: number): boolean {
    this.ensureNotDisposed();
    if (this.#formHandle === NULL_FORM) {
      return false;
    }
    const fn = button === 'left' ? this.#module._FORM_OnLButtonUp : this.#module._FORM_OnRButtonUp;
    return fn(this.#formHandle, this.#pageHandle, modifier, x, y) !== 0;
  }

  /**
   * Notify form fill environment of a double-click event.
   *
   * @param modifier - Keyboard modifier flags
   * @param x - X coordinate in page space
   * @param y - Y coordinate in page space
   * @returns True if the event was handled
   */
  formDoubleClick(modifier: FormModifierFlags, x: number, y: number): boolean {
    this.ensureNotDisposed();
    if (this.#formHandle === NULL_FORM) {
      return false;
    }
    return this.#module._FORM_OnLButtonDoubleClick(this.#formHandle, this.#pageHandle, modifier, x, y) !== 0;
  }

  /**
   * Notify form fill environment of a key down event.
   *
   * @param keyCode - Virtual key code
   * @param modifier - Keyboard modifier flags
   * @returns True if the event was handled
   */
  formKeyDown(keyCode: number, modifier: FormModifierFlags): boolean {
    this.ensureNotDisposed();
    if (this.#formHandle === NULL_FORM) {
      return false;
    }
    return this.#module._FORM_OnKeyDown(this.#formHandle, this.#pageHandle, keyCode, modifier) !== 0;
  }

  /**
   * Notify form fill environment of a key up event.
   *
   * @param keyCode - Virtual key code
   * @param modifier - Keyboard modifier flags
   * @returns True if the event was handled
   */
  formKeyUp(keyCode: number, modifier: FormModifierFlags): boolean {
    this.ensureNotDisposed();
    if (this.#formHandle === NULL_FORM) {
      return false;
    }
    return this.#module._FORM_OnKeyUp(this.#formHandle, this.#pageHandle, keyCode, modifier) !== 0;
  }

  /**
   * Notify form fill environment of a character input event.
   *
   * @param charCode - Character code
   * @param modifier - Keyboard modifier flags
   * @returns True if the event was handled
   */
  formChar(charCode: number, modifier: FormModifierFlags): boolean {
    this.ensureNotDisposed();
    if (this.#formHandle === NULL_FORM) {
      return false;
    }
    return this.#module._FORM_OnChar(this.#formHandle, this.#pageHandle, charCode, modifier) !== 0;
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

    // First call to get required size
    const requiredSize = this.#module._FORM_GetFocusedText(this.#formHandle, this.#pageHandle, NULL_PTR, 0);
    if (requiredSize <= UTF16LE_NULL_TERMINATOR_BYTES) {
      return undefined;
    }

    using buffer = this.#memory.alloc(requiredSize);
    const written = this.#module._FORM_GetFocusedText(this.#formHandle, this.#pageHandle, buffer.ptr, requiredSize);
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

    const textBytes = encodeUTF16LE(text);
    using textBuffer = this.#memory.allocFrom(textBytes);
    this.#module._FORM_ReplaceAndKeepSelection(this.#formHandle, this.#pageHandle, textBuffer.ptr);
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
    return this.#module._FORM_SelectAllText(this.#formHandle, this.#pageHandle) !== 0;
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
    return this.#module._FORM_SetIndexSelected(this.#formHandle, this.#pageHandle, index, selected ? 1 : 0) !== 0;
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
    return this.#module._FORM_IsIndexSelected(this.#formHandle, this.#pageHandle, index) !== 0;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Page Manipulation Methods
  // ─────────────────────────────────────────────────────────────────────────

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
    return fromNative(
      flattenResultMap.fromNative,
      this.#module._FPDFPage_Flatten(this.#pageHandle, toNative(flattenFlagsMap.toNative, flags)),
      FlattenResult.Fail,
    );
  }

  /**
   * Check if this page contains transparency.
   *
   * @returns True if the page contains transparency
   */
  hasTransparency(): boolean {
    this.ensureNotDisposed();
    return this.#module._FPDFPage_HasTransparency(this.#pageHandle) !== 0;
  }

  /**
   * Remove a page object from this page.
   *
   * After removal, call generateContent() to update the page content stream.
   *
   * @param obj - The page object to remove
   * @returns True if successful
   */
  removeObject(obj: PDFiumPageObject): boolean {
    this.ensureNotDisposed();
    return Objects.removePageObject(this.#module, this.#pageHandle, obj[INTERNAL].handle);
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
    return Objects.generateContent(this.#module, this.#pageHandle);
  }

  /**
   * Transform this page with a matrix and optional clip rectangle.
   *
   * @param matrix - The transformation matrix to apply
   * @param clipRect - Optional clip rectangle in page coordinates
   * @returns True if successful
   */
  transformWithClip(matrix: TransformMatrix, clipRect?: PageBox): boolean {
    this.ensureNotDisposed();

    // Allocate matrix struct (FS_MATRIX: 6 floats)
    using matrixStruct = new FSMatrix(this.#memory);
    matrixStruct.a = matrix.a;
    matrixStruct.b = matrix.b;
    matrixStruct.c = matrix.c;
    matrixStruct.d = matrix.d;
    matrixStruct.e = matrix.e;
    matrixStruct.f = matrix.f;

    if (clipRect) {
      using rect = new FSRectF(this.#memory);
      rect.left = clipRect.left;
      rect.top = clipRect.top;
      rect.right = clipRect.right;
      rect.bottom = clipRect.bottom;
      return this.#module._FPDFPage_TransFormWithClip(this.#pageHandle, matrixStruct.ptr, rect.ptr) !== 0;
    }

    return this.#module._FPDFPage_TransFormWithClip(this.#pageHandle, matrixStruct.ptr, NULL_PTR) !== 0;
  }

  /**
   * Create, insert, and destroy a clip path in a single operation.
   *
   * @param box - The clip path rectangle in page coordinates
   * @returns True if the clip path was created and inserted successfully
   */
  setClipPath(box: PageBox): boolean {
    this.ensureNotDisposed();
    const handle = this.#module._FPDF_CreateClipPath(box.left, box.bottom, box.right, box.top);
    if (handle === NULL_CLIP_PATH) {
      return false;
    }
    this.#module._FPDFPage_InsertClipPath(this.#pageHandle, handle);
    this.#module._FPDF_DestroyClipPath(handle);
    return true;
  }

  /**
   * Create a new image page object.
   *
   * The returned object must be inserted into a page or annotation,
   * or destroyed via `obj.destroy()`.
   *
   * @returns A new image page object, or null if failed
   */
  createImageObject(): PDFiumImageObject | null {
    this.ensureNotDisposed();
    const handle = Objects.pageObjNewImage(this.#module, this.#documentHandle);
    if (handle === null) {
      return null;
    }
    const bounds = this.#readObjectBounds(handle);
    const details = this.#readImageObjectDetails(handle);
    return new PDFiumImageObject(this.#pageObjectContext(), handle, bounds, details.width, details.height);
  }

  #getMarkParams(mark: PageObjectMarkHandle): PageObjectMark['params'] {
    const params: PageObjectMark['params'] = [];
    const paramCount = Objects.pageObjMarkCountParams(this.#module, mark);

    for (let i = 0; i < paramCount; i++) {
      // Get param key
      const key = Objects.pageObjMarkGetParamKey(this.#module, this.#memory, mark, i);
      if (!key) continue;

      // Get value type
      const valueType = Objects.pageObjMarkGetParamValueType(this.#module, this.#memory, mark, key);

      if (valueType === PageObjectMarkValueType.Int) {
        const intVal = Objects.pageObjMarkGetParamIntValue(this.#module, this.#memory, mark, key);
        if (intVal !== undefined) {
          params.push({ key, valueType, value: intVal });
        }
      } else if (valueType === PageObjectMarkValueType.String || valueType === PageObjectMarkValueType.Name) {
        const strVal = Objects.pageObjMarkGetParamStringValue(this.#module, this.#memory, mark, key);
        if (strVal !== undefined) {
          params.push({ key, valueType, value: strVal });
        }
      } else if (valueType === PageObjectMarkValueType.Blob) {
        const blobVal = Objects.pageObjMarkGetParamBlobValue(this.#module, this.#memory, mark, key);
        if (blobVal !== undefined) {
          params.push({ key, valueType, value: blobVal });
        }
      }
    }

    return params;
  }

  /**
   * Remove an annotation from this page.
   *
   * @param index - Zero-based annotation index
   * @returns True if successful
   */
  removeAnnotation(index: number): boolean {
    this.ensureNotDisposed();
    return Annotations.removeAnnotation(this.#module, this.#pageHandle, index);
  }

  /**
   * Create a new annotation on this page.
   *
   * @param type - The annotation type to create
   * @returns The new annotation, or null if creation failed
   */
  createAnnotation(type: AnnotationType): PDFiumAnnotation | null {
    this.ensureNotDisposed();
    const handle = Annotations.createAnnotation(this.#module, this.#pageHandle, type);
    if (handle === null) return null;
    return this.#openAnnotation(handle);
  }

  /**
   * Check if an annotation subtype is supported for object extraction.
   *
   * @param subtype - The annotation subtype to check
   * @returns True if the subtype supports object operations
   */
  isAnnotationSubtypeSupported(subtype: AnnotationType): boolean {
    this.ensureNotDisposed();
    return this.#module._FPDFAnnot_IsSupportedSubtype(toNative(annotationTypeMap.toNative, subtype)) !== 0;
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
    return this.#module._FPDFAnnot_IsObjectSupportedSubtype(toNative(annotationTypeMap.toNative, subtype)) !== 0;
  }

  /**
   * Get the count of focusable annotation subtypes.
   *
   * @returns The number of focusable subtypes
   */
  getFocusableSubtypesCount(): number {
    this.ensureNotDisposed();

    if (this.#formHandle === NULL_FORM) {
      return 0;
    }

    return this.#module._FPDFAnnot_GetFocusableSubtypesCount(this.#formHandle);
  }

  /**
   * Get the focusable annotation subtypes.
   *
   * @returns Array of focusable annotation types
   */
  getFocusableSubtypes(): AnnotationType[] {
    this.ensureNotDisposed();

    if (this.#formHandle === NULL_FORM) {
      return [];
    }

    const count = this.getFocusableSubtypesCount();
    if (count === 0) {
      return [];
    }

    // Each subtype is an int32 (4 bytes)
    using subtypesBuf = this.#memory.alloc(count * SIZEOF_INT);
    const success = this.#module._FPDFAnnot_GetFocusableSubtypes(this.#formHandle, subtypesBuf.ptr, count);
    if (!success) {
      return [];
    }

    const result: AnnotationType[] = [];
    for (let i = 0; i < count; i++) {
      const subtype = this.#memory.readInt32(ptrOffset(subtypesBuf.ptr, i * SIZEOF_INT));
      const mapped = fromNative(annotationTypeMap.fromNative, subtype, AnnotationType.Unknown);
      if (mapped !== AnnotationType.Unknown) {
        result.push(mapped);
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

    if (this.#formHandle === NULL_FORM) {
      return false;
    }

    if (subtypes.length === 0) {
      return this.#module._FPDFAnnot_SetFocusableSubtypes(this.#formHandle, NULL_PTR, 0) !== 0;
    }

    using subtypesBuf = this.#memory.alloc(subtypes.length * SIZEOF_INT);
    for (let i = 0; i < subtypes.length; i++) {
      const st = subtypes[i];
      const native = st !== undefined ? toNative(annotationTypeMap.toNative, st) : 0;
      this.#memory.writeInt32(ptrOffset(subtypesBuf.ptr, i * SIZEOF_INT), native);
    }

    return this.#module._FPDFAnnot_SetFocusableSubtypes(this.#formHandle, subtypesBuf.ptr, subtypes.length) !== 0;
  }

  /**
   * Search for text on this page.
   *
   * Returns a generator yielding search results with position information.
   * The search handle is cleaned up when the generator finishes or is closed.
   *
   * @param query - The text to search for
   * @param flags - Search flags (case sensitivity, whole word, etc.)
   * @throws {TextError} If the text page fails to load
   */
  *findText(query: string, flags: TextSearchFlags = TextSearchFlags.None): IterableIterator<TextSearchResult> {
    this.ensureNotDisposed();
    if (query.length === 0) {
      return;
    }
    this.#ensureTextPage();

    const { results } = Text.search(this.#module, this.#memory, this.#textPageHandle, query, flags);

    for (const res of results) {
      const rects = this.#getTextRects(res.index, res.length);
      yield { charIndex: res.index, charCount: res.length, rects };
    }
  }

  /**
   * Get the bounding box of a character by its index.
   *
   * @param charIndex - Zero-based character index
   * @returns The character bounding box, or undefined if the index is invalid
   * @throws {TextError} If the text page fails to load
   */
  getCharBox(charIndex: number): CharBox | undefined {
    this.ensureNotDisposed();
    this.#ensureTextPage();

    const count = this.charCount;
    if (charIndex < 0 || charIndex >= count) {
      return undefined;
    }

    return Text.getCharBox(this.#module, this.#memory, this.#textPageHandle, charIndex);
  }

  /**
   * Get the loose bounding box of a character by its index.
   *
   * @param charIndex - Zero-based character index
   * @returns The character loose bounding box, or undefined if the index is invalid
   */
  getCharLooseBox(charIndex: number): CharBox | undefined {
    this.ensureNotDisposed();
    this.#ensureTextPage();

    using rect = new FSRectF(this.#memory);
    const success = this.#module._FPDFText_GetLooseCharBox(this.#textPageHandle, charIndex, rect.ptr);
    if (!success) {
      return undefined;
    }

    return {
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
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

    return Text.getCharIndexAtPoint(this.#module, this.#textPageHandle, x, y, xTolerance, yTolerance);
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

  /**
   * Get efficient text layout data (characters and bounding boxes).
   *
   * Optimised for bulk extraction. Returns a single string of text and a flat Float32Array
   * of bounding boxes — 4 values per character in the order `[left, right, bottom, top]`,
   * so `rects.length === text.length * 4`. Access character `i` bounds via
   * `rects[i*4]` (left), `rects[i*4+1]` (right), `rects[i*4+2]` (bottom), `rects[i*4+3]` (top).
   *
   * @returns Object containing { text, rects }
   */
  getTextLayout(): { text: string; rects: Float32Array } {
    this.ensureNotDisposed();
    this.#ensureTextPage();

    const charCount = this.#module._FPDFText_CountChars(this.#textPageHandle);
    if (charCount <= 0) {
      return { text: '', rects: new Float32Array(0) };
    }

    // 1. Get Text
    const text = this.getText();

    // 2. Get Rects (Batch)
    const rects = new Float32Array(charCount * 4);

    // RAII wrapper for native struct
    using rect = new FSRectF(this.#memory);

    const getLooseBox = this.#module._FPDFText_GetLooseCharBox;
    if (typeof getLooseBox !== 'function') {
      // Fallback to empty rects if API missing
      return { text, rects };
    }

    for (let i = 0; i < charCount; i++) {
      const success = getLooseBox(this.#textPageHandle, i, rect.ptr);
      if (success) {
        // Target format: [left, right, bottom, top]
        const offset = i * 4;
        rects[offset] = rect.left;
        rects[offset + 1] = rect.right;
        rects[offset + 2] = rect.bottom;
        rects[offset + 3] = rect.top;
      }
    }

    return { text, rects };
  }
  #ensureTextPage(): void {
    if (this.#textPageHandle === NULL_TEXT_PAGE) {
      this.#textPageHandle = Text.loadTextPage(this.#module, this.#pageHandle);
      if (this.#textPageHandle === NULL_TEXT_PAGE) {
        throw new TextError(PDFiumErrorCode.TEXT_LOAD_FAILED, 'Failed to load text page');
      }
    }
  }

  #getTextRects(charIndex: number, charCount: number): Rect[] {
    const rectCount = Text.countRects(this.#module, this.#textPageHandle, charIndex, charCount);
    if (rectCount <= 0) {
      return [];
    }

    const rects: Rect[] = [];
    for (let i = 0; i < rectCount; i++) {
      const rect = Text.getRect(this.#module, this.#memory, this.#textPageHandle, i);
      if (rect) {
        rects.push(rect);
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
    return Text.countChars(this.#module, this.#textPageHandle);
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

    const count = this.charCount;
    if (charIndex < 0 || charIndex >= count) {
      return 0;
    }

    return Text.getUnicode(this.#module, this.#textPageHandle, charIndex);
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

    const count = this.charCount;
    if (charIndex < 0 || charIndex >= count) {
      return 0;
    }

    return Text.getFontSize(this.#module, this.#textPageHandle, charIndex);
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

    const count = this.charCount;
    if (charIndex < 0 || charIndex >= count) {
      return -1;
    }

    return Text.getFontWeight(this.#module, this.#textPageHandle, charIndex);
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

    const count = this.charCount;
    if (charIndex < 0 || charIndex >= count) {
      return undefined;
    }

    return Text.getFontName(this.#module, this.#memory, this.#textPageHandle, charIndex);
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

    const count = this.charCount;
    if (charIndex < 0 || charIndex >= count) {
      return TextRenderMode.Fill;
    }

    return Text.getTextRenderMode(this.#module, this.#textPageHandle, charIndex);
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

    const count = this.charCount;
    if (charIndex < 0 || charIndex >= count) {
      return 0;
    }

    return Text.getCharAngle(this.#module, this.#textPageHandle, charIndex);
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

    const count = this.charCount;
    if (charIndex < 0 || charIndex >= count) {
      return undefined;
    }

    return Text.getCharOrigin(this.#module, this.#memory, this.#textPageHandle, charIndex);
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

    const count = this.charCount;
    if (charIndex < 0 || charIndex >= count) {
      return undefined;
    }

    return Text.getFillColor(this.#module, this.#memory, this.#textPageHandle, charIndex);
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

    const count = this.charCount;
    if (charIndex < 0 || charIndex >= count) {
      return undefined;
    }

    return Text.getStrokeColor(this.#module, this.#memory, this.#textPageHandle, charIndex);
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

    const count = this.charCount;
    if (charIndex < 0 || charIndex >= count) {
      return undefined;
    }

    const unicode = Text.getUnicode(this.#module, this.#textPageHandle, charIndex);
    const fontSize = Text.getFontSize(this.#module, this.#textPageHandle, charIndex);
    const fontWeight = Text.getFontWeight(this.#module, this.#textPageHandle, charIndex);
    const renderModeValue = Text.getTextRenderMode(this.#module, this.#textPageHandle, charIndex);
    const angle = Text.getCharAngle(this.#module, this.#textPageHandle, charIndex);
    const isGenerated = this.#module._FPDFText_IsGenerated(this.#textPageHandle, charIndex) !== 0;
    const isHyphen = this.#module._FPDFText_IsHyphen(this.#textPageHandle, charIndex) !== 0;
    const hasUnicodeMapError = this.#module._FPDFText_HasUnicodeMapError(this.#textPageHandle, charIndex) !== 0;

    // Get origin
    const origin = Text.getCharOrigin(this.#module, this.#memory, this.#textPageHandle, charIndex);

    const info: CharacterInfo = {
      index: charIndex,
      unicode,
      char: String.fromCodePoint(unicode),
      fontSize,
      fontWeight,
      renderMode: renderModeValue,
      angle,
      originX: origin.x,
      originY: origin.y,
      isGenerated,
      isHyphen,
      hasUnicodeMapError,
    };

    // Add optional font name
    const fontName = this.getCharFontName(charIndex);
    if (fontName !== undefined) {
      (info as Mutable<CharacterInfo>).fontName = fontName;
    }

    // Add optional colours
    const fillColour = this.getCharFillColour(charIndex);
    if (fillColour !== undefined) {
      (info as Mutable<CharacterInfo>).fillColour = fillColour;
    }

    const strokeColour = this.getCharStrokeColour(charIndex);
    if (strokeColour !== undefined) {
      (info as Mutable<CharacterInfo>).strokeColour = strokeColour;
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
  structureElements(): IterableIterator<StructureElement> | undefined {
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
      (result as Mutable<StructureElement>).altText = altText;
    }
    if (lang) {
      (result as Mutable<StructureElement>).lang = lang;
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

  #createPageObject(handle: PageObjectHandle): PDFiumPageObject {
    const rawType = this.#module._FPDFPageObj_GetType(handle);
    const bounds = this.#readObjectBounds(handle);
    const ctx = this.#pageObjectContext();

    switch (rawType) {
      case PageObjectTypeNative.TEXT: {
        const { text, fontSize } = this.#readTextObjectDetails(handle);
        return new PDFiumTextObject(ctx, handle, bounds, text, fontSize);
      }
      case PageObjectTypeNative.IMAGE: {
        const { width, height } = this.#readImageObjectDetails(handle);
        return new PDFiumImageObject(ctx, handle, bounds, width, height);
      }
      case PageObjectTypeNative.PATH:
        return new PDFiumPathObject(ctx, handle, PageObjectType.Path, bounds);
      case PageObjectTypeNative.SHADING:
        return new PDFiumPageObject(ctx, handle, PageObjectType.Shading, bounds);
      case PageObjectTypeNative.FORM:
        return new PDFiumPageObject(ctx, handle, PageObjectType.Form, bounds);
      default:
        return new PDFiumPageObject(ctx, handle, PageObjectType.Unknown, bounds);
    }
  }

  #pageObjectContext(): PageObjectContext {
    return {
      module: this.#module,
      memory: this.#memory,
      ensurePageValid: () => this.ensureNotDisposed(),
      retain: () => this.retain(),
      release: () => this.release(),
      getFont: (handle: PageObjectHandle) => {
        const fontHandle = this.#module._FPDFTextObj_GetFont(handle);
        if (fontHandle === NULL_FONT) {
          return null;
        }
        return new PDFiumFont(
          this.#module,
          this.#memory,
          fontHandle,
          () => this.retain(),
          () => this.release(),
        );
      },
      getMarkParams: (mark: PageObjectMarkHandle) => this.#getMarkParams(mark),
      getImageMetadata: (handle: PageObjectHandle) =>
        Images.imageObjGetMetadata(this.#module, this.#memory, handle, this.#pageHandle),
    };
  }

  #annotationContext(): AnnotationContext {
    return {
      module: this.#module,
      memory: this.#memory,
      pageHandle: this.#pageHandle,
      formHandle: this.#formHandle,
      buildLink: (handle) => this.#buildLinkFromHandle(handle, -1) ?? null,
    };
  }

  #openAnnotation(handle: AnnotationHandle): PDFiumAnnotation {
    return new PDFiumAnnotation(
      this.#annotationContext(),
      handle,
      () => this.retain(),
      () => this.release(),
    );
  }

  #readObjectBounds(handle: PageObjectHandle): Rect {
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

    return {
      left: this.#memory.readFloat32(leftPtr),
      bottom: this.#memory.readFloat32(bottomPtr),
      right: this.#memory.readFloat32(rightPtr),
      top: this.#memory.readFloat32(topPtr),
    };
  }

  #readTextObjectDetails(handle: PageObjectHandle): { text: string; fontSize: number } {
    // Read font size
    using sizeBuf = this.#memory.alloc(SIZEOF_FLOAT);
    let fontSize = 0;
    if (this.#module._FPDFTextObj_GetFontSize(handle, sizeBuf.ptr)) {
      fontSize = this.#memory.readFloat32(sizeBuf.ptr);
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
   * @returns The link at the point, or null if none
   */
  getLinkAtPoint(x: number, y: number): PDFLink | null {
    this.ensureNotDisposed();

    const linkHandle = this.#module._FPDFLink_GetLinkAtPoint(this.#pageHandle, x, y);
    if (linkHandle === NULL_LINK) {
      return null;
    }

    return this.#buildLinkFromHandle(linkHandle, -1) ?? null;
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
  links(): IterableIterator<PDFLink> {
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
    return this.#module._FPDFLink_LoadWebLinks(this.#textPageHandle);
  }

  /**
   * Get the URL for a detected web link.
   *
   * @param linkPage - Web links container handle
   * @param linkIndex - Zero-based index of the web link
   */
  #getWebLinkURL(linkPage: PageLinkHandle, linkIndex: number): string | undefined {
    return getWasmStringUTF16LE(this.#memory, (buf, len) =>
      this.#module._FPDFLink_GetURL(linkPage, linkIndex, buf, len),
    );
  }

  /**
   * Get the bounding rectangles for a detected web link.
   *
   * @param linkPage - Web links container handle
   * @param linkIndex - Zero-based index of the web link
   */
  #getWebLinkRects(linkPage: PageLinkHandle, linkIndex: number): Rect[] {
    const rectCount = this.#module._FPDFLink_CountRects(linkPage, linkIndex);
    const rects: Rect[] = [];

    using left = this.#memory.alloc(8);
    using top = this.#memory.alloc(8);
    using right = this.#memory.alloc(8);
    using bottom = this.#memory.alloc(8);

    for (let i = 0; i < rectCount; i++) {
      const success = this.#module._FPDFLink_GetRect(linkPage, linkIndex, i, left.ptr, top.ptr, right.ptr, bottom.ptr);

      if (success) {
        rects.push({
          left: this.#memory.readFloat64(left.ptr),
          top: this.#memory.readFloat64(top.ptr),
          right: this.#memory.readFloat64(right.ptr),
          bottom: this.#memory.readFloat64(bottom.ptr),
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
    using startCharPtr = this.#memory.alloc(4);
    using charCountPtr = this.#memory.alloc(4);

    const success = this.#module._FPDFLink_GetTextRange(linkPage, linkIndex, startCharPtr.ptr, charCountPtr.ptr);
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
    using rect = new FSRectF(this.#memory);
    const hasRect = this.#module._FPDFLink_GetAnnotRect(linkHandle, rect.ptr);

    let bounds: Rect;
    if (hasRect) {
      bounds = { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
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
    const type = fromNative(actionTypeMap.fromNative, typeValue, ActionType.Unsupported);

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
    return getWasmStringUTF8(this.#memory, (buf, len) =>
      this.#module._FPDFAction_GetURIPath(this.#documentHandle, actionHandle, buf, len),
    );
  }

  /**
   * Get the file path from a Launch or RemoteGoTo action.
   */
  #getActionFilePath(actionHandle: ActionHandle): string | undefined {
    return getWasmStringUTF8(this.#memory, (buf, len) => this.#module._FPDFAction_GetFilePath(actionHandle, buf, len));
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
    const fitType = fromNative(destinationFitTypeMap.fromNative, fitTypeValue, DestinationFitType.Unknown);

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
      destination.x = this.#memory.readFloat32(xPtr.ptr);
    }
    if (hasY) {
      destination.y = this.#memory.readFloat32(yPtr.ptr);
    }
    if (hasZoom) {
      destination.zoom = this.#memory.readFloat32(zoomPtr.ptr);
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
   * @throws {PageError} If the device coordinates are not finite numbers
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
      toNative(pageRotationMap.toNative, context.rotate),
      deviceX,
      deviceY,
      pageXPtr.ptr,
      pageYPtr.ptr,
    );

    return {
      x: this.#memory.readFloat64(pageXPtr.ptr),
      y: this.#memory.readFloat64(pageYPtr.ptr),
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
   * @throws {PageError} If the page coordinates are not finite numbers
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
      toNative(pageRotationMap.toNative, context.rotate),
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

    this.#module._FORM_DoPageAAction(
      this.#pageHandle,
      this.#formHandle,
      toNative(pageActionTypeMap.toNative, actionType),
    );
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
