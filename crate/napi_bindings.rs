//! napi-rs bindings exposing PdfiumLibrary to Node.js.

use crate::{AnnotationInfo, BookmarkNode, LinkInfo, PdfiumLibrary};
use napi::bindgen_prelude::*;
use napi_derive::napi;
use std::cell::RefCell;

#[napi(object)]
pub struct NativeAttachment {
    pub name: String,
    pub data: Buffer,
}

#[napi(object)]
pub struct NativeCharFontInfo {
    pub name: String,
    pub flags: i32,
}

#[napi(object)]
pub struct NativeBookmark {
    pub title: String,
    pub page_index: i32,
    pub children: Vec<NativeBookmark>,
}

fn to_native_bookmarks(nodes: Vec<BookmarkNode>) -> Vec<NativeBookmark> {
    nodes
        .into_iter()
        .map(|n| NativeBookmark {
            title: n.title,
            page_index: n.page_index,
            children: to_native_bookmarks(n.children),
        })
        .collect()
}

#[napi(object)]
pub struct NativeAnnotation {
    pub index: i32,
    pub subtype: i32,
    pub left: f64,
    pub top: f64,
    pub right: f64,
    pub bottom: f64,
    pub has_colour: bool,
    pub r: u32,
    pub g: u32,
    pub b: u32,
    pub a: u32,
}

fn to_native_annotations(infos: Vec<AnnotationInfo>) -> Vec<NativeAnnotation> {
    infos
        .into_iter()
        .map(|a| NativeAnnotation {
            index: a.index,
            subtype: a.subtype,
            left: a.left as f64,
            top: a.top as f64,
            right: a.right as f64,
            bottom: a.bottom as f64,
            has_colour: a.has_colour,
            r: a.r,
            g: a.g,
            b: a.b,
            a: a.a,
        })
        .collect()
}

#[napi(object)]
pub struct NativeLink {
    pub index: i32,
    pub left: f64,
    pub bottom: f64,
    pub right: f64,
    pub top: f64,
    pub has_action: bool,
    pub action_type: u32,
    pub uri: Option<String>,
    pub file_path: Option<String>,
    pub has_dest: bool,
    pub dest_page_index: i32,
    pub dest_fit_type: u32,
    pub has_x: bool,
    pub has_y: bool,
    pub has_zoom: bool,
    pub x: f64,
    pub y: f64,
    pub zoom: f64,
}

fn to_native_links(infos: Vec<LinkInfo>) -> Vec<NativeLink> {
    infos
        .into_iter()
        .map(|l| NativeLink {
            index: l.index,
            left: l.left as f64,
            bottom: l.bottom as f64,
            right: l.right as f64,
            top: l.top as f64,
            has_action: l.has_action,
            action_type: l.action_type,
            uri: l.uri,
            file_path: l.file_path,
            has_dest: l.has_dest,
            dest_page_index: l.dest_page_index,
            dest_fit_type: l.dest_fit_type,
            has_x: l.has_x,
            has_y: l.has_y,
            has_zoom: l.has_zoom,
            x: l.x as f64,
            y: l.y as f64,
            zoom: l.zoom as f64,
        })
        .collect()
}

#[napi(object)]
pub struct NativeSignature {
    pub index: i32,
    pub contents: Option<Buffer>,
    pub byte_range: Option<Vec<i32>>,
    pub sub_filter: Option<String>,
    pub reason: Option<String>,
    pub time: Option<String>,
    pub doc_mdp_permission: i32,
}

#[napi(object)]
pub struct NativePoint {
    pub x: f64,
    pub y: f64,
}

#[napi(object)]
pub struct NativeDevicePoint {
    pub x: i32,
    pub y: i32,
}

#[napi(object)]
pub struct NativeCharBox {
    pub left: f64,
    pub right: f64,
    pub bottom: f64,
    pub top: f64,
}

#[napi(object)]
pub struct NativeRect {
    pub left: f64,
    pub top: f64,
    pub right: f64,
    pub bottom: f64,
}

#[napi(object)]
pub struct NativeColour {
    pub r: u32,
    pub g: u32,
    pub b: u32,
    pub a: u32,
}

#[napi(object)]
pub struct NativeSearchResult {
    pub index: i32,
    pub count: i32,
}

