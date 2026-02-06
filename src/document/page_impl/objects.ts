/**
 * Page Object implementation for PDFiumPage.
 *
 * @module document/page_impl/objects
 * @internal
 */

import {
  type BlendMode,
  type Colour,
  type DashPattern,
  LineCapStyle,
  LineJoinStyle,
  PageObjectMarkValueType,
  PathFillMode,
  PathSegmentType,
  type Point,
  type QuadPoints,
  type TransformMatrix,
} from '../../core/types.js';
import {
  NULL_CLIP_PATH,
  NULL_MARK,
  NULL_PAGE_OBJECT,
  NULL_PATH_SEGMENT,
  UTF16LE_BYTES_PER_CHAR,
  UTF16LE_NULL_TERMINATOR_BYTES,
} from '../../internal/constants.js';
import {
  fromNative,
  lineCapStyleMap,
  lineJoinStyleMap,
  pageObjectMarkValueTypeMap,
  pathFillModeMap,
  pathSegmentTypeMap,
  toNative,
} from '../../internal/enum-maps.js';
import type {
  ClipPathHandle,
  DocumentHandle,
  PageHandle,
  PageObjectHandle,
  PageObjectMarkHandle,
  PathSegmentHandle,
} from '../../internal/handles.js';
import type { PDFiumWASM } from '../../wasm/bindings/index.js';
import { NULL_PTR, ptrOffset, type WASMMemoryManager } from '../../wasm/memory.js';
import { FSMatrix, FSPointF, FSQuadPointsF } from '../../wasm/structs.js';

// ─────────────────────────────────────────────────────────────────────────
// Page Object Manipulation
// ─────────────────────────────────────────────────────────────────────────

export function removePageObject(module: PDFiumWASM, pageHandle: PageHandle, object: PageObjectHandle): boolean {
  return module._FPDFPage_RemoveObject(pageHandle, object) !== 0;
}

export function generateContent(module: PDFiumWASM, pageHandle: PageHandle): boolean {
  return module._FPDFPage_GenerateContent(pageHandle) !== 0;
}

export function pageObjDestroy(module: PDFiumWASM, obj: PageObjectHandle): void {
  module._FPDFPageObj_Destroy(obj);
}

export function pageObjHasTransparency(module: PDFiumWASM, obj: PageObjectHandle): boolean {
  return module._FPDFPageObj_HasTransparency(obj) !== 0;
}

export function pageObjSetBlendMode(
  module: PDFiumWASM,
  memory: WASMMemoryManager,
  obj: PageObjectHandle,
  blendMode: BlendMode,
): void {
  using blendBuf = memory.allocString(blendMode);
  module._FPDFPageObj_SetBlendMode(obj, blendBuf.ptr);
}

export function pageObjNewImage(module: PDFiumWASM, documentHandle: DocumentHandle): PageObjectHandle | null {
  const handle = module._FPDFPageObj_NewImageObj(documentHandle);
  return handle === NULL_PAGE_OBJECT ? null : handle;
}

export function pageObjGetClipPath(module: PDFiumWASM, obj: PageObjectHandle): ClipPathHandle | null {
  const handle = module._FPDFPageObj_GetClipPath(obj);
  return handle === NULL_CLIP_PATH ? null : handle;
}

export function pageObjTransformClipPath(
  module: PDFiumWASM,
  obj: PageObjectHandle,
  a: number,
  b: number,
  c: number,
  d: number,
  e: number,
  f: number,
): void {
  module._FPDFPageObj_TransformClipPath(obj, a, b, c, d, e, f);
}

