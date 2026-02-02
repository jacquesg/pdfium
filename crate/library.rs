//! PDFium library loader using libloading.
//!
//! Loads the native PDFium shared library at runtime and provides
//! safe wrappers around the raw FFI function pointers.

use crate::bindings::*;
use libloading::{Library, Symbol};
use std::collections::HashMap;
use std::ffi::CString;
use std::os::raw::{c_char, c_int, c_uint, c_ulong, c_void};
use std::path::Path;
use std::ptr;

/// Handle map entry — maps a u32 handle to a raw pointer.
enum HandleEntry {
    Document(FPDF_DOCUMENT),
    Page(FPDF_PAGE),
    TextPage(FPDF_TEXTPAGE),
}

/// A node in the bookmark (outline) tree.
pub struct BookmarkNode {
    pub title: String,
    /// Zero-based page index, or -1 if no destination.
    pub page_index: i32,
    pub children: Vec<BookmarkNode>,
}

/// Read-only annotation data extracted from a page.
pub struct AnnotationInfo {
    pub index: i32,
    pub subtype: i32,
    pub left: f32,
    pub top: f32,
    pub right: f32,
    pub bottom: f32,
    pub has_colour: bool,
    pub r: u32,
    pub g: u32,
    pub b: u32,
    pub a: u32,
}

/// Read-only link data extracted from a page.
pub struct LinkInfo {
    pub index: i32,
    /// Bounding rect
    pub left: f32,
    pub bottom: f32,
    pub right: f32,
    pub top: f32,
    /// Action info
    pub has_action: bool,
    pub action_type: u32,
    pub uri: Option<String>,
    pub file_path: Option<String>,
    /// Destination info
    pub has_dest: bool,
    pub dest_page_index: i32,
    pub dest_fit_type: u32,
    pub has_x: bool,
    pub has_y: bool,
    pub has_zoom: bool,
    pub x: f32,
    pub y: f32,
    pub zoom: f32,
}

/// Loaded PDFium library with dynamically resolved function pointers.
#[allow(dead_code)]
pub struct PdfiumLibrary {
    _lib: Library,

    // Core
    init_library_with_config: Symbol<'static, FnInitLibraryWithConfig>,
    destroy_library: Symbol<'static, FnDestroyLibrary>,
    get_last_error: Symbol<'static, FnGetLastError>,

    // Document
    load_mem_document: Symbol<'static, FnLoadMemDocument>,
    close_document: Symbol<'static, FnCloseDocument>,
    get_page_count: Symbol<'static, FnGetPageCount>,

    // Page
    load_page: Symbol<'static, FnLoadPage>,
    close_page: Symbol<'static, FnClosePage>,
    get_page_width_f: Symbol<'static, FnGetPageWidthF>,
    get_page_height_f: Symbol<'static, FnGetPageHeightF>,

    // Text
    text_load_page: Symbol<'static, FnTextLoadPage>,
    text_close_page: Symbol<'static, FnTextClosePage>,
    text_count_chars: Symbol<'static, FnTextCountChars>,
    text_get_text: Symbol<'static, FnTextGetText>,

    // Text character font info
    text_get_font_size: Symbol<'static, FnTextGetFontSize>,
    text_get_font_weight: Symbol<'static, FnTextGetFontWeight>,
    text_get_font_info: Symbol<'static, FnTextGetFontInfo>,
    text_get_text_render_mode: Option<Symbol<'static, FnTextGetTextRenderMode>>,

    // Bitmap / Render
    bitmap_create_ex: Symbol<'static, FnBitmapCreateEx>,
    bitmap_fill_rect: Symbol<'static, FnBitmapFillRect>,
    bitmap_destroy: Symbol<'static, FnBitmapDestroy>,
    bitmap_get_buffer: Symbol<'static, FnBitmapGetBuffer>,
    bitmap_get_stride: Symbol<'static, FnBitmapGetStride>,
    render_page_bitmap: Symbol<'static, FnRenderPageBitmap>,

    // Metadata / Document info
    get_meta_text: Symbol<'static, FnGetMetaText>,
    get_file_version: Symbol<'static, FnGetFileVersion>,
    get_doc_permissions: Symbol<'static, FnGetDocPermissions>,
    get_doc_user_permissions: Symbol<'static, FnGetDocUserPermissions>,
    doc_get_page_mode: Symbol<'static, FnDocGetPageMode>,
    get_security_handler_revision: Symbol<'static, FnGetSecurityHandlerRevision>,
    catalog_is_tagged: Symbol<'static, FnCatalogIsTagged>,
    get_page_label: Symbol<'static, FnGetPageLabel>,

    // Page boxes
    page_get_media_box: Symbol<'static, FnPageGetBox>,
    page_get_crop_box: Symbol<'static, FnPageGetBox>,
    page_get_bleed_box: Symbol<'static, FnPageGetBox>,
    page_get_trim_box: Symbol<'static, FnPageGetBox>,
    page_get_art_box: Symbol<'static, FnPageGetBox>,
    page_set_media_box: Symbol<'static, FnPageSetBox>,
    page_set_crop_box: Symbol<'static, FnPageSetBox>,
    page_set_bleed_box: Symbol<'static, FnPageSetBox>,
    page_set_trim_box: Symbol<'static, FnPageSetBox>,
    page_set_art_box: Symbol<'static, FnPageSetBox>,

    // Signatures
    get_signature_count: Symbol<'static, FnGetSignatureCount>,
    get_signature_object: Symbol<'static, FnGetSignatureObject>,
    signature_get_contents: Symbol<'static, FnSignatureGetContents>,
    signature_get_byte_range: Symbol<'static, FnSignatureGetByteRange>,
    signature_get_sub_filter: Symbol<'static, FnSignatureGetSubFilter>,
    signature_get_reason: Symbol<'static, FnSignatureGetReason>,
    signature_get_time: Symbol<'static, FnSignatureGetTime>,
    signature_get_doc_mdp_permission: Symbol<'static, FnSignatureGetDocMDPPermission>,

    // Attachments
    doc_get_attachment_count: Symbol<'static, FnDocGetAttachmentCount>,
    doc_get_attachment: Symbol<'static, FnDocGetAttachment>,
    attachment_get_name: Symbol<'static, FnAttachmentGetName>,
    attachment_get_file: Symbol<'static, FnAttachmentGetFile>,

    // Page import
    import_pages: Symbol<'static, FnImportPages>,
    import_pages_by_index: Symbol<'static, FnImportPagesByIndex>,
    import_n_pages_to_one: Symbol<'static, FnImportNPagesToOne>,
    copy_viewer_preferences: Symbol<'static, FnCopyViewerPreferences>,

    // Bookmarks / Links
    bookmark_get_first_child: Symbol<'static, FnBookmarkGetFirstChild>,
    bookmark_get_next_sibling: Symbol<'static, FnBookmarkGetNextSibling>,
    bookmark_get_title: Symbol<'static, FnBookmarkGetTitle>,
    bookmark_get_count: Symbol<'static, FnBookmarkGetCount>,
    bookmark_get_dest: Symbol<'static, FnBookmarkGetDest>,
    bookmark_get_action: Symbol<'static, FnBookmarkGetAction>,
    dest_get_dest_page_index: Symbol<'static, FnDestGetDestPageIndex>,
    action_get_type: Symbol<'static, FnActionGetType>,

    // Links
    link_enumerate: Symbol<'static, FnLinkEnumerate>,
    link_get_annot_rect: Symbol<'static, FnLinkGetAnnotRect>,
    link_get_action: Symbol<'static, FnLinkGetAction>,
    link_get_dest: Symbol<'static, FnLinkGetDest>,
    action_get_dest: Symbol<'static, FnActionGetDest>,
    action_get_uri_path: Symbol<'static, FnActionGetURIPath>,
    action_get_file_path: Symbol<'static, FnActionGetFilePath>,
    dest_get_view: Symbol<'static, FnDestGetView>,
    dest_get_location_in_page: Symbol<'static, FnDestGetLocationInPage>,

    // Annotations (read)
    page_get_annot_count: Symbol<'static, FnPageGetAnnotCount>,
    page_get_annot: Symbol<'static, FnPageGetAnnot>,
    page_close_annot: Symbol<'static, FnPageCloseAnnot>,
    annot_get_subtype: Symbol<'static, FnAnnotGetSubtype>,
    annot_get_rect: Symbol<'static, FnAnnotGetRect>,
    annot_get_color: Symbol<'static, FnAnnotGetColor>,

    // Annotations (mutation)
    page_create_annot: Symbol<'static, FnPageCreateAnnot>,
    page_remove_annot: Symbol<'static, FnPageRemoveAnnot>,
    annot_set_rect: Symbol<'static, FnAnnotSetRect>,
    annot_set_color: Symbol<'static, FnAnnotSetColor>,
    annot_get_flags: Symbol<'static, FnAnnotGetFlags>,
    annot_set_flags: Symbol<'static, FnAnnotSetFlags>,
    annot_set_string_value: Symbol<'static, FnAnnotSetStringValue>,
    annot_set_border: Symbol<'static, FnAnnotSetBorder>,
    annot_set_attachment_points: Symbol<'static, FnAnnotSetAttachmentPoints>,
    annot_append_attachment_points: Symbol<'static, FnAnnotAppendAttachmentPoints>,
    annot_set_uri: Symbol<'static, FnAnnotSetURI>,

    // Text character extended operations
    text_get_unicode: Symbol<'static, FnTextGetUnicode>,
    text_is_generated: Symbol<'static, FnTextIsGenerated>,
    text_is_hyphen: Symbol<'static, FnTextIsHyphen>,
    text_has_unicode_map_error: Symbol<'static, FnTextHasUnicodeMapError>,
    text_get_char_angle: Symbol<'static, FnTextGetCharAngle>,
    text_get_char_origin: Symbol<'static, FnTextGetCharOrigin>,
    text_get_char_box: Symbol<'static, FnTextGetCharBox>,
    text_get_loose_char_box: Symbol<'static, FnTextGetLooseCharBox>,
    text_get_char_index_at_pos: Symbol<'static, FnTextGetCharIndexAtPos>,
    text_get_fill_color: Symbol<'static, FnTextGetFillColor>,
    text_get_stroke_color: Symbol<'static, FnTextGetStrokeColor>,
    text_get_matrix: Symbol<'static, FnTextGetMatrix>,

    // Text search
    text_find_start: Symbol<'static, FnTextFindStart>,
    text_find_next: Symbol<'static, FnTextFindNext>,
    text_find_prev: Symbol<'static, FnTextFindPrev>,
    text_find_close: Symbol<'static, FnTextFindClose>,
    text_get_sch_result_index: Symbol<'static, FnTextGetSchResultIndex>,
    text_get_sch_count: Symbol<'static, FnTextGetSchCount>,

    // Text rectangle / bounded text
    text_count_rects: Symbol<'static, FnTextCountRects>,
    text_get_rect: Symbol<'static, FnTextGetRect>,
    text_get_bounded_text: Symbol<'static, FnTextGetBoundedText>,

    // Page operations (rotation, flatten, transparency, content)
    page_get_rotation: Symbol<'static, FnPageGetRotation>,
    page_set_rotation: Symbol<'static, FnPageSetRotation>,
    page_has_transparency: Symbol<'static, FnPageHasTransparency>,
    page_flatten: Symbol<'static, FnPageFlatten>,
    page_generate_content: Symbol<'static, FnPageGenerateContent>,

    // Coordinate conversion
    device_to_page: Symbol<'static, FnDeviceToPage>,
    page_to_device: Symbol<'static, FnPageToDevice>,

    // Save / export
    save_as_copy: Symbol<'static, FnSaveAsCopy>,
    save_with_version: Symbol<'static, FnSaveWithVersion>,

    // Handle management
    handles: HashMap<u32, HandleEntry>,
    next_handle: u32,

    // Keep document data alive while documents are open
    doc_data: HashMap<u32, Vec<u8>>,
}

macro_rules! load_sym {
    ($lib:expr, $name:literal, $ty:ty) => {{
        let sym: Symbol<'_, $ty> = unsafe { $lib.get($name.as_bytes()) }
            .map_err(|e| format!("Failed to load symbol {}: {}", $name, e))?;
        // SAFETY: The library outlives the symbols because _lib is stored in the struct.
        // We transmute to erase the borrow lifetime since _lib is stored in the same struct.
        unsafe { std::mem::transmute(sym) }
    }};
}

macro_rules! try_load_sym {
    ($lib:expr, $name:literal, $ty:ty) => {{
        let result: std::result::Result<Symbol<'_, $ty>, _> = unsafe { $lib.get($name.as_bytes()) };
        result.ok().map(|sym| unsafe { std::mem::transmute::<Symbol<'_, $ty>, Symbol<'static, $ty>>(sym) })
    }};
}

/// C-compatible callback for FPDF_FILEWRITE.WriteBlock.
/// Appends data to the Vec<u8> embedded in the SaveContext.
unsafe extern "C" fn write_block_callback(
    p_this: *mut SaveContext,
    p_data: *const c_void,
    size: c_ulong,
) -> c_int {
    if p_this.is_null() || p_data.is_null() || size == 0 {
        return 1; // success (nothing to write)
    }
    let ctx = &mut *p_this;
    let data = std::slice::from_raw_parts(p_data as *const u8, size as usize);
    ctx.buffer.extend_from_slice(data);
    1 // success
}

