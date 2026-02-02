#![allow(non_camel_case_types, non_snake_case, dead_code)]

//! Raw FFI type definitions for PDFium C API.
//!
//! These are manually defined (not bindgen) for simplicity and fewer build dependencies.

use std::os::raw::{c_char, c_int, c_uint, c_ulong, c_void};

pub type FPDF_DOCUMENT = *mut c_void;
pub type FPDF_PAGE = *mut c_void;
pub type FPDF_TEXTPAGE = *mut c_void;
pub type FPDF_BITMAP = *mut c_void;
pub type FPDF_BOOL = c_int;
pub type FPDF_DWORD = c_ulong;
pub type FPDF_STRING = *const c_char;

#[repr(C)]
pub struct FPDF_LIBRARY_CONFIG {
    pub version: c_int,
    pub m_pUserFontPaths: *const *const c_char,
    pub m_pIsolate: *mut c_void,
    pub m_v8EmbedderSlot: c_uint,
    pub m_pPlatform: *mut c_void,
}

// Function pointer type aliases for loaded symbols
pub type FnInitLibraryWithConfig = unsafe extern "C" fn(*const FPDF_LIBRARY_CONFIG);
pub type FnDestroyLibrary = unsafe extern "C" fn();
pub type FnGetLastError = unsafe extern "C" fn() -> c_ulong;

pub type FnLoadMemDocument =
    unsafe extern "C" fn(*const c_void, c_int, FPDF_STRING) -> FPDF_DOCUMENT;
pub type FnCloseDocument = unsafe extern "C" fn(FPDF_DOCUMENT);
pub type FnGetPageCount = unsafe extern "C" fn(FPDF_DOCUMENT) -> c_int;

pub type FnLoadPage = unsafe extern "C" fn(FPDF_DOCUMENT, c_int) -> FPDF_PAGE;
pub type FnClosePage = unsafe extern "C" fn(FPDF_PAGE);
pub type FnGetPageWidthF = unsafe extern "C" fn(FPDF_PAGE) -> f32;
pub type FnGetPageHeightF = unsafe extern "C" fn(FPDF_PAGE) -> f32;

pub type FnTextLoadPage = unsafe extern "C" fn(FPDF_PAGE) -> FPDF_TEXTPAGE;
pub type FnTextClosePage = unsafe extern "C" fn(FPDF_TEXTPAGE);
pub type FnTextCountChars = unsafe extern "C" fn(FPDF_TEXTPAGE) -> c_int;
pub type FnTextGetText =
    unsafe extern "C" fn(FPDF_TEXTPAGE, c_int, c_int, *mut u16) -> c_int;

pub type FnBitmapCreateEx =
    unsafe extern "C" fn(c_int, c_int, c_int, *mut c_void, c_int) -> FPDF_BITMAP;
pub type FnBitmapFillRect =
    unsafe extern "C" fn(FPDF_BITMAP, c_int, c_int, c_int, c_int, FPDF_DWORD);
pub type FnBitmapDestroy = unsafe extern "C" fn(FPDF_BITMAP);
pub type FnBitmapGetBuffer = unsafe extern "C" fn(FPDF_BITMAP) -> *mut c_void;
pub type FnBitmapGetStride = unsafe extern "C" fn(FPDF_BITMAP) -> c_int;

pub type FnRenderPageBitmap =
    unsafe extern "C" fn(FPDF_BITMAP, FPDF_PAGE, c_int, c_int, c_int, c_int, c_int, c_int);

// Metadata / Document info
pub type FnGetMetaText =
    unsafe extern "C" fn(FPDF_DOCUMENT, FPDF_STRING, *mut c_void, c_ulong) -> c_ulong;
