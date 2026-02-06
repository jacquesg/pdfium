/**
 * Annotation implementation for PDFiumPage.
 *
 * @module document/page_impl/annotations
 * @internal
 */

import { PageError, PDFiumErrorCode } from '../../core/errors.js';
import {
  type Annotation,
  type AnnotationBorder,
  type AnnotationFlags,
  AnnotationType,
  type Colour,
  type ExtendedAnnotation,
  type FormFieldFlags,
  FormFieldType,
  type PageBox,
  type QuadPoints,
  type WidgetAnnotation,
  type WidgetOption,
} from '../../core/types.js';
import { NULL_ANNOT, SIZEOF_FLOAT } from '../../internal/constants.js';
import { annotationTypeMap, formFieldTypeMap, fromNative, toBitflags, toNative } from '../../internal/enum-maps.js';
import type { AnnotationHandle, FormHandle, PageHandle, WASMPointer } from '../../internal/handles.js';
import { NativeHandle } from '../../wasm/allocation.js';
import type { PDFiumWASM } from '../../wasm/bindings/index.js';
import { encodeUTF16LE, ptrOffset, textEncoder, type WASMMemoryManager } from '../../wasm/memory.js';
import { FSRectF } from '../../wasm/structs.js';
import { getWasmStringUTF16LE } from '../../wasm/utils.js';

export function getAnnotation(
  module: PDFiumWASM,
  memory: WASMMemoryManager,
  pageHandle: PageHandle,
  index: number,
): Annotation {
  if (!Number.isSafeInteger(index)) {
    throw new PageError(
      PDFiumErrorCode.PAGE_INDEX_OUT_OF_RANGE,
      `Annotation index must be a safe integer, got ${index}`,
    );
  }

  const count = module._FPDFPage_GetAnnotCount(pageHandle);
  if (index < 0 || index >= count) {
    throw new PageError(
      PDFiumErrorCode.ANNOT_INDEX_OUT_OF_RANGE,
      `Annotation index ${index} out of range [0, ${count})`,
    );
  }

  const handle = module._FPDFPage_GetAnnot(pageHandle, index);
  if (handle === NULL_ANNOT) {
    throw new PageError(PDFiumErrorCode.ANNOT_LOAD_FAILED, `Failed to load annotation ${index}`);
  }

  using _annot = new NativeHandle<AnnotationHandle>(handle, (h) => module._FPDFPage_CloseAnnot(h));
  return readAnnotation(module, memory, handle, index);
}

export function getAnnotations(module: PDFiumWASM, memory: WASMMemoryManager, pageHandle: PageHandle): Annotation[] {
  const count = module._FPDFPage_GetAnnotCount(pageHandle);
  const annotations: Annotation[] = [];

  for (let i = 0; i < count; i++) {
    const handle = module._FPDFPage_GetAnnot(pageHandle, i);
    if (handle === NULL_ANNOT) {
      continue;
    }
    {
      using _annot = new NativeHandle<AnnotationHandle>(handle, (h) => module._FPDFPage_CloseAnnot(h));
      annotations.push(readAnnotation(module, memory, handle, i));
    }
  }

  return annotations;
}

export function getExtendedAnnotation(
  module: PDFiumWASM,
  memory: WASMMemoryManager,
  pageHandle: PageHandle,
  index: number,
): ExtendedAnnotation {
  if (!Number.isSafeInteger(index)) {
    throw new PageError(PDFiumErrorCode.PAGE_INDEX_OUT_OF_RANGE, `Index ${index}`);
  }
  const count = module._FPDFPage_GetAnnotCount(pageHandle);
  if (index < 0 || index >= count) {
    throw new PageError(PDFiumErrorCode.ANNOT_INDEX_OUT_OF_RANGE, `Index ${index}`);
  }
  const handle = module._FPDFPage_GetAnnot(pageHandle, index);
  if (handle === NULL_ANNOT) {
    throw new PageError(PDFiumErrorCode.ANNOT_LOAD_FAILED, `Failed to load annotation ${index}`);
  }

  using _annot = new NativeHandle<AnnotationHandle>(handle, (h) => module._FPDFPage_CloseAnnot(h));
  return readExtendedAnnotation(module, memory, handle, index);
}

