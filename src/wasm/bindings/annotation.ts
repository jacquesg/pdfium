/**
 * Annotation WASM bindings.
 *
 * @module wasm/bindings/annotation
 */

import type {
  AnnotationHandle,
  FormHandle,
  LinkHandle,
  PageHandle,
  PageObjectHandle,
  WASMPointer,
} from '../../internal/handles.js';

/**
 * Annotation WASM bindings.
 */
export interface AnnotationBindings {
  // Basic annotation operations
  _FPDFPage_GetAnnotCount: (page: PageHandle) => number;
  _FPDFPage_GetAnnot: (page: PageHandle, index: number) => AnnotationHandle;
  _FPDFPage_CloseAnnot: (annotation: AnnotationHandle) => void;
  _FPDFAnnot_GetSubtype: (annotation: AnnotationHandle) => number;
  _FPDFAnnot_GetRect: (annotation: AnnotationHandle, rect: WASMPointer) => number;
  _FPDFAnnot_GetColor: (
    annotation: AnnotationHandle,
    colourType: number,
    r: WASMPointer,
    g: WASMPointer,
    b: WASMPointer,
    a: WASMPointer,
  ) => number;

  // Extended annotation operations
  _FPDFAnnot_GetFlags: (annotation: AnnotationHandle) => number;
  _FPDFAnnot_GetFormFieldFlags: (form: FormHandle, annotation: AnnotationHandle) => number;
  _FPDFAnnot_GetFormFieldType: (form: FormHandle, annotation: AnnotationHandle) => number;
  _FPDFAnnot_GetFormFieldName: (
    form: FormHandle,
    annotation: AnnotationHandle,
    buffer: WASMPointer,
    buflen: number,
  ) => number;
  _FPDFAnnot_GetFormFieldAlternateName: (
    form: FormHandle,
    annotation: AnnotationHandle,
    buffer: WASMPointer,
    buflen: number,
  ) => number;
  _FPDFAnnot_GetFormFieldValue: (
    form: FormHandle,
    annotation: AnnotationHandle,
    buffer: WASMPointer,
    buflen: number,
  ) => number;
  _FPDFAnnot_GetObjectCount: (annotation: AnnotationHandle) => number;
  _FPDFAnnot_GetObject: (annotation: AnnotationHandle, index: number) => PageObjectHandle;
  _FPDFAnnot_GetOptionCount: (form: FormHandle, annotation: AnnotationHandle) => number;
  _FPDFAnnot_GetOptionLabel: (
    form: FormHandle,
    annotation: AnnotationHandle,
    index: number,
    buffer: WASMPointer,
    buflen: number,
  ) => number;
  _FPDFAnnot_IsOptionSelected: (form: FormHandle, annotation: AnnotationHandle, index: number) => number;
  _FPDFAnnot_GetStringValue: (
    annotation: AnnotationHandle,
    key: WASMPointer,
    buffer: WASMPointer,
    buflen: number,
  ) => number;
  _FPDFAnnot_HasKey: (annotation: AnnotationHandle, key: WASMPointer) => number;
  _FPDFAnnot_GetValueType: (annotation: AnnotationHandle, key: WASMPointer) => number;
  _FPDFAnnot_GetVertices: (annotation: AnnotationHandle, buffer: WASMPointer, length: number) => number;
  _FPDFAnnot_GetInkListCount: (annotation: AnnotationHandle) => number;
  _FPDFAnnot_GetInkListPath: (
    annotation: AnnotationHandle,
    pathIndex: number,
    buffer: WASMPointer,
    length: number,
  ) => number;
  _FPDFAnnot_GetLine: (
    annotation: AnnotationHandle,
    startX: WASMPointer,
    startY: WASMPointer,
    endX: WASMPointer,
    endY: WASMPointer,
  ) => number;
  _FPDFAnnot_GetBorder: (
    annotation: AnnotationHandle,
    horizontalRadius: WASMPointer,
    verticalRadius: WASMPointer,
    borderWidth: WASMPointer,
  ) => number;
  _FPDFAnnot_CountAttachmentPoints: (annotation: AnnotationHandle) => number;
  _FPDFAnnot_GetAttachmentPoints: (annotation: AnnotationHandle, index: number, quadPoints: WASMPointer) => number;
  _FPDFAnnot_GetNumberValue: (annotation: AnnotationHandle, key: WASMPointer, value: WASMPointer) => number;
  _FPDFAnnot_GetAP: (
    annotation: AnnotationHandle,
    appearanceMode: number,
    buffer: WASMPointer,
    buflen: number,
  ) => number;

