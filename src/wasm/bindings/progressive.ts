/**
 * Progressive loading and save operations WASM bindings.
 *
 * @module wasm/bindings/progressive
 */

import type { AvailabilityHandle, DocumentHandle, WASMPointer } from '../../internal/handles.js';

/**
 * Progressive loading and save operations WASM bindings.
 */
export interface ProgressiveBindings {
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
}