impl PdfiumLibrary {
    /// Load the PDFium shared library from the given path.
    pub fn load<P: AsRef<Path>>(path: P) -> Result<Self, String> {
        let lib = unsafe { Library::new(path.as_ref()) }
            .map_err(|e| format!("Failed to load library: {}", e))?;

        let library = Self {
            init_library_with_config: load_sym!(lib, "FPDF_InitLibraryWithConfig", FnInitLibraryWithConfig),
            destroy_library: load_sym!(lib, "FPDF_DestroyLibrary", FnDestroyLibrary),
            get_last_error: load_sym!(lib, "FPDF_GetLastError", FnGetLastError),
            load_mem_document: load_sym!(lib, "FPDF_LoadMemDocument", FnLoadMemDocument),
            close_document: load_sym!(lib, "FPDF_CloseDocument", FnCloseDocument),
            get_page_count: load_sym!(lib, "FPDF_GetPageCount", FnGetPageCount),
            load_page: load_sym!(lib, "FPDF_LoadPage", FnLoadPage),
            close_page: load_sym!(lib, "FPDF_ClosePage", FnClosePage),
            get_page_width_f: load_sym!(lib, "FPDF_GetPageWidthF", FnGetPageWidthF),
            get_page_height_f: load_sym!(lib, "FPDF_GetPageHeightF", FnGetPageHeightF),
            text_load_page: load_sym!(lib, "FPDFText_LoadPage", FnTextLoadPage),
            text_close_page: load_sym!(lib, "FPDFText_ClosePage", FnTextClosePage),
            text_count_chars: load_sym!(lib, "FPDFText_CountChars", FnTextCountChars),
            text_get_text: load_sym!(lib, "FPDFText_GetText", FnTextGetText),
            text_get_font_size: load_sym!(lib, "FPDFText_GetFontSize", FnTextGetFontSize),
            text_get_font_weight: load_sym!(lib, "FPDFText_GetFontWeight", FnTextGetFontWeight),
            text_get_font_info: load_sym!(lib, "FPDFText_GetFontInfo", FnTextGetFontInfo),
            text_get_text_render_mode: try_load_sym!(lib, "FPDFText_GetTextRenderMode", FnTextGetTextRenderMode),
            bitmap_create_ex: load_sym!(lib, "FPDFBitmap_CreateEx", FnBitmapCreateEx),
            bitmap_fill_rect: load_sym!(lib, "FPDFBitmap_FillRect", FnBitmapFillRect),
            bitmap_destroy: load_sym!(lib, "FPDFBitmap_Destroy", FnBitmapDestroy),
            bitmap_get_buffer: load_sym!(lib, "FPDFBitmap_GetBuffer", FnBitmapGetBuffer),
            bitmap_get_stride: load_sym!(lib, "FPDFBitmap_GetStride", FnBitmapGetStride),
            render_page_bitmap: load_sym!(lib, "FPDF_RenderPageBitmap", FnRenderPageBitmap),

            // Metadata / Document info
            get_meta_text: load_sym!(lib, "FPDF_GetMetaText", FnGetMetaText),
            get_file_version: load_sym!(lib, "FPDF_GetFileVersion", FnGetFileVersion),
            get_doc_permissions: load_sym!(lib, "FPDF_GetDocPermissions", FnGetDocPermissions),
            get_doc_user_permissions: load_sym!(lib, "FPDF_GetDocUserPermissions", FnGetDocUserPermissions),
            doc_get_page_mode: load_sym!(lib, "FPDFDoc_GetPageMode", FnDocGetPageMode),
            get_security_handler_revision: load_sym!(lib, "FPDF_GetSecurityHandlerRevision", FnGetSecurityHandlerRevision),
            catalog_is_tagged: load_sym!(lib, "FPDFCatalog_IsTagged", FnCatalogIsTagged),
            get_page_label: load_sym!(lib, "FPDF_GetPageLabel", FnGetPageLabel),

            // Page boxes
            page_get_media_box: load_sym!(lib, "FPDFPage_GetMediaBox", FnPageGetBox),
            page_get_crop_box: load_sym!(lib, "FPDFPage_GetCropBox", FnPageGetBox),
            page_get_bleed_box: load_sym!(lib, "FPDFPage_GetBleedBox", FnPageGetBox),
            page_get_trim_box: load_sym!(lib, "FPDFPage_GetTrimBox", FnPageGetBox),
            page_get_art_box: load_sym!(lib, "FPDFPage_GetArtBox", FnPageGetBox),
            page_set_media_box: load_sym!(lib, "FPDFPage_SetMediaBox", FnPageSetBox),
            page_set_crop_box: load_sym!(lib, "FPDFPage_SetCropBox", FnPageSetBox),
            page_set_bleed_box: load_sym!(lib, "FPDFPage_SetBleedBox", FnPageSetBox),
            page_set_trim_box: load_sym!(lib, "FPDFPage_SetTrimBox", FnPageSetBox),
            page_set_art_box: load_sym!(lib, "FPDFPage_SetArtBox", FnPageSetBox),

            // Signatures
            get_signature_count: load_sym!(lib, "FPDF_GetSignatureCount", FnGetSignatureCount),
            get_signature_object: load_sym!(lib, "FPDF_GetSignatureObject", FnGetSignatureObject),
            signature_get_contents: load_sym!(lib, "FPDFSignatureObj_GetContents", FnSignatureGetContents),
            signature_get_byte_range: load_sym!(lib, "FPDFSignatureObj_GetByteRange", FnSignatureGetByteRange),
            signature_get_sub_filter: load_sym!(lib, "FPDFSignatureObj_GetSubFilter", FnSignatureGetSubFilter),
            signature_get_reason: load_sym!(lib, "FPDFSignatureObj_GetReason", FnSignatureGetReason),
            signature_get_time: load_sym!(lib, "FPDFSignatureObj_GetTime", FnSignatureGetTime),
            signature_get_doc_mdp_permission: load_sym!(lib, "FPDFSignatureObj_GetDocMDPPermission", FnSignatureGetDocMDPPermission),

            // Attachments
            doc_get_attachment_count: load_sym!(lib, "FPDFDoc_GetAttachmentCount", FnDocGetAttachmentCount),
            doc_get_attachment: load_sym!(lib, "FPDFDoc_GetAttachment", FnDocGetAttachment),
            attachment_get_name: load_sym!(lib, "FPDFAttachment_GetName", FnAttachmentGetName),
            attachment_get_file: load_sym!(lib, "FPDFAttachment_GetFile", FnAttachmentGetFile),

            // Page import
            import_pages: load_sym!(lib, "FPDF_ImportPages", FnImportPages),
            import_pages_by_index: load_sym!(lib, "FPDF_ImportPagesByIndex", FnImportPagesByIndex),
            import_n_pages_to_one: load_sym!(lib, "FPDF_ImportNPagesToOne", FnImportNPagesToOne),
            copy_viewer_preferences: load_sym!(lib, "FPDF_CopyViewerPreferences", FnCopyViewerPreferences),

            // Bookmarks / Links
            bookmark_get_first_child: load_sym!(lib, "FPDFBookmark_GetFirstChild", FnBookmarkGetFirstChild),
            bookmark_get_next_sibling: load_sym!(lib, "FPDFBookmark_GetNextSibling", FnBookmarkGetNextSibling),
            bookmark_get_title: load_sym!(lib, "FPDFBookmark_GetTitle", FnBookmarkGetTitle),
            bookmark_get_count: load_sym!(lib, "FPDFBookmark_GetCount", FnBookmarkGetCount),
            bookmark_get_dest: load_sym!(lib, "FPDFBookmark_GetDest", FnBookmarkGetDest),
            bookmark_get_action: load_sym!(lib, "FPDFBookmark_GetAction", FnBookmarkGetAction),
            dest_get_dest_page_index: load_sym!(lib, "FPDFDest_GetDestPageIndex", FnDestGetDestPageIndex),
            action_get_type: load_sym!(lib, "FPDFAction_GetType", FnActionGetType),

            // Links
            link_enumerate: load_sym!(lib, "FPDFLink_Enumerate", FnLinkEnumerate),
            link_get_annot_rect: load_sym!(lib, "FPDFLink_GetAnnotRect", FnLinkGetAnnotRect),
            link_get_action: load_sym!(lib, "FPDFLink_GetAction", FnLinkGetAction),
            link_get_dest: load_sym!(lib, "FPDFLink_GetDest", FnLinkGetDest),
            action_get_dest: load_sym!(lib, "FPDFAction_GetDest", FnActionGetDest),
            action_get_uri_path: load_sym!(lib, "FPDFAction_GetURIPath", FnActionGetURIPath),
            action_get_file_path: load_sym!(lib, "FPDFAction_GetFilePath", FnActionGetFilePath),
            dest_get_view: load_sym!(lib, "FPDFDest_GetView", FnDestGetView),
            dest_get_location_in_page: load_sym!(lib, "FPDFDest_GetLocationInPage", FnDestGetLocationInPage),

            // Annotations (read)
            page_get_annot_count: load_sym!(lib, "FPDFPage_GetAnnotCount", FnPageGetAnnotCount),
            page_get_annot: load_sym!(lib, "FPDFPage_GetAnnot", FnPageGetAnnot),
            page_close_annot: load_sym!(lib, "FPDFPage_CloseAnnot", FnPageCloseAnnot),
            annot_get_subtype: load_sym!(lib, "FPDFAnnot_GetSubtype", FnAnnotGetSubtype),
            annot_get_rect: load_sym!(lib, "FPDFAnnot_GetRect", FnAnnotGetRect),
            annot_get_color: load_sym!(lib, "FPDFAnnot_GetColor", FnAnnotGetColor),

            // Annotations (mutation)
            page_create_annot: load_sym!(lib, "FPDFPage_CreateAnnot", FnPageCreateAnnot),
            page_remove_annot: load_sym!(lib, "FPDFPage_RemoveAnnot", FnPageRemoveAnnot),
            annot_set_rect: load_sym!(lib, "FPDFAnnot_SetRect", FnAnnotSetRect),
            annot_set_color: load_sym!(lib, "FPDFAnnot_SetColor", FnAnnotSetColor),
            annot_get_flags: load_sym!(lib, "FPDFAnnot_GetFlags", FnAnnotGetFlags),
            annot_set_flags: load_sym!(lib, "FPDFAnnot_SetFlags", FnAnnotSetFlags),
            annot_set_string_value: load_sym!(lib, "FPDFAnnot_SetStringValue", FnAnnotSetStringValue),
            annot_set_border: load_sym!(lib, "FPDFAnnot_SetBorder", FnAnnotSetBorder),
            annot_set_attachment_points: load_sym!(lib, "FPDFAnnot_SetAttachmentPoints", FnAnnotSetAttachmentPoints),
            annot_append_attachment_points: load_sym!(lib, "FPDFAnnot_AppendAttachmentPoints", FnAnnotAppendAttachmentPoints),
            annot_set_uri: load_sym!(lib, "FPDFAnnot_SetURI", FnAnnotSetURI),

            // Text character extended operations
            text_get_unicode: load_sym!(lib, "FPDFText_GetUnicode", FnTextGetUnicode),
            text_is_generated: load_sym!(lib, "FPDFText_IsGenerated", FnTextIsGenerated),
            text_is_hyphen: load_sym!(lib, "FPDFText_IsHyphen", FnTextIsHyphen),
            text_has_unicode_map_error: load_sym!(lib, "FPDFText_HasUnicodeMapError", FnTextHasUnicodeMapError),
            text_get_char_angle: load_sym!(lib, "FPDFText_GetCharAngle", FnTextGetCharAngle),
            text_get_char_origin: load_sym!(lib, "FPDFText_GetCharOrigin", FnTextGetCharOrigin),
            text_get_char_box: load_sym!(lib, "FPDFText_GetCharBox", FnTextGetCharBox),
            text_get_loose_char_box: load_sym!(lib, "FPDFText_GetLooseCharBox", FnTextGetLooseCharBox),
            text_get_char_index_at_pos: load_sym!(lib, "FPDFText_GetCharIndexAtPos", FnTextGetCharIndexAtPos),
            text_get_fill_color: load_sym!(lib, "FPDFText_GetFillColor", FnTextGetFillColor),
            text_get_stroke_color: load_sym!(lib, "FPDFText_GetStrokeColor", FnTextGetStrokeColor),
            text_get_matrix: load_sym!(lib, "FPDFText_GetMatrix", FnTextGetMatrix),

            // Text search
            text_find_start: load_sym!(lib, "FPDFText_FindStart", FnTextFindStart),
            text_find_next: load_sym!(lib, "FPDFText_FindNext", FnTextFindNext),
            text_find_prev: load_sym!(lib, "FPDFText_FindPrev", FnTextFindPrev),
            text_find_close: load_sym!(lib, "FPDFText_FindClose", FnTextFindClose),
            text_get_sch_result_index: load_sym!(lib, "FPDFText_GetSchResultIndex", FnTextGetSchResultIndex),
            text_get_sch_count: load_sym!(lib, "FPDFText_GetSchCount", FnTextGetSchCount),

            // Text rectangle / bounded text
            text_count_rects: load_sym!(lib, "FPDFText_CountRects", FnTextCountRects),
            text_get_rect: load_sym!(lib, "FPDFText_GetRect", FnTextGetRect),
            text_get_bounded_text: load_sym!(lib, "FPDFText_GetBoundedText", FnTextGetBoundedText),

            // Page operations
            page_get_rotation: load_sym!(lib, "FPDFPage_GetRotation", FnPageGetRotation),
            page_set_rotation: load_sym!(lib, "FPDFPage_SetRotation", FnPageSetRotation),
            page_has_transparency: load_sym!(lib, "FPDFPage_HasTransparency", FnPageHasTransparency),
            page_flatten: load_sym!(lib, "FPDFPage_Flatten", FnPageFlatten),
            page_generate_content: load_sym!(lib, "FPDFPage_GenerateContent", FnPageGenerateContent),

            // Coordinate conversion
            device_to_page: load_sym!(lib, "FPDF_DeviceToPage", FnDeviceToPage),
            page_to_device: load_sym!(lib, "FPDF_PageToDevice", FnPageToDevice),

            // Save / export
            save_as_copy: load_sym!(lib, "FPDF_SaveAsCopy", FnSaveAsCopy),
            save_with_version: load_sym!(lib, "FPDF_SaveWithVersion", FnSaveWithVersion),

            _lib: lib,
            handles: HashMap::new(),
            next_handle: 1,
            doc_data: HashMap::new(),
        };

        Ok(library)
    }

    fn alloc_handle(&mut self, entry: HandleEntry) -> u32 {
        let handle = self.next_handle;
        self.next_handle += 1;
        self.handles.insert(handle, entry);
        handle
    }

    // --- Core ---

    pub fn init_library(&self) {
        let config = FPDF_LIBRARY_CONFIG {
            version: 2,
            m_pUserFontPaths: ptr::null(),
            m_pIsolate: ptr::null_mut(),
            m_v8EmbedderSlot: 0,
            m_pPlatform: ptr::null_mut(),
        };
        unsafe { (self.init_library_with_config)(&config) };
    }

    pub fn destroy_library(&self) {
        unsafe { (self.destroy_library)() };
    }

    pub fn get_last_error(&self) -> u32 {
        unsafe { (self.get_last_error)() as u32 }
    }

    // --- Document ---

