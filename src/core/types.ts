/**
 * Shared type definitions for the @jacquesg/pdfium library.
 *
 * @module core/types
 */

/**
 * Branded type for WASM pointers.
 *
 * Prevents accidentally mixing WASM pointers with regular numbers.
 */
export type WASMPointer = number & { readonly __brand: 'WASMPointer' };

/** Branded handle for a loaded PDF document. */
export type DocumentHandle = number & { readonly __brand: 'DocumentHandle' };

/** Branded handle for a loaded PDF page. */
export type PageHandle = number & { readonly __brand: 'PageHandle' };

/** Branded handle for a bitmap. */
export type BitmapHandle = number & { readonly __brand: 'BitmapHandle' };

/** Branded handle for a form fill environment. */
export type FormHandle = number & { readonly __brand: 'FormHandle' };

/** Branded handle for a text page. */
export type TextPageHandle = number & { readonly __brand: 'TextPageHandle' };

/** Branded handle for a page object. */
export type PageObjectHandle = number & { readonly __brand: 'PageObjectHandle' };

/** Branded handle for a bookmark. */
export type BookmarkHandle = number & { readonly __brand: 'BookmarkHandle' };

/** Branded handle for a destination. */
export type DestinationHandle = number & { readonly __brand: 'DestinationHandle' };

/** Branded handle for a text search. */
export type SearchHandle = number & { readonly __brand: 'SearchHandle' };

/** Branded handle for a file attachment. */
export type AttachmentHandle = number & { readonly __brand: 'AttachmentHandle' };

/** Branded handle for a structure tree. */
export type StructTreeHandle = number & { readonly __brand: 'StructTreeHandle' };

/** Branded handle for a structure element. */
export type StructElementHandle = number & { readonly __brand: 'StructElementHandle' };

/**
 * Page dimensions in points (1/72 inch).
 */
export interface PageSize {
  /** Width in points */
  width: number;
  /** Height in points */
  height: number;
}

/**
 * Page rotation values.
 *
 * PDFium uses integer values 0-3 to represent rotation:
 * - 0 = 0 degrees (no rotation)
 * - 1 = 90 degrees clockwise
 * - 2 = 180 degrees
 * - 3 = 270 degrees clockwise (90 degrees counter-clockwise)
 */
export enum PageRotation {
  None = 0,
  Clockwise90 = 1,
  Rotate180 = 2,
  CounterClockwise90 = 3,
}

/**
 * Options for rendering a PDF page.
 */
export interface RenderOptions {
  /** Scale factor (default: 1) */
  scale?: number;
  /** Target width in pixels (overrides scale) */
  width?: number;
  /** Target height in pixels (overrides scale) */
  height?: number;
  /** Include form fields in render (default: false) */
  renderFormFields?: boolean;
  /** Background colour as ARGB integer (default: 0xFFFFFFFF - white) */
  backgroundColour?: number;
  /** Rotation to apply during rendering (default: PageRotation.None) */
  rotation?: PageRotation;
}

/**
 * Result of rendering a PDF page.
 */
export interface RenderResult {
  /** Rendered width in pixels */
  width: number;
  /** Rendered height in pixels */
  height: number;
  /** Original page width in points */
  originalWidth: number;
  /** Original page height in points */
  originalHeight: number;
  /** RGBA pixel data (4 bytes per pixel) */
  data: Uint8Array;
}

/**
 * Options for opening a PDF document.
 */
export interface OpenDocumentOptions {
  /** Password for encrypted documents */
  password?: string;
}

/**
 * Configurable resource limits for PDFium operations.
 */
export interface PDFiumLimits {
  /** Maximum document size in bytes (default: 512 MB) */
  maxDocumentSize?: number;
  /** Maximum render dimension in pixels (default: 32767) */
  maxRenderDimension?: number;
  /** Maximum text character count for extraction (default: 10_000_000) */
  maxTextCharCount?: number;
}

/** Default resource limits. */
export const DEFAULT_LIMITS: Readonly<Required<PDFiumLimits>> = {
  maxDocumentSize: 512 * 1024 * 1024,
  maxRenderDimension: 32_767,
  maxTextCharCount: 10_000_000,
};

/**
 * Options for initialising the PDFium library.
 */
export interface PDFiumInitOptions {
  /** Path or URL to the WASM binary */
  wasmUrl?: string;
  /** Pre-loaded WASM binary */
  wasmBinary?: ArrayBuffer;
  /** Enable worker mode for off-main-thread processing (default: false) */
  useWorker?: boolean;
  /** Custom worker script URL (only if useWorker is true) */
  workerUrl?: string;
  /** Resource limits for security and stability */
  limits?: PDFiumLimits;
}

/**
 * Page object types in PDFium.
 */
export enum PageObjectType {
  Unknown = 0,
  Text = 1,
  Path = 2,
  Image = 3,
  Shading = 4,
  Form = 5,
}

/**
 * Base interface for page objects.
 */
export interface PageObjectBase {
  /** The type of this page object */
  type: PageObjectType;
  /** Bounding box in page coordinates */
  bounds: {
    left: number;
    top: number;
    right: number;
    bottom: number;
  };
}

/**
 * Text object on a PDF page.
 */
export interface TextObject extends PageObjectBase {
  type: PageObjectType.Text;
  /** The text content */
  text: string;
  /** Font size in points */
  fontSize: number;
}

/**
 * Image object on a PDF page.
 */
export interface ImageObject extends PageObjectBase {
  type: PageObjectType.Image;
  /** Image width in pixels */
  width: number;
  /** Image height in pixels */
  height: number;
}

/**
 * Path object on a PDF page.
 */
export interface PathObject extends PageObjectBase {
  type: PageObjectType.Path;
}

