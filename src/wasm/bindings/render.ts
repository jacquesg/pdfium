/**
 * Rendering and bitmap WASM bindings.
 *
 * @module wasm/bindings/render
 */

import type { BitmapHandle, FormHandle, PageHandle, WASMPointer } from '../../internal/handles.js';

/**
 * Rendering and bitmap WASM bindings.
 */
export interface RenderBindings {
  // Bitmap operations
  _FPDFBitmap_CreateEx: (
    width: number,
    height: number,
    format: number,
    buffer: WASMPointer,
    stride: number,
  ) => BitmapHandle;
  _FPDFBitmap_FillRect: (
    bitmap: BitmapHandle,
    left: number,
    top: number,
    width: number,
    height: number,
    colour: number,
  ) => void;
  _FPDFBitmap_Destroy: (bitmap: BitmapHandle) => void;
  _FPDFBitmap_GetBuffer: (bitmap: BitmapHandle) => WASMPointer;
  _FPDFBitmap_GetWidth: (bitmap: BitmapHandle) => number;
  _FPDFBitmap_GetHeight: (bitmap: BitmapHandle) => number;
  _FPDFBitmap_GetStride: (bitmap: BitmapHandle) => number;
  _FPDFBitmap_GetFormat: (bitmap: BitmapHandle) => number;

  // Render operations
  _FPDF_RenderPageBitmap: (
    bitmap: BitmapHandle,
    page: PageHandle,
    startX: number,
    startY: number,
    sizeX: number,
    sizeY: number,
    rotate: number,
    flags: number,
  ) => void;

  /**
   * Render a page to a bitmap using a transformation matrix and clipping rectangle.
   *
   * @param bitmap - Target bitmap
   * @param page - Page to render
   * @param matrix - Pointer to FS_MATRIX struct (6 floats: a, b, c, d, e, f)
   * @param clipping - Pointer to FS_RECTF struct (4 floats: left, bottom, right, top)
   * @param flags - Render flags
   */
  _FPDF_RenderPageBitmapWithMatrix: (
    bitmap: BitmapHandle,
    page: PageHandle,
    matrix: WASMPointer,
    clipping: WASMPointer,
    flags: number,
  ) => void;

  // Form fill drawing
  _FPDF_FFLDraw: (
    formHandle: FormHandle,
    bitmap: BitmapHandle,
    page: PageHandle,
    startX: number,
    startY: number,
    sizeX: number,
    sizeY: number,
    rotate: number,
    flags: number,
  ) => void;

  // Thumbnail operations
  _FPDFPage_GetThumbnailAsBitmap: (page: PageHandle) => BitmapHandle;
  _FPDFPage_GetDecodedThumbnailData: (page: PageHandle, buffer: WASMPointer, buflen: number) => number;
  _FPDFPage_GetRawThumbnailData: (page: PageHandle, buffer: WASMPointer, buflen: number) => number;

  // Progressive rendering operations
  /**
   * Start progressive rendering of a page.
   *
   * @param bitmap - Target bitmap
   * @param page - Page to render
   * @param startX - Left pixel position of the display area in bitmap
   * @param startY - Top pixel position of the display area in bitmap
   * @param sizeX - Horizontal size (in pixels) of the display area
   * @param sizeY - Vertical size (in pixels) of the display area
   * @param rotate - Page orientation (0=normal, 1=90° CW, 2=180°, 3=90° CCW)
   * @param flags - Render flags
   * @param pause - Pointer to IFSDK_PAUSE struct for pause callback
   * @returns Rendering status: 0=Ready, 1=ToBeContinued, 2=Done, 3=Failed
   */
  _FPDF_RenderPageBitmap_Start: (
    bitmap: BitmapHandle,
    page: PageHandle,
    startX: number,
    startY: number,
    sizeX: number,
    sizeY: number,
    rotate: number,
    flags: number,
    pause: WASMPointer,
  ) => number;

  /**
   * Continue progressive rendering of a page.
   *
   * @param page - Page being rendered
   * @param pause - Pointer to IFSDK_PAUSE struct for pause callback
   * @returns Rendering status: 0=Ready, 1=ToBeContinued, 2=Done, 3=Failed
   */
  _FPDF_RenderPage_Continue: (page: PageHandle, pause: WASMPointer) => number;

  /**
   * Release resources from progressive rendering.
   *
   * @param page - Page that was being rendered
   */
  _FPDF_RenderPage_Close: (page: PageHandle) => void;
}
