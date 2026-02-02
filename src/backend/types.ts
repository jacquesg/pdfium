/**
 * Backend abstraction for PDFium operations.
 *
 * Allows the library to work against either the WASM module or the native
 * addon transparently. Each method encapsulates the full alloc-call-read-free
 * cycle so consumers don't need to handle memory management.
 *
 * @module backend/types
 */

/**
 * An annotation as returned from the backend.
 *
 * Colour channels are 0-255. If `hasColour` is false, the colour fields
 * should be ignored.
 */
export interface BackendAnnotation {
  index: number;
  subtype: number;
  left: number;
  top: number;
  right: number;
  bottom: number;
  hasColour: boolean;
  r: number;
  g: number;
  b: number;
  a: number;
}

/**
 * A bookmark node as returned from the backend.
 *
 * Uses -1 for `pageIndex` when the bookmark has no in-document destination,
 * matching what PDFium's `FPDFDest_GetDestPageIndex` returns for invalid
 * destinations.
 */
export interface BackendBookmark {
  title: string;
  /** Zero-based page index, or -1 if no destination. */
  pageIndex: number;
  children: BackendBookmark[];
}

/**
 * A link as returned from the backend.
 *
 * Contains fully-resolved action and destination data.
 */
export interface BackendLink {
  index: number;
  left: number;
  bottom: number;
  right: number;
  top: number;
  hasAction: boolean;
  actionType: number;
  uri: string | null;
  filePath: string | null;
  hasDest: boolean;
  destPageIndex: number;
  destFitType: number;
  hasX: boolean;
  hasY: boolean;
  hasZoom: boolean;
  x: number;
  y: number;
  zoom: number;
}

/**
 * PDFium backend interface.
 *
 * Provides operation-level methods for core PDFium functionality.
 * Both the WASM and native backends implement this interface.
 */
export interface PDFiumBackend {
  /** Backend identifier for diagnostics. */
  readonly kind: 'wasm' | 'native';

  // ── Lifecycle ──────────────────────────────────────────────────────────

  /** Initialise the PDFium library. */
  initLibrary(): void;

  /** Destroy the PDFium library. */
  destroyLibrary(): void;

  /** Get the last error code from PDFium. */
  getLastError(): number;

  // ── Document ───────────────────────────────────────────────────────────

  /** Load a document from binary data. Returns an opaque document handle. */
  loadDocument(data: Uint8Array, password?: string): number;

  /** Close a document and free associated resources. */
  closeDocument(docHandle: number): void;

  /** Get the number of pages in a document. */
  getPageCount(docHandle: number): number;

  // ── Page ───────────────────────────────────────────────────────────────

  /** Load a page from a document. Returns an opaque page handle. */
  loadPage(docHandle: number, pageIndex: number): number;

  /** Close a page and free associated resources. */
  closePage(pageHandle: number): void;

  /** Get the page width in points. */
  getPageWidth(pageHandle: number): number;

  /** Get the page height in points. */
  getPageHeight(pageHandle: number): number;

  // ── Text ───────────────────────────────────────────────────────────────

  /** Load a text page for text extraction. Returns an opaque text page handle. */
  loadTextPage(pageHandle: number): number;

  /** Close a text page. */
  closeTextPage(textPageHandle: number): void;

  /** Count the number of characters on a text page. */
  countTextChars(textPageHandle: number): number;

  /** Extract all text from a text page as a string. */
  getFullText(textPageHandle: number): string;

  // ── Text Character Font Info ──────────────────────────────────────────

  /** Get the font size of a character at the given index. */
  getCharFontSize(textPageHandle: number, charIndex: number): number;

  /** Get the font weight of a character at the given index (100-900, or -1). */
  getCharFontWeight(textPageHandle: number, charIndex: number): number;

  /** Get the font name and flags for a character. Returns `null` if unavailable. */
  getCharFontInfo(textPageHandle: number, charIndex: number): { name: string; flags: number } | null;

  /** Get the text render mode for a character at the given index. */
  getCharRenderMode(textPageHandle: number, charIndex: number): number;

  // ── Text Character Extended Operations ──────────────────────────────────

  /** Get the Unicode codepoint of a character. */
  getCharUnicode(textPageHandle: number, charIndex: number): number;

  /** Check if a character is generated (not from the original PDF content). */
  isCharGenerated(textPageHandle: number, charIndex: number): boolean;

  /** Check if a character is a hyphen. */
  isCharHyphen(textPageHandle: number, charIndex: number): boolean;

  /** Check if a character has a Unicode mapping error. */
  hasCharUnicodeMapError(textPageHandle: number, charIndex: number): boolean;

  /** Get the rotation angle (in radians) of a character. */
  getCharAngle(textPageHandle: number, charIndex: number): number;

  /** Get the origin point of a character. Returns `null` if unavailable. */
  getCharOrigin(textPageHandle: number, charIndex: number): { x: number; y: number } | null;

  /** Get the bounding box of a character. Returns `null` if unavailable. */
  getCharBox(
    textPageHandle: number,
    charIndex: number,
  ): { left: number; right: number; bottom: number; top: number } | null;