    pub fn load_document(&mut self, data: &[u8], password: Option<&str>) -> Result<u32, String> {
        let password_cstr = password
            .map(|p| CString::new(p).map_err(|e| format!("Invalid password: {}", e)))
            .transpose()?;

        let password_ptr = password_cstr
            .as_ref()
            .map_or(ptr::null(), |c| c.as_ptr());

        // Keep a copy of the data alive
        let data_copy = data.to_vec();

        let doc = unsafe {
            (self.load_mem_document)(
                data_copy.as_ptr() as *const c_void,
                data_copy.len() as c_int,
                password_ptr,
            )
        };

        if doc.is_null() {
            let error = self.get_last_error();
            return Err(format!("Failed to load document, error code: {}", error));
        }

        let handle = self.alloc_handle(HandleEntry::Document(doc));
        self.doc_data.insert(handle, data_copy);
        Ok(handle)
    }

    pub fn close_document(&mut self, handle: u32) -> Result<(), String> {
        match self.handles.remove(&handle) {
            Some(HandleEntry::Document(doc)) => {
                unsafe { (self.close_document)(doc) };
                self.doc_data.remove(&handle);
                Ok(())
            }
            Some(_) => Err("Handle is not a document".to_string()),
            None => Err("Invalid handle".to_string()),
        }
    }

    pub fn get_page_count(&self, doc_handle: u32) -> Result<i32, String> {
        match self.handles.get(&doc_handle) {
            Some(HandleEntry::Document(doc)) => Ok(unsafe { (self.get_page_count)(*doc) }),
            _ => Err("Invalid document handle".to_string()),
        }
    }

    // --- Page ---

    pub fn load_page(&mut self, doc_handle: u32, index: i32) -> Result<u32, String> {
        let doc = match self.handles.get(&doc_handle) {
            Some(HandleEntry::Document(doc)) => *doc,
            _ => return Err("Invalid document handle".to_string()),
        };

        let page = unsafe { (self.load_page)(doc, index) };
        if page.is_null() {
            return Err(format!("Failed to load page {}", index));
        }

        Ok(self.alloc_handle(HandleEntry::Page(page)))
    }

    pub fn close_page(&mut self, handle: u32) -> Result<(), String> {
        match self.handles.remove(&handle) {
            Some(HandleEntry::Page(page)) => {
                unsafe { (self.close_page)(page) };
                Ok(())
            }
            Some(_) => Err("Handle is not a page".to_string()),
            None => Err("Invalid handle".to_string()),
        }
    }

    pub fn get_page_width(&self, page_handle: u32) -> Result<f64, String> {
        match self.handles.get(&page_handle) {
            Some(HandleEntry::Page(page)) => {
                Ok(unsafe { (self.get_page_width_f)(*page) } as f64)
            }
            _ => Err("Invalid page handle".to_string()),
        }
    }

    pub fn get_page_height(&self, page_handle: u32) -> Result<f64, String> {
        match self.handles.get(&page_handle) {
            Some(HandleEntry::Page(page)) => {
                Ok(unsafe { (self.get_page_height_f)(*page) } as f64)
            }
            _ => Err("Invalid page handle".to_string()),
        }
    }

    // --- Text ---

    pub fn load_text_page(&mut self, page_handle: u32) -> Result<u32, String> {
        let page = match self.handles.get(&page_handle) {
            Some(HandleEntry::Page(page)) => *page,
            _ => return Err("Invalid page handle".to_string()),
        };

        let text_page = unsafe { (self.text_load_page)(page) };
        if text_page.is_null() {
            return Err("Failed to load text page".to_string());
        }

        Ok(self.alloc_handle(HandleEntry::TextPage(text_page)))
    }

    pub fn close_text_page(&mut self, handle: u32) -> Result<(), String> {
        match self.handles.remove(&handle) {
            Some(HandleEntry::TextPage(tp)) => {
                unsafe { (self.text_close_page)(tp) };
                Ok(())
            }
            Some(_) => Err("Handle is not a text page".to_string()),
            None => Err("Invalid handle".to_string()),
        }
    }

    pub fn count_text_chars(&self, text_page_handle: u32) -> Result<i32, String> {
        match self.handles.get(&text_page_handle) {
            Some(HandleEntry::TextPage(tp)) => Ok(unsafe { (self.text_count_chars)(*tp) }),
            _ => Err("Invalid text page handle".to_string()),
        }
    }

    pub fn get_full_text(&self, text_page_handle: u32) -> Result<String, String> {
        let tp = match self.handles.get(&text_page_handle) {
            Some(HandleEntry::TextPage(tp)) => *tp,
            _ => return Err("Invalid text page handle".to_string()),
        };

        let char_count = unsafe { (self.text_count_chars)(tp) };
        if char_count <= 0 {
            return Ok(String::new());
        }

        // FPDFText_GetText writes UTF-16LE including a null terminator
        let buf_len = (char_count + 1) as usize;
        let mut buffer: Vec<u16> = vec![0u16; buf_len];

        unsafe { (self.text_get_text)(tp, 0, char_count, buffer.as_mut_ptr()) };

        // Decode UTF-16LE, trimming the null terminator
        String::from_utf16(&buffer[..char_count as usize])
            .map_err(|e| format!("UTF-16 decode error: {}", e))
    }

    // --- Text Character Font Info ---

    pub fn get_char_font_size(&self, text_page_handle: u32, char_index: i32) -> Result<f64, String> {
        let tp = match self.handles.get(&text_page_handle) {
            Some(HandleEntry::TextPage(tp)) => *tp,
            _ => return Err("Invalid text page handle".to_string()),
        };
        Ok(unsafe { (self.text_get_font_size)(tp, char_index) })
    }

    pub fn get_char_font_weight(&self, text_page_handle: u32, char_index: i32) -> Result<i32, String> {
        let tp = match self.handles.get(&text_page_handle) {
            Some(HandleEntry::TextPage(tp)) => *tp,
            _ => return Err("Invalid text page handle".to_string()),
        };
        Ok(unsafe { (self.text_get_font_weight)(tp, char_index) })
    }

    /// Get the font name and flags for a character.
    /// Returns (fontName, flags) or None if unavailable.
    pub fn get_char_font_info(&self, text_page_handle: u32, char_index: i32) -> Result<Option<(String, i32)>, String> {
        let tp = match self.handles.get(&text_page_handle) {
            Some(HandleEntry::TextPage(tp)) => *tp,
            _ => return Err("Invalid text page handle".to_string()),
        };

        let mut flags: c_int = 0;

        // First call: get required buffer size
        let size = unsafe {
            (self.text_get_font_info)(tp, char_index, ptr::null_mut(), 0, &mut flags)
        } as usize;

        if size == 0 {
            return Ok(None);
        }

        // Second call: fill buffer (UTF-8 encoded font name)
        let mut buf = vec![0u8; size];
        unsafe {
            (self.text_get_font_info)(
                tp,
                char_index,
                buf.as_mut_ptr() as *mut c_void,
                size as c_ulong,
                &mut flags,
            );
        }

        // Trim null terminator
        if buf.last() == Some(&0) {
            buf.pop();
        }

        match String::from_utf8(buf) {
            Ok(name) if !name.is_empty() => Ok(Some((name, flags))),
            _ => Ok(None),
        }
    }

    pub fn get_char_render_mode(&self, text_page_handle: u32, char_index: i32) -> Result<i32, String> {
        let tp = match self.handles.get(&text_page_handle) {
            Some(HandleEntry::TextPage(tp)) => *tp,
            _ => return Err("Invalid text page handle".to_string()),
        };
        match &self.text_get_text_render_mode {
            Some(f) => Ok(unsafe { f(tp, char_index) }),
            None => Ok(0), // Default to Fill mode
        }
    }

    // --- Text Character Extended Operations ---

    pub fn get_char_unicode(&self, text_page_handle: u32, char_index: i32) -> Result<u32, String> {
        let tp = match self.handles.get(&text_page_handle) {
            Some(HandleEntry::TextPage(tp)) => *tp,
            _ => return Err("Invalid text page handle".to_string()),
        };
        Ok(unsafe { (self.text_get_unicode)(tp, char_index) })
    }

    pub fn is_char_generated(&self, text_page_handle: u32, char_index: i32) -> Result<bool, String> {
        let tp = match self.handles.get(&text_page_handle) {
            Some(HandleEntry::TextPage(tp)) => *tp,
            _ => return Err("Invalid text page handle".to_string()),
        };
        Ok(unsafe { (self.text_is_generated)(tp, char_index) } != 0)
    }

    pub fn is_char_hyphen(&self, text_page_handle: u32, char_index: i32) -> Result<bool, String> {
        let tp = match self.handles.get(&text_page_handle) {
            Some(HandleEntry::TextPage(tp)) => *tp,
            _ => return Err("Invalid text page handle".to_string()),
        };
        Ok(unsafe { (self.text_is_hyphen)(tp, char_index) } != 0)
    }

    pub fn has_char_unicode_map_error(&self, text_page_handle: u32, char_index: i32) -> Result<bool, String> {
        let tp = match self.handles.get(&text_page_handle) {
            Some(HandleEntry::TextPage(tp)) => *tp,
            _ => return Err("Invalid text page handle".to_string()),
        };
        Ok(unsafe { (self.text_has_unicode_map_error)(tp, char_index) } != 0)
    }

    pub fn get_char_angle(&self, text_page_handle: u32, char_index: i32) -> Result<f64, String> {
        let tp = match self.handles.get(&text_page_handle) {
            Some(HandleEntry::TextPage(tp)) => *tp,
            _ => return Err("Invalid text page handle".to_string()),
        };
        Ok(unsafe { (self.text_get_char_angle)(tp, char_index) } as f64)
    }

    /// Get the origin (x, y) of a character.
    /// Returns None if the operation fails.
    pub fn get_char_origin(
        &self,
        text_page_handle: u32,
        char_index: i32,
    ) -> Result<Option<(f64, f64)>, String> {
        let tp = match self.handles.get(&text_page_handle) {
            Some(HandleEntry::TextPage(tp)) => *tp,
            _ => return Err("Invalid text page handle".to_string()),
        };

        let mut x: f64 = 0.0;
        let mut y: f64 = 0.0;
        let ok = unsafe { (self.text_get_char_origin)(tp, char_index, &mut x, &mut y) };
        if ok == 0 {
            Ok(None)
        } else {
            Ok(Some((x, y)))
        }
    }

    /// Get the bounding box of a character.
    /// Returns (left, right, bottom, top) or None if the operation fails.
    pub fn get_char_box(
        &self,
        text_page_handle: u32,
        char_index: i32,
    ) -> Result<Option<(f64, f64, f64, f64)>, String> {
        let tp = match self.handles.get(&text_page_handle) {
            Some(HandleEntry::TextPage(tp)) => *tp,
            _ => return Err("Invalid text page handle".to_string()),
        };

        let mut left: f64 = 0.0;
        let mut right: f64 = 0.0;
        let mut bottom: f64 = 0.0;
        let mut top: f64 = 0.0;
        let ok = unsafe {
            (self.text_get_char_box)(tp, char_index, &mut left, &mut right, &mut bottom, &mut top)
        };
        if ok == 0 {
            Ok(None)
        } else {
            Ok(Some((left, right, bottom, top)))
        }
    }

    /// Get the loose bounding box of a character (as FS_RECTF: left, top, right, bottom).
    /// Returns (left, top, right, bottom) or None.
    pub fn get_char_loose_box(
        &self,
        text_page_handle: u32,
        char_index: i32,
    ) -> Result<Option<(f32, f32, f32, f32)>, String> {
        let tp = match self.handles.get(&text_page_handle) {
            Some(HandleEntry::TextPage(tp)) => *tp,
            _ => return Err("Invalid text page handle".to_string()),
        };

        let mut rect = [0f32; 4]; // left, top, right, bottom
        let ok = unsafe { (self.text_get_loose_char_box)(tp, char_index, rect.as_mut_ptr()) };
        if ok == 0 {
            Ok(None)
        } else {
            Ok(Some((rect[0], rect[1], rect[2], rect[3])))
        }
    }

    pub fn get_char_index_at_pos(
        &self,
        text_page_handle: u32,
        x: f64,
        y: f64,
        x_tolerance: f64,
        y_tolerance: f64,
    ) -> Result<i32, String> {
        let tp = match self.handles.get(&text_page_handle) {
            Some(HandleEntry::TextPage(tp)) => *tp,
            _ => return Err("Invalid text page handle".to_string()),
        };
        Ok(unsafe { (self.text_get_char_index_at_pos)(tp, x, y, x_tolerance, y_tolerance) })
    }

    /// Get the fill colour (r, g, b, a) of a character.
    /// Returns None if the operation fails.
    pub fn get_char_fill_colour(
        &self,
        text_page_handle: u32,
        char_index: i32,
    ) -> Result<Option<(u32, u32, u32, u32)>, String> {
        let tp = match self.handles.get(&text_page_handle) {
            Some(HandleEntry::TextPage(tp)) => *tp,
            _ => return Err("Invalid text page handle".to_string()),
        };

        let mut r: c_uint = 0;
        let mut g: c_uint = 0;
        let mut b: c_uint = 0;
        let mut a: c_uint = 0;
        let ok = unsafe { (self.text_get_fill_color)(tp, char_index, &mut r, &mut g, &mut b, &mut a) };
        if ok == 0 {
            Ok(None)
        } else {
            Ok(Some((r as u32, g as u32, b as u32, a as u32)))
        }
    }

    /// Get the stroke colour (r, g, b, a) of a character.
    /// Returns None if the operation fails.
    pub fn get_char_stroke_colour(
        &self,
        text_page_handle: u32,
        char_index: i32,
    ) -> Result<Option<(u32, u32, u32, u32)>, String> {
        let tp = match self.handles.get(&text_page_handle) {
            Some(HandleEntry::TextPage(tp)) => *tp,
            _ => return Err("Invalid text page handle".to_string()),
        };

        let mut r: c_uint = 0;
        let mut g: c_uint = 0;
        let mut b: c_uint = 0;
        let mut a: c_uint = 0;
        let ok = unsafe { (self.text_get_stroke_color)(tp, char_index, &mut r, &mut g, &mut b, &mut a) };
        if ok == 0 {
            Ok(None)
        } else {
            Ok(Some((r as u32, g as u32, b as u32, a as u32)))
        }
    }

