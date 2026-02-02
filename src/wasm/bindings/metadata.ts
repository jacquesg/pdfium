/**
 * Document metadata and viewer preferences WASM bindings.
 *
 * @module wasm/bindings/metadata
 */

import type {
  DestinationHandle,
  DocumentHandle,
  JavaScriptActionHandle,
  PageHandle,
  StructElementHandle,
  StructTreeHandle,
  WASMPointer,
} from '../../internal/handles.js';

/**
 * Document metadata and viewer preferences WASM bindings.
 */
export interface MetadataBindings {
  // Document metadata operations
  _FPDF_GetMetaText: (document: DocumentHandle, tag: WASMPointer, buffer: WASMPointer, bufferLen: number) => number;
  _FPDF_GetFileVersion: (document: DocumentHandle, fileVersion: WASMPointer) => number;
  _FPDF_GetDocPermissions: (document: DocumentHandle) => number;
  _FPDF_GetDocUserPermissions: (document: DocumentHandle) => number;
  _FPDFDoc_GetPageMode: (document: DocumentHandle) => number;
  _FPDF_GetSecurityHandlerRevision: (document: DocumentHandle) => number;
  _FPDF_DocumentHasValidCrossReferenceTable: (document: DocumentHandle) => number;
  _FPDF_GetTrailerEnds: (document: DocumentHandle, buffer: WASMPointer, bufferLen: number) => number;
  _FPDF_GetPageLabel: (document: DocumentHandle, pageIndex: number, buffer: WASMPointer, bufferLen: number) => number;
  _FPDFCatalog_IsTagged: (document: DocumentHandle) => number;

  // Page box operations
  _FPDFPage_GetMediaBox: (
    page: PageHandle,
    left: WASMPointer,
    bottom: WASMPointer,
    right: WASMPointer,
    top: WASMPointer,
  ) => number;
  _FPDFPage_GetCropBox: (
    page: PageHandle,
    left: WASMPointer,
    bottom: WASMPointer,
    right: WASMPointer,
    top: WASMPointer,
  ) => number;
  _FPDFPage_GetBleedBox: (
    page: PageHandle,
    left: WASMPointer,
    bottom: WASMPointer,
    right: WASMPointer,
    top: WASMPointer,
  ) => number;
  _FPDFPage_GetTrimBox: (
    page: PageHandle,
    left: WASMPointer,
    bottom: WASMPointer,
    right: WASMPointer,
    top: WASMPointer,
  ) => number;
  _FPDFPage_GetArtBox: (
    page: PageHandle,
    left: WASMPointer,
    bottom: WASMPointer,
    right: WASMPointer,
    top: WASMPointer,
  ) => number;
  _FPDFPage_SetMediaBox: (page: PageHandle, left: number, bottom: number, right: number, top: number) => void;
  _FPDFPage_SetCropBox: (page: PageHandle, left: number, bottom: number, right: number, top: number) => void;
  _FPDFPage_SetBleedBox: (page: PageHandle, left: number, bottom: number, right: number, top: number) => void;
  _FPDFPage_SetTrimBox: (page: PageHandle, left: number, bottom: number, right: number, top: number) => void;
  _FPDFPage_SetArtBox: (page: PageHandle, left: number, bottom: number, right: number, top: number) => void;
  _FPDFPage_GetPageBoundingBox: (page: PageHandle, rect: WASMPointer) => number;

  // Viewer preferences operations
  _FPDF_VIEWERREF_GetPrintScaling: (document: DocumentHandle) => number;
  _FPDF_VIEWERREF_GetNumCopies: (document: DocumentHandle) => number;
  _FPDF_VIEWERREF_GetPrintPageRange: (document: DocumentHandle) => WASMPointer;
  _FPDF_VIEWERREF_GetPrintPageRangeCount: (pageRange: WASMPointer) => number;
  _FPDF_VIEWERREF_GetPrintPageRangeElement: (pageRange: WASMPointer, index: number) => number;
  _FPDF_VIEWERREF_GetDuplex: (document: DocumentHandle) => number;
  _FPDF_VIEWERREF_GetName: (document: DocumentHandle, key: WASMPointer, buffer: WASMPointer, length: number) => number;
  _FPDF_CountNamedDests: (document: DocumentHandle) => number;
  _FPDF_GetNamedDestByName: (document: DocumentHandle, name: WASMPointer) => DestinationHandle;
  _FPDF_GetNamedDest: (
    document: DocumentHandle,
    index: number,
    buffer: WASMPointer,
    buflen: WASMPointer,
  ) => DestinationHandle;

  // JavaScript inspection operations
  _FPDFDoc_GetJavaScriptActionCount: (document: DocumentHandle) => number;
  _FPDFDoc_GetJavaScriptAction: (document: DocumentHandle, index: number) => JavaScriptActionHandle;
  _FPDFJavaScriptAction_GetName: (javascript: JavaScriptActionHandle, buffer: WASMPointer, buflen: number) => number;
  _FPDFJavaScriptAction_GetScript: (javascript: JavaScriptActionHandle, buffer: WASMPointer, buflen: number) => number;
  _FPDFJavaScriptAction_Close: (javascript: JavaScriptActionHandle) => void;

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
}