  /** Get the loose bounding box of a character. Returns `null` if unavailable. */
  getCharLooseBox(
    textPageHandle: number,
    charIndex: number,
  ): { left: number; top: number; right: number; bottom: number } | null;

  /** Get the character index at a page position. Returns -1 if not found, -3 if near a character. */
  getCharIndexAtPos(textPageHandle: number, x: number, y: number, xTolerance: number, yTolerance: number): number;

  /** Get the fill colour of a character. Returns `null` if unavailable. */
  getCharFillColour(textPageHandle: number, charIndex: number): { r: number; g: number; b: number; a: number } | null;

  /** Get the stroke colour of a character. Returns `null` if unavailable. */
  getCharStrokeColour(textPageHandle: number, charIndex: number): { r: number; g: number; b: number; a: number } | null;

  /** Get the transformation matrix [a, b, c, d, e, f] of a character. Returns `null` if unavailable. */
  getCharMatrix(textPageHandle: number, charIndex: number): number[] | null;

  // ── Text Search ───────────────────────────────────────────────────────

  /** Find all occurrences of a string on a text page. */
  findText(textPageHandle: number, query: string, flags: number): { index: number; count: number }[];

  // ── Text Rectangles ───────────────────────────────────────────────────

  /** Count rectangles covering a range of characters. */
  countTextRects(textPageHandle: number, startIndex: number, count: number): number;

  /** Get a text rectangle by index. Returns `null` if unavailable. */
  getTextRect(
    textPageHandle: number,
    rectIndex: number,
  ): { left: number; top: number; right: number; bottom: number } | null;

  /** Get text within a bounding rectangle. */
  getBoundedText(textPageHandle: number, left: number, top: number, right: number, bottom: number): string;

  // ── Page Operations ───────────────────────────────────────────────────

  /** Get the page rotation (0=0°, 1=90°, 2=180°, 3=270°). */
  getPageRotation(pageHandle: number): number;

  /** Set the page rotation (0=0°, 1=90°, 2=180°, 3=270°). */
  setPageRotation(pageHandle: number, rotation: number): void;

  /** Check if a page has transparency. */
  hasPageTransparency(pageHandle: number): boolean;

  /** Flatten a page (0=NormalDisplay, 1=Print). Returns: 0=fail, 1=success, 2=nothing to flatten. */
  flattenPage(pageHandle: number, flags: number): number;

  /** Generate page content (update content stream after modifications). */
  generateContent(pageHandle: number): boolean;

  // ── Coordinate Conversion ─────────────────────────────────────────────

  /** Convert device coordinates to page coordinates. */
  deviceToPage(
    pageHandle: number,
    startX: number,
    startY: number,
    sizeX: number,
    sizeY: number,
    rotation: number,
    deviceX: number,
    deviceY: number,
  ): { x: number; y: number };

  /** Convert page coordinates to device coordinates. */
  pageToDevice(
    pageHandle: number,
    startX: number,
    startY: number,
    sizeX: number,
    sizeY: number,
    rotation: number,
    pageX: number,
    pageY: number,
  ): { x: number; y: number };

  // ── Render ─────────────────────────────────────────────────────────────

  /**
   * Render a page to an RGBA pixel buffer.
   *
   * @returns RGBA pixel data (4 bytes per pixel, width * height * 4 total).
   */
  renderPage(
    pageHandle: number,
    width: number,
    height: number,
    rotation: number,
    flags: number,
    bgColour: number,
  ): Uint8Array;

  // ── Metadata ─────────────────────────────────────────────────────────

  /** Get a metadata field by tag name. Returns `null` if not present. */
  getMetaText(docHandle: number, tag: string): string | null;

  /** Get the PDF file version (e.g. 14 for PDF 1.4). Returns `null` if unavailable. */
  getFileVersion(docHandle: number): number | null;

  /** Get the document permissions bitmask. */
  getDocPermissions(docHandle: number): number;

  /** Get the document user permissions bitmask. */
  getDocUserPermissions(docHandle: number): number;

  /** Get the document page mode (initial display). */
  getPageMode(docHandle: number): number;

  /** Get the security handler revision, or -1 if unencrypted. */
  getSecurityHandlerRevision(docHandle: number): number;

  /** Check if the document is tagged (accessible). */
  isTagged(docHandle: number): boolean;

  /** Get the label for a page. Returns `null` if not defined. */
  getPageLabel(docHandle: number, pageIndex: number): string | null;

  // ── Page Boxes ───────────────────────────────────────────────────────

  /**
   * Get a page box by type (0=Media, 1=Crop, 2=Bleed, 3=Trim, 4=Art).
   *
   * @returns `[left, bottom, right, top]` or `null` if not set.
   */
  getPageBox(pageHandle: number, boxType: number): [number, number, number, number] | null;

  /**
   * Set a page box by type (0=Media, 1=Crop, 2=Bleed, 3=Trim, 4=Art).
   */
  setPageBox(pageHandle: number, boxType: number, left: number, bottom: number, right: number, top: number): void;