export function getExtendedAnnotations(
  module: PDFiumWASM,
  memory: WASMMemoryManager,
  pageHandle: PageHandle,
): ExtendedAnnotation[] {
  const count = module._FPDFPage_GetAnnotCount(pageHandle);
  const annotations: ExtendedAnnotation[] = [];

  for (let i = 0; i < count; i++) {
    const handle = module._FPDFPage_GetAnnot(pageHandle, i);
    if (handle === NULL_ANNOT) {
      continue;
    }
    {
      using _annot = new NativeHandle<AnnotationHandle>(handle, (h) => module._FPDFPage_CloseAnnot(h));
      annotations.push(readExtendedAnnotation(module, memory, handle, i));
    }
  }
  return annotations;
}

export function getWidgetAnnotation(
  module: PDFiumWASM,
  memory: WASMMemoryManager,
  pageHandle: PageHandle,
  formHandle: FormHandle,
  index: number,
): WidgetAnnotation | undefined {
  if (!Number.isSafeInteger(index)) {
    throw new PageError(PDFiumErrorCode.PAGE_INDEX_OUT_OF_RANGE, `Index ${index}`);
  }
  const count = module._FPDFPage_GetAnnotCount(pageHandle);
  if (index < 0 || index >= count) {
    throw new PageError(
      PDFiumErrorCode.ANNOT_INDEX_OUT_OF_RANGE,
      `Annotation index ${index} out of range [0, ${count})`,
    );
  }

  const handle = module._FPDFPage_GetAnnot(pageHandle, index);
  if (handle === NULL_ANNOT) return undefined;

  using _annot = new NativeHandle<AnnotationHandle>(handle, (h) => module._FPDFPage_CloseAnnot(h));
  const rawType = module._FPDFAnnot_GetSubtype(handle);
  if (rawType !== 20 /* Widget */) return undefined;

  return readWidgetAnnotation(module, memory, handle, formHandle, index);
}

export function getWidgetAnnotations(
  module: PDFiumWASM,
  memory: WASMMemoryManager,
  pageHandle: PageHandle,
  formHandle: FormHandle,
): WidgetAnnotation[] {
  const count = module._FPDFPage_GetAnnotCount(pageHandle);
  const widgets: WidgetAnnotation[] = [];

  for (let i = 0; i < count; i++) {
    const handle = module._FPDFPage_GetAnnot(pageHandle, i);
    if (handle === NULL_ANNOT) continue;
    {
      using _annot = new NativeHandle<AnnotationHandle>(handle, (h) => module._FPDFPage_CloseAnnot(h));
      const rawType = module._FPDFAnnot_GetSubtype(handle);
      if (rawType === 20 /* Widget */) {
        widgets.push(readWidgetAnnotation(module, memory, handle, formHandle, i));
      }
    }
  }
  return widgets;
}

function readAnnotation(
  module: PDFiumWASM,
  memory: WASMMemoryManager,
  handle: AnnotationHandle,
  index: number,
): Annotation {
  const rawType = module._FPDFAnnot_GetSubtype(handle);
  const type: AnnotationType = fromNative(annotationTypeMap.fromNative, rawType, AnnotationType.Unknown);
  const bounds = readAnnotationRect(module, memory, handle);
  const colour = readAnnotationColour(module, memory, handle);

  return { index, type, bounds, colour: colour ?? null };
}

function readAnnotationRect(
  module: PDFiumWASM,
  memory: WASMMemoryManager,
  handle: AnnotationHandle,
): { left: number; top: number; right: number; bottom: number } {
  using rect = new FSRectF(memory);
  const success = module._FPDFAnnot_GetRect(handle, rect.ptr);
  if (!success) {
    return { left: 0, top: 0, right: 0, bottom: 0 };
  }

  return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
}

function readAnnotationColour(
  module: PDFiumWASM,
  memory: WASMMemoryManager,
  handle: AnnotationHandle,
): Colour | undefined {
  using colourBuf = memory.alloc(4 * SIZEOF_FLOAT);
  const rPtr = ptrOffset(colourBuf.ptr, 0);
  const gPtr = ptrOffset(colourBuf.ptr, 4);
  const bPtr = ptrOffset(colourBuf.ptr, 8);
  const aPtr = ptrOffset(colourBuf.ptr, 12);

  const success = module._FPDFAnnot_GetColor(handle, 0, rPtr, gPtr, bPtr, aPtr);
  if (!success) {
    return undefined;
  }

  return {
    r: memory.readInt32(rPtr),
    g: memory.readInt32(gPtr),
    b: memory.readInt32(bPtr),
    a: memory.readInt32(aPtr),
  };
}