#[napi]
pub struct NativePdfium {
    inner: RefCell<PdfiumLibrary>,
}

#[napi]
impl NativePdfium {
    #[napi(factory)]
    pub fn load(library_path: String) -> Result<Self> {
        let lib = PdfiumLibrary::load(&library_path)
            .map_err(|e| Error::from_reason(e))?;
        Ok(Self {
            inner: RefCell::new(lib),
        })
    }

    #[napi]
    pub fn init_library(&self) {
        self.inner.borrow().init_library();
    }

    #[napi]
    pub fn destroy_library(&self) {
        self.inner.borrow().destroy_library();
    }

    #[napi]
    pub fn get_last_error(&self) -> u32 {
        self.inner.borrow().get_last_error()
    }

    #[napi]
    pub fn load_document(&self, data: Buffer, password: Option<String>) -> Result<u32> {
        self.inner
            .borrow_mut()
            .load_document(&data, password.as_deref())
            .map_err(|e| Error::from_reason(e))
    }

    #[napi]
    pub fn close_document(&self, handle: u32) -> Result<()> {
        self.inner
            .borrow_mut()
            .close_document(handle)
            .map_err(|e| Error::from_reason(e))
    }

    #[napi]
    pub fn get_page_count(&self, doc_handle: u32) -> Result<i32> {
        self.inner
            .borrow()
            .get_page_count(doc_handle)
            .map_err(|e| Error::from_reason(e))
    }

    #[napi]
    pub fn load_page(&self, doc_handle: u32, index: i32) -> Result<u32> {
        self.inner
            .borrow_mut()
            .load_page(doc_handle, index)
            .map_err(|e| Error::from_reason(e))
    }

    #[napi]
    pub fn close_page(&self, page_handle: u32) -> Result<()> {
        self.inner
            .borrow_mut()
            .close_page(page_handle)
            .map_err(|e| Error::from_reason(e))
    }

    #[napi]
    pub fn get_page_width(&self, page_handle: u32) -> Result<f64> {
        self.inner
            .borrow()
            .get_page_width(page_handle)
            .map_err(|e| Error::from_reason(e))
    }

    #[napi]
    pub fn get_page_height(&self, page_handle: u32) -> Result<f64> {
        self.inner
            .borrow()
            .get_page_height(page_handle)
            .map_err(|e| Error::from_reason(e))
    }

    #[napi]
    pub fn load_text_page(&self, page_handle: u32) -> Result<u32> {
        self.inner
            .borrow_mut()
            .load_text_page(page_handle)
            .map_err(|e| Error::from_reason(e))
    }

    #[napi]
    pub fn close_text_page(&self, text_page_handle: u32) -> Result<()> {
        self.inner
            .borrow_mut()
            .close_text_page(text_page_handle)
            .map_err(|e| Error::from_reason(e))
    }

    #[napi]
    pub fn count_text_chars(&self, text_page_handle: u32) -> Result<i32> {
        self.inner
            .borrow()
            .count_text_chars(text_page_handle)
            .map_err(|e| Error::from_reason(e))
    }

    #[napi]
    pub fn get_full_text(&self, text_page_handle: u32) -> Result<String> {
        self.inner
            .borrow()
            .get_full_text(text_page_handle)
            .map_err(|e| Error::from_reason(e))
    }

    // --- Text Character Font Info ---

    #[napi]
    pub fn get_char_font_size(&self, text_page_handle: u32, char_index: i32) -> Result<f64> {
        self.inner
            .borrow()
            .get_char_font_size(text_page_handle, char_index)
            .map_err(|e| Error::from_reason(e))
    }

    #[napi]
    pub fn get_char_font_weight(&self, text_page_handle: u32, char_index: i32) -> Result<i32> {
        self.inner
            .borrow()
            .get_char_font_weight(text_page_handle, char_index)
            .map_err(|e| Error::from_reason(e))
    }

    /// Get font name and flags for a character.
    /// Returns { name, flags } or null if unavailable.
    #[napi]
    pub fn get_char_font_info(&self, text_page_handle: u32, char_index: i32) -> Result<Option<NativeCharFontInfo>> {
        self.inner
            .borrow()
            .get_char_font_info(text_page_handle, char_index)
            .map(|opt| opt.map(|(name, flags)| NativeCharFontInfo { name, flags }))
            .map_err(|e| Error::from_reason(e))
    }

