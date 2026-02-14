import { vi } from 'vitest';

export function createMockWasmModule() {
  const heap = new Uint8Array(1024 * 1024); // 1MB mock heap
  let nextPtr = 8; // Local state per module instance
  let nextFunctionPtr = 1000; // Unique function pointer IDs

  return {
    HEAPU8: heap,
    HEAP32: new Int32Array(heap.buffer),
    HEAPF32: new Float32Array(heap.buffer),
    HEAPF64: new Float64Array(heap.buffer),

    // Memory management
    _malloc: vi.fn((size) => {
      // Simple bump allocator to return unique pointers
      // Start at 8 to avoid null pointer (0)
      let ptr = nextPtr;

      // Align to 8 bytes
      if (ptr % 8 !== 0) {
        ptr = (ptr + 7) & ~7;
      }

      nextPtr = ptr + size + 8; // +8 for safety/padding
      return ptr;
    }),
    _free: vi.fn(),

    // Emscripten function table support for callbacks
    addFunction: vi.fn((_callback, _signature) => {
      const ptr = nextFunctionPtr++;
      return ptr;
    }),
    removeFunction: vi.fn(),

    // Core
    _FPDF_InitLibraryWithConfig: vi.fn(),
    _FPDF_DestroyLibrary: vi.fn(),
    _FPDF_GetLastError: vi.fn(() => 0),

    // Document
    _FPDF_LoadMemDocument: vi.fn(() => 100), // Return dummy handle
    _FPDF_CreateNewDocument: vi.fn(() => 100),
    _FPDF_CloseDocument: vi.fn(),
    _FPDF_GetPageCount: vi.fn(() => 5),
    _FPDF_GetDocPermissions: vi.fn(() => -1),
    _FPDF_GetDocUserPermissions: vi.fn(() => -1),
    _FPDF_GetSecurityHandlerRevision: vi.fn(() => -1),
    _FPDF_DocumentHasValidCrossReferenceTable: vi.fn(() => 1),
    _FPDF_GetTrailerEnds: vi.fn(() => 0),
    _FPDF_GetPageLabel: vi.fn(() => 0),
    _FPDFCatalog_IsTagged: vi.fn(() => 0),
    _FPDF_GetFileVersion: vi.fn(() => 1),
    _FPDF_GetMetaText: vi.fn(() => 0),

    // Page
    _FPDF_LoadPage: vi.fn(() => 200), // Dummy page handle
    _FPDFPage_New: vi.fn(() => 200),
    _FPDFPage_Delete: vi.fn(),
    _FPDF_ClosePage: vi.fn(),
    _FPDF_GetPageWidth: vi.fn(() => 595),
    _FPDF_GetPageHeight: vi.fn(() => 842),
    _FPDF_GetPageWidthF: vi.fn(() => 595),
    _FPDF_GetPageHeightF: vi.fn(() => 842),
    _FPDFPage_GetRotation: vi.fn(() => 0),
    _FPDFPage_GenerateContent: vi.fn(() => 1),
    _FPDFPage_HasTransparency: vi.fn(() => 0),
    _FPDF_DeviceToPage: vi.fn(() => 1),
    _FPDF_PageToDevice: vi.fn(() => 1),

    // Text
    _FPDFText_LoadPage: vi.fn(() => 300), // Dummy text handle
    _FPDFText_ClosePage: vi.fn(),
    _FPDFText_CountChars: vi.fn(() => 10),
    _FPDFText_GetText: vi.fn(() => 0),
    _FPDFText_GetUnicode: vi.fn(() => 65), // 'A'
    _FPDFText_GetFontSize: vi.fn(() => 12),
    _FPDFText_GetFontWeight: vi.fn(() => 400),
    _FPDFText_GetTextObject: vi.fn(() => 305),
    _FPDFTextObj_GetTextRenderMode: vi.fn(() => 0),
    _FPDFText_GetCharAngle: vi.fn(() => 0),
    _FPDFText_IsGenerated: vi.fn(() => 0),
    _FPDFText_IsHyphen: vi.fn(() => 0),
    _FPDFText_HasUnicodeMapError: vi.fn(() => 0),
    _FPDFText_GetCharOrigin: vi.fn(),
    _FPDFText_GetFillColor: vi.fn(() => 0),
    _FPDFText_GetStrokeColor: vi.fn(() => 0),
    _FPDFText_GetFontInfo: vi.fn(() => 0),
    _FPDFText_CountRects: vi.fn(() => 0),
    _FPDFText_GetRect: vi.fn(() => 0),
    _FPDFText_GetBoundedText: vi.fn(() => 0),
    _FPDFText_GetCharBox: vi.fn(() => 1),
    _FPDFText_GetLooseCharBox: vi.fn(() => 1),
    _FPDFText_GetCharIndexAtPos: vi.fn(() => 0),
    _FPDFText_LoadStandardFont: vi.fn(() => 50),
    _FPDFFont_Close: vi.fn(),
    _FPDFText_SetText: vi.fn(),

    // Rendering
    _FPDFBitmap_CreateEx: vi.fn(() => 400), // Bitmap handle
    _FPDFBitmap_FillRect: vi.fn(),
    _FPDF_RenderPageBitmap: vi.fn(),
    _FPDFBitmap_Destroy: vi.fn(),
    _FPDF_RenderPageBitmapWithMatrix: vi.fn(),
    _FPDF_FFLDraw: vi.fn(),

    // Page Objects (Manipulation)
    _FPDFPage_InsertObject: vi.fn(),
    _FPDFPage_RemoveObject: vi.fn(() => 1),
    _FPDFPageObj_Destroy: vi.fn(),
    _FPDFPageObj_CreateNewRect: vi.fn(() => 300),
    _FPDFPageObj_CreateTextObj: vi.fn(() => 301),
    _FPDFPageObj_SetFillColor: vi.fn(() => 1),
    _FPDFPageObj_SetStrokeColor: vi.fn(() => 1),
    _FPDFPageObj_SetStrokeWidth: vi.fn(),
    _FPDFPageObj_Transform: vi.fn(),

    // Form Environment
    _FPDFDOC_InitFormFillEnvironment: vi.fn(() => 500),
    _FPDFDOC_ExitFormFillEnvironment: vi.fn(),
    _FORM_OnAfterLoadPage: vi.fn(),
    _FORM_DoDocumentJSAction: vi.fn(),
    _FORM_DoDocumentOpenAction: vi.fn(),
    _FORM_DoDocumentAAction: vi.fn(),
    _FORM_DoPageAAction: vi.fn(),
    _FORM_OnBeforeClosePage: vi.fn(),
    _FORM_ReplaceAndKeepSelection: vi.fn(),
    _FORM_ReplaceSelection: vi.fn(),
    _FORM_SelectAllText: vi.fn(() => 1),
    _FORM_SetFocusedAnnot: vi.fn(() => 1),
    _FORM_SetIndexSelected: vi.fn(() => 1),
    _FORM_IsIndexSelected: vi.fn(() => 1),
    _FORM_GetSelectedText: vi.fn(() => 0),
    _FORM_GetFocusedText: vi.fn(() => 0),
    _FORM_CanUndo: vi.fn(() => 0),
    _FORM_CanRedo: vi.fn(() => 0),
    _FORM_Undo: vi.fn(() => 0),
    _FORM_Redo: vi.fn(() => 0),
    _FORM_OnMouseMove: vi.fn(() => 0),
    _FORM_OnMouseWheel: vi.fn(() => 0),
    _FORM_OnFocus: vi.fn(() => 0),
    _FORM_OnLButtonDown: vi.fn(() => 0),
    _FORM_OnLButtonUp: vi.fn(() => 0),
    _FORM_OnRButtonDown: vi.fn(() => 0),
    _FORM_OnRButtonUp: vi.fn(() => 0),
    _FORM_OnMButtonDown: vi.fn(() => 0),
    _FORM_OnMButtonUp: vi.fn(() => 0),
    _FORM_OnLButtonDoubleClick: vi.fn(() => 0),
    _FORM_OnKeyDown: vi.fn(() => 0),
    _FORM_OnKeyUp: vi.fn(() => 0),
    _FORM_OnChar: vi.fn(() => 0),
    _FORM_GetFocusedAnnot: vi.fn(() => 0),
    _FPDFPage_HasFormFieldAtPoint: vi.fn(() => -1),
    _FPDFPage_FormFieldZOrderAtPoint: vi.fn(() => -1),
    _FPDFPage_SetRotation: vi.fn(),
    _FPDFPage_Flatten: vi.fn(() => 0), // Success
    _FPDFPage_SetMediaBox: vi.fn(),
    _FPDFPage_SetCropBox: vi.fn(),
    _FPDFPage_SetBleedBox: vi.fn(),
    _FPDFPage_SetTrimBox: vi.fn(),
    _FPDFPage_SetArtBox: vi.fn(),
    _FPDFPage_GetMediaBox: vi.fn(() => 1),
    _FPDFPage_GetCropBox: vi.fn(() => 1),
    _FPDFPage_GetBleedBox: vi.fn(() => 1),
    _FPDFPage_GetTrimBox: vi.fn(() => 1),
    _FPDFPage_GetArtBox: vi.fn(() => 1),
    _FPDF_GetPageBoundingBox: vi.fn(() => 1),
    _FPDFPage_TransFormWithClip: vi.fn(() => 1),
    _FPDFPage_TransformAnnots: vi.fn(),
    _FPDF_CreateClipPath: vi.fn(() => 600),
    _FPDFPage_InsertClipPath: vi.fn(),
    _FPDF_DestroyClipPath: vi.fn(),
    _FPDFPage_GetThumbnailAsBitmap: vi.fn(() => 0),
    _FPDFPage_GetDecodedThumbnailData: vi.fn(() => 0),
    _FPDFPage_GetRawThumbnailData: vi.fn(() => 0),

    // Objects
    _FPDFPage_CountObjects: vi.fn(() => 0),
    _FPDFPage_GetObject: vi.fn(() => 0),
    _FPDFPageObj_GetBounds: vi.fn(() => 0),
    _FPDFPageObj_GetType: vi.fn(() => 0),
    _FPDFPageObj_GetFillColor: vi.fn(() => 0),
    _FPDFPageObj_GetStrokeColor: vi.fn(() => 0),
    _FPDFPageObj_GetStrokeWidth: vi.fn(() => 0),
    _FPDFPageObj_GetMatrix: vi.fn(() => 0),
    _FPDFPageObj_SetMatrix: vi.fn(() => 1),
    _FPDFPageObj_GetRotatedBounds: vi.fn(() => 0),
    _FPDFPageObj_GetDashCount: vi.fn(() => 0),
    _FPDFPageObj_GetDashArray: vi.fn(() => 0),
    _FPDFPageObj_GetDashPhase: vi.fn(() => 0),
    _FPDFPageObj_SetDashArray: vi.fn(() => 1),
    _FPDFPageObj_SetDashPhase: vi.fn(() => 1),
    _FPDFPageObj_GetLineCap: vi.fn(() => 0),
    _FPDFPageObj_SetLineCap: vi.fn(() => 1),
    _FPDFPageObj_GetLineJoin: vi.fn(() => 0),
    _FPDFPageObj_SetLineJoin: vi.fn(() => 1),
    _FPDFPageObj_HasTransparency: vi.fn(() => 0),
    _FPDFPageObj_SetBlendMode: vi.fn(),
    _FPDFPageObj_GetClipPath: vi.fn(() => 0),
    _FPDFPageObj_TransformClipPath: vi.fn(),
    _FPDFPageObj_CountMarks: vi.fn(() => 0),
    _FPDFPageObj_GetMark: vi.fn(() => 0),
    _FPDFPageObj_AddMark: vi.fn(() => 0),
    _FPDFPageObj_RemoveMark: vi.fn(() => 0),
    _FPDFPageObjMark_GetName: vi.fn(() => 0),
    _FPDFPageObjMark_CountParams: vi.fn(() => 0),
    _FPDFPageObjMark_GetParamKey: vi.fn(() => 0),
    _FPDFPageObjMark_GetParamValueType: vi.fn(() => 1),
    _FPDFPageObjMark_GetParamIntValue: vi.fn(() => 0),
    _FPDFPageObjMark_GetParamStringValue: vi.fn(() => 0),
    _FPDFPageObjMark_GetParamBlobValue: vi.fn(() => 0),
    _FPDFPageObjMark_SetIntParam: vi.fn(() => 0),
    _FPDFPageObjMark_SetStringParam: vi.fn(() => 0),
    _FPDFPageObjMark_SetBlobParam: vi.fn(() => 0),
    _FPDFPageObjMark_RemoveParam: vi.fn(() => 0),

    // Text Objects
    _FPDFTextObj_SetTextRenderMode: vi.fn(() => 1),
    _FPDFTextObj_GetFontSize: vi.fn(() => 1),
    _FPDFTextObj_GetFont: vi.fn(() => 0),
    _FPDFTextObj_GetText: vi.fn(() => 0),

    // Path Objects
    _FPDFPath_GetDrawMode: vi.fn(() => 0),
    _FPDFPath_SetDrawMode: vi.fn(() => 1),
    _FPDFPath_CountSegments: vi.fn(() => 0),
    _FPDFPath_GetPathSegment: vi.fn(() => 0),
    _FPDFPath_MoveTo: vi.fn(() => 1),
    _FPDFPath_LineTo: vi.fn(() => 1),
    _FPDFPath_BezierTo: vi.fn(() => 1),
    _FPDFPath_Close: vi.fn(() => 1),
    _FPDFPathSegment_GetPoint: vi.fn(() => 0),
    _FPDFPathSegment_GetType: vi.fn(() => 0),
    _FPDFPathSegment_GetClose: vi.fn(() => 0),

    // Image Objects
    _FPDFImageObj_LoadJpegFile: vi.fn(() => 1),
    _FPDFImageObj_LoadJpegFileInline: vi.fn(() => 1),
    _FPDFImageObj_SetBitmap: vi.fn(() => 1),
    _FPDFImageObj_SetMatrix: vi.fn(() => 1),
    _FPDFImageObj_GetBitmap: vi.fn(() => 0),
    _FPDFImageObj_GetRenderedBitmap: vi.fn(() => 0),
    _FPDFImageObj_GetImageMetadata: vi.fn(() => 0),
    _FPDFImageObj_GetImageDataDecoded: vi.fn(() => 0),
    _FPDFImageObj_GetImageDataRaw: vi.fn(() => 0),
    _FPDFImageObj_GetImagePixelSize: vi.fn(() => 0),
    _FPDFImageObj_GetImageFilterCount: vi.fn(() => 0),
    _FPDFImageObj_GetImageFilter: vi.fn(() => 0),

    // Font
    _FPDFFont_GetFamilyName: vi.fn(() => 0),
    _FPDFFont_GetBaseFontName: vi.fn(() => 0),
    _FPDFFont_GetItalicAngle: vi.fn(() => 0),
    _FPDFFont_GetFontName: vi.fn(() => 0),
    _FPDFFont_GetFlags: vi.fn(() => 0),
    _FPDFFont_GetWeight: vi.fn(() => 0),
    _FPDFFont_GetFontData: vi.fn(() => 0),
    _FPDFFont_GetIsEmbedded: vi.fn(() => 0),
    _FPDFFont_GetAscent: vi.fn(() => 0),
    _FPDFFont_GetDescent: vi.fn(() => 0),
    _FPDFFont_GetGlyphWidth: vi.fn(() => 0),
    _FPDFFont_GetGlyphPath: vi.fn(() => 0),
    _FPDFGlyphPath_CountGlyphSegments: vi.fn(() => 0),
    _FPDFGlyphPath_GetGlyphPathSegment: vi.fn(() => 0),

    // Bitmap
    _FPDFBitmap_GetBuffer: vi.fn(() => 0),
    _FPDFBitmap_GetWidth: vi.fn(() => 0),
    _FPDFBitmap_GetHeight: vi.fn(() => 0),
    _FPDFBitmap_GetStride: vi.fn(() => 0),
    _FPDFBitmap_GetFormat: vi.fn(() => 0),

    // Page Object Creation
    _FPDFPageObj_CreateNewPath: vi.fn(() => 0),
    _FPDFPageObj_NewImageObj: vi.fn(() => 0),

    // Progressive Rendering
    _FPDF_RenderPageBitmap_Start: vi.fn(() => 0),
    _FPDF_RenderPage_Continue: vi.fn(() => 0),
    _FPDF_RenderPage_Close: vi.fn(),

    // Progressive Loading
    _FPDF_LoadCustomDocument: vi.fn(() => 0),

    // Annotations
    _FPDFPage_GetAnnotCount: vi.fn(() => 0),
    _FPDFPage_GetAnnot: vi.fn(() => 0),
    _FPDFPage_CreateAnnot: vi.fn(() => 0),
    _FPDFPage_RemoveAnnot: vi.fn(() => 0),
    _FPDFPage_CloseAnnot: vi.fn(),
    _FPDFPage_GetAnnotIndex: vi.fn(() => 0),
    _FPDFAnnot_GetSubtype: vi.fn(() => 0),
    _FPDFAnnot_GetRect: vi.fn(() => 0),
    _FPDFAnnot_SetRect: vi.fn(() => 0),
    _FPDFAnnot_GetColor: vi.fn(() => 0),
    _FPDFAnnot_SetColor: vi.fn(() => 0),
    _FPDFAnnot_GetFlags: vi.fn(() => 0),
    _FPDFAnnot_SetFlags: vi.fn(() => 0),
    _FPDFAnnot_HasKey: vi.fn(() => 0),
    _FPDFAnnot_GetStringValue: vi.fn(() => 0),
    _FPDFAnnot_SetStringValue: vi.fn(() => 0),
    _FPDFAnnot_GetBorder: vi.fn(() => 0),
    _FPDFAnnot_SetBorder: vi.fn(() => 0),
    _FPDFAnnot_GetAP: vi.fn(() => 0),
    _FPDFAnnot_SetAP: vi.fn(() => 0),
    _FPDFAnnot_GetLine: vi.fn(() => 0),
    _FPDFAnnot_GetVertices: vi.fn(() => 0),
    _FPDFAnnot_GetInkListCount: vi.fn(() => 0),
    _FPDFAnnot_GetInkListPath: vi.fn(() => 0),
    _FPDFAnnot_AddInkStroke: vi.fn(() => -1),
    _FPDFAnnot_CountAttachmentPoints: vi.fn(() => 0),
    _FPDFAnnot_GetAttachmentPoints: vi.fn(() => 0),
    _FPDFAnnot_SetAttachmentPoints: vi.fn(() => 0),
    _FPDFAnnot_AppendAttachmentPoints: vi.fn(() => 0),
    _FPDFAnnot_GetObject: vi.fn(() => 0),
    _FPDFAnnot_GetObjectCount: vi.fn(() => 0),
    _FPDFAnnot_AppendObject: vi.fn(() => 0),
    _FPDFAnnot_UpdateObject: vi.fn(() => 0),
    _FPDFAnnot_RemoveObject: vi.fn(() => 0),
    _FPDFAnnot_GetValueType: vi.fn(() => 1),
    _FPDFAnnot_GetNumberValue: vi.fn(() => 0),
    _FPDFAnnot_GetLink: vi.fn(() => 0),
    _FPDFAnnot_SetURI: vi.fn(() => 0),
    _FPDFAnnot_GetFontSize: vi.fn(() => 0),
    _FPDFAnnot_GetFormControlCount: vi.fn(() => 0),
    _FPDFAnnot_GetFormControlIndex: vi.fn(() => -1),
    _FPDFAnnot_GetFormFieldExportValue: vi.fn(() => 0),
    _FPDFAnnot_GetFormFieldType: vi.fn(() => 0),
    _FPDFAnnot_GetFormFieldFlags: vi.fn(() => 0),
    _FPDFAnnot_GetFormFieldName: vi.fn(() => 0),
    _FPDFAnnot_GetFormFieldValue: vi.fn(() => 0),
    _FPDFAnnot_GetFormFieldAlternateName: vi.fn(() => 0),
    _FPDFAnnot_GetOptionCount: vi.fn(() => 0),
    _FPDFAnnot_GetOptionLabel: vi.fn(() => 0),
    _FPDFAnnot_IsOptionSelected: vi.fn(() => 0),
    _FPDFAnnot_IsSupportedSubtype: vi.fn(() => 1),
    _FPDFAnnot_IsObjectSupportedSubtype: vi.fn(() => 1),
    _FPDFAnnot_GetFocusableSubtypesCount: vi.fn(() => 0),
    _FPDFAnnot_GetFocusableSubtypes: vi.fn(() => 0),
    _FPDFAnnot_SetFocusableSubtypes: vi.fn(() => 1),

    // Structure Tree
    _FPDF_StructTree_GetForPage: vi.fn(() => 0),
    _FPDF_StructTree_Close: vi.fn(),
    _FPDF_StructTree_CountChildren: vi.fn(() => 0),
    _FPDF_StructTree_GetChildAtIndex: vi.fn(() => 0),
    _FPDF_StructElement_GetType: vi.fn(() => 0),
    _FPDF_StructElement_GetTitle: vi.fn(() => 0),
    _FPDF_StructElement_GetAltText: vi.fn(() => 0),
    _FPDF_StructElement_GetLang: vi.fn(() => 0),
    _FPDF_StructElement_CountChildren: vi.fn(() => 0),
    _FPDF_StructElement_GetChildAtIndex: vi.fn(() => 0),

    // Text Search
    _FPDFText_FindStart: vi.fn(() => 0),
    _FPDFText_FindNext: vi.fn(() => 0),
    _FPDFText_FindPrev: vi.fn(() => 0),
    _FPDFText_FindClose: vi.fn(),
    _FPDFText_GetSchResultIndex: vi.fn(() => 0),
    _FPDFText_GetSchCount: vi.fn(() => 0),
    _FPDFText_GetMatrix: vi.fn(() => 0),
    _FPDFText_LoadFont: vi.fn(() => 0),

    // Links
    _FPDFLink_GetLinkAtPoint: vi.fn(() => 0),
    _FPDFLink_GetLinkZOrderAtPoint: vi.fn(() => -1),
    _FPDFLink_LoadWebLinks: vi.fn(() => 0),
    _FPDFLink_CountWebLinks: vi.fn(() => 0),
    _FPDFLink_GetURL: vi.fn(() => 0),
    _FPDFLink_CountRects: vi.fn(() => 0),
    _FPDFLink_GetRect: vi.fn(() => 0),
    _FPDFLink_GetTextRange: vi.fn(() => 0),
    _FPDFLink_CloseWebLinks: vi.fn(),
    // biome-ignore lint/suspicious/noExplicitAny: Mock args
    _FPDFLink_Enumerate: vi.fn((..._args: any[]) => 0),
    _FPDFLink_GetAnnotRect: vi.fn(() => 0),
    _FPDFLink_GetAnnot: vi.fn(() => 0),
    _FPDFLink_CountQuadPoints: vi.fn(() => 0),
    _FPDFLink_GetQuadPoints: vi.fn(() => 0),
    _FPDFLink_GetAction: vi.fn(() => 0),
    _FPDFLink_GetDest: vi.fn(() => 0),
    _FPDFBookmark_GetFirstChild: vi.fn(() => 0),
    _FPDFBookmark_GetNextSibling: vi.fn(() => 0),
    _FPDFBookmark_GetTitle: vi.fn(() => 0),
    _FPDFBookmark_GetDest: vi.fn(() => 0),
    _FPDFBookmark_GetCount: vi.fn(() => 0),
    _FPDFBookmark_Find: vi.fn(() => 0),
    _FPDFBookmark_GetAction: vi.fn(() => 0),
    _FPDFDest_GetDestPageIndex: vi.fn(() => -1),
    _FPDFDest_GetView: vi.fn(() => 0),
    // biome-ignore lint/suspicious/noExplicitAny: Mock args
    _FPDFDest_GetLocationInPage: vi.fn((..._args: any[]) => 0),

    // Actions
    _FPDFAction_GetType: vi.fn(() => 0),
    _FPDFAction_GetURIPath: vi.fn(() => 0),
    _FPDFAction_GetFilePath: vi.fn(() => 0),
    _FPDFAction_GetDest: vi.fn(() => 0),

    // Attachments
    _FPDFDoc_GetAttachmentCount: vi.fn(() => 0),
    _FPDFDoc_GetAttachment: vi.fn(() => 0),
    _FPDFDoc_AddAttachment: vi.fn(() => 0),
    _FPDFDoc_DeleteAttachment: vi.fn(() => 0),
    _FPDFAttachment_GetName: vi.fn(() => 0),
    _FPDFAttachment_GetFile: vi.fn(() => 0),
    _FPDFAttachment_SetFile: vi.fn(() => 0),
    _FPDFAttachment_HasKey: vi.fn(() => 0),
    _FPDFAttachment_GetValueType: vi.fn(() => 0),
    _FPDFAttachment_GetStringValue: vi.fn(() => 0),
    _FPDFAttachment_SetStringValue: vi.fn(() => 0),

    // Signatures
    _FPDF_GetSignatureCount: vi.fn(() => 0),
    _FPDF_GetSignatureObject: vi.fn(() => 0),
    _FPDFSignatureObj_GetContents: vi.fn(() => 0),
    _FPDFSignatureObj_GetByteRange: vi.fn(() => 0),
    _FPDFSignatureObj_GetSubFilter: vi.fn(() => 0),
    _FPDFSignatureObj_GetReason: vi.fn(() => 0),
    _FPDFSignatureObj_GetTime: vi.fn(() => 0),
    _FPDFSignatureObj_GetDocMDPPermission: vi.fn(() => 0),

    // Page Import/Export
    _FPDF_ImportPages: vi.fn(() => 1),
    _FPDF_ImportPagesByIndex: vi.fn(() => 1),
    _FPDF_ImportNPagesToOne: vi.fn(() => 100),
    _FPDF_CopyViewerPreferences: vi.fn(() => 1),

    // Document
    _FPDFDoc_GetPageMode: vi.fn(() => 0),

    // Form Fill
    _FPDF_GetFormType: vi.fn(() => 0),
    _FORM_ForceToKillFocus: vi.fn(() => 0),
    _FPDF_SetFormFieldHighlightColor: vi.fn(),
    _FPDF_SetFormFieldHighlightAlpha: vi.fn(),

    // Saving
    _FPDF_SaveAsCopy: vi.fn(() => 0),
    _FPDF_SaveWithVersion: vi.fn(() => 0),

    // Named Dests
    _FPDF_CountNamedDests: vi.fn(() => 0),
    _FPDF_GetNamedDestByName: vi.fn(() => 0),
    _FPDF_GetNamedDest: vi.fn(() => 0),

    // Viewer Prefs
    _FPDF_VIEWERREF_GetPrintScaling: vi.fn(() => 1),
    _FPDF_VIEWERREF_GetNumCopies: vi.fn(() => 1),
    _FPDF_VIEWERREF_GetDuplex: vi.fn(() => 0),
    _FPDF_VIEWERREF_GetPrintPageRange: vi.fn(() => 0),
    _FPDF_VIEWERREF_GetPrintPageRangeCount: vi.fn(() => 0),
    _FPDF_VIEWERREF_GetPrintPageRangeElement: vi.fn(() => -1),
    _FPDF_VIEWERREF_GetName: vi.fn(() => 0),

    // JavaScript
    _FPDFDoc_GetJavaScriptActionCount: vi.fn(() => 0),
    _FPDFDoc_GetJavaScriptAction: vi.fn(() => 0),
    _FPDFJavaScriptAction_GetName: vi.fn(() => 0),
    _FPDFJavaScriptAction_GetScript: vi.fn(() => 0),
    _FPDFDoc_CloseJavaScriptAction: vi.fn(),

    // Progressive Loading
    _FPDFAvail_Create: vi.fn(() => 700), // Return dummy avail handle
    _FPDFAvail_Destroy: vi.fn(),
    _FPDFAvail_IsDocAvail: vi.fn(() => 1), // Available
    _FPDFAvail_GetDocument: vi.fn(() => 100), // Return dummy doc handle
    _FPDFAvail_GetFirstPageNum: vi.fn(() => 0),
    _FPDFAvail_IsPageAvail: vi.fn(() => 1), // Available
    _FPDFAvail_IsFormAvail: vi.fn(() => 1), // Available
    _FPDFAvail_IsLinearized: vi.fn(() => 1), // Linearised
  };
}