pub type FnGetFileVersion = unsafe extern "C" fn(FPDF_DOCUMENT, *mut c_int) -> FPDF_BOOL;
pub type FnGetDocPermissions = unsafe extern "C" fn(FPDF_DOCUMENT) -> c_ulong;
pub type FnGetDocUserPermissions = unsafe extern "C" fn(FPDF_DOCUMENT) -> c_ulong;
pub type FnDocGetPageMode = unsafe extern "C" fn(FPDF_DOCUMENT) -> c_int;
pub type FnGetSecurityHandlerRevision = unsafe extern "C" fn(FPDF_DOCUMENT) -> c_int;
pub type FnCatalogIsTagged = unsafe extern "C" fn(FPDF_DOCUMENT) -> FPDF_BOOL;
pub type FnGetPageLabel =
    unsafe extern "C" fn(FPDF_DOCUMENT, c_int, *mut c_void, c_ulong) -> c_ulong;

// Page boxes
pub type FnPageGetBox =
    unsafe extern "C" fn(FPDF_PAGE, *mut f32, *mut f32, *mut f32, *mut f32) -> FPDF_BOOL;
pub type FnPageSetBox = unsafe extern "C" fn(FPDF_PAGE, f32, f32, f32, f32);

// Bounding box — uses FS_RECTF output struct but we pass 4 floats via pointer
pub type FnPageGetBoundingBox =
    unsafe extern "C" fn(FPDF_PAGE, *mut f32) -> FPDF_BOOL;

// Signatures
pub type FPDF_SIGNATURE = *mut c_void;
pub type FnGetSignatureCount = unsafe extern "C" fn(FPDF_DOCUMENT) -> c_int;
pub type FnGetSignatureObject = unsafe extern "C" fn(FPDF_DOCUMENT, c_int) -> FPDF_SIGNATURE;
pub type FnSignatureGetContents =
    unsafe extern "C" fn(FPDF_SIGNATURE, *mut c_void, c_ulong) -> c_ulong;
pub type FnSignatureGetByteRange =
    unsafe extern "C" fn(FPDF_SIGNATURE, *mut c_int, c_ulong) -> c_ulong;
pub type FnSignatureGetSubFilter =
    unsafe extern "C" fn(FPDF_SIGNATURE, *mut c_char, c_ulong) -> c_ulong;
pub type FnSignatureGetReason =
    unsafe extern "C" fn(FPDF_SIGNATURE, *mut c_void, c_ulong) -> c_ulong;
pub type FnSignatureGetTime =
    unsafe extern "C" fn(FPDF_SIGNATURE, *mut c_char, c_ulong) -> c_ulong;
pub type FnSignatureGetDocMDPPermission = unsafe extern "C" fn(FPDF_SIGNATURE) -> c_int;

// Text character font info
pub type FnTextGetFontSize =
    unsafe extern "C" fn(FPDF_TEXTPAGE, c_int) -> f64;
pub type FnTextGetFontWeight =
    unsafe extern "C" fn(FPDF_TEXTPAGE, c_int) -> c_int;
pub type FnTextGetFontInfo =
    unsafe extern "C" fn(FPDF_TEXTPAGE, c_int, *mut c_void, c_ulong, *mut c_int) -> c_ulong;
pub type FnTextGetTextRenderMode =
    unsafe extern "C" fn(FPDF_TEXTPAGE, c_int) -> c_int;

// Attachments
pub type FPDF_ATTACHMENT = *mut c_void;
pub type FnDocGetAttachmentCount = unsafe extern "C" fn(FPDF_DOCUMENT) -> c_int;
pub type FnDocGetAttachment = unsafe extern "C" fn(FPDF_DOCUMENT, c_int) -> FPDF_ATTACHMENT;
pub type FnAttachmentGetName =
    unsafe extern "C" fn(FPDF_ATTACHMENT, *mut c_void, c_ulong) -> c_ulong;
pub type FnAttachmentGetFile =
    unsafe extern "C" fn(FPDF_ATTACHMENT, *mut c_void, c_ulong, *mut c_ulong) -> FPDF_BOOL;

// Page import
pub type FnImportPages =
    unsafe extern "C" fn(FPDF_DOCUMENT, FPDF_DOCUMENT, FPDF_STRING, c_int) -> FPDF_BOOL;