    #[napi]
    pub fn get_char_render_mode(&self, text_page_handle: u32, char_index: i32) -> Result<i32> {
        self.inner
            .borrow()
            .get_char_render_mode(text_page_handle, char_index)
            .map_err(|e| Error::from_reason(e))
    }

    // --- Metadata ---

    #[napi]
    pub fn get_meta_text(&self, doc_handle: u32, tag: String) -> Result<Option<String>> {
        self.inner
            .borrow()
            .get_meta_text(doc_handle, &tag)
            .map_err(|e| Error::from_reason(e))
    }

    #[napi]
    pub fn get_file_version(&self, doc_handle: u32) -> Result<Option<i32>> {
        self.inner
            .borrow()
            .get_file_version(doc_handle)
            .map_err(|e| Error::from_reason(e))
    }

    #[napi]
    pub fn get_doc_permissions(&self, doc_handle: u32) -> Result<u32> {
        self.inner
            .borrow()
            .get_doc_permissions(doc_handle)
            .map_err(|e| Error::from_reason(e))
    }

    #[napi]
    pub fn get_doc_user_permissions(&self, doc_handle: u32) -> Result<u32> {
        self.inner
            .borrow()
            .get_doc_user_permissions(doc_handle)
            .map_err(|e| Error::from_reason(e))
    }

    #[napi]
    pub fn get_page_mode(&self, doc_handle: u32) -> Result<i32> {
        self.inner
            .borrow()
            .get_page_mode(doc_handle)
            .map_err(|e| Error::from_reason(e))
    }

    #[napi]
    pub fn get_security_handler_revision(&self, doc_handle: u32) -> Result<i32> {
        self.inner
            .borrow()
            .get_security_handler_revision(doc_handle)
            .map_err(|e| Error::from_reason(e))
    }

    #[napi]
    pub fn is_tagged(&self, doc_handle: u32) -> Result<bool> {
        self.inner
            .borrow()
            .is_tagged(doc_handle)
            .map_err(|e| Error::from_reason(e))
    }

    #[napi]
    pub fn get_page_label(&self, doc_handle: u32, page_index: i32) -> Result<Option<String>> {
        self.inner
            .borrow()
            .get_page_label(doc_handle, page_index)
            .map_err(|e| Error::from_reason(e))
    }

    // --- Page Boxes ---

    /// Get a page box. box_type: 0=Media, 1=Crop, 2=Bleed, 3=Trim, 4=Art.
    /// Returns [left, bottom, right, top] or null.
    #[napi]
    pub fn get_page_box(&self, page_handle: u32, box_type: i32) -> Result<Option<Vec<f64>>> {
        self.inner
            .borrow()
            .get_page_box(page_handle, box_type)
            .map(|opt| opt.map(|[l, b, r, t]| vec![l as f64, b as f64, r as f64, t as f64]))
            .map_err(|e| Error::from_reason(e))
    }

    /// Set a page box. box_type: 0=Media, 1=Crop, 2=Bleed, 3=Trim, 4=Art.
    #[napi]
    pub fn set_page_box(
        &self,
        page_handle: u32,
        box_type: i32,
        left: f64,
        bottom: f64,
        right: f64,
        top: f64,
    ) -> Result<()> {
        self.inner
            .borrow()
            .set_page_box(page_handle, box_type, left as f32, bottom as f32, right as f32, top as f32)
            .map_err(|e| Error::from_reason(e))
    }

    // --- Render ---

    #[napi]
    pub fn render_page(
        &self,
        page_handle: u32,
        width: i32,
        height: i32,
        rotation: i32,
        flags: i32,
        bg_colour: u32,
    ) -> Result<Buffer> {
        self.inner
            .borrow()
            .render_page(page_handle, width, height, rotation, flags, bg_colour)
            .map(|data| data.into())
            .map_err(|e| Error::from_reason(e))
    }

    // --- Save / Export ---

    /// Save a document to a buffer.
    /// flags: 0=None, 1=Incremental, 2=NoIncremental, 3=RemoveSecurity.
    /// version: optional PDF version (e.g. 17 for PDF 1.7).
    #[napi]
    pub fn save_document(&self, doc_handle: u32, flags: u32, version: Option<i32>) -> Result<Buffer> {
        self.inner
            .borrow()
            .save_document(doc_handle, flags, version)
            .map(|data| data.into())
            .map_err(|e| Error::from_reason(e))
    }