    /// Get the transformation matrix (FS_MATRIX: a, b, c, d, e, f) for a character.
    /// Returns None if the operation fails.
    pub fn get_char_matrix(
        &self,
        text_page_handle: u32,
        char_index: i32,
    ) -> Result<Option<[f64; 6]>, String> {
        let tp = match self.handles.get(&text_page_handle) {
            Some(HandleEntry::TextPage(tp)) => *tp,
            _ => return Err("Invalid text page handle".to_string()),
        };

        let mut matrix = [0f64; 6];
        let ok = unsafe { (self.text_get_matrix)(tp, char_index, matrix.as_mut_ptr()) };
        if ok == 0 {
            Ok(None)
        } else {
            Ok(Some(matrix))
        }
    }

    // --- Text Search ---

    /// Start a text search. Returns search results as (index, count) pairs.
    ///
    /// `query` is the search string. `flags` is a bitmask of search flags.
    /// Returns all matches found.
    pub fn find_text(
        &self,
        text_page_handle: u32,
        query: &str,
        flags: u32,
    ) -> Result<Vec<(i32, i32)>, String> {
        let tp = match self.handles.get(&text_page_handle) {
            Some(HandleEntry::TextPage(tp)) => *tp,
            _ => return Err("Invalid text page handle".to_string()),
        };

        // Encode query as UTF-16LE with null terminator
        let mut query_utf16: Vec<u16> = query.encode_utf16().collect();
        query_utf16.push(0);

        let handle = unsafe {
            (self.text_find_start)(tp, query_utf16.as_ptr(), flags as c_ulong, 0)
        };
        if handle.is_null() {
            return Ok(Vec::new());
        }

        let mut results = Vec::new();
        while unsafe { (self.text_find_next)(handle) } != 0 {
            let index = unsafe { (self.text_get_sch_result_index)(handle) };
            let count = unsafe { (self.text_get_sch_count)(handle) };
            results.push((index, count));
        }

        unsafe { (self.text_find_close)(handle) };
        Ok(results)
    }

    // --- Text Rectangles ---

    /// Count text rectangles for a range of characters.
    pub fn count_text_rects(
        &self,
        text_page_handle: u32,
        start_index: i32,
        count: i32,
    ) -> Result<i32, String> {
        let tp = match self.handles.get(&text_page_handle) {
            Some(HandleEntry::TextPage(tp)) => *tp,
            _ => return Err("Invalid text page handle".to_string()),
        };
        Ok(unsafe { (self.text_count_rects)(tp, start_index, count) })
    }

    /// Get a text rectangle by index.
    /// Returns (left, top, right, bottom) or None.
    pub fn get_text_rect(
        &self,
        text_page_handle: u32,
        rect_index: i32,
    ) -> Result<Option<(f64, f64, f64, f64)>, String> {
        let tp = match self.handles.get(&text_page_handle) {
            Some(HandleEntry::TextPage(tp)) => *tp,
            _ => return Err("Invalid text page handle".to_string()),
        };

        let mut left: f64 = 0.0;
        let mut top: f64 = 0.0;
        let mut right: f64 = 0.0;
        let mut bottom: f64 = 0.0;
        let ok = unsafe {
            (self.text_get_rect)(tp, rect_index, &mut left, &mut top, &mut right, &mut bottom)
        };
        if ok == 0 {
            Ok(None)
        } else {
            Ok(Some((left, top, right, bottom)))
        }
    }

    /// Get text within a bounding rectangle.
    pub fn get_bounded_text(
        &self,
        text_page_handle: u32,
        left: f64,
        top: f64,
        right: f64,
        bottom: f64,
    ) -> Result<String, String> {
        let tp = match self.handles.get(&text_page_handle) {
            Some(HandleEntry::TextPage(tp)) => *tp,
            _ => return Err("Invalid text page handle".to_string()),
        };

        // First call: get required buffer size
        let size = unsafe {
            (self.text_get_bounded_text)(tp, left, top, right, bottom, ptr::null_mut(), 0)
        };
        if size <= 0 {
            return Ok(String::new());
        }

        let mut buffer: Vec<u16> = vec![0u16; size as usize];
        let written = unsafe {
            (self.text_get_bounded_text)(tp, left, top, right, bottom, buffer.as_mut_ptr(), size)
        };

        if written <= 0 {
            return Ok(String::new());
        }

        // Trim null terminator if present
        let len = if written > 0 && buffer[(written - 1) as usize] == 0 {
            (written - 1) as usize
        } else {
            written as usize
        };

        String::from_utf16(&buffer[..len])
            .map_err(|e| format!("UTF-16 decode error: {}", e))
    }

    // --- Page Rotation / Flatten / Transparency / Content ---

    pub fn get_page_rotation(&self, page_handle: u32) -> Result<i32, String> {
        match self.handles.get(&page_handle) {
            Some(HandleEntry::Page(page)) => Ok(unsafe { (self.page_get_rotation)(*page) }),
            _ => Err("Invalid page handle".to_string()),
        }
    }

    pub fn set_page_rotation(&self, page_handle: u32, rotation: i32) -> Result<(), String> {
        match self.handles.get(&page_handle) {
            Some(HandleEntry::Page(page)) => {
                unsafe { (self.page_set_rotation)(*page, rotation) };
                Ok(())
            }
            _ => Err("Invalid page handle".to_string()),
        }
    }

    pub fn has_page_transparency(&self, page_handle: u32) -> Result<bool, String> {
        match self.handles.get(&page_handle) {
            Some(HandleEntry::Page(page)) => {
                Ok(unsafe { (self.page_has_transparency)(*page) } != 0)
            }
            _ => Err("Invalid page handle".to_string()),
        }
    }

    /// Flatten a page (merge annotations/form fields into page content).
    ///
    /// `flags`: 0 = NormalDisplay, 1 = Print.
    /// Returns: 0 = could not flatten, 1 = success, 2 = nothing to flatten.
    pub fn flatten_page(&self, page_handle: u32, flags: i32) -> Result<i32, String> {
        match self.handles.get(&page_handle) {
            Some(HandleEntry::Page(page)) => {
                Ok(unsafe { (self.page_flatten)(*page, flags) })
            }
            _ => Err("Invalid page handle".to_string()),
        }
    }

    /// Generate page content (update the content stream after modifications).
    pub fn generate_content(&self, page_handle: u32) -> Result<bool, String> {
        match self.handles.get(&page_handle) {
            Some(HandleEntry::Page(page)) => {
                Ok(unsafe { (self.page_generate_content)(*page) } != 0)
            }
            _ => Err("Invalid page handle".to_string()),
        }
    }

    // --- Coordinate Conversion ---

    /// Convert device coordinates to page coordinates.
    pub fn device_to_page(
        &self,
        page_handle: u32,
        start_x: i32,
        start_y: i32,
        size_x: i32,
        size_y: i32,
        rotation: i32,
        device_x: i32,
        device_y: i32,
    ) -> Result<(f64, f64), String> {
        let page = match self.handles.get(&page_handle) {
            Some(HandleEntry::Page(page)) => *page,
            _ => return Err("Invalid page handle".to_string()),
        };

        let mut page_x: f64 = 0.0;
        let mut page_y: f64 = 0.0;
        let ok = unsafe {
            (self.device_to_page)(
                page, start_x, start_y, size_x, size_y, rotation,
                device_x, device_y, &mut page_x, &mut page_y,
            )
        };
        if ok == 0 {
            Err("Device to page conversion failed".to_string())
        } else {
            Ok((page_x, page_y))
        }
    }

    /// Convert page coordinates to device coordinates.
    pub fn page_to_device(
        &self,
        page_handle: u32,
        start_x: i32,
        start_y: i32,
        size_x: i32,
        size_y: i32,
        rotation: i32,
        page_x: f64,
        page_y: f64,
    ) -> Result<(i32, i32), String> {
        let page = match self.handles.get(&page_handle) {
            Some(HandleEntry::Page(page)) => *page,
            _ => return Err("Invalid page handle".to_string()),
        };

        let mut device_x: c_int = 0;
        let mut device_y: c_int = 0;
        let ok = unsafe {
            (self.page_to_device)(
                page, start_x, start_y, size_x, size_y, rotation,
                page_x, page_y, &mut device_x, &mut device_y,
            )
        };
        if ok == 0 {
            Err("Page to device conversion failed".to_string())
        } else {
            Ok((device_x, device_y))
        }
    }

    // --- Metadata ---

    pub fn get_meta_text(&self, doc_handle: u32, tag: &str) -> Result<Option<String>, String> {
        let doc = match self.handles.get(&doc_handle) {
            Some(HandleEntry::Document(doc)) => *doc,
            _ => return Err("Invalid document handle".to_string()),
        };

        let tag_cstr = CString::new(tag).map_err(|e| format!("Invalid tag: {}", e))?;

        // First call: get required buffer size (in bytes, including null terminator)
        let size = unsafe { (self.get_meta_text)(doc, tag_cstr.as_ptr(), ptr::null_mut(), 0) };
        if size == 0 {
            return Ok(None);
        }

        // size is in bytes; UTF-16LE uses 2 bytes per code unit
        let u16_len = size as usize / 2;
        let mut buffer: Vec<u16> = vec![0u16; u16_len];

        unsafe {
            (self.get_meta_text)(
                doc,
                tag_cstr.as_ptr(),
                buffer.as_mut_ptr() as *mut c_void,
                size,
            );
        }

        // Trim null terminator
        let text_len = if u16_len > 0 && buffer[u16_len - 1] == 0 {
            u16_len - 1
        } else {
            u16_len
        };

        if text_len == 0 {
            return Ok(None);
        }

        String::from_utf16(&buffer[..text_len])
            .map(Some)
            .map_err(|e| format!("UTF-16 decode error: {}", e))
    }

    pub fn get_file_version(&self, doc_handle: u32) -> Result<Option<i32>, String> {
        let doc = match self.handles.get(&doc_handle) {
            Some(HandleEntry::Document(doc)) => *doc,
            _ => return Err("Invalid document handle".to_string()),
        };

        let mut version: c_int = 0;
        let ok = unsafe { (self.get_file_version)(doc, &mut version) };
        if ok == 0 {
            Ok(None)
        } else {
            Ok(Some(version))
        }
    }

    pub fn get_doc_permissions(&self, doc_handle: u32) -> Result<u32, String> {
        match self.handles.get(&doc_handle) {
            Some(HandleEntry::Document(doc)) => {
                Ok(unsafe { (self.get_doc_permissions)(*doc) } as u32)
            }
            _ => Err("Invalid document handle".to_string()),
        }
    }

    pub fn get_doc_user_permissions(&self, doc_handle: u32) -> Result<u32, String> {
        match self.handles.get(&doc_handle) {
            Some(HandleEntry::Document(doc)) => {
                Ok(unsafe { (self.get_doc_user_permissions)(*doc) } as u32)
            }
            _ => Err("Invalid document handle".to_string()),
        }
    }

    pub fn get_page_mode(&self, doc_handle: u32) -> Result<i32, String> {
        match self.handles.get(&doc_handle) {
            Some(HandleEntry::Document(doc)) => {
                Ok(unsafe { (self.doc_get_page_mode)(*doc) })
            }
            _ => Err("Invalid document handle".to_string()),
        }
    }

    pub fn get_security_handler_revision(&self, doc_handle: u32) -> Result<i32, String> {
        match self.handles.get(&doc_handle) {
            Some(HandleEntry::Document(doc)) => {
                Ok(unsafe { (self.get_security_handler_revision)(*doc) })
            }
            _ => Err("Invalid document handle".to_string()),
        }
    }

    pub fn is_tagged(&self, doc_handle: u32) -> Result<bool, String> {
        match self.handles.get(&doc_handle) {
            Some(HandleEntry::Document(doc)) => {
                Ok(unsafe { (self.catalog_is_tagged)(*doc) } != 0)
            }
            _ => Err("Invalid document handle".to_string()),
        }
    }

    pub fn get_page_label(&self, doc_handle: u32, page_index: i32) -> Result<Option<String>, String> {
        let doc = match self.handles.get(&doc_handle) {
            Some(HandleEntry::Document(doc)) => *doc,
            _ => return Err("Invalid document handle".to_string()),
        };

        let size = unsafe { (self.get_page_label)(doc, page_index, ptr::null_mut(), 0) };
        if size == 0 {
            return Ok(None);
        }

        let u16_len = size as usize / 2;
        let mut buffer: Vec<u16> = vec![0u16; u16_len];

        unsafe {
            (self.get_page_label)(
                doc,
                page_index,
                buffer.as_mut_ptr() as *mut c_void,
                size,
            );
        }

        let text_len = if u16_len > 0 && buffer[u16_len - 1] == 0 {
            u16_len - 1
        } else {
            u16_len
        };

        if text_len == 0 {
            return Ok(None);
        }

        String::from_utf16(&buffer[..text_len])
            .map(Some)
            .map_err(|e| format!("UTF-16 decode error: {}", e))
    }

    // --- Page Boxes ---

    fn get_page_box_inner(
        &self,
        page_handle: u32,
        getter: &Symbol<'static, FnPageGetBox>,
    ) -> Result<Option<[f32; 4]>, String> {
        let page = match self.handles.get(&page_handle) {
            Some(HandleEntry::Page(page)) => *page,
            _ => return Err("Invalid page handle".to_string()),
        };

        let mut left: f32 = 0.0;
        let mut bottom: f32 = 0.0;
        let mut right: f32 = 0.0;
        let mut top: f32 = 0.0;

        let ok = unsafe { getter(page, &mut left, &mut bottom, &mut right, &mut top) };
        if ok == 0 {
            Ok(None)
        } else {
            Ok(Some([left, bottom, right, top]))
        }
    }

    fn set_page_box_inner(
        &self,
        page_handle: u32,
        setter: &Symbol<'static, FnPageSetBox>,
        left: f32,
        bottom: f32,
        right: f32,
        top: f32,
    ) -> Result<(), String> {
        let page = match self.handles.get(&page_handle) {
            Some(HandleEntry::Page(page)) => *page,
            _ => return Err("Invalid page handle".to_string()),
        };
        unsafe { setter(page, left, bottom, right, top) };
        Ok(())
    }