function readExtendedAnnotation(
  module: PDFiumWASM,
  memory: WASMMemoryManager,
  handle: AnnotationHandle,
  index: number,
): ExtendedAnnotation {
  const base = readAnnotation(module, memory, handle, index);
  const flags = getAnnotationFlags(module, handle);
  const contents = getAnnotationStringValue(module, memory, handle, 'Contents');
  const author = getAnnotationStringValue(module, memory, handle, 'T');
  const modificationDate = getAnnotationStringValue(module, memory, handle, 'M');
  const creationDate = getAnnotationStringValue(module, memory, handle, 'CreationDate');

  return {
    ...base,
    flags,
    ...(contents !== undefined ? { contents } : {}),
    ...(author !== undefined ? { author } : {}),
    ...(modificationDate !== undefined ? { modificationDate } : {}),
    ...(creationDate !== undefined ? { creationDate } : {}),
  };
}

function getAnnotationFlags(module: PDFiumWASM, handle: AnnotationHandle): AnnotationFlags {
  return toBitflags<AnnotationFlags>(module._FPDFAnnot_GetFlags(handle));
}

function getAnnotationStringValue(
  module: PDFiumWASM,
  memory: WASMMemoryManager,
  handle: AnnotationHandle,
  key: string,
): string | undefined {
  using keyBuffer = memory.allocString(key);
  return getWasmStringUTF16LE(memory, (buf, len) => module._FPDFAnnot_GetStringValue(handle, keyBuffer.ptr, buf, len));
}

function readWidgetAnnotation(
  module: PDFiumWASM,
  memory: WASMMemoryManager,
  handle: AnnotationHandle,
  formHandle: FormHandle,
  index: number,
): WidgetAnnotation {
  const extended = readExtendedAnnotation(module, memory, handle, index);
  const fieldType = getFormFieldType(module, formHandle, handle);
  const fieldName = getFormFieldName(module, memory, formHandle, handle);
  const alternateName = getFormFieldAlternateName(module, memory, formHandle, handle);
  const fieldValue = getFormFieldValue(module, memory, formHandle, handle);
  const fieldFlags = getFormFieldFlags(module, formHandle, handle);
  const options = getFormFieldOptions(module, memory, formHandle, handle, fieldType);

  return {
    ...extended,
    fieldType,
    fieldFlags,
    ...(fieldName !== undefined ? { fieldName } : {}),
    ...(alternateName !== undefined ? { alternateName } : {}),
    ...(fieldValue !== undefined ? { fieldValue } : {}),
    ...(options !== undefined && options.length > 0 ? { options } : {}),
  };
}

function getFormFieldType(module: PDFiumWASM, formHandle: FormHandle, handle: AnnotationHandle): FormFieldType {
  const raw = module._FPDFAnnot_GetFormFieldType(formHandle, handle);
  return fromNative(formFieldTypeMap.fromNative, raw, FormFieldType.Unknown);
}

function getFormFieldFlags(module: PDFiumWASM, formHandle: FormHandle, handle: AnnotationHandle): FormFieldFlags {
  return toBitflags<FormFieldFlags>(module._FPDFAnnot_GetFormFieldFlags(formHandle, handle));
}

function getFormFieldName(
  module: PDFiumWASM,
  memory: WASMMemoryManager,
  formHandle: FormHandle,
  handle: AnnotationHandle,
): string | undefined {
  return getFormFieldString(memory, module._FPDFAnnot_GetFormFieldName, formHandle, handle);
}

function getFormFieldAlternateName(
  module: PDFiumWASM,
  memory: WASMMemoryManager,
  formHandle: FormHandle,
  handle: AnnotationHandle,
): string | undefined {
  return getFormFieldString(memory, module._FPDFAnnot_GetFormFieldAlternateName, formHandle, handle);
}