    // --- Attachments ---

    #[napi]
    pub fn get_attachment_count(&self, doc_handle: u32) -> Result<i32> {
        self.inner
            .borrow()
            .get_attachment_count(doc_handle)
            .map_err(|e| Error::from_reason(e))
    }

    #[napi]
    pub fn get_attachment(&self, doc_handle: u32, index: i32) -> Result<Option<NativeAttachment>> {
        self.inner
            .borrow()
            .get_attachment(doc_handle, index)
            .map(|opt| opt.map(|(name, data)| NativeAttachment { name, data: data.into() }))
            .map_err(|e| Error::from_reason(e))
    }

    // --- Page Import ---

    #[napi]
    pub fn import_pages(
        &self,
        dest_handle: u32,
        src_handle: u32,
        page_range: Option<String>,
        insert_index: i32,
    ) -> Result<()> {
        self.inner
            .borrow()
            .import_pages(dest_handle, src_handle, page_range.as_deref(), insert_index)
            .map_err(|e| Error::from_reason(e))
    }

    #[napi]
    pub fn import_pages_by_index(
        &self,
        dest_handle: u32,
        src_handle: u32,
        page_indices: Vec<i32>,
        insert_index: i32,
    ) -> Result<()> {
        self.inner
            .borrow()
            .import_pages_by_index(dest_handle, src_handle, &page_indices, insert_index)
            .map_err(|e| Error::from_reason(e))
    }

    #[napi]
    pub fn import_n_pages_to_one(
        &self,
        src_handle: u32,
        output_width: f64,
        output_height: f64,
        pages_per_row: u32,
        pages_per_column: u32,
    ) -> Result<u32> {
        self.inner
            .borrow_mut()
            .import_n_pages_to_one(
                src_handle,
                output_width as f32,
                output_height as f32,
                pages_per_row as usize,
                pages_per_column as usize,
            )
            .map_err(|e| Error::from_reason(e))
    }

    #[napi]
    pub fn copy_viewer_preferences(&self, dest_handle: u32, src_handle: u32) -> Result<bool> {
        self.inner
            .borrow()
            .copy_viewer_preferences(dest_handle, src_handle)
            .map_err(|e| Error::from_reason(e))
    }

    // --- Signatures ---

    #[napi]
    pub fn get_signature_count(&self, doc_handle: u32) -> Result<i32> {
        self.inner
            .borrow()
            .get_signature_count(doc_handle)
            .map_err(|e| Error::from_reason(e))
    }

    // --- Bookmarks ---

    #[napi]
    pub fn get_bookmarks(&self, doc_handle: u32) -> Result<Vec<NativeBookmark>> {
        let nodes = self
            .inner
            .borrow()
            .get_bookmarks(doc_handle)
            .map_err(|e| Error::from_reason(e))?;
        Ok(to_native_bookmarks(nodes))
    }

    // --- Annotations ---

    #[napi]
    pub fn get_annotations(&self, page_handle: u32) -> Result<Vec<NativeAnnotation>> {
        let infos = self
            .inner
            .borrow()
            .get_annotations(page_handle)
            .map_err(|e| Error::from_reason(e))?;
        Ok(to_native_annotations(infos))
    }

    // --- Annotation Mutations ---

    #[napi]
    pub fn create_annotation(&self, page_handle: u32, subtype: i32) -> Result<i32> {
        self.inner
            .borrow()
            .create_annotation(page_handle, subtype)
            .map_err(|e| Error::from_reason(e))
    }

    #[napi]
    pub fn remove_annotation(&self, page_handle: u32, index: i32) -> Result<bool> {
        self.inner
            .borrow()
            .remove_annotation(page_handle, index)
            .map_err(|e| Error::from_reason(e))
    }

    #[napi]
    pub fn set_annotation_rect(
        &self,
        page_handle: u32,
        index: i32,
        left: f64,
        top: f64,
        right: f64,
        bottom: f64,
    ) -> Result<bool> {
        self.inner
            .borrow()
            .set_annotation_rect(page_handle, index, left as f32, top as f32, right as f32, bottom as f32)
            .map_err(|e| Error::from_reason(e))
    }