export function pageObjGetRotatedBounds(
  module: PDFiumWASM,
  memory: WASMMemoryManager,
  obj: PageObjectHandle,
): QuadPoints | null {
  using quadBuf = new FSQuadPointsF(memory);
  const result = module._FPDFPageObj_GetRotatedBounds(obj, quadBuf.ptr);
  if (result === 0) {
    return null;
  }

  return {
    x1: quadBuf.x1,
    y1: quadBuf.y1,
    x2: quadBuf.x2,
    y2: quadBuf.y2,
    x3: quadBuf.x3,
    y3: quadBuf.y3,
    x4: quadBuf.x4,
    y4: quadBuf.y4,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Extended Page Object Methods
// ─────────────────────────────────────────────────────────────────────────

export function pageObjGetFillColour(
  module: PDFiumWASM,
  memory: WASMMemoryManager,
  obj: PageObjectHandle,
): Colour | null {
  using colourBuf = memory.alloc(16);
  const rPtr = colourBuf.ptr;
  const gPtr = ptrOffset(colourBuf.ptr, 4);
  const bPtr = ptrOffset(colourBuf.ptr, 8);
  const aPtr = ptrOffset(colourBuf.ptr, 12);

  const result = module._FPDFPageObj_GetFillColor(obj, rPtr, gPtr, bPtr, aPtr);
  if (result === 0) {
    return null;
  }

  return {
    r: memory.readUint32(rPtr),
    g: memory.readUint32(gPtr),
    b: memory.readUint32(bPtr),
    a: memory.readUint32(aPtr),
  };
}

export function pageObjGetStrokeColour(
  module: PDFiumWASM,
  memory: WASMMemoryManager,
  obj: PageObjectHandle,
): Colour | null {
  using colourBuf = memory.alloc(16);
  const rPtr = colourBuf.ptr;
  const gPtr = ptrOffset(colourBuf.ptr, 4);
  const bPtr = ptrOffset(colourBuf.ptr, 8);
  const aPtr = ptrOffset(colourBuf.ptr, 12);

  const result = module._FPDFPageObj_GetStrokeColor(obj, rPtr, gPtr, bPtr, aPtr);
  if (result === 0) {
    return null;
  }

  return {
    r: memory.readUint32(rPtr),
    g: memory.readUint32(gPtr),
    b: memory.readUint32(bPtr),
    a: memory.readUint32(aPtr),
  };
}

export function pageObjGetStrokeWidth(
  module: PDFiumWASM,
  memory: WASMMemoryManager,
  obj: PageObjectHandle,
): number | null {
  using widthBuf = memory.alloc(4);
  const result = module._FPDFPageObj_GetStrokeWidth(obj, widthBuf.ptr);
  if (result === 0) {
    return null;
  }
  return memory.readFloat32(widthBuf.ptr);
}

export function pageObjGetMatrix(
  module: PDFiumWASM,
  memory: WASMMemoryManager,
  obj: PageObjectHandle,
): TransformMatrix | null {
  using matrix = new FSMatrix(memory);
  const result = module._FPDFPageObj_GetMatrix(obj, matrix.ptr);
  if (result === 0) {
    return null;
  }
  const { a, b, c, d, e, f } = matrix;
  return { a, b, c, d, e, f };
}

export function pageObjSetMatrix(
  module: PDFiumWASM,
  memory: WASMMemoryManager,
  obj: PageObjectHandle,
  matrix: TransformMatrix,
): boolean {
  using matrixStruct = new FSMatrix(memory);
  matrixStruct.a = matrix.a;
  matrixStruct.b = matrix.b;
  matrixStruct.c = matrix.c;
  matrixStruct.d = matrix.d;
  matrixStruct.e = matrix.e;
  matrixStruct.f = matrix.f;

  return module._FPDFPageObj_SetMatrix(obj, matrixStruct.ptr) !== 0;
}

export function pageObjGetLineCap(module: PDFiumWASM, obj: PageObjectHandle): LineCapStyle {
  const result = module._FPDFPageObj_GetLineCap(obj);
  return fromNative(lineCapStyleMap.fromNative, result, LineCapStyle.Butt);
}

export function pageObjSetLineCap(module: PDFiumWASM, obj: PageObjectHandle, lineCap: LineCapStyle): boolean {
  return module._FPDFPageObj_SetLineCap(obj, toNative(lineCapStyleMap.toNative, lineCap)) !== 0;
}

export function pageObjGetLineJoin(module: PDFiumWASM, obj: PageObjectHandle): LineJoinStyle {
  const result = module._FPDFPageObj_GetLineJoin(obj);
  return fromNative(lineJoinStyleMap.fromNative, result, LineJoinStyle.Miter);
}

export function pageObjSetLineJoin(module: PDFiumWASM, obj: PageObjectHandle, lineJoin: LineJoinStyle): boolean {
  return module._FPDFPageObj_SetLineJoin(obj, toNative(lineJoinStyleMap.toNative, lineJoin)) !== 0;
}

export function pageObjGetDashPattern(
  module: PDFiumWASM,
  memory: WASMMemoryManager,
  obj: PageObjectHandle,
): DashPattern | null {
  const count = module._FPDFPageObj_GetDashCount(obj);
  if (count < 0) {
    return null;
  }

  // Get dash array
  const dashArray: number[] = [];
  if (count > 0) {
    using dashBuf = memory.alloc(count * 4);
    const result = module._FPDFPageObj_GetDashArray(obj, dashBuf.ptr, count);
    if (result === 0) {
      return null;
    }
    const floatView = new Float32Array(memory.heapU8.buffer, dashBuf.ptr, count);
    for (let i = 0; i < count; i++) {
      // biome-ignore lint/style/noNonNullAssertion: Checked by count
      dashArray.push(floatView[i]!);
    }
  }

  // Get phase
  using phaseBuf = memory.alloc(4);
  const phaseResult = module._FPDFPageObj_GetDashPhase(obj, phaseBuf.ptr);
  if (phaseResult === 0) {
    return null;
  }
  const phase = memory.readFloat32(phaseBuf.ptr);

  return { dashArray, phase };
}

export function pageObjSetDashPattern(
  module: PDFiumWASM,
  memory: WASMMemoryManager,
  obj: PageObjectHandle,
  pattern: DashPattern,
): boolean {
  const count = pattern.dashArray.length;
  if (count === 0) {
    return module._FPDFPageObj_SetDashArray(obj, NULL_PTR, 0, pattern.phase) !== 0;
  }

  using dashBuf = memory.alloc(count * 4);
  const floatView = new Float32Array(memory.heapU8.buffer, dashBuf.ptr, count);
  for (let i = 0; i < count; i++) {
    // biome-ignore lint/style/noNonNullAssertion: Checked by count
    floatView[i] = pattern.dashArray[i]!;
  }

  return module._FPDFPageObj_SetDashArray(obj, dashBuf.ptr, count, pattern.phase) !== 0;
}

export function pageObjSetDashPhase(module: PDFiumWASM, obj: PageObjectHandle, phase: number): boolean {
  return module._FPDFPageObj_SetDashPhase(obj, phase) !== 0;
}

// ─────────────────────────────────────────────────────────────────────────
// Text Object Operations
// ─────────────────────────────────────────────────────────────────────────

export function textObjGetRenderMode(module: PDFiumWASM, handle: PageObjectHandle): number {
  return module._FPDFTextObj_GetTextRenderMode(handle);
}

export function textObjSetRenderMode(module: PDFiumWASM, handle: PageObjectHandle, mode: number): boolean {
  return module._FPDFTextObj_SetTextRenderMode(handle, mode) !== 0;
}

// ─────────────────────────────────────────────────────────────────────────
// Path Operations
// ─────────────────────────────────────────────────────────────────────────

export function pathMoveTo(module: PDFiumWASM, path: PageObjectHandle, x: number, y: number): boolean {
  return module._FPDFPath_MoveTo(path, x, y) !== 0;
}

export function pathLineTo(module: PDFiumWASM, path: PageObjectHandle, x: number, y: number): boolean {
  return module._FPDFPath_LineTo(path, x, y) !== 0;
}

export function pathBezierTo(
  module: PDFiumWASM,
  path: PageObjectHandle,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
): boolean {
  return module._FPDFPath_BezierTo(path, x1, y1, x2, y2, x3, y3) !== 0;
}

export function pathClose(module: PDFiumWASM, path: PageObjectHandle): boolean {
  return module._FPDFPath_Close(path) !== 0;
}

export function pathSetDrawMode(
  module: PDFiumWASM,
  path: PageObjectHandle,
  fillMode: PathFillMode,
  stroke: boolean,
): boolean {
  return module._FPDFPath_SetDrawMode(path, toNative(pathFillModeMap.toNative, fillMode), stroke ? 1 : 0) !== 0;
}

export function pathGetDrawMode(
  module: PDFiumWASM,
  memory: WASMMemoryManager,
  path: PageObjectHandle,
): { fillMode: PathFillMode; stroke: boolean } | null {
  using fillModePtr = memory.alloc(4);
  using strokePtr = memory.alloc(4);

  if (module._FPDFPath_GetDrawMode(path, fillModePtr.ptr, strokePtr.ptr) === 0) {
    return null;
  }

  const fillMode = fromNative(pathFillModeMap.fromNative, memory.readInt32(fillModePtr.ptr), PathFillMode.None);
  const strokeVal = memory.readInt32(strokePtr.ptr);

  return {
    fillMode,
    stroke: strokeVal !== 0,
  };
}

export function pathCountSegments(module: PDFiumWASM, path: PageObjectHandle): number {
  return module._FPDFPath_CountSegments(path);
}

export function pathGetSegment(module: PDFiumWASM, path: PageObjectHandle, index: number): PathSegmentHandle | null {
  const handle = module._FPDFPath_GetPathSegment(path, index);
  if (handle === NULL_PATH_SEGMENT) {
    return null;
  }
  return handle;
}

export function pathSegmentGetPoint(
  module: PDFiumWASM,
  memory: WASMMemoryManager,
  segment: PathSegmentHandle,
): Point | null {
  using point = new FSPointF(memory);

  if (module._FPDFPathSegment_GetPoint(segment, point.ptr, ptrOffset(point.ptr, 4)) === 0) {
    return null;
  }

  return { x: point.x, y: point.y };
}

export function pathSegmentGetType(module: PDFiumWASM, segment: PathSegmentHandle): PathSegmentType {
  return fromNative(pathSegmentTypeMap.fromNative, module._FPDFPathSegment_GetType(segment), PathSegmentType.Unknown);
}

export function pathSegmentGetClose(module: PDFiumWASM, segment: PathSegmentHandle): boolean {
  return module._FPDFPathSegment_GetClose(segment) !== 0;
}

// ─────────────────────────────────────────────────────────────────────────
// Marks
// ─────────────────────────────────────────────────────────────────────────

export function pageObjCountMarks(module: PDFiumWASM, obj: PageObjectHandle): number {
  return module._FPDFPageObj_CountMarks(obj);
}

export function pageObjGetMark(module: PDFiumWASM, obj: PageObjectHandle, index: number): PageObjectMarkHandle | null {
  const handle = module._FPDFPageObj_GetMark(obj, index);
  return handle === NULL_MARK ? null : handle;
}

export function pageObjAddMark(
  module: PDFiumWASM,
  memory: WASMMemoryManager,
  obj: PageObjectHandle,
  name: string,
): PageObjectMarkHandle | null {
  using nameAlloc = memory.allocString(name);
  const markHandle = module._FPDFPageObj_AddMark(obj, nameAlloc.ptr);
  return markHandle === NULL_MARK ? null : markHandle;
}

export function pageObjRemoveMark(module: PDFiumWASM, obj: PageObjectHandle, mark: PageObjectMarkHandle): boolean {
  return module._FPDFPageObj_RemoveMark(obj, mark) !== 0;
}

export function pageObjMarkGetName(
  module: PDFiumWASM,
  memory: WASMMemoryManager,
  mark: PageObjectMarkHandle,
): string | undefined {
  const fn = module._FPDFPageObjMark_GetName;

  using outLenPtr = memory.alloc(4);
  const success = fn(mark, NULL_PTR, 0, outLenPtr.ptr);
  if (!success) return undefined;

  const size = memory.readUint32(outLenPtr.ptr);
  if (size <= UTF16LE_NULL_TERMINATOR_BYTES) {
    return undefined;
  }

  using buffer = memory.alloc(size);
  const success2 = fn(mark, buffer.ptr, size, outLenPtr.ptr);
  if (!success2) {
    return undefined;
  }

  const charCount = (size - UTF16LE_NULL_TERMINATOR_BYTES) / UTF16LE_BYTES_PER_CHAR;
  return memory.readUTF16LE(buffer.ptr, charCount);
}

export function pageObjMarkCountParams(module: PDFiumWASM, mark: PageObjectMarkHandle): number {
  return module._FPDFPageObjMark_CountParams(mark);
}

export function pageObjMarkGetParamKey(
  module: PDFiumWASM,
  memory: WASMMemoryManager,
  mark: PageObjectMarkHandle,
  index: number,
): string | undefined {
  // Key is UTF-8 (ASCII?) in FPDFPageObjMark_GetParamKey
  // It returns byte length including null terminator.
  const fn = module._FPDFPageObjMark_GetParamKey;

  using outLenPtr = memory.alloc(4);
  fn(mark, index, NULL_PTR, 0, outLenPtr.ptr);
  const keyLen = memory.readInt32(outLenPtr.ptr);

  if (keyLen <= 0) return undefined;

  using keyBuffer = memory.alloc(keyLen);
  fn(mark, index, keyBuffer.ptr, keyLen, outLenPtr.ptr);

  return memory.readUtf8String(keyBuffer.ptr, keyLen - 1);
}

export function pageObjMarkGetParamValueType(
  module: PDFiumWASM,
  memory: WASMMemoryManager,
  mark: PageObjectMarkHandle,
  key: string,
): PageObjectMarkValueType {
  using keyAlloc = memory.allocString(key);
  return fromNative(
    pageObjectMarkValueTypeMap.fromNative,
    module._FPDFPageObjMark_GetParamValueType(mark, keyAlloc.ptr),
    PageObjectMarkValueType.Int,
  );
}

export function pageObjMarkGetParamIntValue(
  module: PDFiumWASM,
  memory: WASMMemoryManager,
  mark: PageObjectMarkHandle,
  key: string,
): number | undefined {
  using keyAlloc = memory.allocString(key);
  using valPtr = memory.alloc(4);
  if (!module._FPDFPageObjMark_GetParamIntValue(mark, keyAlloc.ptr, valPtr.ptr)) {
    return undefined;
  }
  return memory.readInt32(valPtr.ptr);
}

export function pageObjMarkGetParamStringValue(
  module: PDFiumWASM,
  memory: WASMMemoryManager,
  mark: PageObjectMarkHandle,
  key: string,
): string | undefined {
  using keyAlloc = memory.allocString(key);
  // String value logic:
  using outLenPtr = memory.alloc(4);
  const valLen = module._FPDFPageObjMark_GetParamStringValue(mark, keyAlloc.ptr, NULL_PTR, 0, outLenPtr.ptr);
  if (valLen <= 0) return undefined;

  using valBuf = memory.alloc(valLen);
  module._FPDFPageObjMark_GetParamStringValue(mark, keyAlloc.ptr, valBuf.ptr, valLen, outLenPtr.ptr);
  const charCount = (valLen - 2) / 2;
  return memory.readUTF16LE(valBuf.ptr, charCount);
}

export function pageObjMarkGetParamBlobValue(
  module: PDFiumWASM,
  memory: WASMMemoryManager,
  mark: PageObjectMarkHandle,
  key: string,
): Uint8Array | undefined {
  using keyAlloc = memory.allocString(key);
  using outLenPtr = memory.alloc(4);

  const size = module._FPDFPageObjMark_GetParamBlobValue(mark, keyAlloc.ptr, NULL_PTR, 0, outLenPtr.ptr);
  if (!size) return undefined;

  const len = memory.readUint32(outLenPtr.ptr);
  if (len <= 0) return undefined;

  using buf = memory.alloc(len);
  module._FPDFPageObjMark_GetParamBlobValue(mark, keyAlloc.ptr, buf.ptr, len, outLenPtr.ptr);
  return memory.copyFromWASM(buf.ptr, len);
}
