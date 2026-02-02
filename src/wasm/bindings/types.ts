/**
 * WASM binding types and enums.
 *
 * @module wasm/bindings/types
 */

/**
 * Options for loading the WASM module.
 */
export interface WASMLoadOptions {
  /** Pre-loaded WASM binary */
  wasmBinary?: ArrayBuffer;
  /** URL to fetch the WASM binary from (browser environments) */
  wasmUrl?: string;
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