pub type FnImportPagesByIndex =
    unsafe extern "C" fn(FPDF_DOCUMENT, FPDF_DOCUMENT, *const c_int, c_ulong, c_int) -> FPDF_BOOL;
pub type FnImportNPagesToOne =
    unsafe extern "C" fn(FPDF_DOCUMENT, f32, f32, usize, usize) -> FPDF_DOCUMENT;
pub type FnCopyViewerPreferences =
    unsafe extern "C" fn(FPDF_DOCUMENT, FPDF_DOCUMENT) -> FPDF_BOOL;

// Save / export
/// FPDF_FILEWRITE-compatible struct with an embedded buffer for collecting output.
/// The first two fields must match the FPDF_FILEWRITE C struct layout.
#[repr(C)]
pub struct SaveContext {
    pub version: c_int,
    pub write_block: unsafe extern "C" fn(*mut SaveContext, *const c_void, c_ulong) -> c_int,
    pub buffer: Vec<u8>,
}

// Bookmarks / Links
pub type FPDF_BOOKMARK = *mut c_void;
pub type FPDF_DEST = *mut c_void;
pub type FPDF_ACTION = *mut c_void;

pub type FnBookmarkGetFirstChild =
    unsafe extern "C" fn(FPDF_DOCUMENT, FPDF_BOOKMARK) -> FPDF_BOOKMARK;
pub type FnBookmarkGetNextSibling =
    unsafe extern "C" fn(FPDF_DOCUMENT, FPDF_BOOKMARK) -> FPDF_BOOKMARK;
pub type FnBookmarkGetTitle =
    unsafe extern "C" fn(FPDF_BOOKMARK, *mut c_void, c_ulong) -> c_ulong;
pub type FnBookmarkGetCount = unsafe extern "C" fn(FPDF_BOOKMARK) -> c_int;
pub type FnBookmarkGetDest =
    unsafe extern "C" fn(FPDF_DOCUMENT, FPDF_BOOKMARK) -> FPDF_DEST;
pub type FnBookmarkGetAction = unsafe extern "C" fn(FPDF_BOOKMARK) -> FPDF_ACTION;
pub type FnDestGetDestPageIndex =
    unsafe extern "C" fn(FPDF_DOCUMENT, FPDF_DEST) -> c_int;
pub type FnActionGetType = unsafe extern "C" fn(FPDF_ACTION) -> c_ulong;

// Links
pub type FPDF_LINK = *mut c_void;

pub type FnLinkEnumerate =
    unsafe extern "C" fn(FPDF_PAGE, *mut c_int, *mut FPDF_LINK) -> FPDF_BOOL;
pub type FnLinkGetAnnotRect =
    unsafe extern "C" fn(FPDF_LINK, *mut FS_RECTF) -> FPDF_BOOL;
pub type FnLinkGetAction = unsafe extern "C" fn(FPDF_LINK) -> FPDF_ACTION;
pub type FnLinkGetDest =
    unsafe extern "C" fn(FPDF_DOCUMENT, FPDF_LINK) -> FPDF_DEST;
pub type FnActionGetDest =
    unsafe extern "C" fn(FPDF_DOCUMENT, FPDF_ACTION) -> FPDF_DEST;
pub type FnActionGetURIPath =
    unsafe extern "C" fn(FPDF_DOCUMENT, FPDF_ACTION, *mut c_void, c_ulong) -> c_ulong;
pub type FnActionGetFilePath =
    unsafe extern "C" fn(FPDF_ACTION, *mut c_void, c_ulong) -> c_ulong;
pub type FnDestGetView =
    unsafe extern "C" fn(FPDF_DEST, *mut c_ulong, *mut f32) -> c_ulong;
pub type FnDestGetLocationInPage =
    unsafe extern "C" fn(FPDF_DEST, *mut FPDF_BOOL, *mut FPDF_BOOL, *mut FPDF_BOOL, *mut f32, *mut f32, *mut f32) -> FPDF_BOOL;

// Annotations
pub type FPDF_ANNOTATION = *mut c_void;

