/**
 * Core PDFium WASM bindings for library initialisation, document, and page operations.
 *
 * @module wasm/bindings/core
 */

import type { DocumentHandle, PageHandle, WASMPointer } from '../../internal/handles.js';

/**
 * Core WASM bindings for library init, document, and page operations.
 */
export interface CoreBindings {
  // Library initialisation
  _FPDF_InitLibraryWithConfig: (config: WASMPointer) => void;
  _FPDF_DestroyLibrary: () => void;
  _FPDF_GetLastError: () => number;

  // Document operations
  _FPDF_LoadMemDocument: (documentPtr: WASMPointer, documentSize: number, passwordPtr: WASMPointer) => DocumentHandle;
  _FPDF_CloseDocument: (document: DocumentHandle) => void;
  _FPDF_GetPageCount: (document: DocumentHandle) => number;
  _FPDF_CreateNewDocument: () => DocumentHandle;

  // Page operations
  _FPDF_LoadPage: (document: DocumentHandle, pageIndex: number) => PageHandle;
  _FPDF_ClosePage: (page: PageHandle) => void;
  _FPDF_GetPageWidth: (page: PageHandle) => number;
  _FPDF_GetPageHeight: (page: PageHandle) => number;

  // Page rotation
  _FPDFPage_GetRotation: (page: PageHandle) => number;
  _FPDFPage_SetRotation: (page: PageHandle, rotate: number) => void;

  // Page creation
  _FPDFPage_New: (document: DocumentHandle, pageIndex: number, width: number, height: number) => PageHandle;
  _FPDFPage_Delete: (document: DocumentHandle, pageIndex: number) => void;
  _FPDFPage_GenerateContent: (page: PageHandle) => number;
  _FPDFPage_HasTransparency: (page: PageHandle) => number;
  _FPDFPage_Flatten: (page: PageHandle, flag: number) => number;

  // Coordinate conversion
  _FPDF_DeviceToPage: (
    page: PageHandle,
    startX: number,
    startY: number,
    sizeX: number,
    sizeY: number,
    rotate: number,
    deviceX: number,
    deviceY: number,
    pageX: WASMPointer,
    pageY: WASMPointer,
  ) => number;

  _FPDF_PageToDevice: (
    page: PageHandle,
    startX: number,
    startY: number,
    sizeX: number,
    sizeY: number,
    rotate: number,
    pageX: number,
    pageY: number,
    deviceX: WASMPointer,
    deviceY: WASMPointer,
  ) => number;
}