    pub fn get_page_box(&self, page_handle: u32, box_type: i32) -> Result<Option<[f32; 4]>, String> {
        let getter = match box_type {
            0 => &self.page_get_media_box,
            1 => &self.page_get_crop_box,
            2 => &self.page_get_bleed_box,
            3 => &self.page_get_trim_box,
            4 => &self.page_get_art_box,
            _ => return Err(format!("Invalid box type: {}", box_type)),
        };
        self.get_page_box_inner(page_handle, getter)
    }

    pub fn set_page_box(
        &self,
        page_handle: u32,
        box_type: i32,
        left: f32,
        bottom: f32,
        right: f32,
        top: f32,
    ) -> Result<(), String> {
        let setter = match box_type {
            0 => &self.page_set_media_box,
            1 => &self.page_set_crop_box,
            2 => &self.page_set_bleed_box,
            3 => &self.page_set_trim_box,
            4 => &self.page_set_art_box,
            _ => return Err(format!("Invalid box type: {}", box_type)),
        };
        self.set_page_box_inner(page_handle, setter, left, bottom, right, top)
    }

    // --- Render ---

    pub fn render_page(
        &self,
        page_handle: u32,
        width: i32,
        height: i32,
        rotation: i32,
        flags: i32,
        bg_colour: u32,
    ) -> Result<Vec<u8>, String> {
        let page = match self.handles.get(&page_handle) {
            Some(HandleEntry::Page(page)) => *page,
            _ => return Err("Invalid page handle".to_string()),
        };

        let stride = width * 4; // BGRA = 4 bytes per pixel
        let buf_size = (stride * height) as usize;
        let mut pixel_buf: Vec<u8> = vec![0u8; buf_size];

        // FPDFBitmap_CreateEx with format 4 = BGRA
        let bitmap = unsafe {
            (self.bitmap_create_ex)(
                width,
                height,
                4, // BGRA
                pixel_buf.as_mut_ptr() as *mut c_void,
                stride,
            )
        };

        if bitmap.is_null() {
            return Err("Failed to create bitmap".to_string());
        }

        // Fill background
        unsafe {
            (self.bitmap_fill_rect)(bitmap, 0, 0, width, height, bg_colour as FPDF_DWORD);
        };

        // Render
        unsafe {
            (self.render_page_bitmap)(bitmap, page, 0, 0, width, height, rotation, flags);
        };

        // Destroy bitmap handle (pixel data is in our Vec)
        unsafe { (self.bitmap_destroy)(bitmap) };

        // Convert BGRA to RGBA in-place
        for i in (0..buf_size).step_by(4) {
            pixel_buf.swap(i, i + 2); // swap B and R
        }

        Ok(pixel_buf)
    }

    // --- Save / Export ---

    /// Save a document to a byte buffer.
    ///
    /// `flags`: 0=None, 1=Incremental, 2=NoIncremental, 3=RemoveSecurity.
    /// `version`: optional PDF version (e.g. 17 for PDF 1.7). If None, uses FPDF_SaveAsCopy.
    pub fn save_document(
        &self,
        doc_handle: u32,
        flags: u32,
        version: Option<i32>,
    ) -> Result<Vec<u8>, String> {
        let doc = match self.handles.get(&doc_handle) {
            Some(HandleEntry::Document(doc)) => *doc,
            _ => return Err("Invalid document handle".to_string()),
        };

        let mut ctx = SaveContext {
            version: 1,
            write_block: write_block_callback,
            buffer: Vec::new(),
        };

        let ok = match version {
            Some(ver) => unsafe {
                (self.save_with_version)(doc, &mut ctx, flags as FPDF_DWORD, ver)
            },
            None => unsafe {
                (self.save_as_copy)(doc, &mut ctx, flags as FPDF_DWORD)
            },
        };

        if ok == 0 {
            return Err("Failed to save document".to_string());
        }

        Ok(ctx.buffer)
    }

    // --- Signatures ---

    pub fn get_signature_count(&self, doc_handle: u32) -> Result<i32, String> {
        let doc = match self.handles.get(&doc_handle) {
            Some(HandleEntry::Document(doc)) => *doc,
            _ => return Err("Invalid document handle".to_string()),
        };
        Ok(unsafe { (self.get_signature_count)(doc) })
    }

    /// Get signature data at the given index.
    /// Returns (contents, byte_range, sub_filter, reason, time, doc_mdp_permission).
    pub fn get_signature(
        &self,
        doc_handle: u32,
        index: i32,
    ) -> Result<(Option<Vec<u8>>, Option<Vec<i32>>, Option<String>, Option<String>, Option<String>, i32), String> {
        let doc = match self.handles.get(&doc_handle) {
            Some(HandleEntry::Document(doc)) => *doc,
            _ => return Err("Invalid document handle".to_string()),
        };

        let sig = unsafe { (self.get_signature_object)(doc, index) };
        if sig.is_null() {
            return Err(format!("Failed to get signature at index {}", index));
        }

        // Contents
        let contents = {
            let size = unsafe { (self.signature_get_contents)(sig, ptr::null_mut(), 0) } as usize;
            if size > 0 {
                let mut buf = vec![0u8; size];
                unsafe { (self.signature_get_contents)(sig, buf.as_mut_ptr() as *mut c_void, size as c_ulong) };
                Some(buf)
            } else {
                None
            }
        };

        // Byte range
        let byte_range = {
            let count = unsafe { (self.signature_get_byte_range)(sig, ptr::null_mut(), 0) } as usize;
            if count > 0 {
                let mut buf = vec![0i32; count];
                unsafe { (self.signature_get_byte_range)(sig, buf.as_mut_ptr(), count as c_ulong) };
                Some(buf)
            } else {
                None
            }
        };

        // Sub-filter (ASCII)
        let sub_filter = {
            let size = unsafe { (self.signature_get_sub_filter)(sig, ptr::null_mut(), 0) } as usize;
            if size > 1 {
                let mut buf = vec![0u8; size];
                unsafe { (self.signature_get_sub_filter)(sig, buf.as_mut_ptr() as *mut c_char, size as c_ulong) };
                // Trim null terminator
                if buf.last() == Some(&0) { buf.pop(); }
                String::from_utf8(buf).ok()
            } else {
                None
            }
        };

        // Reason (UTF-16LE)
        let reason = {
            let size = unsafe { (self.signature_get_reason)(sig, ptr::null_mut(), 0) } as usize;
            if size > 2 {
                let mut buf = vec![0u8; size];
                unsafe { (self.signature_get_reason)(sig, buf.as_mut_ptr() as *mut c_void, size as c_ulong) };
                // UTF-16LE: strip null terminator (2 bytes), decode
                let len = if size >= 2 { size - 2 } else { size };
                let u16_slice: Vec<u16> = buf[..len].chunks_exact(2)
                    .map(|c| u16::from_le_bytes([c[0], c[1]]))
                    .collect();
                Some(String::from_utf16_lossy(&u16_slice))
            } else {
                None
            }
        };

        // Time (ASCII)
        let time = {
            let size = unsafe { (self.signature_get_time)(sig, ptr::null_mut(), 0) } as usize;
            if size > 1 {
                let mut buf = vec![0u8; size];
                unsafe { (self.signature_get_time)(sig, buf.as_mut_ptr() as *mut c_char, size as c_ulong) };
                if buf.last() == Some(&0) { buf.pop(); }
                String::from_utf8(buf).ok()
            } else {
                None
            }
        };

        // DocMDP permission
        let doc_mdp = unsafe { (self.signature_get_doc_mdp_permission)(sig) };

        Ok((contents, byte_range, sub_filter, reason, time, doc_mdp))
    }

    // --- Attachments ---

    pub fn get_attachment_count(&self, doc_handle: u32) -> Result<i32, String> {
        let doc = match self.handles.get(&doc_handle) {
            Some(HandleEntry::Document(doc)) => *doc,
            _ => return Err("Invalid document handle".to_string()),
        };
        Ok(unsafe { (self.doc_get_attachment_count)(doc) })
    }

    /// Get an attachment by index.
    /// Returns (name, data) or None if the attachment doesn't exist or has no data.
    pub fn get_attachment(&self, doc_handle: u32, index: i32) -> Result<Option<(String, Vec<u8>)>, String> {
        let doc = match self.handles.get(&doc_handle) {
            Some(HandleEntry::Document(doc)) => *doc,
            _ => return Err("Invalid document handle".to_string()),
        };

        let attachment = unsafe { (self.doc_get_attachment)(doc, index) };
        if attachment.is_null() {
            return Ok(None);
        }

        // Get name (UTF-16LE, two-call pattern)
        let name_size = unsafe { (self.attachment_get_name)(attachment, ptr::null_mut(), 0) } as usize;
        let name = if name_size > 0 {
            let u16_len = name_size / 2;
            let mut buf: Vec<u16> = vec![0u16; u16_len];
            unsafe {
                (self.attachment_get_name)(attachment, buf.as_mut_ptr() as *mut c_void, name_size as c_ulong);
            }
            // Trim null terminator
            let text_len = if u16_len > 0 && buf[u16_len - 1] == 0 { u16_len - 1 } else { u16_len };
            String::from_utf16(&buf[..text_len]).unwrap_or_default()
        } else {
            String::new()
        };

        // Get file data (two-call pattern)
        let mut out_len: c_ulong = 0;
        let ok = unsafe { (self.attachment_get_file)(attachment, ptr::null_mut(), 0, &mut out_len) };
        let data = if ok != 0 && out_len > 0 {
            let size = out_len as usize;
            let mut buf = vec![0u8; size];
            let mut actual_len: c_ulong = 0;
            unsafe {
                (self.attachment_get_file)(
                    attachment,
                    buf.as_mut_ptr() as *mut c_void,
                    size as c_ulong,
                    &mut actual_len,
                );
            }
            buf.truncate(actual_len as usize);
            buf
        } else {
            Vec::new()
        };

        Ok(Some((name, data)))
    }

    // --- Page Import ---

    /// Import pages from a source document by page range string.
    ///
    /// `page_range` is a comma-separated list like "1-3,5,8-10" (1-based)
    /// or `None` to import all pages. `insert_index` is 0-based.
    pub fn import_pages(
        &self,
        dest_handle: u32,
        src_handle: u32,
        page_range: Option<&str>,
        insert_index: i32,
    ) -> Result<(), String> {
        let dest_doc = match self.handles.get(&dest_handle) {
            Some(HandleEntry::Document(doc)) => *doc,
            _ => return Err("Invalid destination document handle".to_string()),
        };
        let src_doc = match self.handles.get(&src_handle) {
            Some(HandleEntry::Document(doc)) => *doc,
            _ => return Err("Invalid source document handle".to_string()),
        };

        let result = match page_range {
            Some(range) => {
                let c_range = CString::new(range)
                    .map_err(|_| "Invalid page range string".to_string())?;
                unsafe { (self.import_pages)(dest_doc, src_doc, c_range.as_ptr(), insert_index) }
            }
            None => {
                unsafe { (self.import_pages)(dest_doc, src_doc, ptr::null(), insert_index) }
            }
        };

        if result == 0 {
            return Err("Failed to import pages".to_string());
        }
        Ok(())
    }

    /// Import pages by index array.
    ///
    /// `page_indices` is a slice of 0-based page indices.
    /// `insert_index` is 0-based in the destination document.
    pub fn import_pages_by_index(
        &self,
        dest_handle: u32,
        src_handle: u32,
        page_indices: &[i32],
        insert_index: i32,
    ) -> Result<(), String> {
        let dest_doc = match self.handles.get(&dest_handle) {
            Some(HandleEntry::Document(doc)) => *doc,
            _ => return Err("Invalid destination document handle".to_string()),
        };
        let src_doc = match self.handles.get(&src_handle) {
            Some(HandleEntry::Document(doc)) => *doc,
            _ => return Err("Invalid source document handle".to_string()),
        };

        let result = unsafe {
            (self.import_pages_by_index)(
                dest_doc,
                src_doc,
                page_indices.as_ptr(),
                page_indices.len() as c_ulong,
                insert_index,
            )
        };

        if result == 0 {
            return Err("Failed to import pages by index".to_string());
        }
        Ok(())
    }

    /// Create a new document with N-up layout.
    ///
    /// Returns a new document handle where multiple source pages are
    /// arranged on each output page.
    pub fn import_n_pages_to_one(
        &mut self,
        src_handle: u32,
        output_width: f32,
        output_height: f32,
        pages_per_row: usize,
        pages_per_column: usize,
    ) -> Result<u32, String> {
        let src_doc = match self.handles.get(&src_handle) {
            Some(HandleEntry::Document(doc)) => *doc,
            _ => return Err("Invalid source document handle".to_string()),
        };

        let new_doc = unsafe {
            (self.import_n_pages_to_one)(
                src_doc,
                output_width,
                output_height,
                pages_per_row,
                pages_per_column,
            )
        };

        if new_doc.is_null() {
            return Err("Failed to create N-up document".to_string());
        }

        let handle = self.alloc_handle(HandleEntry::Document(new_doc));
        Ok(handle)
    }

    /// Copy viewer preferences from source to destination document.
    pub fn copy_viewer_preferences(
        &self,
        dest_handle: u32,
        src_handle: u32,
    ) -> Result<bool, String> {
        let dest_doc = match self.handles.get(&dest_handle) {
            Some(HandleEntry::Document(doc)) => *doc,
            _ => return Err("Invalid destination document handle".to_string()),
        };
        let src_doc = match self.handles.get(&src_handle) {
            Some(HandleEntry::Document(doc)) => *doc,
            _ => return Err("Invalid source document handle".to_string()),
        };

        let result = unsafe { (self.copy_viewer_preferences)(dest_doc, src_doc) };
        Ok(result != 0)
    }

    // --- Bookmarks ---

    /// Maximum recursion depth for bookmark tree traversal.
    const MAX_BOOKMARK_DEPTH: usize = 100;

    /// Get the full bookmark (outline) tree for a document.
    ///
    /// Returns a flat list of top-level bookmarks, each with nested children.
    /// `page_index` is -1 when the bookmark has no in-document destination.
    pub fn get_bookmarks(&self, doc_handle: u32) -> Result<Vec<BookmarkNode>, String> {
        let doc = match self.handles.get(&doc_handle) {
            Some(HandleEntry::Document(doc)) => *doc,
            _ => return Err("Invalid document handle".to_string()),
        };

        Ok(self.collect_bookmarks(doc, ptr::null_mut(), 0))
    }