function getFormFieldValue(
  module: PDFiumWASM,
  memory: WASMMemoryManager,
  formHandle: FormHandle,
  handle: AnnotationHandle,
): string | undefined {
  return getFormFieldString(memory, module._FPDFAnnot_GetFormFieldValue, formHandle, handle);
}

function getFormFieldString(
  memory: WASMMemoryManager,
  fn: (form: FormHandle, annot: AnnotationHandle, buffer: WASMPointer, buflen: number) => number,
  formHandle: FormHandle,
  handle: AnnotationHandle,
): string | undefined {
  return getWasmStringUTF16LE(memory, (buf, len) => fn(formHandle, handle, buf, len));
}

function getFormFieldOptions(
  module: PDFiumWASM,
  memory: WASMMemoryManager,
  formHandle: FormHandle,
  handle: AnnotationHandle,
  fieldType: FormFieldType,
): WidgetOption[] | undefined {
  if (fieldType !== FormFieldType.ComboBox && fieldType !== FormFieldType.ListBox) {
    return undefined;
  }

  const count = module._FPDFAnnot_GetOptionCount(formHandle, handle);
  if (count <= 0) {
    return undefined;
  }

  const options = new Array<WidgetOption>(count);
  for (let i = 0; i < count; i++) {
    const label = getOptionLabel(module, memory, formHandle, handle, i);
    const selected = module._FPDFAnnot_IsOptionSelected(formHandle, handle, i) !== 0;
    options[i] = { index: i, label: label ?? '', selected };
  }

  return options;
}

function getOptionLabel(
  module: PDFiumWASM,
  memory: WASMMemoryManager,
  formHandle: FormHandle,
  handle: AnnotationHandle,
  optionIndex: number,
): string | undefined {
  const fn = module._FPDFAnnot_GetOptionLabel;
  return getWasmStringUTF16LE(memory, (buf, len) => fn(formHandle, handle, optionIndex, buf, len));
}

// ─────────────────────────────────────────────────────────────────────────
// Annotation Modification
// ─────────────────────────────────────────────────────────────────────────

export function createAnnotation(
  module: PDFiumWASM,
  pageHandle: PageHandle,
  type: AnnotationType,
): AnnotationHandle | null {
  const handle = module._FPDFPage_CreateAnnot(pageHandle, toNative(annotationTypeMap.toNative, type));
  return handle === NULL_ANNOT ? null : handle;
}

export function closeAnnotation(module: PDFiumWASM, handle: AnnotationHandle): void {
  module._FPDFPage_CloseAnnot(handle);
}

export function removeAnnotation(module: PDFiumWASM, pageHandle: PageHandle, index: number): boolean {
  return module._FPDFPage_RemoveAnnot(pageHandle, index) !== 0;
}

export function setAnnotationColour(
  module: PDFiumWASM,
  pageHandle: PageHandle,
  index: number,
  colour: Colour,
  colourType: number = 0,
): boolean {
  const handle = module._FPDFPage_GetAnnot(pageHandle, index);
  if (handle === NULL_ANNOT) {
    return false;
  }

  using _annot = new NativeHandle<AnnotationHandle>(handle, (h) => module._FPDFPage_CloseAnnot(h));
  return module._FPDFAnnot_SetColor(handle, colourType, colour.r, colour.g, colour.b, colour.a) !== 0;
}

export function setAnnotationRect(
  module: PDFiumWASM,
  memory: WASMMemoryManager,
  pageHandle: PageHandle,
  index: number,
  bounds: PageBox,
): boolean {
  const handle = module._FPDFPage_GetAnnot(pageHandle, index);
  if (handle === NULL_ANNOT) {
    return false;
  }

  using _annot = new NativeHandle<AnnotationHandle>(handle, (h) => module._FPDFPage_CloseAnnot(h));

  using rect = new FSRectF(memory);
  rect.left = bounds.left;
  rect.top = bounds.top;
  rect.right = bounds.right;
  rect.bottom = bounds.bottom;

  return module._FPDFAnnot_SetRect(handle, rect.ptr) !== 0;
}