    #[napi]
    pub fn set_annotation_colour(
        &self,
        page_handle: u32,
        index: i32,
        colour_type: i32,
        r: u32,
        g: u32,
        b: u32,
        a: u32,
    ) -> Result<bool> {
        self.inner
            .borrow()
            .set_annotation_colour(page_handle, index, colour_type, r, g, b, a)
            .map_err(|e| Error::from_reason(e))
    }

    #[napi]
    pub fn get_annotation_flags(&self, page_handle: u32, index: i32) -> Result<i32> {
        self.inner
            .borrow()
            .get_annotation_flags(page_handle, index)
            .map_err(|e| Error::from_reason(e))
    }

    #[napi]
    pub fn set_annotation_flags(&self, page_handle: u32, index: i32, flags: i32) -> Result<bool> {
        self.inner
            .borrow()
            .set_annotation_flags(page_handle, index, flags)
            .map_err(|e| Error::from_reason(e))
    }

    #[napi]
    pub fn set_annotation_string_value(
        &self,
        page_handle: u32,
        index: i32,
        key: String,
        value: String,
    ) -> Result<bool> {
        self.inner
            .borrow()
            .set_annotation_string_value(page_handle, index, &key, &value)
            .map_err(|e| Error::from_reason(e))
    }

    #[napi]
    pub fn set_annotation_border(
        &self,
        page_handle: u32,
        index: i32,
        horizontal_radius: f64,
        vertical_radius: f64,
        border_width: f64,
    ) -> Result<bool> {
        self.inner
            .borrow()
            .set_annotation_border(
                page_handle,
                index,
                horizontal_radius as f32,
                vertical_radius as f32,
                border_width as f32,
            )
            .map_err(|e| Error::from_reason(e))
    }

    #[napi]
    pub fn set_annotation_attachment_points(
        &self,
        page_handle: u32,
        annot_index: i32,
        quad_index: u32,
        x1: f64, y1: f64,
        x2: f64, y2: f64,
        x3: f64, y3: f64,
        x4: f64, y4: f64,
    ) -> Result<bool> {
        self.inner
            .borrow()
            .set_annotation_attachment_points(
                page_handle,
                annot_index,
                quad_index as usize,
                x1 as f32, y1 as f32,
                x2 as f32, y2 as f32,
                x3 as f32, y3 as f32,
                x4 as f32, y4 as f32,
            )
            .map_err(|e| Error::from_reason(e))
    }

    #[napi]
    pub fn append_annotation_attachment_points(
        &self,
        page_handle: u32,
        annot_index: i32,
        x1: f64, y1: f64,
        x2: f64, y2: f64,
        x3: f64, y3: f64,
        x4: f64, y4: f64,
    ) -> Result<bool> {
        self.inner
            .borrow()
            .append_annotation_attachment_points(
                page_handle,
                annot_index,
                x1 as f32, y1 as f32,
                x2 as f32, y2 as f32,
                x3 as f32, y3 as f32,
                x4 as f32, y4 as f32,
            )
            .map_err(|e| Error::from_reason(e))
    }

    #[napi]
    pub fn set_annotation_uri(&self, page_handle: u32, index: i32, uri: String) -> Result<bool> {
        self.inner
            .borrow()
            .set_annotation_uri(page_handle, index, &uri)
            .map_err(|e| Error::from_reason(e))
    }

    // --- Text Character Extended Operations ---

    #[napi]
    pub fn get_char_unicode(&self, text_page_handle: u32, char_index: i32) -> Result<u32> {
        self.inner
            .borrow()
            .get_char_unicode(text_page_handle, char_index)
            .map_err(|e| Error::from_reason(e))
    }

    #[napi]
    pub fn is_char_generated(&self, text_page_handle: u32, char_index: i32) -> Result<bool> {
        self.inner
            .borrow()
            .is_char_generated(text_page_handle, char_index)
            .map_err(|e| Error::from_reason(e))
    }

    #[napi]
    pub fn is_char_hyphen(&self, text_page_handle: u32, char_index: i32) -> Result<bool> {
        self.inner
            .borrow()
            .is_char_hyphen(text_page_handle, char_index)
            .map_err(|e| Error::from_reason(e))
    }