/// FS_RECTF: { left: f32, top: f32, right: f32, bottom: f32 }
#[repr(C)]
pub struct FS_RECTF {
    pub left: f32,
    pub top: f32,
    pub right: f32,
    pub bottom: f32,
}

pub type FnPageGetAnnotCount = unsafe extern "C" fn(FPDF_PAGE) -> c_int;
pub type FnPageGetAnnot = unsafe extern "C" fn(FPDF_PAGE, c_int) -> FPDF_ANNOTATION;
pub type FnPageCloseAnnot = unsafe extern "C" fn(FPDF_ANNOTATION);
pub type FnPageCreateAnnot = unsafe extern "C" fn(FPDF_PAGE, c_int) -> FPDF_ANNOTATION;
pub type FnPageRemoveAnnot = unsafe extern "C" fn(FPDF_PAGE, c_int) -> FPDF_BOOL;
pub type FnAnnotGetSubtype = unsafe extern "C" fn(FPDF_ANNOTATION) -> c_int;
pub type FnAnnotGetRect = unsafe extern "C" fn(FPDF_ANNOTATION, *mut FS_RECTF) -> FPDF_BOOL;
pub type FnAnnotSetRect = unsafe extern "C" fn(FPDF_ANNOTATION, *const FS_RECTF) -> FPDF_BOOL;
pub type FnAnnotGetColor =
    unsafe extern "C" fn(FPDF_ANNOTATION, c_int, *mut c_uint, *mut c_uint, *mut c_uint, *mut c_uint) -> FPDF_BOOL;
pub type FnAnnotSetColor =
    unsafe extern "C" fn(FPDF_ANNOTATION, c_int, c_uint, c_uint, c_uint, c_uint) -> FPDF_BOOL;
pub type FnAnnotGetFlags = unsafe extern "C" fn(FPDF_ANNOTATION) -> c_int;
pub type FnAnnotSetFlags = unsafe extern "C" fn(FPDF_ANNOTATION, c_int) -> FPDF_BOOL;
pub type FnAnnotSetStringValue =
    unsafe extern "C" fn(FPDF_ANNOTATION, FPDF_STRING, *const u16) -> FPDF_BOOL;
pub type FnAnnotSetBorder =
    unsafe extern "C" fn(FPDF_ANNOTATION, f32, f32, f32) -> FPDF_BOOL;

/// FS_QUADPOINTSF: 8 floats (x1,y1,x2,y2,x3,y3,x4,y4)
#[repr(C)]
pub struct FS_QUADPOINTSF {
    pub x1: f32, pub y1: f32,
    pub x2: f32, pub y2: f32,
    pub x3: f32, pub y3: f32,
    pub x4: f32, pub y4: f32,
}

pub type FnAnnotSetAttachmentPoints =
    unsafe extern "C" fn(FPDF_ANNOTATION, usize, *const FS_QUADPOINTSF) -> FPDF_BOOL;
pub type FnAnnotAppendAttachmentPoints =
    unsafe extern "C" fn(FPDF_ANNOTATION, *const FS_QUADPOINTSF) -> FPDF_BOOL;
pub type FnAnnotSetURI =
    unsafe extern "C" fn(FPDF_ANNOTATION, FPDF_STRING) -> FPDF_BOOL;

// Text character extended operations
pub type FnTextGetUnicode =
    unsafe extern "C" fn(FPDF_TEXTPAGE, c_int) -> c_uint;
pub type FnTextIsGenerated =
    unsafe extern "C" fn(FPDF_TEXTPAGE, c_int) -> c_int;
pub type FnTextIsHyphen =
    unsafe extern "C" fn(FPDF_TEXTPAGE, c_int) -> c_int;
pub type FnTextHasUnicodeMapError =
    unsafe extern "C" fn(FPDF_TEXTPAGE, c_int) -> c_int;
pub type FnTextGetCharAngle =
    unsafe extern "C" fn(FPDF_TEXTPAGE, c_int) -> f32;
