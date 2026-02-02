/**
 * Page object creation and editing WASM bindings.
 *
 * @module wasm/bindings/edit
 */

import type {
  BitmapHandle,
  ClipPathHandle,
  DocumentHandle,
  FontHandle,
  PageHandle,
  PageObjectHandle,
  PageObjectMarkHandle,
  PathSegmentHandle,
  TextPageHandle,
  WASMPointer,
} from '../../internal/handles.js';

/**
 * Page object creation and editing WASM bindings.
 */
export interface EditBindings {
  // Page object operations
  _FPDFPage_CountObjects: (page: PageHandle) => number;
  _FPDFPage_GetObject: (page: PageHandle, index: number) => PageObjectHandle;
  _FPDFPageObj_GetType: (object: PageObjectHandle) => number;
  _FPDFPageObj_GetBounds: (
    object: PageObjectHandle,
    left: WASMPointer,
    bottom: WASMPointer,
    right: WASMPointer,
    top: WASMPointer,
  ) => number;
  _FPDFPage_InsertObject: (page: PageHandle, pageObj: PageObjectHandle) => void;
  _FPDFPage_RemoveObject: (page: PageHandle, pageObj: PageObjectHandle) => number;

  // Text page object operations
  _FPDFTextObj_GetText: (
    textObj: PageObjectHandle,
    textPage: TextPageHandle,
    buffer: WASMPointer,
    length: number,
  ) => number;
  _FPDFTextObj_GetFontSize: (textObj: PageObjectHandle, sizePtr: WASMPointer) => number;
  _FPDFTextObj_GetFont: (textObj: PageObjectHandle) => FontHandle;

  // Image object operations
  _FPDFImageObj_GetBitmap: (object: PageObjectHandle) => BitmapHandle;
  _FPDFImageObj_GetImageDataRaw: (object: PageObjectHandle, buffer: WASMPointer, length: number) => number;
  _FPDFImageObj_GetImagePixelSize: (object: PageObjectHandle, widthPtr: WASMPointer, heightPtr: WASMPointer) => number;
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
  _FPDFImageObj_SetBitmap: (
    pages: WASMPointer,
    count: number,
    imageObj: PageObjectHandle,
    bitmap: BitmapHandle,
  ) => number;
  _FPDFImageObj_SetMatrix: (
    imageObj: PageObjectHandle,
    a: number,
    b: number,
    c: number,
    d: number,
    e: number,
    f: number,
  ) => number;
  _FPDFImageObj_GetImageDataDecoded: (imageObj: PageObjectHandle, buffer: WASMPointer, buflen: number) => number;
  _FPDFImageObj_GetImageMetadata: (imageObj: PageObjectHandle, page: PageHandle, metadata: WASMPointer) => number;

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

  // Path operations
  _FPDFPath_MoveTo: (path: PageObjectHandle, x: number, y: number) => number;
  _FPDFPath_LineTo: (path: PageObjectHandle, x: number, y: number) => number;
  _FPDFPath_BezierTo: (
    path: PageObjectHandle,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number,
  ) => number;
  _FPDFPath_Close: (path: PageObjectHandle) => number;
  _FPDFPath_SetDrawMode: (path: PageObjectHandle, fillMode: number, stroke: number) => number;
  _FPDFPath_GetDrawMode: (path: PageObjectHandle, fillMode: WASMPointer, stroke: WASMPointer) => number;
  _FPDFPath_CountSegments: (path: PageObjectHandle) => number;
  _FPDFPath_GetPathSegment: (path: PageObjectHandle, index: number) => PathSegmentHandle;
  _FPDFPathSegment_GetPoint: (segment: PathSegmentHandle, x: WASMPointer, y: WASMPointer) => number;
  _FPDFPathSegment_GetType: (segment: PathSegmentHandle) => number;
  _FPDFPathSegment_GetClose: (segment: PathSegmentHandle) => number;

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

  // Extended page object operations
  _FPDFPageObj_GetFillColor: (
    obj: PageObjectHandle,
    r: WASMPointer,
    g: WASMPointer,
    b: WASMPointer,
    a: WASMPointer,
  ) => number;
  _FPDFPageObj_GetStrokeColor: (
    obj: PageObjectHandle,
    r: WASMPointer,
    g: WASMPointer,
    b: WASMPointer,
    a: WASMPointer,
  ) => number;
  _FPDFPageObj_GetStrokeWidth: (obj: PageObjectHandle, width: WASMPointer) => number;
  _FPDFPageObj_GetMatrix: (obj: PageObjectHandle, matrix: WASMPointer) => number;
  _FPDFPageObj_SetMatrix: (obj: PageObjectHandle, matrix: WASMPointer) => number;
  _FPDFPageObj_GetLineCap: (obj: PageObjectHandle) => number;
  _FPDFPageObj_SetLineCap: (obj: PageObjectHandle, lineCap: number) => number;
  _FPDFPageObj_GetLineJoin: (obj: PageObjectHandle) => number;
  _FPDFPageObj_SetLineJoin: (obj: PageObjectHandle, lineJoin: number) => number;
  _FPDFPageObj_GetDashCount: (obj: PageObjectHandle) => number;
  _FPDFPageObj_GetDashArray: (obj: PageObjectHandle, dashArray: WASMPointer, count: number) => number;
  _FPDFPageObj_SetDashArray: (obj: PageObjectHandle, dashArray: WASMPointer, count: number, phase: number) => number;
  _FPDFPageObj_GetDashPhase: (obj: PageObjectHandle, phase: WASMPointer) => number;
  _FPDFPageObj_SetDashPhase: (obj: PageObjectHandle, phase: number) => number;
  _FPDFPageObj_Destroy: (obj: PageObjectHandle) => void;
  _FPDFPageObj_HasTransparency: (obj: PageObjectHandle) => number;
  _FPDFPageObj_SetBlendMode: (obj: PageObjectHandle, blendMode: WASMPointer) => void;
  _FPDFPageObj_NewImageObj: (document: DocumentHandle) => PageObjectHandle;
  _FPDFPageObj_GetClipPath: (obj: PageObjectHandle) => ClipPathHandle;
  _FPDFPageObj_TransformClipPath: (
    obj: PageObjectHandle,
    a: number,
    b: number,
    c: number,
    d: number,
    e: number,
    f: number,
  ) => void;
  _FPDFPageObj_GetRotatedBounds: (obj: PageObjectHandle, quadPoints: WASMPointer) => number;

