/**
 * Attachment WASM bindings.
 *
 * @module wasm/bindings/attachment
 */

import type { AttachmentHandle, DocumentHandle, WASMPointer } from '../../internal/handles.js';

/**
 * Attachment WASM bindings.
 */
export interface AttachmentBindings {
  // Attachment operations
  _FPDFDoc_GetAttachmentCount: (document: DocumentHandle) => number;
  _FPDFDoc_GetAttachment: (document: DocumentHandle, index: number) => AttachmentHandle;
  _FPDFDoc_AddAttachment: (document: DocumentHandle, name: WASMPointer) => AttachmentHandle;
  _FPDFDoc_DeleteAttachment: (document: DocumentHandle, index: number) => number;
  _FPDFAttachment_GetName: (attachment: AttachmentHandle, buffer: WASMPointer, bufferLen: number) => number;
  _FPDFAttachment_GetFile: (
    attachment: AttachmentHandle,
    buffer: WASMPointer,
    bufferLen: number,
    outLen: WASMPointer,
  ) => number;
  _FPDFAttachment_SetFile: (
    attachment: AttachmentHandle,
    document: DocumentHandle,
    contents: WASMPointer,
    length: number,
  ) => number;
  _FPDFAttachment_HasKey: (attachment: AttachmentHandle, key: WASMPointer) => number;
  _FPDFAttachment_GetValueType: (attachment: AttachmentHandle, key: WASMPointer) => number;
  _FPDFAttachment_GetStringValue: (
    attachment: AttachmentHandle,
    key: WASMPointer,
    buffer: WASMPointer,
    bufferLen: number,
  ) => number;
  _FPDFAttachment_SetStringValue: (attachment: AttachmentHandle, key: WASMPointer, value: WASMPointer) => number;
}