export function setAnnotationFlags(
  module: PDFiumWASM,
  pageHandle: PageHandle,
  index: number,
  flags: AnnotationFlags,
): boolean {
  const handle = module._FPDFPage_GetAnnot(pageHandle, index);
  if (handle === NULL_ANNOT) {
    return false;
  }

  using _annot = new NativeHandle<AnnotationHandle>(handle, (h) => module._FPDFPage_CloseAnnot(h));
  return module._FPDFAnnot_SetFlags(handle, flags) !== 0;
}

export function setAnnotationStringValue(
  module: PDFiumWASM,
  memory: WASMMemoryManager,
  pageHandle: PageHandle,
  index: number,
  key: string,
  value: string,
): boolean {
  const handle = module._FPDFPage_GetAnnot(pageHandle, index);
  if (handle === NULL_ANNOT) {
    return false;
  }

  using _annot = new NativeHandle<AnnotationHandle>(handle, (h) => module._FPDFPage_CloseAnnot(h));

  // Encode key as ASCII
  const keyBytes = textEncoder.encode(`${key}\0`);
  using keyBuffer = memory.alloc(keyBytes.length);
  memory.heapU8.set(keyBytes, keyBuffer.ptr);

  // Encode value as UTF-16LE
  const valueBytes = encodeUTF16LE(value);
  using valueBuffer = memory.allocFrom(valueBytes);

  return module._FPDFAnnot_SetStringValue(handle, keyBuffer.ptr, valueBuffer.ptr) !== 0;
}

export function setAnnotationBorder(
  module: PDFiumWASM,
  pageHandle: PageHandle,
  index: number,
  border: AnnotationBorder,
): boolean {
  const handle = module._FPDFPage_GetAnnot(pageHandle, index);
  if (handle === NULL_ANNOT) {
    return false;
  }

  using _annot = new NativeHandle<AnnotationHandle>(handle, (h) => module._FPDFPage_CloseAnnot(h));
  return module._FPDFAnnot_SetBorder(handle, border.horizontalRadius, border.verticalRadius, border.borderWidth) !== 0;
}

export function setAnnotationAttachmentPoints(
  module: PDFiumWASM,
  memory: WASMMemoryManager,
  pageHandle: PageHandle,
  index: number,
  quadIndex: number,
  quadPoints: QuadPoints,
): boolean {
  const handle = module._FPDFPage_GetAnnot(pageHandle, index);
  if (handle === NULL_ANNOT) {
    return false;
  }

  using _annot = new NativeHandle<AnnotationHandle>(handle, (h) => module._FPDFPage_CloseAnnot(h));

  // FS_QUADPOINTSF has 8 floats
  using quadBuf = memory.alloc(32);
  const floatView = new Float32Array(memory.heapU8.buffer, quadBuf.ptr, 8);
  floatView[0] = quadPoints.x1;
  floatView[1] = quadPoints.y1;
  floatView[2] = quadPoints.x2;
  floatView[3] = quadPoints.y2;
  floatView[4] = quadPoints.x3;
  floatView[5] = quadPoints.y3;
  floatView[6] = quadPoints.x4;
  floatView[7] = quadPoints.y4;

  return module._FPDFAnnot_SetAttachmentPoints(handle, quadIndex, quadBuf.ptr) !== 0;
}

export function appendAnnotationAttachmentPoints(
  module: PDFiumWASM,
  memory: WASMMemoryManager,
  pageHandle: PageHandle,
  index: number,
  quadPoints: QuadPoints,
): boolean {
  const handle = module._FPDFPage_GetAnnot(pageHandle, index);
  if (handle === NULL_ANNOT) {
    return false;
  }

  using _annot = new NativeHandle<AnnotationHandle>(handle, (h) => module._FPDFPage_CloseAnnot(h));

  using quadBuf = memory.alloc(32);
  const floatView = new Float32Array(memory.heapU8.buffer, quadBuf.ptr, 8);
  floatView[0] = quadPoints.x1;
  floatView[1] = quadPoints.y1;
  floatView[2] = quadPoints.x2;
  floatView[3] = quadPoints.y2;
  floatView[4] = quadPoints.x3;
  floatView[5] = quadPoints.y3;
  floatView[6] = quadPoints.x4;
  floatView[7] = quadPoints.y4;

  return module._FPDFAnnot_AppendAttachmentPoints(handle, quadBuf.ptr) !== 0;
}