  // Clip path operations
  _FPDFPage_TransFormWithClip: (page: PageHandle, matrix: WASMPointer, clipRect: WASMPointer) => number;
  _FPDFPage_InsertClipPath: (page: PageHandle, clipPath: ClipPathHandle) => void;
  _FPDF_CreateClipPath: (left: number, bottom: number, right: number, top: number) => ClipPathHandle;
  _FPDF_DestroyClipPath: (clipPath: ClipPathHandle) => void;

  // Page transform operations
  _FPDFPage_TransformAnnots: (
    page: PageHandle,
    a: number,
    b: number,
    c: number,
    d: number,
    e: number,
    f: number,
  ) => void;

  // Text object render mode
  _FPDFTextObj_GetTextRenderMode: (textObj: PageObjectHandle) => number;
  _FPDFTextObj_SetTextRenderMode: (textObj: PageObjectHandle, renderMode: number) => number;

  // Page object mark operations
  /** Get the number of marks on a page object. */
  _FPDFPageObj_CountMarks: (pageObj: PageObjectHandle) => number;

  /** Get a mark from a page object by index. */
  _FPDFPageObj_GetMark: (pageObj: PageObjectHandle, index: number) => PageObjectMarkHandle;

  /** Get the name of a mark. */
  _FPDFPageObjMark_GetName: (
    mark: PageObjectMarkHandle,
    buffer: WASMPointer,
    buflen: number,
    outLen: WASMPointer,
  ) => number;

  /** Get the number of parameters on a mark. */
  _FPDFPageObjMark_CountParams: (mark: PageObjectMarkHandle) => number;

  /** Get a parameter key by index. */
  _FPDFPageObjMark_GetParamKey: (
    mark: PageObjectMarkHandle,
    index: number,
    buffer: WASMPointer,
    buflen: number,
    outLen: WASMPointer,
  ) => number;

  /** Get the value type of a parameter. */
  _FPDFPageObjMark_GetParamValueType: (mark: PageObjectMarkHandle, key: WASMPointer) => number;

  /** Get an integer parameter value. */
  _FPDFPageObjMark_GetParamIntValue: (mark: PageObjectMarkHandle, key: WASMPointer, outValue: WASMPointer) => number;

  /** Get a string parameter value. */
  _FPDFPageObjMark_GetParamStringValue: (
    mark: PageObjectMarkHandle,
    key: WASMPointer,
    buffer: WASMPointer,
    buflen: number,
    outLen: WASMPointer,
  ) => number;

  /** Get a blob parameter value. */
  _FPDFPageObjMark_GetParamBlobValue: (
    mark: PageObjectMarkHandle,
    key: WASMPointer,
    buffer: WASMPointer,
    buflen: number,
    outLen: WASMPointer,
  ) => number;

  /** Add a mark to a page object. */
  _FPDFPageObj_AddMark: (pageObj: PageObjectHandle, name: WASMPointer) => PageObjectMarkHandle;

  /** Remove a mark from a page object. */
  _FPDFPageObj_RemoveMark: (pageObj: PageObjectHandle, mark: PageObjectMarkHandle) => number;

  /** Set an integer parameter on a mark. */
  _FPDFPageObjMark_SetIntParam: (
    document: DocumentHandle,
    pageObj: PageObjectHandle,
    mark: PageObjectMarkHandle,
    key: WASMPointer,
    value: number,
  ) => number;

  /** Set a string parameter on a mark. */
  _FPDFPageObjMark_SetStringParam: (
    document: DocumentHandle,
    pageObj: PageObjectHandle,
    mark: PageObjectMarkHandle,
    key: WASMPointer,
    value: WASMPointer,
  ) => number;

  /** Set a blob parameter on a mark. */
  _FPDFPageObjMark_SetBlobParam: (
    document: DocumentHandle,
    pageObj: PageObjectHandle,
    mark: PageObjectMarkHandle,
    key: WASMPointer,
    value: WASMPointer,
    valueLen: number,
  ) => number;

  /** Remove a parameter from a mark. */
  _FPDFPageObjMark_RemoveParam: (pageObj: PageObjectHandle, mark: PageObjectMarkHandle, key: WASMPointer) => number;
}
