/**
 * Digital signature WASM bindings.
 *
 * @module wasm/bindings/signature
 */

import type { DocumentHandle, SignatureHandle, WASMPointer } from '../../internal/handles.js';

/**
 * Digital signature WASM bindings.
 */
export interface SignatureBindings {
  // Digital signature operations
  _FPDF_GetSignatureCount: (document: DocumentHandle) => number;
  _FPDF_GetSignatureObject: (document: DocumentHandle, index: number) => SignatureHandle;
  _FPDFSignatureObj_GetContents: (signature: SignatureHandle, buffer: WASMPointer, length: number) => number;
  _FPDFSignatureObj_GetByteRange: (signature: SignatureHandle, buffer: WASMPointer, length: number) => number;
  _FPDFSignatureObj_GetSubFilter: (signature: SignatureHandle, buffer: WASMPointer, length: number) => number;
  _FPDFSignatureObj_GetReason: (signature: SignatureHandle, buffer: WASMPointer, length: number) => number;
  _FPDFSignatureObj_GetTime: (signature: SignatureHandle, buffer: WASMPointer, length: number) => number;
  _FPDFSignatureObj_GetDocMDPPermission: (signature: SignatureHandle) => number;
}