  // Annotation modification operations
  _FPDFAnnot_SetColor: (
    annotation: AnnotationHandle,
    colorType: number,
    r: number,
    g: number,
    b: number,
    a: number,
  ) => number;
  _FPDFAnnot_SetRect: (annotation: AnnotationHandle, rect: WASMPointer) => number;
  _FPDFAnnot_SetFlags: (annotation: AnnotationHandle, flags: number) => number;
  _FPDFAnnot_SetStringValue: (annotation: AnnotationHandle, key: WASMPointer, value: WASMPointer) => number;
  _FPDFAnnot_SetBorder: (
    annotation: AnnotationHandle,
    horizontalRadius: number,
    verticalRadius: number,
    borderWidth: number,
  ) => number;
  _FPDFAnnot_SetAP: (annotation: AnnotationHandle, appearanceMode: number, value: WASMPointer) => number;
  _FPDFAnnot_SetAttachmentPoints: (annotation: AnnotationHandle, quadIndex: number, quadPoints: WASMPointer) => number;
  _FPDFAnnot_AppendAttachmentPoints: (annotation: AnnotationHandle, quadPoints: WASMPointer) => number;
  _FPDFAnnot_RemoveObject: (annotation: AnnotationHandle, index: number) => number;
  _FPDFAnnot_UpdateObject: (annotation: AnnotationHandle, object: PageObjectHandle) => number;
  _FPDFAnnot_AppendObject: (annotation: AnnotationHandle, object: PageObjectHandle) => number;
  _FPDFPage_CreateAnnot: (page: PageHandle, subtype: number) => AnnotationHandle;
  _FPDFPage_RemoveAnnot: (page: PageHandle, index: number) => number;

  // Annotation creation operations
  _FPDFAnnot_IsSupportedSubtype: (subtype: number) => number;
  _FPDFAnnot_IsObjectSupportedSubtype: (subtype: number) => number;
  _FPDFAnnot_AddInkStroke: (annotation: AnnotationHandle, points: WASMPointer, pointCount: number) => number;
  _FPDFAnnot_SetVertices: (annotation: AnnotationHandle, points: WASMPointer, pointCount: number) => number;
  _FPDFAnnot_GetLink: (annotation: AnnotationHandle) => LinkHandle;
  _FPDFAnnot_SetURI: (annotation: AnnotationHandle, uri: WASMPointer) => number;
  _FPDFAnnot_GetFontSize: (form: FormHandle, annotation: AnnotationHandle, value: WASMPointer) => number;
  _FPDFAnnot_GetFocusableSubtypesCount: (form: FormHandle) => number;
  _FPDFAnnot_GetFocusableSubtypes: (form: FormHandle, subtypes: WASMPointer, count: number) => number;
  _FPDFAnnot_SetFocusableSubtypes: (form: FormHandle, subtypes: WASMPointer, count: number) => number;
  _FPDFAnnot_GetFormControlCount: (form: FormHandle, annotation: AnnotationHandle) => number;
  _FPDFAnnot_GetFormControlIndex: (form: FormHandle, annotation: AnnotationHandle) => number;
  _FPDFAnnot_GetFormFieldExportValue: (
    form: FormHandle,
    annotation: AnnotationHandle,
    buffer: WASMPointer,
    buflen: number,
  ) => number;
  _FPDFPage_GetAnnotIndex: (page: PageHandle, annotation: AnnotationHandle) => number;
}