  // ── Links ──────────────────────────────────────────────────────────────

  /**
   * Get all links on a page with fully-resolved actions and destinations.
   *
   * Requires both page handle and document handle because destination
   * resolution needs the document context.
   */
  getLinks(pageHandle: number, docHandle: number): BackendLink[];

  // ── Annotations ────────────────────────────────────────────────────────

  /**
   * Get all annotations on a page.
   *
   * Returns an array of annotations with subtype, bounds, and optional colour.
   */
  getAnnotations(pageHandle: number): BackendAnnotation[];

  /** Create a new annotation. Returns the index of the new annotation. */
  createAnnotation(pageHandle: number, subtype: number): number;

  /** Remove an annotation by index. */
  removeAnnotation(pageHandle: number, index: number): boolean;

  /** Set the bounding rect of an annotation. */
  setAnnotationRect(
    pageHandle: number,
    index: number,
    left: number,
    top: number,
    right: number,
    bottom: number,
  ): boolean;

  /** Set the colour of an annotation. colourType: 0=colour, 1=interior. */
  setAnnotationColour(
    pageHandle: number,
    index: number,
    colourType: number,
    r: number,
    g: number,
    b: number,
    a: number,
  ): boolean;

  /** Get the flags of an annotation. */
  getAnnotationFlags(pageHandle: number, index: number): number;

  /** Set the flags of an annotation. */
  setAnnotationFlags(pageHandle: number, index: number, flags: number): boolean;

  /** Set a string value on an annotation (e.g. key="Contents"). */
  setAnnotationStringValue(pageHandle: number, index: number, key: string, value: string): boolean;

  /** Set the border of an annotation. */
  setAnnotationBorder(
    pageHandle: number,
    index: number,
    horizontalRadius: number,
    verticalRadius: number,
    borderWidth: number,
  ): boolean;

  /** Set attachment points at a specific quad index. */
  setAnnotationAttachmentPoints(
    pageHandle: number,
    annotIndex: number,
    quadIndex: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number,
    x4: number,
    y4: number,
  ): boolean;

  /** Append attachment points to an annotation. */
  appendAnnotationAttachmentPoints(
    pageHandle: number,
    annotIndex: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number,
    x4: number,
    y4: number,
  ): boolean;

  /** Set the URI on a link annotation. */
  setAnnotationUri(pageHandle: number, index: number, uri: string): boolean;

  // ── Bookmarks ──────────────────────────────────────────────────────────

  /**
   * Get the full bookmark (outline) tree for a document.
   *
   * Returns an array of top-level bookmarks, each with nested children.
   * `pageIndex` is -1 when the bookmark has no in-document destination.
   */
  getBookmarks(docHandle: number): BackendBookmark[];

  // ── Signatures ────────────────────────────────────────────────────────

  /** Get the number of signatures in a document. */
  getSignatureCount(docHandle: number): number;

  /**
   * Get signature data at the given index.
   *
   * Returns `null` if the signature cannot be retrieved.
   */
  getSignature(
    docHandle: number,
    index: number,
  ): {
    contents?: Uint8Array;
    byteRange?: number[];
    subFilter?: string;
    reason?: string;
    time?: string;
    docMDPPermission: number;
  } | null;

  // ── Save / Export ────────────────────────────────────────────────────

  /**
   * Save a document to a byte buffer.
   *
   * @param flags - Save flags (0=None, 1=Incremental, 2=NoIncremental, 3=RemoveSecurity).
   * @param version - Optional PDF version (e.g. 17 for PDF 1.7). `null` to keep original.
   */
  saveDocument(docHandle: number, flags: number, version: number | null): Uint8Array;

  // ── Attachments ──────────────────────────────────────────────────────

  /** Get the number of attachments in a document. */
  getAttachmentCount(docHandle: number): number;

  /**
   * Get an attachment by index.
   *
   * Returns `null` if the attachment cannot be retrieved.
   */
  getAttachment(docHandle: number, index: number): { name: string; data: Uint8Array } | null;

  // ── Page Import ──────────────────────────────────────────────────────

  /**
   * Import pages from a source document.
   *
   * @param pageRange - Page range string (e.g. "1-3,5") or `null` for all pages (1-based).
   * @param insertIndex - Zero-based insertion index in the destination.
   */
  importPages(destHandle: number, srcHandle: number, pageRange: string | null, insertIndex: number): void;

  /**
   * Import pages by index array.
   *
   * @param pageIndices - Zero-based page indices to import.
   * @param insertIndex - Zero-based insertion index in the destination.
   */
  importPagesByIndex(destHandle: number, srcHandle: number, pageIndices: number[], insertIndex: number): void;

  /**
   * Create a new document with N-up layout (multiple pages per sheet).
   *
   * @returns A new document handle, or 0 on failure.
   */
  importNPagesToOne(
    srcHandle: number,
    outputWidth: number,
    outputHeight: number,
    pagesPerRow: number,
    pagesPerColumn: number,
  ): number;

  /** Copy viewer preferences from source to destination document. */
  copyViewerPreferences(destHandle: number, srcHandle: number): boolean;
}