    fn collect_bookmarks(
        &self,
        doc: FPDF_DOCUMENT,
        parent: FPDF_BOOKMARK,
        depth: usize,
    ) -> Vec<BookmarkNode> {
        if depth > Self::MAX_BOOKMARK_DEPTH {
            return Vec::new();
        }

        let mut result = Vec::new();
        let mut current = unsafe { (self.bookmark_get_first_child)(doc, parent) };

        while !current.is_null() {
            let title = self.read_bookmark_title(current);

            let dest = unsafe { (self.bookmark_get_dest)(doc, current) };
            let page_index = if !dest.is_null() {
                unsafe { (self.dest_get_dest_page_index)(doc, dest) }
            } else {
                -1
            };

            let children = self.collect_bookmarks(doc, current, depth + 1);

            result.push(BookmarkNode {
                title,
                page_index,
                children,
            });
            current = unsafe { (self.bookmark_get_next_sibling)(doc, current) };
        }

        result
    }

    // --- Annotations ---

    /// Get all annotations on a page.
    ///
    /// Opens each annotation, reads its subtype, bounding rect, and colour,
    /// then closes it. The caller never sees raw annotation handles.
    pub fn get_annotations(&self, page_handle: u32) -> Result<Vec<AnnotationInfo>, String> {
        let page = match self.handles.get(&page_handle) {
            Some(HandleEntry::Page(page)) => *page,
            _ => return Err("Invalid page handle".to_string()),
        };

        let count = unsafe { (self.page_get_annot_count)(page) };
        if count <= 0 {
            return Ok(Vec::new());
        }

        let mut result = Vec::with_capacity(count as usize);

        for i in 0..count {
            let annot = unsafe { (self.page_get_annot)(page, i) };
            if annot.is_null() {
                continue;
            }

            let subtype = unsafe { (self.annot_get_subtype)(annot) };

            // Read bounding rect
            let mut rect = FS_RECTF {
                left: 0.0,
                top: 0.0,
                right: 0.0,
                bottom: 0.0,
            };
            let has_rect = unsafe { (self.annot_get_rect)(annot, &mut rect) };
            let (left, top, right, bottom) = if has_rect != 0 {
                (rect.left, rect.top, rect.right, rect.bottom)
            } else {
                (0.0, 0.0, 0.0, 0.0)
            };

            // Read colour (type 0 = colour, type 1 = interior colour)
            let mut r: c_uint = 0;
            let mut g: c_uint = 0;
            let mut b: c_uint = 0;
            let mut a: c_uint = 0;
            let has_colour = unsafe { (self.annot_get_color)(annot, 0, &mut r, &mut g, &mut b, &mut a) } != 0;

            unsafe { (self.page_close_annot)(annot) };

            result.push(AnnotationInfo {
                index: i,
                subtype,
                left,
                top,
                right,
                bottom,
                has_colour,
                r: r as u32,
                g: g as u32,
                b: b as u32,
                a: a as u32,
            });
        }

        Ok(result)
    }

    // --- Annotation Mutations ---

    /// Create a new annotation on a page.
    ///
    /// Returns the index of the newly created annotation, or an error.
    pub fn create_annotation(&self, page_handle: u32, subtype: i32) -> Result<i32, String> {
        let page = match self.handles.get(&page_handle) {
            Some(HandleEntry::Page(page)) => *page,
            _ => return Err("Invalid page handle".to_string()),
        };

        let annot = unsafe { (self.page_create_annot)(page, subtype) };
        if annot.is_null() {
            return Err("Failed to create annotation".to_string());
        }

        unsafe { (self.page_close_annot)(annot) };

        // Return the index of the new annotation (last one)
        let count = unsafe { (self.page_get_annot_count)(page) };
        Ok(count - 1)
    }

    /// Remove an annotation from a page by index.
    pub fn remove_annotation(&self, page_handle: u32, index: i32) -> Result<bool, String> {
        let page = match self.handles.get(&page_handle) {
            Some(HandleEntry::Page(page)) => *page,
            _ => return Err("Invalid page handle".to_string()),
        };

        let result = unsafe { (self.page_remove_annot)(page, index) };
        Ok(result != 0)
    }

    /// Set the bounding rectangle of an annotation.
    pub fn set_annotation_rect(
        &self,
        page_handle: u32,
        index: i32,
        left: f32,
        top: f32,
        right: f32,
        bottom: f32,
    ) -> Result<bool, String> {
        let page = match self.handles.get(&page_handle) {
            Some(HandleEntry::Page(page)) => *page,
            _ => return Err("Invalid page handle".to_string()),
        };

        let annot = unsafe { (self.page_get_annot)(page, index) };
        if annot.is_null() {
            return Ok(false);
        }

        let rect = FS_RECTF { left, top, right, bottom };
        let ok = unsafe { (self.annot_set_rect)(annot, &rect) };
        unsafe { (self.page_close_annot)(annot) };
        Ok(ok != 0)
    }

    /// Set the colour of an annotation.
    ///
    /// `colour_type`: 0 = colour, 1 = interior colour.
    pub fn set_annotation_colour(
        &self,
        page_handle: u32,
        index: i32,
        colour_type: i32,
        r: u32,
        g: u32,
        b: u32,
        a: u32,
    ) -> Result<bool, String> {
        let page = match self.handles.get(&page_handle) {
            Some(HandleEntry::Page(page)) => *page,
            _ => return Err("Invalid page handle".to_string()),
        };

        let annot = unsafe { (self.page_get_annot)(page, index) };
        if annot.is_null() {
            return Ok(false);
        }

        let ok = unsafe {
            (self.annot_set_color)(annot, colour_type, r as c_uint, g as c_uint, b as c_uint, a as c_uint)
        };
        unsafe { (self.page_close_annot)(annot) };
        Ok(ok != 0)
    }

    /// Get the flags of an annotation.
    pub fn get_annotation_flags(&self, page_handle: u32, index: i32) -> Result<i32, String> {
        let page = match self.handles.get(&page_handle) {
            Some(HandleEntry::Page(page)) => *page,
            _ => return Err("Invalid page handle".to_string()),
        };

        let annot = unsafe { (self.page_get_annot)(page, index) };
        if annot.is_null() {
            return Err(format!("Failed to get annotation at index {}", index));
        }

        let flags = unsafe { (self.annot_get_flags)(annot) };
        unsafe { (self.page_close_annot)(annot) };
        Ok(flags)
    }

    /// Set the flags of an annotation.
    pub fn set_annotation_flags(
        &self,
        page_handle: u32,
        index: i32,
        flags: i32,
    ) -> Result<bool, String> {
        let page = match self.handles.get(&page_handle) {
            Some(HandleEntry::Page(page)) => *page,
            _ => return Err("Invalid page handle".to_string()),
        };

        let annot = unsafe { (self.page_get_annot)(page, index) };
        if annot.is_null() {
            return Ok(false);
        }

        let ok = unsafe { (self.annot_set_flags)(annot, flags) };
        unsafe { (self.page_close_annot)(annot) };
        Ok(ok != 0)
    }

    /// Set a string value on an annotation.
    ///
    /// `key` is an ASCII key like "Contents". `value` is a UTF-16LE string.
    pub fn set_annotation_string_value(
        &self,
        page_handle: u32,
        index: i32,
        key: &str,
        value: &str,
    ) -> Result<bool, String> {
        let page = match self.handles.get(&page_handle) {
            Some(HandleEntry::Page(page)) => *page,
            _ => return Err("Invalid page handle".to_string()),
        };

        let annot = unsafe { (self.page_get_annot)(page, index) };
        if annot.is_null() {
            return Ok(false);
        }

        let key_cstr = CString::new(key).map_err(|e| format!("Invalid key: {}", e))?;

        // Encode value as UTF-16LE with null terminator
        let mut utf16: Vec<u16> = value.encode_utf16().collect();
        utf16.push(0);

        let ok = unsafe { (self.annot_set_string_value)(annot, key_cstr.as_ptr(), utf16.as_ptr()) };
        unsafe { (self.page_close_annot)(annot) };
        Ok(ok != 0)
    }

    /// Set the border of an annotation.
    pub fn set_annotation_border(
        &self,
        page_handle: u32,
        index: i32,
        horizontal_radius: f32,
        vertical_radius: f32,
        border_width: f32,
    ) -> Result<bool, String> {
        let page = match self.handles.get(&page_handle) {
            Some(HandleEntry::Page(page)) => *page,
            _ => return Err("Invalid page handle".to_string()),
        };

        let annot = unsafe { (self.page_get_annot)(page, index) };
        if annot.is_null() {
            return Ok(false);
        }

        let ok = unsafe { (self.annot_set_border)(annot, horizontal_radius, vertical_radius, border_width) };
        unsafe { (self.page_close_annot)(annot) };
        Ok(ok != 0)
    }

    /// Set attachment points at a specific quad index on an annotation.
    pub fn set_annotation_attachment_points(
        &self,
        page_handle: u32,
        annot_index: i32,
        quad_index: usize,
        x1: f32, y1: f32,
        x2: f32, y2: f32,
        x3: f32, y3: f32,
        x4: f32, y4: f32,
    ) -> Result<bool, String> {
        let page = match self.handles.get(&page_handle) {
            Some(HandleEntry::Page(page)) => *page,
            _ => return Err("Invalid page handle".to_string()),
        };

        let annot = unsafe { (self.page_get_annot)(page, annot_index) };
        if annot.is_null() {
            return Ok(false);
        }

        let qp = FS_QUADPOINTSF { x1, y1, x2, y2, x3, y3, x4, y4 };
        let ok = unsafe { (self.annot_set_attachment_points)(annot, quad_index, &qp) };
        unsafe { (self.page_close_annot)(annot) };
        Ok(ok != 0)
    }

    /// Append attachment points to an annotation.
    pub fn append_annotation_attachment_points(
        &self,
        page_handle: u32,
        annot_index: i32,
        x1: f32, y1: f32,
        x2: f32, y2: f32,
        x3: f32, y3: f32,
        x4: f32, y4: f32,
    ) -> Result<bool, String> {
        let page = match self.handles.get(&page_handle) {
            Some(HandleEntry::Page(page)) => *page,
            _ => return Err("Invalid page handle".to_string()),
        };

        let annot = unsafe { (self.page_get_annot)(page, annot_index) };
        if annot.is_null() {
            return Ok(false);
        }

        let qp = FS_QUADPOINTSF { x1, y1, x2, y2, x3, y3, x4, y4 };
        let ok = unsafe { (self.annot_append_attachment_points)(annot, &qp) };
        unsafe { (self.page_close_annot)(annot) };
        Ok(ok != 0)
    }

    /// Set the URI on a link annotation.
    pub fn set_annotation_uri(
        &self,
        page_handle: u32,
        index: i32,
        uri: &str,
    ) -> Result<bool, String> {
        let page = match self.handles.get(&page_handle) {
            Some(HandleEntry::Page(page)) => *page,
            _ => return Err("Invalid page handle".to_string()),
        };

        let annot = unsafe { (self.page_get_annot)(page, index) };
        if annot.is_null() {
            return Ok(false);
        }

        let uri_cstr = CString::new(uri).map_err(|e| format!("Invalid URI: {}", e))?;
        let ok = unsafe { (self.annot_set_uri)(annot, uri_cstr.as_ptr()) };
        unsafe { (self.page_close_annot)(annot) };
        Ok(ok != 0)
    }

    // --- Links ---

    /// Get all links on a page, fully resolving actions and destinations.
    ///
    /// Uses `FPDFLink_Enumerate` to iterate links, then for each link reads
    /// bounds, action (type, URI, file path), and destination (page index,
    /// fit type, location).
    pub fn get_links(&self, page_handle: u32, doc_handle: u32) -> Result<Vec<LinkInfo>, String> {
        let page = match self.handles.get(&page_handle) {
            Some(HandleEntry::Page(page)) => *page,
            _ => return Err("Invalid page handle".to_string()),
        };
        let doc = match self.handles.get(&doc_handle) {
            Some(HandleEntry::Document(doc)) => *doc,
            _ => return Err("Invalid document handle".to_string()),
        };

        let mut result = Vec::new();
        let mut start_pos: c_int = 0;
        let mut link_ptr: *mut c_void = ptr::null_mut();
        let mut index: i32 = 0;

        while unsafe { (self.link_enumerate)(page, &mut start_pos, &mut link_ptr) } != 0 {
            if link_ptr.is_null() {
                continue;
            }

            // Bounds
            let mut rect = FS_RECTF { left: 0.0, top: 0.0, right: 0.0, bottom: 0.0 };
            let has_rect = unsafe { (self.link_get_annot_rect)(link_ptr, &mut rect) } != 0;
            let (left, bottom, right, top) = if has_rect {
                // FS_RECTF: left, bottom, right, top (PDF coordinate order for link rects)
                (rect.left, rect.top, rect.right, rect.bottom)
            } else {
                (0.0, 0.0, 0.0, 0.0)
            };

            // Action
            let action_handle = unsafe { (self.link_get_action)(link_ptr) };
            let has_action = !action_handle.is_null();
            let mut action_type: u32 = 0;
            let mut uri: Option<String> = None;
            let mut file_path: Option<String> = None;

            if has_action {
                action_type = unsafe { (self.action_get_type)(action_handle) } as u32;

                // URI (action type 3)
                if action_type == 3 {
                    uri = self.read_action_uri(doc, action_handle);
                }

                // File path (action type 2 = RemoteGoTo, 4 = Launch)
                if action_type == 2 || action_type == 4 {
                    file_path = self.read_action_file_path(action_handle);
                }
            }

            // Destination — try link's direct dest first, then action's dest
            let mut dest_handle = unsafe { (self.link_get_dest)(doc, link_ptr) };
            if dest_handle.is_null() && has_action {
                dest_handle = unsafe { (self.action_get_dest)(doc, action_handle) };
            }

            let has_dest = !dest_handle.is_null();
            let mut dest_page_index: i32 = -1;
            let mut dest_fit_type: u32 = 0;
            let mut has_x = false;
            let mut has_y = false;
            let mut has_zoom = false;
            let mut x: f32 = 0.0;
            let mut y: f32 = 0.0;
            let mut zoom: f32 = 0.0;

            if has_dest {
                dest_page_index = unsafe { (self.dest_get_dest_page_index)(doc, dest_handle) };

                let mut num_params: c_ulong = 0;
                let mut params = [0f32; 4];
                dest_fit_type = unsafe {
                    (self.dest_get_view)(dest_handle, &mut num_params, params.as_mut_ptr())
                } as u32;

                let mut has_x_raw: c_int = 0;
                let mut has_y_raw: c_int = 0;
                let mut has_zoom_raw: c_int = 0;
                unsafe {
                    (self.dest_get_location_in_page)(
                        dest_handle,
                        &mut has_x_raw,
                        &mut has_y_raw,
                        &mut has_zoom_raw,
                        &mut x,
                        &mut y,
                        &mut zoom,
                    );
                }
                has_x = has_x_raw != 0;
                has_y = has_y_raw != 0;
                has_zoom = has_zoom_raw != 0;
            }

            result.push(LinkInfo {
                index,
                left,
                bottom,
                right,
                top,
                has_action,
                action_type,
                uri,
                file_path,
                has_dest,
                dest_page_index,
                dest_fit_type,
                has_x,
                has_y,
                has_zoom,
                x,
                y,
                zoom,
            });

            index += 1;
        }

        Ok(result)
    }