    #[napi]
    pub fn has_char_unicode_map_error(&self, text_page_handle: u32, char_index: i32) -> Result<bool> {
        self.inner
            .borrow()
            .has_char_unicode_map_error(text_page_handle, char_index)
            .map_err(|e| Error::from_reason(e))
    }

    #[napi]
    pub fn get_char_angle(&self, text_page_handle: u32, char_index: i32) -> Result<f64> {
        self.inner
            .borrow()
            .get_char_angle(text_page_handle, char_index)
            .map_err(|e| Error::from_reason(e))
    }

    /// Get the origin (x, y) of a character. Returns { x, y } or null.
    #[napi]
    pub fn get_char_origin(&self, text_page_handle: u32, char_index: i32) -> Result<Option<NativePoint>> {
        self.inner
            .borrow()
            .get_char_origin(text_page_handle, char_index)
            .map(|opt| opt.map(|(x, y)| NativePoint { x, y }))
            .map_err(|e| Error::from_reason(e))
    }

    /// Get char bounding box. Returns { left, right, bottom, top } or null.
    #[napi]
    pub fn get_char_box(&self, text_page_handle: u32, char_index: i32) -> Result<Option<NativeCharBox>> {
        self.inner
            .borrow()
            .get_char_box(text_page_handle, char_index)
            .map(|opt| opt.map(|(left, right, bottom, top)| NativeCharBox { left, right, bottom, top }))
            .map_err(|e| Error::from_reason(e))
    }

    /// Get char loose bounding box (FS_RECTF). Returns { left, top, right, bottom } or null.
    #[napi]
    pub fn get_char_loose_box(&self, text_page_handle: u32, char_index: i32) -> Result<Option<NativeRect>> {
        self.inner
            .borrow()
            .get_char_loose_box(text_page_handle, char_index)
            .map(|opt| opt.map(|(left, top, right, bottom)| NativeRect {
                left: left as f64,
                top: top as f64,
                right: right as f64,
                bottom: bottom as f64,
            }))
            .map_err(|e| Error::from_reason(e))
    }

    #[napi]
    pub fn get_char_index_at_pos(
        &self,
        text_page_handle: u32,
        x: f64,
        y: f64,
        x_tolerance: f64,
        y_tolerance: f64,
    ) -> Result<i32> {
        self.inner
            .borrow()
            .get_char_index_at_pos(text_page_handle, x, y, x_tolerance, y_tolerance)
            .map_err(|e| Error::from_reason(e))
    }

    /// Get fill colour of a character. Returns { r, g, b, a } or null.
    #[napi]
    pub fn get_char_fill_colour(&self, text_page_handle: u32, char_index: i32) -> Result<Option<NativeColour>> {
        self.inner
            .borrow()
            .get_char_fill_colour(text_page_handle, char_index)
            .map(|opt| opt.map(|(r, g, b, a)| NativeColour { r, g, b, a }))
            .map_err(|e| Error::from_reason(e))
    }

    /// Get stroke colour of a character. Returns { r, g, b, a } or null.
    #[napi]
    pub fn get_char_stroke_colour(&self, text_page_handle: u32, char_index: i32) -> Result<Option<NativeColour>> {
        self.inner
            .borrow()
            .get_char_stroke_colour(text_page_handle, char_index)
            .map(|opt| opt.map(|(r, g, b, a)| NativeColour { r, g, b, a }))
            .map_err(|e| Error::from_reason(e))
    }

    /// Get the character transformation matrix. Returns [a, b, c, d, e, f] or null.
    #[napi]
    pub fn get_char_matrix(&self, text_page_handle: u32, char_index: i32) -> Result<Option<Vec<f64>>> {
        self.inner
            .borrow()
            .get_char_matrix(text_page_handle, char_index)
            .map(|opt| opt.map(|m| m.to_vec()))
            .map_err(|e| Error::from_reason(e))
    }

    // --- Text Search ---

    /// Find all occurrences of a text string. Returns array of { index, count }.
    #[napi]
    pub fn find_text(
        &self,
        text_page_handle: u32,
        query: String,
        flags: u32,
    ) -> Result<Vec<NativeSearchResult>> {
        self.inner
            .borrow()
            .find_text(text_page_handle, &query, flags)
            .map(|results| {
                results
                    .into_iter()
                    .map(|(index, count)| NativeSearchResult { index, count })
                    .collect()
            })
            .map_err(|e| Error::from_reason(e))
    }

