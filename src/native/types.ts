/**
 * TypeScript interface matching the Rust napi-rs exports.
 *
 * @module native/types
 */

export interface NativePdfiumBinding {
  NativePdfium: {
    load(libraryPath: string): NativePdfium;
  };
}

export interface NativeBookmark {
  title: string;
  /** Zero-based page index, or -1 if no destination. */
  pageIndex: number;
  children: NativeBookmark[];
}

export interface NativeAnnotation {
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

export interface NativeLink {
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

export interface NativePdfium {
  initLibrary(): void;
  destroyLibrary(): void;
  getLastError(): number;

  loadDocument(data: Buffer, password?: string): number;
  closeDocument(handle: number): void;
  getPageCount(docHandle: number): number;

  loadPage(docHandle: number, index: number): number;
  closePage(pageHandle: number): void;
  getPageWidth(pageHandle: number): number;
  getPageHeight(pageHandle: number): number;

  loadTextPage(pageHandle: number): number;
  closeTextPage(textPageHandle: number): void;
  countTextChars(textPageHandle: number): number;
  getFullText(textPageHandle: number): string;

  renderPage(
    pageHandle: number,
    width: number,
    height: number,
    rotation: number,
    flags: number,
    bgColour: number,
  ): Buffer;

  // Metadata / Document info
  getMetaText(docHandle: number, tag: string): string | null;
  getFileVersion(docHandle: number): number | null;
  getDocPermissions(docHandle: number): number;
  getDocUserPermissions(docHandle: number): number;
  getPageMode(docHandle: number): number;
  getSecurityHandlerRevision(docHandle: number): number;
  isTagged(docHandle: number): boolean;
  getPageLabel(docHandle: number, pageIndex: number): string | null;

  // Page boxes (boxType: 0=Media, 1=Crop, 2=Bleed, 3=Trim, 4=Art)
  getPageBox(pageHandle: number, boxType: number): number[] | null;
  setPageBox(pageHandle: number, boxType: number, left: number, bottom: number, right: number, top: number): void;

  // Text character font info
  getCharFontSize(textPageHandle: number, charIndex: number): number;
  getCharFontWeight(textPageHandle: number, charIndex: number): number;
  getCharFontInfo(textPageHandle: number, charIndex: number): { name: string; flags: number } | null;
  getCharRenderMode(textPageHandle: number, charIndex: number): number;

  // Text character extended operations
  getCharUnicode(textPageHandle: number, charIndex: number): number;
  isCharGenerated(textPageHandle: number, charIndex: number): boolean;
  isCharHyphen(textPageHandle: number, charIndex: number): boolean;
  hasCharUnicodeMapError(textPageHandle: number, charIndex: number): boolean;
  getCharAngle(textPageHandle: number, charIndex: number): number;
  getCharOrigin(textPageHandle: number, charIndex: number): { x: number; y: number } | null;
  getCharBox(
    textPageHandle: number,
    charIndex: number,
  ): { left: number; right: number; bottom: number; top: number } | null;
  getCharLooseBox(
    textPageHandle: number,
    charIndex: number,
  ): { left: number; top: number; right: number; bottom: number } | null;
  getCharIndexAtPos(textPageHandle: number, x: number, y: number, xTolerance: number, yTolerance: number): number;
  getCharFillColour(textPageHandle: number, charIndex: number): { r: number; g: number; b: number; a: number } | null;
  getCharStrokeColour(textPageHandle: number, charIndex: number): { r: number; g: number; b: number; a: number } | null;
  getCharMatrix(textPageHandle: number, charIndex: number): number[] | null;

  // Text search
  findText(textPageHandle: number, query: string, flags: number): { index: number; count: number }[];

  // Text rectangles / bounded text
  countTextRects(textPageHandle: number, startIndex: number, count: number): number;
  getTextRect(
    textPageHandle: number,
    rectIndex: number,
  ): { left: number; top: number; right: number; bottom: number } | null;
  getBoundedText(textPageHandle: number, left: number, top: number, right: number, bottom: number): string;

  // Page rotation, flatten, transparency, content generation
  getPageRotation(pageHandle: number): number;
  setPageRotation(pageHandle: number, rotation: number): void;
  hasPageTransparency(pageHandle: number): boolean;
  flattenPage(pageHandle: number, flags: number): number;
  generateContent(pageHandle: number): boolean;

  // Coordinate conversion
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

  // Save / export
  saveDocument(docHandle: number, flags: number, version: number | null): Buffer;

  // Attachments
  getAttachmentCount(docHandle: number): number;
  getAttachment(docHandle: number, index: number): { name: string; data: Buffer } | null;

  // Signatures
  getSignatureCount(docHandle: number): number;
  getSignature(
    docHandle: number,
    index: number,
  ): {
    index: number;
    contents: Buffer | null;
    byteRange: number[] | null;
    subFilter: string | null;
    reason: string | null;
    time: string | null;
    docMdpPermission: number;
  };

  // Links
  getLinks(pageHandle: number, docHandle: number): NativeLink[];

  // Annotations (read)
  getAnnotations(pageHandle: number): NativeAnnotation[];

  // Annotations (mutation)
  createAnnotation(pageHandle: number, subtype: number): number;
  removeAnnotation(pageHandle: number, index: number): boolean;
  setAnnotationRect(
    pageHandle: number,
    index: number,
    left: number,
    top: number,
    right: number,
    bottom: number,
  ): boolean;
  setAnnotationColour(
    pageHandle: number,
    index: number,
    colourType: number,
    r: number,
    g: number,
    b: number,
    a: number,
  ): boolean;
  getAnnotationFlags(pageHandle: number, index: number): number;
  setAnnotationFlags(pageHandle: number, index: number, flags: number): boolean;
  setAnnotationStringValue(pageHandle: number, index: number, key: string, value: string): boolean;
  setAnnotationBorder(
    pageHandle: number,
    index: number,
    horizontalRadius: number,
    verticalRadius: number,
    borderWidth: number,
  ): boolean;
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
  setAnnotationUri(pageHandle: number, index: number, uri: string): boolean;

  // Bookmarks
  getBookmarks(docHandle: number): NativeBookmark[];

  // Page import
  importPages(destHandle: number, srcHandle: number, pageRange: string | null, insertIndex: number): void;
  importPagesByIndex(destHandle: number, srcHandle: number, pageIndices: number[], insertIndex: number): void;
  importNPagesToOne(
    srcHandle: number,
    outputWidth: number,
    outputHeight: number,
    pagesPerRow: number,
    pagesPerColumn: number,
  ): number;
  copyViewerPreferences(destHandle: number, srcHandle: number): boolean;
}