    fn read_action_uri(&self, doc: FPDF_DOCUMENT, action: FPDF_ACTION) -> Option<String> {
        let size = unsafe { (self.action_get_uri_path)(doc, action, ptr::null_mut(), 0) } as usize;
        if size <= 1 {
            return None;
        }
        let mut buf = vec![0u8; size];
        unsafe {
            (self.action_get_uri_path)(doc, action, buf.as_mut_ptr() as *mut c_void, size as c_ulong);
        }
        // UTF-8, trim null
        if buf.last() == Some(&0) { buf.pop(); }
        String::from_utf8(buf).ok()
    }

    fn read_action_file_path(&self, action: FPDF_ACTION) -> Option<String> {
        let size = unsafe { (self.action_get_file_path)(action, ptr::null_mut(), 0) } as usize;
        if size <= 1 {
            return None;
        }
        let mut buf = vec![0u8; size];
        unsafe {
            (self.action_get_file_path)(action, buf.as_mut_ptr() as *mut c_void, size as c_ulong);
        }
        // UTF-8, trim null
        if buf.last() == Some(&0) { buf.pop(); }
        String::from_utf8(buf).ok()
    }

    fn read_bookmark_title(&self, bookmark: FPDF_BOOKMARK) -> String {
        let size =
            unsafe { (self.bookmark_get_title)(bookmark, ptr::null_mut(), 0) } as usize;
        if size <= 2 {
            // <= null terminator (2 bytes for UTF-16LE)
            return String::new();
        }

        let u16_len = size / 2;
        let mut buffer: Vec<u16> = vec![0u16; u16_len];

        unsafe {
            (self.bookmark_get_title)(
                bookmark,
                buffer.as_mut_ptr() as *mut c_void,
                size as c_ulong,
            );
        }

        // Trim null terminator
        let text_len = if u16_len > 0 && buffer[u16_len - 1] == 0 {
            u16_len - 1
        } else {
            u16_len
        };

        String::from_utf16(&buffer[..text_len]).unwrap_or_default()
    }
}

#[cfg(test)]
mod tests {
    //! PDFium has global state — tests MUST run serially:
    //! `cargo test -- --test-threads=1`

    use super::*;
    use std::path::PathBuf;

    /// Resolve the path to libpdfium for testing.
    /// Uses PDFIUM_LIB_PATH env var, or falls back to npm/darwin-arm64/libpdfium.dylib.
    fn lib_path() -> Option<PathBuf> {
        if let Ok(path) = std::env::var("PDFIUM_LIB_PATH") {
            return Some(PathBuf::from(path));
        }

        // Fall back to local dev path relative to crate root
        let candidates = [
            "npm/darwin-arm64/libpdfium.dylib",
            "npm/darwin-x64/libpdfium.dylib",
            "npm/linux-x64-gnu/libpdfium.so",
            "npm/linux-arm64-gnu/libpdfium.so",
            "npm/linux-x64-musl/libpdfium.so",
            "npm/win32-x64-msvc/pdfium.dll",
        ];

        for candidate in &candidates {
            let path = PathBuf::from(candidate);
            if path.exists() {
                return Some(path);
            }
        }

        None
    }

    fn test_pdf_path() -> PathBuf {
        PathBuf::from("test/fixtures/test_1.pdf")
    }

    macro_rules! skip_if_no_lib {
        () => {
            match lib_path() {
                Some(p) => p,
                None => {
                    eprintln!("Skipping test: no libpdfium available");
                    return;
                }
            }
        };
    }

    #[test]
    fn load_nonexistent_library_fails() {
        let result = PdfiumLibrary::load("/nonexistent/libpdfium.so");
        assert!(result.is_err());
        let err = result.err().unwrap();
        assert!(err.contains("Failed to load library"), "Unexpected error: {}", err);
    }

    #[test]
    fn load_library_succeeds() {
        let path = skip_if_no_lib!();
        let lib = PdfiumLibrary::load(&path);
        assert!(lib.is_ok(), "Failed to load library: {:?}", lib.err());
    }

    #[test]
    fn init_and_destroy_lifecycle() {
        let path = skip_if_no_lib!();
        let lib = PdfiumLibrary::load(&path).unwrap();
        lib.init_library();
        lib.destroy_library();
    }

    #[test]
    fn load_document_and_get_page_count() {
        let path = skip_if_no_lib!();
        let mut lib = PdfiumLibrary::load(&path).unwrap();
        lib.init_library();

        let pdf_data = std::fs::read(test_pdf_path()).expect("Failed to read test PDF");
        let doc_handle = lib.load_document(&pdf_data, None).unwrap();
        assert!(doc_handle > 0);

        let page_count = lib.get_page_count(doc_handle).unwrap();
        assert!(page_count > 0, "Expected at least one page");

        lib.close_document(doc_handle).unwrap();
        lib.destroy_library();
    }

    #[test]
    fn load_document_invalid_data_fails() {
        let path = skip_if_no_lib!();
        let mut lib = PdfiumLibrary::load(&path).unwrap();
        lib.init_library();

        let result = lib.load_document(b"not a pdf", None);
        assert!(result.is_err());

        lib.destroy_library();
    }

    #[test]
    fn invalid_handle_errors() {
        let path = skip_if_no_lib!();
        let lib = PdfiumLibrary::load(&path).unwrap();
        lib.init_library();

        assert!(lib.get_page_count(999).is_err());
        assert!(lib.get_page_width(999).is_err());
        assert!(lib.get_page_height(999).is_err());

        lib.destroy_library();
    }

    #[test]
    fn page_dimensions() {
        let path = skip_if_no_lib!();
        let mut lib = PdfiumLibrary::load(&path).unwrap();
        lib.init_library();

        let pdf_data = std::fs::read(test_pdf_path()).expect("Failed to read test PDF");
        let doc = lib.load_document(&pdf_data, None).unwrap();
        let page = lib.load_page(doc, 0).unwrap();

        let width = lib.get_page_width(page).unwrap();
        let height = lib.get_page_height(page).unwrap();
        assert!(width > 0.0, "Width should be positive");
        assert!(height > 0.0, "Height should be positive");

        lib.close_page(page).unwrap();
        lib.close_document(doc).unwrap();
        lib.destroy_library();
    }

    #[test]
    fn text_extraction() {
        let path = skip_if_no_lib!();
        let mut lib = PdfiumLibrary::load(&path).unwrap();
        lib.init_library();

        let pdf_data = std::fs::read(test_pdf_path()).expect("Failed to read test PDF");
        let doc = lib.load_document(&pdf_data, None).unwrap();
        let page = lib.load_page(doc, 0).unwrap();
        let text_page = lib.load_text_page(page).unwrap();

        let char_count = lib.count_text_chars(text_page).unwrap();
        assert!(char_count >= 0);

        let text = lib.get_full_text(text_page).unwrap();
        assert_eq!(text.len() > 0, char_count > 0);

        lib.close_text_page(text_page).unwrap();
        lib.close_page(page).unwrap();
        lib.close_document(doc).unwrap();
        lib.destroy_library();
    }

    #[test]
    fn render_page_produces_rgba_buffer() {
        let path = skip_if_no_lib!();
        let mut lib = PdfiumLibrary::load(&path).unwrap();
        lib.init_library();

        let pdf_data = std::fs::read(test_pdf_path()).expect("Failed to read test PDF");
        let doc = lib.load_document(&pdf_data, None).unwrap();
        let page = lib.load_page(doc, 0).unwrap();

        let width = lib.get_page_width(page).unwrap().round() as i32;
        let height = lib.get_page_height(page).unwrap().round() as i32;

        let pixels = lib.render_page(page, width, height, 0, 0, 0xFFFFFFFF).unwrap();
        assert_eq!(pixels.len(), (width * height * 4) as usize);

        // Verify it's not all zeros (something was rendered)
        assert!(pixels.iter().any(|&b| b != 0), "Rendered buffer should not be all zeros");

        lib.close_page(page).unwrap();
        lib.close_document(doc).unwrap();
        lib.destroy_library();
    }

    #[test]
    fn render_invalid_page_handle_fails() {
        let path = skip_if_no_lib!();
        let lib = PdfiumLibrary::load(&path).unwrap();
        lib.init_library();

        let result = lib.render_page(999, 100, 100, 0, 0, 0xFFFFFFFF);
        assert!(result.is_err());

        lib.destroy_library();
    }

    #[test]
    fn close_document_frees_handle() {
        let path = skip_if_no_lib!();
        let mut lib = PdfiumLibrary::load(&path).unwrap();
        lib.init_library();

        let pdf_data = std::fs::read(test_pdf_path()).expect("Failed to read test PDF");
        let doc = lib.load_document(&pdf_data, None).unwrap();
        lib.close_document(doc).unwrap();

        // Using closed handle should fail
        assert!(lib.get_page_count(doc).is_err());
        assert!(lib.close_document(doc).is_err());

        lib.destroy_library();
    }

    #[test]
    fn metadata_extraction() {
        let path = skip_if_no_lib!();
        let mut lib = PdfiumLibrary::load(&path).unwrap();
        lib.init_library();

        let pdf_data = std::fs::read(test_pdf_path()).expect("Failed to read test PDF");
        let doc = lib.load_document(&pdf_data, None).unwrap();

        // These may or may not return values depending on the test PDF
        let _title = lib.get_meta_text(doc, "Title").unwrap();
        let _author = lib.get_meta_text(doc, "Author").unwrap();
        let _producer = lib.get_meta_text(doc, "Producer").unwrap();

        // Non-existent tag should return None
        let missing = lib.get_meta_text(doc, "NonExistentTag12345").unwrap();
        assert!(missing.is_none() || missing.as_deref() == Some(""));

        lib.close_document(doc).unwrap();
        lib.destroy_library();
    }

    #[test]
    fn file_version_and_permissions() {
        let path = skip_if_no_lib!();
        let mut lib = PdfiumLibrary::load(&path).unwrap();
        lib.init_library();

        let pdf_data = std::fs::read(test_pdf_path()).expect("Failed to read test PDF");
        let doc = lib.load_document(&pdf_data, None).unwrap();

        let version = lib.get_file_version(doc).unwrap();
        assert!(version.is_some(), "Test PDF should have a file version");
        assert!(version.unwrap() >= 10, "PDF version should be >= 1.0 (10)");

        let _permissions = lib.get_doc_permissions(doc).unwrap();
        let _user_permissions = lib.get_doc_user_permissions(doc).unwrap();

        let page_mode = lib.get_page_mode(doc).unwrap();
        assert!(page_mode >= 0);

        let _sec_rev = lib.get_security_handler_revision(doc).unwrap();
        let _tagged = lib.is_tagged(doc).unwrap();

        lib.close_document(doc).unwrap();
        lib.destroy_library();
    }

    #[test]
    fn page_boxes() {
        let path = skip_if_no_lib!();
        let mut lib = PdfiumLibrary::load(&path).unwrap();
        lib.init_library();

        let pdf_data = std::fs::read(test_pdf_path()).expect("Failed to read test PDF");
        let doc = lib.load_document(&pdf_data, None).unwrap();
        let page = lib.load_page(doc, 0).unwrap();

        // MediaBox should always exist
        let media_box = lib.get_page_box(page, 0).unwrap();
        assert!(media_box.is_some(), "MediaBox should exist");
        let [left, bottom, right, top] = media_box.unwrap();
        assert!(right > left, "MediaBox width should be positive");
        assert!(top > bottom, "MediaBox height should be positive");

        // Other boxes may or may not exist
        let _crop = lib.get_page_box(page, 1).unwrap();
        let _bleed = lib.get_page_box(page, 2).unwrap();
        let _trim = lib.get_page_box(page, 3).unwrap();
        let _art = lib.get_page_box(page, 4).unwrap();

        // Invalid box type
        assert!(lib.get_page_box(page, 99).is_err());

        lib.close_page(page).unwrap();
        lib.close_document(doc).unwrap();
        lib.destroy_library();
    }

    #[test]
    fn char_font_info() {
        let path = skip_if_no_lib!();
        let mut lib = PdfiumLibrary::load(&path).unwrap();
        lib.init_library();

        let pdf_data = std::fs::read(test_pdf_path()).expect("Failed to read test PDF");
        let doc = lib.load_document(&pdf_data, None).unwrap();
        let page = lib.load_page(doc, 0).unwrap();
        let text_page = lib.load_text_page(page).unwrap();

        let char_count = lib.count_text_chars(text_page).unwrap();
        if char_count > 0 {
            let font_size = lib.get_char_font_size(text_page, 0).unwrap();
            assert!(font_size > 0.0, "Font size should be positive");

            let font_weight = lib.get_char_font_weight(text_page, 0).unwrap();
            assert!(font_weight > 0 || font_weight == -1, "Font weight should be > 0 or -1");

            let font_info = lib.get_char_font_info(text_page, 0).unwrap();
            assert!(font_info.is_some(), "Should have font info for first character");
            let (name, _flags) = font_info.unwrap();
            assert!(!name.is_empty(), "Font name should not be empty");

            let render_mode = lib.get_char_render_mode(text_page, 0).unwrap();
            assert!(render_mode >= 0 && render_mode <= 7, "Render mode should be 0-7");
        }

        lib.close_text_page(text_page).unwrap();
        lib.close_page(page).unwrap();
        lib.close_document(doc).unwrap();
        lib.destroy_library();
    }