    // --- Text Rectangles ---

    #[napi]
    pub fn count_text_rects(
        &self,
        text_page_handle: u32,
        start_index: i32,
        count: i32,
    ) -> Result<i32> {
        self.inner
            .borrow()
            .count_text_rects(text_page_handle, start_index, count)
            .map_err(|e| Error::from_reason(e))
    }

    /// Get a text rectangle by index. Returns { left, top, right, bottom } or null.
    #[napi]
    pub fn get_text_rect(&self, text_page_handle: u32, rect_index: i32) -> Result<Option<NativeRect>> {
        self.inner
            .borrow()
            .get_text_rect(text_page_handle, rect_index)
            .map(|opt| opt.map(|(left, top, right, bottom)| NativeRect { left, top, right, bottom }))
            .map_err(|e| Error::from_reason(e))
    }

    #[napi]
    pub fn get_bounded_text(
        &self,
        text_page_handle: u32,
        left: f64,
        top: f64,
        right: f64,
        bottom: f64,
    ) -> Result<String> {
        self.inner
            .borrow()
            .get_bounded_text(text_page_handle, left, top, right, bottom)
            .map_err(|e| Error::from_reason(e))
    }

    // --- Page Rotation / Flatten / Transparency / Content ---

    #[napi]
    pub fn get_page_rotation(&self, page_handle: u32) -> Result<i32> {
        self.inner
            .borrow()
            .get_page_rotation(page_handle)
            .map_err(|e| Error::from_reason(e))
    }

    #[napi]
    pub fn set_page_rotation(&self, page_handle: u32, rotation: i32) -> Result<()> {
        self.inner
            .borrow()
            .set_page_rotation(page_handle, rotation)
            .map_err(|e| Error::from_reason(e))
    }

    #[napi]
    pub fn has_page_transparency(&self, page_handle: u32) -> Result<bool> {
        self.inner
            .borrow()
            .has_page_transparency(page_handle)
            .map_err(|e| Error::from_reason(e))
    }

    #[napi]
    pub fn flatten_page(&self, page_handle: u32, flags: i32) -> Result<i32> {
        self.inner
            .borrow()
            .flatten_page(page_handle, flags)
            .map_err(|e| Error::from_reason(e))
    }

    #[napi]
    pub fn generate_content(&self, page_handle: u32) -> Result<bool> {
        self.inner
            .borrow()
            .generate_content(page_handle)
            .map_err(|e| Error::from_reason(e))
    }

    // --- Coordinate Conversion ---

    /// Convert device coordinates to page coordinates.
    #[napi]
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
    ) -> Result<NativePoint> {
        self.inner
            .borrow()
            .device_to_page(page_handle, start_x, start_y, size_x, size_y, rotation, device_x, device_y)
            .map(|(x, y)| NativePoint { x, y })
            .map_err(|e| Error::from_reason(e))
    }

    /// Convert page coordinates to device coordinates.
    #[napi]
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
    ) -> Result<NativeDevicePoint> {
        self.inner
            .borrow()
            .page_to_device(page_handle, start_x, start_y, size_x, size_y, rotation, page_x, page_y)
            .map(|(x, y)| NativeDevicePoint { x, y })
            .map_err(|e| Error::from_reason(e))
    }

    // --- Links ---

    #[napi]
    pub fn get_links(&self, page_handle: u32, doc_handle: u32) -> Result<Vec<NativeLink>> {
        let infos = self
            .inner
            .borrow()
            .get_links(page_handle, doc_handle)
            .map_err(|e| Error::from_reason(e))?;
        Ok(to_native_links(infos))
    }

    // --- Signatures ---

    #[napi]
    pub fn get_signature(&self, doc_handle: u32, index: i32) -> Result<NativeSignature> {
        let (contents, byte_range, sub_filter, reason, time, doc_mdp) = self.inner
            .borrow()
            .get_signature(doc_handle, index)
            .map_err(|e| Error::from_reason(e))?;

        Ok(NativeSignature {
            index,
            contents: contents.map(|c| c.into()),
            byte_range,
            sub_filter,
            reason,
            time,
            doc_mdp_permission: doc_mdp,
        })
    }
}
