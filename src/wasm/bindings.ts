/**
 * Type-safe PDFium WASM bindings.
 *
 * @module wasm/bindings
 */

import type { WASMPointer } from '../core/types.js';

/**
 * PDFium WASM module interface.
 *
 * These are the exported functions from the PDFium WASM binary.
 */
export interface PDFiumWASM {
  // Library initialisation
  _FPDF_InitLibraryWithConfig: (config: WASMPointer) => void;
  _FPDF_DestroyLibrary: () => void;
  _FPDF_GetLastError: () => number;

  // Document operations
  _FPDF_LoadMemDocument: (documentPtr: WASMPointer, documentSize: number, passwordPtr: WASMPointer) => number;
  _FPDF_CloseDocument: (document: number) => void;
  _FPDF_GetPageCount: (document: number) => number;

  // Page operations
  _FPDF_LoadPage: (document: number, pageIndex: number) => number;
  _FPDF_ClosePage: (page: number) => void;
  _FPDF_GetPageWidth: (page: number) => number;
  _FPDF_GetPageHeight: (page: number) => number;

  // Page object operations
  _FPDFPage_CountObjects: (page: number) => number;
  _FPDFPage_GetObject: (page: number, index: number) => number;
  _FPDFPageObj_GetType: (object: number) => number;

  // Image object operations
  _FPDFImageObj_GetBitmap: (object: number) => number;
  _FPDFImageObj_GetImageDataRaw: (object: number, buffer: WASMPointer, length: number) => number;
  _FPDFImageObj_GetImagePixelSize: (object: number, widthPtr: WASMPointer, heightPtr: WASMPointer) => number;
  _FPDFImageObj_GetImageFilterCount: (object: number) => number;
  _FPDFImageObj_GetImageFilter: (object: number, index: number, buffer: WASMPointer, length: number) => number;
  _FPDFImageObj_GetRenderedBitmap: (document: number, page: number, object: number) => number;

  // Text operations
  _FPDFText_LoadPage: (page: number) => number;
  _FPDFText_ClosePage: (textPage: number) => void;
  _FPDFText_CountChars: (textPage: number) => number;
  _FPDFText_GetText: (textPage: number, startIndex: number, count: number, buffer: WASMPointer) => number;

  // Bitmap operations
  _FPDFBitmap_CreateEx: (
    width: number,
    height: number,
    format: number,
    buffer: WASMPointer,
    stride: number,
  ) => number;
  _FPDFBitmap_FillRect: (
    bitmap: number,
    left: number,
    top: number,
    width: number,
    height: number,
    colour: number,
  ) => void;
  _FPDFBitmap_Destroy: (bitmap: number) => void;
  _FPDFBitmap_GetBuffer: (bitmap: number) => WASMPointer;
  _FPDFBitmap_GetWidth: (bitmap: number) => number;
  _FPDFBitmap_GetHeight: (bitmap: number) => number;
  _FPDFBitmap_GetStride: (bitmap: number) => number;
  _FPDFBitmap_GetFormat: (bitmap: number) => number;

  // Render operations
  _FPDF_RenderPageBitmap: (
    bitmap: number,
    page: number,
    startX: number,
    startY: number,
    sizeX: number,
    sizeY: number,
    rotate: number,
    flags: number,
  ) => void;

  // Form fill operations
  _FPDFDOC_InitFormFillEnvironment: (document: number, formInfo: WASMPointer) => number;
  _FPDFDOC_ExitFormFillEnvironment: (formHandle: number) => void;
  _FORM_OnAfterLoadPage: (page: number, formHandle: number) => void;
  _FORM_OnBeforeClosePage: (page: number, formHandle: number) => void;
  _FPDF_FFLDraw: (
    formHandle: number,
    bitmap: number,
    page: number,
    startX: number,
    startY: number,
    sizeX: number,
    sizeY: number,
    rotate: number,
    flags: number,
  ) => void;

  // Memory management
  wasmExports: {
    malloc: (size: number) => number;
    free: (ptr: number) => void;
  };

  // Heap views
  HEAPU8: Uint8Array;
  HEAP32: Int32Array;
}

/**
 * Options for loading the WASM module.
 */
export interface WASMLoadOptions {
  /** Pre-loaded WASM binary */
  wasmBinary?: ArrayBuffer;
  /** Custom locateFile function for finding WASM */
  locateFile?: (path: string) => string;
  /** Custom instantiateWasm function */
  instantiateWasm?: (
    imports: WebAssembly.Imports,
    successCallback: (module: WebAssembly.Module) => void,
  ) => WebAssembly.Exports;
}

/**
 * PDFium error codes from FPDF_GetLastError.
 */
export enum PDFiumNativeErrorCode {
  SUCCESS = 0,
  UNKNOWN = 1,
  FILE = 2,
  FORMAT = 3,
  PASSWORD = 4,
  SECURITY = 5,
  PAGE = 6,
}

/**
 * Bitmap format constants.
 */
export enum BitmapFormat {
  /** Unknown format */
  Unknown = 0,
  /** Grey scale (1 byte per pixel) */
  Grey = 1,
  /** BGR (3 bytes per pixel) */
  BGR = 2,
  /** BGRx (4 bytes per pixel, x ignored) */
  BGRx = 3,
  /** BGRA (4 bytes per pixel) */
  BGRA = 4,
}

/**
 * Render flags for FPDF_RenderPageBitmap.
 */
export enum RenderFlags {
  /** Normal rendering */
  NONE = 0,
  /** Render annotations */
  ANNOT = 0x01,
  /** Use LCD text rendering */
  LCD_TEXT = 0x02,
  /** Don't use smooth image rendering */
  NO_NATIVETEXT = 0x04,
  /** Grayscale output */
  GRAYSCALE = 0x08,
  /** Render for printing */
  PRINTING = 0x800,
  /** Reverse byte order */
  REVERSE_BYTE_ORDER = 0x10,
}

/**
 * Page object type constants.
 */
export enum PageObjectTypeNative {
  UNKNOWN = 0,
  TEXT = 1,
  PATH = 2,
  IMAGE = 3,
  SHADING = 4,
  FORM = 5,
}