    #[test]
    fn save_document() {
        let path = skip_if_no_lib!();
        let mut lib = PdfiumLibrary::load(&path).unwrap();
        lib.init_library();

        let pdf_data = std::fs::read(test_pdf_path()).expect("Failed to read test PDF");
        let doc = lib.load_document(&pdf_data, None).unwrap();

        // Save without version
        let saved = lib.save_document(doc, 0, None).unwrap();
        assert!(!saved.is_empty(), "Saved document should not be empty");
        assert!(saved.starts_with(b"%PDF"), "Saved data should start with %PDF header");

        // Save with version
        let saved_v17 = lib.save_document(doc, 0, Some(17)).unwrap();
        assert!(!saved_v17.is_empty(), "Saved document with version should not be empty");
        assert!(saved_v17.starts_with(b"%PDF"), "Saved data should start with %PDF header");

        lib.close_document(doc).unwrap();
        lib.destroy_library();
    }

    #[test]
    fn attachments() {
        let path = skip_if_no_lib!();
        let mut lib = PdfiumLibrary::load(&path).unwrap();
        lib.init_library();

        let pdf_data = std::fs::read(test_pdf_path()).expect("Failed to read test PDF");
        let doc = lib.load_document(&pdf_data, None).unwrap();

        let count = lib.get_attachment_count(doc).unwrap();
        assert!(count >= 0, "Attachment count should be non-negative");

        // If there are attachments, verify we can read them
        for i in 0..count {
            let result = lib.get_attachment(doc, i).unwrap();
            assert!(result.is_some(), "Should get attachment at index {}", i);
        }

        // Out-of-range index should return None
        let out_of_range = lib.get_attachment(doc, count + 100).unwrap();
        assert!(out_of_range.is_none());

        lib.close_document(doc).unwrap();
        lib.destroy_library();
    }

    #[test]
    fn bookmarks() {
        let path = skip_if_no_lib!();
        let mut lib = PdfiumLibrary::load(&path).unwrap();
        lib.init_library();

        // test_1.pdf likely has no bookmarks
        let pdf_data = std::fs::read(test_pdf_path()).expect("Failed to read test PDF");
        let doc = lib.load_document(&pdf_data, None).unwrap();
        let bookmarks = lib.get_bookmarks(doc).unwrap();
        // Just verify it doesn't crash and returns a valid vec
        let _ = bookmarks.len();
        lib.close_document(doc).unwrap();

        // test_3_with_images.pdf has bookmarks (used in the integration tests)
        let images_pdf = std::fs::read("test/fixtures/test_3_with_images.pdf");
        if let Ok(data) = images_pdf {
            let doc2 = lib.load_document(&data, None).unwrap();
            let bookmarks2 = lib.get_bookmarks(doc2).unwrap();
            // This PDF is known to have bookmarks
            if !bookmarks2.is_empty() {
                let first = &bookmarks2[0];
                assert!(!first.title.is_empty(), "First bookmark should have a title");
                // page_index is either >= 0 or -1
                assert!(first.page_index >= -1);
            }
            lib.close_document(doc2).unwrap();
        }

        lib.destroy_library();
    }

    #[test]
    fn annotations() {
        let path = skip_if_no_lib!();
        let mut lib = PdfiumLibrary::load(&path).unwrap();
        lib.init_library();

        let pdf_data = std::fs::read(test_pdf_path()).expect("Failed to read test PDF");
        let doc = lib.load_document(&pdf_data, None).unwrap();
        let page = lib.load_page(doc, 0).unwrap();

        let annotations = lib.get_annotations(page).unwrap();
        // Just verify it doesn't crash and returns a valid vec
        for ann in &annotations {
            assert!(ann.index >= 0);
            assert!(ann.subtype >= 0);
        }

        lib.close_page(page).unwrap();
        lib.close_document(doc).unwrap();
        lib.destroy_library();
    }

    #[test]
    fn links() {
        let path = skip_if_no_lib!();
        let mut lib = PdfiumLibrary::load(&path).unwrap();
        lib.init_library();

        let pdf_data = std::fs::read(test_pdf_path()).expect("Failed to read test PDF");
        let doc = lib.load_document(&pdf_data, None).unwrap();
        let page = lib.load_page(doc, 0).unwrap();

        let links = lib.get_links(page, doc).unwrap();
        // Just verify it doesn't crash and returns a valid vec
        for link in &links {
            assert!(link.index >= 0);
            if link.has_action {
                assert!(link.action_type <= 5);
            }
            if link.has_dest {
                assert!(link.dest_page_index >= -1);
            }
        }

        lib.close_page(page).unwrap();
        lib.close_document(doc).unwrap();
        lib.destroy_library();
    }

    #[test]
    fn annotation_mutations() {
        let path = skip_if_no_lib!();
        let mut lib = PdfiumLibrary::load(&path).unwrap();
        lib.init_library();

        let pdf_data = std::fs::read(test_pdf_path()).expect("Failed to read test PDF");
        let doc = lib.load_document(&pdf_data, None).unwrap();
        let page = lib.load_page(doc, 0).unwrap();

        let initial_count = lib.get_annotations(page).unwrap().len();

        // Create an annotation (Text type = 1)
        let new_index = lib.create_annotation(page, 1).unwrap();
        assert!(new_index >= 0);

        let after_create = lib.get_annotations(page).unwrap().len();
        assert_eq!(after_create, initial_count + 1);

        // Set rect
        let ok = lib.set_annotation_rect(page, new_index, 10.0, 200.0, 100.0, 10.0).unwrap();
        assert!(ok);

        // Set colour
        let ok = lib.set_annotation_colour(page, new_index, 0, 255, 0, 0, 255).unwrap();
        assert!(ok);

        // Set and get flags
        let ok = lib.set_annotation_flags(page, new_index, 4).unwrap(); // Hidden flag
        assert!(ok);
        let flags = lib.get_annotation_flags(page, new_index).unwrap();
        assert_eq!(flags, 4);

        // Set string value
        let ok = lib.set_annotation_string_value(page, new_index, "Contents", "Test note").unwrap();
        assert!(ok);

        // Set border
        let ok = lib.set_annotation_border(page, new_index, 0.0, 0.0, 2.0).unwrap();
        assert!(ok);

        // Remove annotation
        let ok = lib.remove_annotation(page, new_index).unwrap();
        assert!(ok);

        let after_remove = lib.get_annotations(page).unwrap().len();
        assert_eq!(after_remove, initial_count);

        lib.close_page(page).unwrap();
        lib.close_document(doc).unwrap();
        lib.destroy_library();
    }

    #[test]
    fn text_character_operations() {
        let path = skip_if_no_lib!();
        let mut lib = PdfiumLibrary::load(&path).unwrap();
        lib.init_library();

        let pdf_data = std::fs::read(test_pdf_path()).expect("Failed to read test PDF");
        let doc = lib.load_document(&pdf_data, None).unwrap();
        let page = lib.load_page(doc, 0).unwrap();
        let text_page = lib.load_text_page(page).unwrap();

        let char_count = lib.count_text_chars(text_page).unwrap();
        if char_count > 0 {
            // Unicode
            let unicode = lib.get_char_unicode(text_page, 0).unwrap();
            assert!(unicode > 0, "First char should have a unicode value");

            // Generated / hyphen / map error
            let _gen = lib.is_char_generated(text_page, 0).unwrap();
            let _hyp = lib.is_char_hyphen(text_page, 0).unwrap();
            let _err = lib.has_char_unicode_map_error(text_page, 0).unwrap();

            // Angle
            let angle = lib.get_char_angle(text_page, 0).unwrap();
            assert!(angle >= 0.0, "Angle should be non-negative");

            // Origin
            let origin = lib.get_char_origin(text_page, 0).unwrap();
            assert!(origin.is_some(), "First char should have an origin");

            // Box
            let cbox = lib.get_char_box(text_page, 0).unwrap();
            assert!(cbox.is_some(), "First char should have a bounding box");

            // Fill colour
            let fill = lib.get_char_fill_colour(text_page, 0).unwrap();
            assert!(fill.is_some(), "First char should have a fill colour");

            // Stroke colour (may or may not be available)
            let _stroke = lib.get_char_stroke_colour(text_page, 0).unwrap();

            // Matrix
            let _matrix = lib.get_char_matrix(text_page, 0).unwrap();

            // Index at position
            let idx = lib.get_char_index_at_pos(text_page, 100.0, 100.0, 10.0, 10.0).unwrap();
            // idx can be -1 if no char at position — that's OK
            assert!(idx >= -3, "Char index at pos should be a valid result");
        }

        lib.close_text_page(text_page).unwrap();
        lib.close_page(page).unwrap();
        lib.close_document(doc).unwrap();
        lib.destroy_library();
    }

    #[test]
    fn text_search_and_rects() {
        let path = skip_if_no_lib!();
        let mut lib = PdfiumLibrary::load(&path).unwrap();
        lib.init_library();

        let pdf_data = std::fs::read(test_pdf_path()).expect("Failed to read test PDF");
        let doc = lib.load_document(&pdf_data, None).unwrap();
        let page = lib.load_page(doc, 0).unwrap();
        let text_page = lib.load_text_page(page).unwrap();

        // Get the full text and search for a substring
        let full_text = lib.get_full_text(text_page).unwrap();
        let first_three: String = full_text.chars().take(3).collect();
        if first_three.chars().count() == 3 {
            let query = &first_three;
            let results = lib.find_text(text_page, query, 0).unwrap();
            assert!(!results.is_empty(), "Should find at least one match for '{}'", query);

            // First result should have valid index and count
            let (index, count) = results[0];
            assert!(index >= 0);
            assert!(count > 0);

            // Count rects for the found text
            let rect_count = lib.count_text_rects(text_page, index, count).unwrap();
            assert!(rect_count > 0, "Found text should have at least one rect");

            // Get the first rect
            let rect = lib.get_text_rect(text_page, 0).unwrap();
            assert!(rect.is_some(), "First rect should be available");
        }

        // Bounded text
        let bounded = lib.get_bounded_text(text_page, 0.0, 0.0, 1000.0, 1000.0).unwrap();
        // May or may not have text depending on coordinate system
        let _ = bounded;

        lib.close_text_page(text_page).unwrap();
        lib.close_page(page).unwrap();
        lib.close_document(doc).unwrap();
        lib.destroy_library();
    }

    #[test]
    fn page_rotation_and_flatten() {
        let path = skip_if_no_lib!();
        let mut lib = PdfiumLibrary::load(&path).unwrap();
        lib.init_library();

        let pdf_data = std::fs::read(test_pdf_path()).expect("Failed to read test PDF");
        let doc = lib.load_document(&pdf_data, None).unwrap();
        let page = lib.load_page(doc, 0).unwrap();

        // Get rotation
        let rotation = lib.get_page_rotation(page).unwrap();
        assert!(rotation >= 0 && rotation <= 3, "Rotation should be 0-3");

        // Set rotation
        lib.set_page_rotation(page, 1).unwrap();
        let new_rotation = lib.get_page_rotation(page).unwrap();
        assert_eq!(new_rotation, 1);

        // Restore
        lib.set_page_rotation(page, rotation).unwrap();

        // Transparency
        let _has_transparency = lib.has_page_transparency(page).unwrap();

        // Flatten (2 means nothing to flatten, which is ok for this test PDF)
        let flatten_result = lib.flatten_page(page, 0).unwrap();
        assert!(flatten_result >= 0 && flatten_result <= 2);

        // Generate content
        let ok = lib.generate_content(page).unwrap();
        assert!(ok, "generateContent should succeed");

        lib.close_page(page).unwrap();
        lib.close_document(doc).unwrap();
        lib.destroy_library();
    }

    #[test]
    fn coordinate_conversion() {
        let path = skip_if_no_lib!();
        let mut lib = PdfiumLibrary::load(&path).unwrap();
        lib.init_library();

        let pdf_data = std::fs::read(test_pdf_path()).expect("Failed to read test PDF");
        let doc = lib.load_document(&pdf_data, None).unwrap();
        let page = lib.load_page(doc, 0).unwrap();

        let width = lib.get_page_width(page).unwrap().round() as i32;
        let height = lib.get_page_height(page).unwrap().round() as i32;

        // Device to page
        let (px, py) = lib.device_to_page(page, 0, 0, width, height, 0, width / 2, height / 2).unwrap();
        assert!(px > 0.0 && py > 0.0, "Page coordinates should be positive for center point");

        // Page to device
        let (dx, dy) = lib.page_to_device(page, 0, 0, width, height, 0, px, py).unwrap();
        // Should round-trip back to approximately the center
        assert!((dx - width / 2).abs() <= 1, "Device X should round-trip");
        assert!((dy - height / 2).abs() <= 1, "Device Y should round-trip");

        lib.close_page(page).unwrap();
        lib.close_document(doc).unwrap();
        lib.destroy_library();
    }

    #[test]
    fn import_pages() {
        let path = skip_if_no_lib!();
        let mut lib = PdfiumLibrary::load(&path).unwrap();
        lib.init_library();

        let pdf_data = std::fs::read(test_pdf_path()).expect("Failed to read test PDF");
        let src = lib.load_document(&pdf_data, None).unwrap();
        let dest = lib.load_document(&pdf_data, None).unwrap();

        let original_count = lib.get_page_count(dest).unwrap();
        assert!(original_count > 0);

        // Import all pages
        lib.import_pages(dest, src, None, original_count).unwrap();
        assert_eq!(lib.get_page_count(dest).unwrap(), original_count * 2);

        // Import by index
        let dest2 = lib.load_document(&pdf_data, None).unwrap();
        lib.import_pages_by_index(dest2, src, &[0], lib.get_page_count(dest2).unwrap()).unwrap();
        assert_eq!(lib.get_page_count(dest2).unwrap(), original_count + 1);

        // N-up
        let nup = lib.import_n_pages_to_one(src, 842.0, 595.0, 2, 1).unwrap();
        assert!(lib.get_page_count(nup).unwrap() > 0);

        // Copy viewer preferences (should succeed even if no prefs exist)
        let result = lib.copy_viewer_preferences(dest, src).unwrap();
        // Just verify it doesn't crash — result depends on document content
        let _ = result;

        lib.close_document(nup).unwrap();
        lib.close_document(dest2).unwrap();
        lib.close_document(dest).unwrap();
        lib.close_document(src).unwrap();
        lib.destroy_library();
    }
}