pub type FnTextGetCharOrigin =
    unsafe extern "C" fn(FPDF_TEXTPAGE, c_int, *mut f64, *mut f64) -> c_int;
pub type FnTextGetCharBox =
    unsafe extern "C" fn(FPDF_TEXTPAGE, c_int, *mut f64, *mut f64, *mut f64, *mut f64) -> c_int;
pub type FnTextGetLooseCharBox =
    unsafe extern "C" fn(FPDF_TEXTPAGE, c_int, *mut f32) -> c_int;
pub type FnTextGetCharIndexAtPos =
    unsafe extern "C" fn(FPDF_TEXTPAGE, f64, f64, f64, f64) -> c_int;
pub type FnTextGetFillColor =
    unsafe extern "C" fn(FPDF_TEXTPAGE, c_int, *mut c_uint, *mut c_uint, *mut c_uint, *mut c_uint) -> c_int;
pub type FnTextGetStrokeColor =
    unsafe extern "C" fn(FPDF_TEXTPAGE, c_int, *mut c_uint, *mut c_uint, *mut c_uint, *mut c_uint) -> c_int;
pub type FnTextGetMatrix =
    unsafe extern "C" fn(FPDF_TEXTPAGE, c_int, *mut f64) -> c_int;

// Text search
pub type FPDF_SCHHANDLE = *mut c_void;
pub type FnTextFindStart =
    unsafe extern "C" fn(FPDF_TEXTPAGE, *const u16, c_ulong, c_int) -> FPDF_SCHHANDLE;
pub type FnTextFindNext =
    unsafe extern "C" fn(FPDF_SCHHANDLE) -> c_int;
pub type FnTextFindPrev =
    unsafe extern "C" fn(FPDF_SCHHANDLE) -> c_int;
pub type FnTextFindClose =
    unsafe extern "C" fn(FPDF_SCHHANDLE);
pub type FnTextGetSchResultIndex =
    unsafe extern "C" fn(FPDF_SCHHANDLE) -> c_int;
pub type FnTextGetSchCount =
    unsafe extern "C" fn(FPDF_SCHHANDLE) -> c_int;

// Text rectangle / bounded text
pub type FnTextCountRects =
    unsafe extern "C" fn(FPDF_TEXTPAGE, c_int, c_int) -> c_int;
pub type FnTextGetRect =
    unsafe extern "C" fn(FPDF_TEXTPAGE, c_int, *mut f64, *mut f64, *mut f64, *mut f64) -> c_int;
pub type FnTextGetBoundedText =
    unsafe extern "C" fn(FPDF_TEXTPAGE, f64, f64, f64, f64, *mut u16, c_int) -> c_int;

// Page rotation, flatten, transparency, content generation
pub type FnPageGetRotation = unsafe extern "C" fn(FPDF_PAGE) -> c_int;
pub type FnPageSetRotation = unsafe extern "C" fn(FPDF_PAGE, c_int);
pub type FnPageHasTransparency = unsafe extern "C" fn(FPDF_PAGE) -> c_int;
pub type FnPageFlatten = unsafe extern "C" fn(FPDF_PAGE, c_int) -> c_int;
pub type FnPageGenerateContent = unsafe extern "C" fn(FPDF_PAGE) -> c_int;

// Coordinate conversion
pub type FnDeviceToPage =
    unsafe extern "C" fn(FPDF_PAGE, c_int, c_int, c_int, c_int, c_int, c_int, c_int, *mut f64, *mut f64) -> c_int;
pub type FnPageToDevice =
    unsafe extern "C" fn(FPDF_PAGE, c_int, c_int, c_int, c_int, c_int, f64, f64, *mut c_int, *mut c_int) -> c_int;

pub type FnSaveAsCopy =
    unsafe extern "C" fn(FPDF_DOCUMENT, *mut SaveContext, FPDF_DWORD) -> FPDF_BOOL;
pub type FnSaveWithVersion =
    unsafe extern "C" fn(FPDF_DOCUMENT, *mut SaveContext, FPDF_DWORD, c_int) -> FPDF_BOOL;
