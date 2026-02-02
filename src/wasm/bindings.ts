/**
 * Type-safe PDFium WASM bindings.
 *
 * @module wasm/bindings
 */

import type {
  AnnotationHandle,
  AttachmentHandle,
  AvailabilityHandle,
  BitmapHandle,
  BookmarkHandle,
  DestinationHandle,
  DocumentHandle,
  FontHandle,
  FormHandle,
  PageHandle,
  PageObjectHandle,
  SearchHandle,
  StructElementHandle,
  StructTreeHandle,
  TextPageHandle,
  WASMPointer,
} from '../core/types.js';

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
  _FPDF_LoadMemDocument: (documentPtr: WASMPointer, documentSize: number, passwordPtr: WASMPointer) => DocumentHandle;
  _FPDF_CloseDocument: (document: DocumentHandle) => void;
  _FPDF_GetPageCount: (document: DocumentHandle) => number;

  // Page operations
  _FPDF_LoadPage: (document: DocumentHandle, pageIndex: number) => PageHandle;
  _FPDF_ClosePage: (page: PageHandle) => void;
  _FPDF_GetPageWidth: (page: PageHandle) => number;
  _FPDF_GetPageHeight: (page: PageHandle) => number;

  // Page rotation
  _FPDFPage_GetRotation: (page: PageHandle) => number;

  // Page object operations
  _FPDFPage_CountObjects: (page: PageHandle) => number;
  _FPDFPage_GetObject: (page: PageHandle, index: number) => PageObjectHandle;
  _FPDFPageObj_GetType: (object: PageObjectHandle) => number;

  // Image object operations
  _FPDFImageObj_GetBitmap: (object: PageObjectHandle) => BitmapHandle;
  _FPDFImageObj_GetImageDataRaw: (object: PageObjectHandle, buffer: WASMPointer, length: number) => number;
  _FPDFImageObj_GetImagePixelSize: (
    object: PageObjectHandle,
    widthPtr: WASMPointer,
    heightPtr: WASMPointer,
  ) => number;
  _FPDFImageObj_GetImageFilterCount: (object: PageObjectHandle) => number;
  _FPDFImageObj_GetImageFilter: (
    object: PageObjectHandle,
    index: number,
    buffer: WASMPointer,
    length: number,
  ) => number;
  _FPDFImageObj_GetRenderedBitmap: (
    document: DocumentHandle,
    page: PageHandle,
    object: PageObjectHandle,
  ) => BitmapHandle;

  // Text operations
  _FPDFText_LoadPage: (page: PageHandle) => TextPageHandle;
  _FPDFText_ClosePage: (textPage: TextPageHandle) => void;
  _FPDFText_CountChars: (textPage: TextPageHandle) => number;
  _FPDFText_GetText: (textPage: TextPageHandle, startIndex: number, count: number, buffer: WASMPointer) => number;

  // Text search operations
  _FPDFText_FindStart: (textPage: TextPageHandle, findWhat: WASMPointer, flags: number, startIndex: number) => SearchHandle;
  _FPDFText_FindNext: (handle: SearchHandle) => number;
  _FPDFText_FindPrev: (handle: SearchHandle) => number;
  _FPDFText_FindClose: (handle: SearchHandle) => void;
  _FPDFText_GetSchResultIndex: (handle: SearchHandle) => number;
  _FPDFText_GetSchCount: (handle: SearchHandle) => number;

  // Text position operations
  _FPDFText_CountRects: (textPage: TextPageHandle, startIndex: number, count: number) => number;
  _FPDFText_GetRect: (
    textPage: TextPageHandle,
    rectIndex: number,
    left: WASMPointer,
    top: WASMPointer,
    right: WASMPointer,
    bottom: WASMPointer,
  ) => number;

  // Bookmark operations
  _FPDFBookmark_GetFirstChild: (document: DocumentHandle, bookmark: BookmarkHandle) => BookmarkHandle;
  _FPDFBookmark_GetNextSibling: (document: DocumentHandle, bookmark: BookmarkHandle) => BookmarkHandle;
  _FPDFBookmark_GetTitle: (bookmark: BookmarkHandle, buffer: WASMPointer, bufferLen: number) => number;
  _FPDFBookmark_GetCount: (bookmark: BookmarkHandle) => number;
  _FPDFBookmark_Find: (document: DocumentHandle, title: WASMPointer) => BookmarkHandle;
  _FPDFBookmark_GetDest: (document: DocumentHandle, bookmark: BookmarkHandle) => DestinationHandle;
  _FPDFBookmark_GetAction: (bookmark: BookmarkHandle) => number;
  _FPDFDest_GetDestPageIndex: (document: DocumentHandle, dest: DestinationHandle) => number;

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

  // Form fill operations
  _FPDFDOC_InitFormFillEnvironment: (document: DocumentHandle, formInfo: WASMPointer) => FormHandle;
  _FPDFDOC_ExitFormFillEnvironment: (formHandle: FormHandle) => void;
  _FORM_OnAfterLoadPage: (page: PageHandle, formHandle: FormHandle) => void;
  _FORM_OnBeforeClosePage: (page: PageHandle, formHandle: FormHandle) => void;
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

  // Annotation operations
  _FPDFPage_GetAnnotCount: (page: PageHandle) => number;
  _FPDFPage_GetAnnot: (page: PageHandle, index: number) => AnnotationHandle;
  _FPDFPage_CloseAnnot: (annotation: AnnotationHandle) => void;
  _FPDFAnnot_GetSubtype: (annotation: AnnotationHandle) => number;
  _FPDFAnnot_GetRect: (
    annotation: AnnotationHandle,
    rect: WASMPointer,
  ) => number;
  _FPDFAnnot_GetColor: (
    annotation: AnnotationHandle,
    colourType: number,
    r: WASMPointer,
    g: WASMPointer,
    b: WASMPointer,
    a: WASMPointer,
  ) => number;

  // Structure tree operations
  _FPDF_StructTree_GetForPage: (page: PageHandle) => StructTreeHandle;
  _FPDF_StructTree_Close: (structTree: StructTreeHandle) => void;
  _FPDF_StructTree_CountChildren: (structTree: StructTreeHandle) => number;
  _FPDF_StructTree_GetChildAtIndex: (structTree: StructTreeHandle, index: number) => StructElementHandle;
  _FPDF_StructElement_GetType: (element: StructElementHandle, buffer: WASMPointer, bufferLen: number) => number;
  _FPDF_StructElement_GetAltText: (element: StructElementHandle, buffer: WASMPointer, bufferLen: number) => number;
  _FPDF_StructElement_GetLang: (element: StructElementHandle, buffer: WASMPointer, bufferLen: number) => number;
  _FPDF_StructElement_CountChildren: (element: StructElementHandle) => number;
  _FPDF_StructElement_GetChildAtIndex: (element: StructElementHandle, index: number) => StructElementHandle;

  // Document creation operations
  _FPDF_CreateNewDocument: () => DocumentHandle;
  _FPDFPage_New: (document: DocumentHandle, pageIndex: number, width: number, height: number) => PageHandle;
  _FPDFPage_Delete: (document: DocumentHandle, pageIndex: number) => void;
  _FPDFPage_InsertObject: (page: PageHandle, pageObj: PageObjectHandle) => void;
  _FPDFPage_GenerateContent: (page: PageHandle) => number;

  // Page object creation
  _FPDFPageObj_CreateNewRect: (x: number, y: number, w: number, h: number) => PageObjectHandle;
  _FPDFPageObj_CreateNewPath: (x: number, y: number) => PageObjectHandle;
  _FPDFPageObj_SetFillColor: (obj: PageObjectHandle, r: number, g: number, b: number, a: number) => number;
  _FPDFPageObj_SetStrokeColor: (obj: PageObjectHandle, r: number, g: number, b: number, a: number) => number;
  _FPDFPageObj_SetStrokeWidth: (obj: PageObjectHandle, width: number) => number;
  _FPDFPageObj_Transform: (
    obj: PageObjectHandle,
    a: number,
    b: number,
    c: number,
    d: number,
    e: number,
    f: number,
  ) => void;

  // Text object creation
  _FPDFText_LoadStandardFont: (document: DocumentHandle, font: WASMPointer) => FontHandle;
  _FPDFText_LoadFont: (
    document: DocumentHandle,
    data: WASMPointer,
    size: number,
    fontType: number,
    cid: number,
  ) => FontHandle;
  _FPDFPageObj_CreateTextObj: (document: DocumentHandle, font: FontHandle, fontSize: number) => PageObjectHandle;
  _FPDFText_SetText: (textObj: PageObjectHandle, text: WASMPointer) => number;
  _FPDFFont_Close: (font: FontHandle) => void;

  // Progressive loading / availability operations
  _FPDFAvail_Create: (fileAvail: WASMPointer, fileAccess: WASMPointer) => AvailabilityHandle;
  _FPDFAvail_Destroy: (avail: AvailabilityHandle) => void;
  _FPDFAvail_IsDocAvail: (avail: AvailabilityHandle, hints: WASMPointer) => number;
  _FPDFAvail_GetDocument: (avail: AvailabilityHandle, password: WASMPointer) => DocumentHandle;
  _FPDFAvail_GetFirstPageNum: (document: DocumentHandle) => number;
  _FPDFAvail_IsPageAvail: (avail: AvailabilityHandle, pageIndex: number, hints: WASMPointer) => number;
  _FPDFAvail_IsLinearized: (avail: AvailabilityHandle) => number;
  _FPDFAvail_IsFormAvail: (avail: AvailabilityHandle, hints: WASMPointer) => number;
  _FPDF_LoadCustomDocument: (fileAccess: WASMPointer, password: WASMPointer) => DocumentHandle;

  // Save operations
  _FPDF_SaveAsCopy: (document: DocumentHandle, fileWrite: WASMPointer, flags: number) => number;
  _FPDF_SaveWithVersion: (
    document: DocumentHandle,
    fileWrite: WASMPointer,
    flags: number,
    fileVersion: number,
  ) => number;

  // Attachment operations
  _FPDFDoc_GetAttachmentCount: (document: DocumentHandle) => number;
  _FPDFDoc_GetAttachment: (document: DocumentHandle, index: number) => AttachmentHandle;
  _FPDFAttachment_GetName: (attachment: AttachmentHandle, buffer: WASMPointer, bufferLen: number) => number;
  _FPDFAttachment_GetFile: (
    attachment: AttachmentHandle,
    buffer: WASMPointer,
    bufferLen: number,
    outLen: WASMPointer,
  ) => number;

  // Memory management
  wasmExports: {
    malloc: (size: number) => number;
    free: (ptr: number) => void;
  };

  // Emscripten runtime callback management
  addFunction: (func: (...args: number[]) => number, signature: string) => number;
  removeFunction: (funcPtr: number) => void;

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