/**
 * Shading object on a PDF page.
 */
export interface ShadingObject extends PageObjectBase {
  type: PageObjectType.Shading;
}

/**
 * Form object on a PDF page.
 */
export interface FormObject extends PageObjectBase {
  type: PageObjectType.Form;
}

/**
 * Union type for all page objects.
 */
export type PageObject = TextObject | ImageObject | PathObject | ShadingObject | FormObject;

/** Branded handle for an annotation. */
export type AnnotationHandle = number & { readonly __brand: 'AnnotationHandle' };

/**
 * PDF annotation subtype values.
 */
export enum AnnotationType {
  Unknown = 0,
  Text = 1,
  Link = 2,
  FreeText = 3,
  Line = 4,
  Square = 5,
  Circle = 6,
  Polygon = 7,
  Highlight = 8,
  Underline = 9,
  Squiggly = 10,
  Strikeout = 11,
  Stamp = 13,
  Caret = 14,
  Ink = 15,
  Popup = 16,
  FileAttachment = 17,
  Sound = 18,
  Widget = 20,
  Screen = 21,
  PrinterMark = 22,
  TrapNet = 23,
  Watermark = 24,
  ThreeD = 25,
  RichMedia = 26,
  XFAWidget = 27,
  Redact = 28,
}

/**
 * Bounding rectangle for an annotation.
 */
export interface AnnotationBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/**
 * RGBA colour value.
 */
export interface Colour {
  r: number;
  g: number;
  b: number;
  a: number;
}

/**
 * Represents a single annotation on a PDF page.
 */
export interface Annotation {
  /** Zero-based index of the annotation on its page. */
  index: number;
  /** The annotation subtype. */
  type: AnnotationType;
  /** The bounding rectangle in page coordinates. */
  bounds: AnnotationBounds;
  /** The annotation colour, if set. */
  colour?: Colour;
}

/**
 * Represents a bookmark (outline entry) in a PDF document.
 */
export interface Bookmark {
  /** The title text of the bookmark. */
  title: string;
  /** The zero-based destination page index, or undefined for external destinations. */
  pageIndex: number | undefined;
  /** Child bookmarks forming a tree structure. */
  children: Bookmark[];
}

/**
 * Flags for text search behaviour.
 */
export enum TextSearchFlags {
  None = 0x0000,
  MatchCase = 0x0001,
  MatchWholeWord = 0x0002,
  Consecutive = 0x0004,
}

/**
 * A bounding rectangle in page coordinates.
 */
export interface TextRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/**
 * A single text search result with position information.
 */
export interface TextSearchResult {
  /** The character index of the match start. */
  charIndex: number;
  /** The number of characters in the match. */
  charCount: number;
  /** The bounding rectangles covering the matched text. */
  rects: TextRect[];
}

/**
 * A structure element in a tagged PDF's structure tree.
 */
export interface StructureElement {
  /** The element type (e.g., "P", "H1", "Table", "Figure"). */
  type: string;
  /** The title attribute, if present. */
  title?: string;
  /** Alternative text for accessibility, if present. */
  altText?: string;
  /** The language attribute (e.g., "en-US"), if present. */
  lang?: string;
  /** Child structure elements. */
  children: StructureElement[];
}

/**
 * A file attachment embedded in a PDF document.
 */
export interface PDFAttachment {
  /** Zero-based index of the attachment. */
  index: number;
  /** The filename of the attachment. */
  name: string;
  /** The raw file data. */
  data: Uint8Array;
}

/**
 * Options for creating a new page.
 */
export interface PageCreationOptions {
  /** Page width in points (default: 612 = US Letter). */
  width?: number;
  /** Page height in points (default: 792 = US Letter). */
  height?: number;
}

/**
 * Style options for shape objects (rectangles, paths).
 */
export interface ShapeStyle {
  /** Fill colour. If omitted, no fill. */
  fill?: Colour;
  /** Stroke colour. If omitted, no stroke. */
  stroke?: Colour;
  /** Stroke width in points (default: 1). */
  strokeWidth?: number;
}

/**
 * Font type for loading custom fonts.
 */
export enum FontType {
  Type1 = 1,
  TrueType = 2,
}

/**
 * Flags for FPDF_SaveAsCopy / FPDF_SaveWithVersion.
 */
export enum SaveFlags {
  /** No special flags. */
  None = 0,
  /** Incremental save. */
  Incremental = 1,
  /** Remove security (unencrypt). */
  NoIncremental = 2,
  /** Remove security. */
  RemoveSecurity = 3,
}

/**
 * Options for saving a PDF document.
 */
export interface SaveOptions {
  /** Save flags (default: SaveFlags.None). */
  flags?: SaveFlags;
  /** PDF file version (e.g., 17 for PDF 1.7). If omitted, uses the document's original version. */
  version?: number;
}

/**
 * Document availability status from FPDFAvail_IsDocAvail / FPDFAvail_IsPageAvail.
 */
export enum DocumentAvailability {
  /** Data error occurred. */
  DataError = -1,
  /** Required data is not yet available. */
  DataNotAvailable = 0,
  /** Required data is available. */
  DataAvailable = 1,
  /** Linearisation status is unknown. */
  LinearizationUnknown = 2,
}

/**
 * Linearisation status from FPDFAvail_IsLinearized.
 */
export enum LinearizationStatus {
  /** Not linearised. */
  NotLinearized = 0,
  /** Linearised. */
  Linearized = 1,
  /** Unknown (not enough data). */
  Unknown = -1,
}

/**
 * Progress callback for long-running operations.
 */
export type ProgressCallback = (progress: number) => void;

/**
 * Serialised error for worker communication.
 */
export interface SerialisedError {
  name: string;
  message: string;
  code: number;
  context?: Record<string, unknown>;
}
