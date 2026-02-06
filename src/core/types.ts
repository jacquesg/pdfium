/**
 * Shared type definitions for the @scaryterry/pdfium library.
 *
 * ## Return value conventions
 *
 * - **throw**: Programming errors — invalid arguments, disposed resources, out-of-bounds indices.
 * - **null**: "No value" — the C function succeeded but there is no data (e.g., no colour set, no handle).
 * - **undefined**: "Key not found" — dictionary lookups where the key doesn't exist.
 *
 * @module core/types
 */

import type { Logger } from './logger.js';
export type { Logger };

/**
 * Information about a JavaScript action in a PDF document.
 *
 * JavaScript actions can be triggered by various events in the PDF
 * (document open, page open, button click, etc.).
 */
export interface JavaScriptAction {
  /** The action name (often corresponds to the triggering event). */
  name: string;
  /** The JavaScript source code. */
  script: string;
}

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
  None = 'None',
  Clockwise90 = 'Clockwise90',
  Rotate180 = 'Rotate180',
  CounterClockwise90 = 'CounterClockwise90',
}

/**
 * Result of flattening a PDF page.
 *
 * When annotations or form fields are flattened, they become part of
 * the page content and can no longer be edited.
 */
export enum FlattenResult {
  /** Flattening failed. */
  Fail = 'Fail',
  /** Flattening succeeded. */
  Success = 'Success',
  /** Nothing to flatten (no annotations or forms). */
  NothingToDo = 'NothingToDo',
}

/**
 * Flags for page flattening operation.
 */
export enum FlattenFlags {
  /** Flatten all content. */
  NormalDisplay = 'NormalDisplay',
  /** Flatten for printing. */
  Print = 'Print',
}

/**
 * Path segment types in a PDF path object.
 */
export enum PathSegmentType {
  /** Unknown segment type. */
  Unknown = 'Unknown',
  /** Line to operation. */
  LineTo = 'LineTo',
  /** Bezier curve to operation. */
  BezierTo = 'BezierTo',
  /** Move to operation. */
  MoveTo = 'MoveTo',
}

/**
 * Path fill mode flags for path drawing operations.
 */
export enum PathFillMode {
  /** No fill. */
  None = 'None',
  /** Alternate fill mode (even-odd rule). */
  Alternate = 'Alternate',
  /** Winding fill mode (non-zero winding rule). */
  Winding = 'Winding',
}

/**
 * PDF page box types.
 *
 * PDFs can have multiple box definitions that specify different boundaries:
 * - MediaBox: The actual physical page boundaries
 * - CropBox: The visible region (default is MediaBox)
 * - BleedBox: Area for trimming during printing
 * - TrimBox: Intended finished page dimensions
 * - ArtBox: Meaningful content boundaries
 */
export enum PageBoxType {
  /** Physical page boundaries (required) */
  MediaBox = 'MediaBox',
  /** Visible region after cropping (defaults to MediaBox) */
  CropBox = 'CropBox',
  /** Bleed area for printing (defaults to CropBox) */
  BleedBox = 'BleedBox',
  /** Final trimmed page dimensions (defaults to CropBox) */
  TrimBox = 'TrimBox',
  /** Meaningful content boundaries (defaults to CropBox) */
  ArtBox = 'ArtBox',
}

/**
 * A bounding rectangle in page coordinates (points, origin at bottom-left).
 *
 * Used for annotation bounds, text search results, link regions, page object
 * bounds, and clip rectangles. For page-level boxes (MediaBox, CropBox, etc.),
 * see {@link PageBox}. For per-character bounds, see {@link CharBox}.
 */
export interface Rect {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

/**
 * Rectangle representing a page box.
 *
 * Coordinates are in points (1/72 inch) with origin at bottom-left.
 */
export interface PageBox {
  /** Left edge in points */
  left: number;
  /** Bottom edge in points */
  bottom: number;
  /** Right edge in points */
  right: number;
  /** Top edge in points */
  top: number;
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
  /**
   * Clip rectangle in page coordinates for sub-region rendering.
   *
   * When specified, only the portion of the page within this rectangle is
   * rendered. The output bitmap dimensions still match the full page size
   * (or the size determined by scale/width/height), but content outside the
   * clip region is not drawn.
   *
   * Coordinates are in PDF page points (1/72 inch).
   */
  clipRect?: Rect;
  /** Progress callback (0.0 to 1.0). */
  onProgress?: ProgressCallback;
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
 * Status of progressive rendering.
 */
export enum ProgressiveRenderStatus {
  /** Rendering has not started yet. */
  Ready = 'Ready',
  /** Rendering was paused and can be continued. */
  ToBeContinued = 'ToBeContinued',
  /** Rendering is complete. */
  Done = 'Done',
  /** Rendering failed. */
  Failed = 'Failed',
}

/**
 * Interface for progressive rendering context.
 */
export interface IProgressiveRenderContext extends Disposable {
  /** Current render status. */
  readonly status: ProgressiveRenderStatus;
  /** Rendered width in pixels. */
  readonly width: number;
  /** Rendered height in pixels. */
  readonly height: number;
  /** Continue the progressive render. */
  continue(): ProgressiveRenderStatus;
  /** Get the render result. */
  getResult(): RenderResult;
}

/**
 * Options for opening a PDF document.
 */
export interface OpenDocumentOptions {
  /** Password for encrypted documents */
  password?: string;
  /** Progress callback (0.0 to 1.0). */
  onProgress?: ProgressCallback;
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
  readonly wasmUrl?: string;
  /** Pre-loaded WASM binary */
  readonly wasmBinary?: ArrayBuffer;
  /**
   * Enable high-level worker mode for off-main-thread processing.
   *
   * When true, `PDFium.init()` returns a worker-backed instance that exposes
   * ergonomic document/page APIs without manual worker protocol management.
   */
  readonly useWorker?: boolean;
  /** Custom worker script URL (only if useWorker is true). */
  readonly workerUrl?: string | URL;
  /** Worker request timeout in milliseconds (default: 30000). */
  readonly workerTimeout?: number;
  /** Worker render timeout in milliseconds (default: 120000). */
  readonly workerRenderTimeout?: number;
  /** Worker destroy timeout in milliseconds (default: 5000). */
  readonly workerDestroyTimeout?: number;
  /**
   * Try to use the native PDFium binding instead of WASM (Node.js only).
   *
   * When true, `PDFium.init()` will attempt to load the platform-specific
   * native addon. If unavailable, it falls back to WASM transparently.
   *
   * Default: false (WASM is used unless explicitly opted in).
   */
  readonly useNative?: boolean;
  /**
   * Force WASM backend even when native addon is available.
   *
   * When true, native addon loading is skipped entirely. Useful for:
   * - Testing/debugging the WASM code path
   * - Ensuring consistent behaviour across environments
   * - Benchmarking WASM without native interference
   *
   * Cannot be used with `useNative: true` (throws InitialisationError).
   *
   * Default: false.
   */
  readonly forceWasm?: boolean;
  /** Resource limits for security and stability */
  readonly limits?: PDFiumLimits;
  /** Custom logger instance. */
  readonly logger?: Logger;
}

/**
 * Page object types in PDFium.
 */
export enum PageObjectType {
  /** Unknown or unrecognised object type. */
  Unknown = 'Unknown',
  /** Text content rendered with a font. */
  Text = 'Text',
  /** Vector path (lines, curves, rectangles). */
  Path = 'Path',
  /** Raster image (JPEG, PNG, etc.). */
  Image = 'Image',
  /** Shading pattern (gradient fill). */
  Shading = 'Shading',
  /** Form XObject (reusable content group). */
  Form = 'Form',
}

/**
 * Base interface for page objects.
 *
 * Page objects represent content elements on a PDF page such as text,
 * images, paths (shapes), shading, and form XObjects. Each object has
 * a type and bounding box.
 *
 * @example
 * ```typescript
 * for (const obj of page.objects()) {
 *   console.log(`${obj.type} at (${obj.bounds.left}, ${obj.bounds.bottom})`);
 *
 *   if (obj instanceof PDFiumTextObject) {
 *     console.log(obj.text, obj.fontSize);
 *   }
 * }
 * ```
 */
export interface PageObjectBase {
  /** The type of this page object. */
  readonly type: PageObjectType;
  /** Bounding box in page coordinates (points, origin at bottom-left). */
  readonly bounds: Rect;
}

/**
 * Text object on a PDF page.
 */
export interface TextObject extends PageObjectBase {
  readonly type: PageObjectType.Text;
  /** The text content */
  readonly text: string;
  /** Font size in points */
  readonly fontSize: number;
}

/**
 * Image object on a PDF page.
 */
export interface ImageObject extends PageObjectBase {
  readonly type: PageObjectType.Image;
  /** Image width in pixels */
  readonly width: number;
  /** Image height in pixels */
  readonly height: number;
}

/**
 * Path object on a PDF page.
 */
export interface PathObject extends PageObjectBase {
  readonly type: PageObjectType.Path;
}

/**
 * Shading object on a PDF page.
 */
export interface ShadingObject extends PageObjectBase {
  readonly type: PageObjectType.Shading;
}

/**
 * Form object on a PDF page.
 */
export interface FormObject extends PageObjectBase {
  readonly type: PageObjectType.Form;
}

/**
 * Unknown or unrecognised page object type.
 */
export interface UnknownObject extends PageObjectBase {
  readonly type: PageObjectType.Unknown;
}

/**
 * Union type for all page objects.
 */
export type PageObject = TextObject | ImageObject | PathObject | ShadingObject | FormObject | UnknownObject;

/**
 * PDF annotation subtype values.
 *
 * Note: Values are non-contiguous per the PDF specification (e.g. 12 and 19 are unused).
 */
export enum AnnotationType {
  /** Unknown annotation type. */
  Unknown = 'Unknown',
  /** Text note (sticky note). */
  Text = 'Text',
  /** Hyperlink. */
  Link = 'Link',
  /** Free text (directly displayed on page). */
  FreeText = 'FreeText',
  /** Line annotation. */
  Line = 'Line',
  /** Rectangle annotation. */
  Square = 'Square',
  /** Ellipse annotation. */
  Circle = 'Circle',
  /** Polygon annotation. */
  Polygon = 'Polygon',
  /** Text highlight markup. */
  Highlight = 'Highlight',
  /** Text underline markup. */
  Underline = 'Underline',
  /** Text squiggly underline markup. */
  Squiggly = 'Squiggly',
  /** Text strikeout markup. */
  Strikeout = 'Strikeout',
  /** Rubber stamp annotation. */
  Stamp = 'Stamp',
  /** Caret (text insertion indicator). */
  Caret = 'Caret',
  /** Ink (freehand drawing). */
  Ink = 'Ink',
  /** Pop-up window for parent annotation. */
  Popup = 'Popup',
  /** Embedded file attachment. */
  FileAttachment = 'FileAttachment',
  /** Sound annotation. */
  Sound = 'Sound',
  /** Interactive form widget. */
  Widget = 'Widget',
  /** Screen annotation (multimedia). */
  Screen = 'Screen',
  /** Printer's mark annotation. */
  PrinterMark = 'PrinterMark',
  /** Trap network annotation. */
  TrapNet = 'TrapNet',
  /** Watermark annotation. */
  Watermark = 'Watermark',
  /** 3D annotation. */
  ThreeD = 'ThreeD',
  /** Rich media annotation. */
  RichMedia = 'RichMedia',
  /** XFA widget annotation. */
  XFAWidget = 'XFAWidget',
  /** Redaction annotation. */
  Redact = 'Redact',
}

/**
 * The colour channel of an annotation to get or set.
 *
 * - `'stroke'` — the stroke/fill colour (default)
 * - `'interior'` — the interior/background colour
 */
export type AnnotationColourType = 'stroke' | 'interior';

/**
 * RGBA colour value.
 *
 * Each channel is an integer in the range 0–255.
 */
export interface Colour {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly a: number;
}

/**
 * Represents a single annotation on a PDF page.
 */
export interface Annotation {
  /** Zero-based index of the annotation on its page. */
  readonly index: number;
  /** The annotation subtype. */
  readonly type: AnnotationType;
  /** The bounding rectangle in page coordinates. */
  readonly bounds: Rect;
  /** The annotation colour, or null if not set. */
  readonly colour: Colour | null;
}

/**
 * Well-known annotation dictionary keys.
 *
 * These are the most commonly used keys for `hasKey`, `getStringValue`, and
 * `setStringValue`. Arbitrary string keys are also accepted.
 */
export type AnnotationDictionaryKey =
  | 'Contents'
  | 'Author'
  | 'Subtype'
  | 'CreationDate'
  | 'ModDate'
  | 'Name'
  | 'Subject'
  | 'T'
  | 'NM';

/**
 * Key for annotation dictionary lookups.
 *
 * Accepts well-known {@link AnnotationDictionaryKey} values for autocomplete,
 * as well as arbitrary string keys via the `string & {}` intersection pattern.
 */
export type DictionaryKey = AnnotationDictionaryKey | (string & {});

/**
 * Represents a bookmark (outline entry) in a PDF document.
 */
export interface Bookmark {
  /** The title text of the bookmark. */
  readonly title: string;
  /** The zero-based destination page index, or undefined for external destinations. */
  readonly pageIndex: number | undefined;
  /** Child bookmarks forming a tree structure. */
  readonly children: readonly Bookmark[];
}

/**
 * Flags for text search behaviour.
 */
export enum TextSearchFlags {
  /** No flags. This value is 0 and therefore falsy by design. */
  None = 0x0000,
  MatchCase = 0x0001,
  MatchWholeWord = 0x0002,
  Consecutive = 0x0004,
}

/**
 * Text rendering modes as defined in PDF specification.
 */
export enum TextRenderMode {
  /** Fill text. */
  Fill = 'Fill',
  /** Stroke text. */
  Stroke = 'Stroke',
  /** Fill then stroke text. */
  FillStroke = 'FillStroke',
  /** Invisible text. */
  Invisible = 'Invisible',
  /** Fill text and add to path for clipping. */
  FillClip = 'FillClip',
  /** Stroke text and add to path for clipping. */
  StrokeClip = 'StrokeClip',
  /** Fill then stroke text and add to path for clipping. */
  FillStrokeClip = 'FillStrokeClip',
  /** Add text to path for clipping. */
  Clip = 'Clip',
}

/**
 * Value types for page object mark parameters.
 */
export enum PageObjectMarkValueType {
  /** Integer value. */
  Int = 'Int',
  /** String value. */
  String = 'String',
  /** Blob (binary) value. */
  Blob = 'Blob',
  /** Name value (PDF name object). */
  Name = 'Name',
}

/**
 * A parameter on a page object mark.
 *
 * Discriminated union keyed on `valueType`. Narrow via
 * `if (param.valueType === PageObjectMarkValueType.Int)` to access `value`.
 */
export type PageObjectMarkParam =
  | { readonly key: string; readonly valueType: PageObjectMarkValueType.Int; readonly value: number }
  | { readonly key: string; readonly valueType: PageObjectMarkValueType.String; readonly value: string }
  | { readonly key: string; readonly valueType: PageObjectMarkValueType.Name; readonly value: string }
  | { readonly key: string; readonly valueType: PageObjectMarkValueType.Blob; readonly value: Uint8Array };

/**
 * A content mark on a page object.
 *
 * Marks are used in tagged PDFs to identify content (e.g., /Artifact for
 * decorative content, /Span for text spans with attributes).
 */
export interface PageObjectMark {
  /** Mark name (e.g., 'Artifact', 'Span', 'Figure'). */
  name: string;
  /** Mark parameters. */
  params: PageObjectMarkParam[];
}

/**
 * Extended information about a character in a PDF page.
 */
export interface CharacterInfo {
  /** Zero-based character index. */
  readonly index: number;
  /** Unicode code point of the character. */
  readonly unicode: number;
  /** The character as a string. */
  readonly char: string;
  /** Font size in points. */
  readonly fontSize: number;
  /** Font weight (100-900, where 400 is normal and 700 is bold). */
  readonly fontWeight: number;
  /** Font name. */
  readonly fontName?: string;
  /** Text rendering mode. */
  readonly renderMode: TextRenderMode;
  /** Rotation angle in radians. */
  readonly angle: number;
  /** Character origin X coordinate. */
  readonly originX: number;
  /** Character origin Y coordinate. */
  readonly originY: number;
  /** Whether this character was generated (not from the original PDF content). */
  readonly isGenerated: boolean;
  /** Whether this character is a hyphen that may indicate a word break. */
  readonly isHyphen: boolean;
  /** Whether there was an error mapping this character to Unicode. */
  readonly hasUnicodeMapError: boolean;
  /** Fill colour (if available). */
  readonly fillColour?: Colour;
  /** Stroke colour (if available). */
  readonly strokeColour?: Colour;
}

/**
 * Bounding box of a single character in page coordinates.
 */
export interface CharBox {
  /** Left edge of the character bounding box. */
  readonly left: number;
  /** Right edge of the character bounding box. */
  readonly right: number;
  /** Bottom edge of the character bounding box. */
  readonly bottom: number;
  /** Top edge of the character bounding box. */
  readonly top: number;
}

/**
 * A single text search result with position information.
 */
export interface TextSearchResult {
  /** The character index of the match start. */
  readonly charIndex: number;
  /** The number of characters in the match. */
  readonly charCount: number;
  /** The bounding rectangles covering the matched text. */
  readonly rects: Rect[];
}

/**
 * A structure element in a tagged PDF's structure tree.
 */
export interface StructureElement {
  /** The element type (e.g., "P", "H1", "Table", "Figure"). */
  readonly type: string;
  /** The title attribute, if present. */
  readonly title?: string;
  /** Alternative text for accessibility, if present. */
  readonly altText?: string;
  /** The language attribute (e.g., "en-US"), if present. */
  readonly lang?: string;
  /** Child structure elements. */
  readonly children: readonly StructureElement[];
}

/**
 * A file attachment embedded in a PDF document.
 */
export interface PDFAttachment {
  /** Zero-based index of the attachment. */
  readonly index: number;
  /** The filename of the attachment. */
  readonly name: string;
  /** The raw file data. */
  readonly data: Uint8Array;
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
  Type1 = 'Type1',
  TrueType = 'TrueType',
}

/**
 * Font descriptor flags.
 *
 * These flags describe various characteristics of a font as defined in the
 * PDF specification (Table 123 - Font descriptor flags).
 */
export enum FontFlags {
  /** Font contains glyphs of fixed width. */
  FixedPitch = 1 << 0,
  /** Font has serifs. */
  Serif = 1 << 1,
  /** Font uses the Adobe standard Latin character set or a subset. */
  Symbolic = 1 << 2,
  /** Font has glyphs resembling cursive handwriting. */
  Script = 1 << 3,
  /** Font uses a character set based on ISO Latin character set. */
  Nonsymbolic = 1 << 5,
  /** Font contains oblique or slanted glyphs. */
  Italic = 1 << 6,
  /** Font contains no lowercase letters. */
  AllCap = 1 << 16,
  /** Font contains lowercase letters rendered as smaller capitals. */
  SmallCap = 1 << 17,
  /** Font rendering simulates bold appearance. */
  ForceBold = 1 << 18,
}

/**
 * Information about a font.
 */
export interface FontInfo {
  /** Family name of the font (e.g., 'Helvetica'). */
  familyName: string;
  /** Full font name (e.g., 'Helvetica-Bold'). */
  fontName: string;
  /** Font descriptor flags. */
  flags: FontFlags;
  /** Font weight (100-900, where 400 is normal, 700 is bold). */
  weight: number;
  /** Italic angle in degrees (negative for italic/oblique). */
  italicAngle: number;
  /** Whether the font is embedded in the document. */
  isEmbedded: boolean;
}

/**
 * Font metrics at a specific size.
 */
export interface FontMetrics {
  /** Distance from baseline to top of highest ascender (positive). */
  ascent: number;
  /** Distance from baseline to bottom of lowest descender (negative). */
  descent: number;
}

/**
 * Flags controlling how a document is saved.
 *
 * These flags control how the document is serialised. `Incremental` preserves
 * the original data and appends changes; `NoIncremental` rewrites the file
 * without encryption; `RemoveSecurity` removes all security handlers.
 */
export enum SaveFlags {
  /** No special flags. */
  None = 'None',
  /** Incremental save. */
  Incremental = 'Incremental',
  /** Remove security (unencrypt). */
  NoIncremental = 'NoIncremental',
  /** Remove security. */
  RemoveSecurity = 'RemoveSecurity',
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
 * Document availability status for progressive loading.
 */
export enum DocumentAvailability {
  /** Data error occurred. */
  DataError = 'DataError',
  /** Required data is not yet available. */
  DataNotAvailable = 'DataNotAvailable',
  /** Required data is available. */
  DataAvailable = 'DataAvailable',
  /** Linearisation status is unknown. */
  LinearisationUnknown = 'LinearisationUnknown',
}

/**
 * Linearisation status of a PDF document.
 */
export enum LinearisationStatus {
  /** Not linearised. */
  NotLinearised = 'NotLinearised',
  /** Linearised. */
  Linearised = 'Linearised',
  /** Unknown (not enough data). */
  Unknown = 'Unknown',
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
  /** Stack trace (only included in debug builds). */
  stack?: string;
}

/**
 * Standard PDF metadata fields.
 *
 * All fields are optional as PDFs may not contain all metadata.
 */
export interface DocumentMetadata {
  /** Document title. */
  title?: string;
  /** Document author. */
  author?: string;
  /** Document subject. */
  subject?: string;
  /** Document keywords (comma-separated). */
  keywords?: string;
  /** Application that created the original content. */
  creator?: string;
  /** Application that produced the PDF. */
  producer?: string;
  /** Document creation date (PDF date string format). */
  creationDate?: string;
  /** Document modification date (PDF date string format). */
  modificationDate?: string;
}

/**
 * PDF document page mode (initial view when opened).
 *
 * Determines what panel is displayed when the document is opened.
 */
export enum PageMode {
  /** Neither document outline nor thumbnails visible. */
  UseNone = 'UseNone',
  /** Document outline (bookmarks) visible. */
  UseOutlines = 'UseOutlines',
  /** Page thumbnails visible. */
  UseThumbs = 'UseThumbs',
  /** Full-screen mode, no menu bar, window controls, or other windows visible. */
  FullScreen = 'FullScreen',
  /** Optional content group panel visible. */
  UseOC = 'UseOC',
  /** Attachments panel visible. */
  UseAttachments = 'UseAttachments',
}

/**
 * PDF document permission flags.
 *
 * Bit flags indicating what operations are permitted on the document.
 * These match the PDF specification permission bits.
 */
export enum DocumentPermission {
  /** Print the document. */
  Print = 1 << 2,
  /** Modify the contents of the document. */
  ModifyContents = 1 << 3,
  /** Copy or extract text and graphics. */
  CopyOrExtract = 1 << 4,
  /** Add or modify annotations and form fields. */
  AddOrModifyAnnotations = 1 << 5,
  /** Fill in interactive form fields. */
  FillForms = 1 << 8,
  /** Extract text and graphics for accessibility. */
  ExtractForAccessibility = 1 << 9,
  /** Assemble the document (insert, rotate, delete pages). */
  Assemble = 1 << 10,
  /** Print at high quality. */
  PrintHighQuality = 1 << 11,
}

/**
 * Structured document permissions decoded from the raw bitmask.
 *
 * Provides named boolean fields for each permission flag, as well as
 * the raw bitmask value for advanced use cases.
 */
export interface DocumentPermissions {
  /** The raw permissions bitmask. */
  readonly raw: number;
  /** Whether printing is allowed. */
  readonly canPrint: boolean;
  /** Whether modifying contents is allowed. */
  readonly canModifyContents: boolean;
  /** Whether copying or extracting text/graphics is allowed. */
  readonly canCopyOrExtract: boolean;
  /** Whether adding or modifying annotations is allowed. */
  readonly canAddOrModifyAnnotations: boolean;
  /** Whether filling forms is allowed. */
  readonly canFillForms: boolean;
  /** Whether extracting for accessibility is allowed. */
  readonly canExtractForAccessibility: boolean;
  /** Whether assembling the document is allowed. */
  readonly canAssemble: boolean;
  /** Whether high-quality printing is allowed. */
  readonly canPrintHighQuality: boolean;
}

/**
 * Duplex printing mode for PDF viewer preferences.
 *
 * Defines how pages should be laid out when printing double-sided.
 */
export enum DuplexMode {
  /** No duplex mode specified. */
  Undefined = 'Undefined',
  /** Print single-sided. */
  Simplex = 'Simplex',
  /** Flip on short edge (for portrait orientation). */
  DuplexFlipShortEdge = 'DuplexFlipShortEdge',
  /** Flip on long edge (for landscape orientation). */
  DuplexFlipLongEdge = 'DuplexFlipLongEdge',
}

/**
 * Viewer preferences for a PDF document.
 *
 * These settings control how a PDF viewer should display and print the document.
 */
export interface ViewerPreferences {
  /** Whether print scaling should be applied. */
  printScaling: boolean;
  /** Number of copies to print by default. */
  numCopies: number;
  /** Duplex printing mode. */
  duplexMode: DuplexMode;
}

/**
 * Named destination in a PDF document.
 *
 * Named destinations allow linking to specific locations by name.
 */
export interface NamedDestination {
  /** The name of the destination. */
  name: string;
  /** The page index (zero-based) that this destination points to. */
  pageIndex: number;
}

/**
 * PDF action types.
 *
 * Actions define behaviour triggered by links, bookmarks, or form events.
 */
export enum ActionType {
  /** Unsupported action type. */
  Unsupported = 'Unsupported',
  /** Go to a destination within the document. */
  GoTo = 'GoTo',
  /** Go to a destination in a remote document. */
  RemoteGoTo = 'RemoteGoTo',
  /** Open a URI (web link). */
  URI = 'URI',
  /** Launch an application or open a file. */
  Launch = 'Launch',
  /** Go to an embedded document. */
  EmbeddedGoTo = 'EmbeddedGoTo',
}

/**
 * Destination view fit types.
 *
 * Defines how the destination view should fit in the viewer.
 */
export enum DestinationFitType {
  /** Unknown or unsupported fit type. */
  Unknown = 'Unknown',
  /** Fit the entire page in the window. */
  XYZ = 'XYZ',
  /** Fit the entire page in the window. */
  Fit = 'Fit',
  /** Fit the page width in the window. */
  FitH = 'FitH',
  /** Fit the page height in the window. */
  FitV = 'FitV',
  /** Fit the specified rectangle in the window. */
  FitR = 'FitR',
  /** Fit the page's bounding box in the window. */
  FitB = 'FitB',
  /** Fit the bounding box width in the window. */
  FitBH = 'FitBH',
  /** Fit the bounding box height in the window. */
  FitBV = 'FitBV',
}

/**
 * A destination within a PDF document.
 */
export interface PDFDestination {
  /** Zero-based page index, or -1 if destination is invalid. */
  pageIndex: number;
  /** Fit type for the destination view. */
  fitType: DestinationFitType;
  /** X coordinate in page units (if applicable). */
  x?: number;
  /** Y coordinate in page units (if applicable). */
  y?: number;
  /** Zoom level (if applicable). */
  zoom?: number;
}

/**
 * A link on a PDF page.
 */
export interface PDFLink {
  /** Zero-based index of the link on its page. */
  index: number;
  /** Bounding rectangle in page coordinates. */
  bounds: Rect;
  /** The action associated with this link. */
  action?: PDFAction;
  /** The destination for GoTo actions. */
  destination?: PDFDestination;
}

/**
 * An action in a PDF document.
 */
export interface PDFAction {
  /** The type of action. */
  type: ActionType;
  /** URI for URI actions. */
  uri?: string;
  /** File path for Launch/RemoteGoTo actions. */
  filePath?: string;
}

/**
 * Form field types for widget annotations.
 */
export enum FormFieldType {
  /** Unknown form field type. */
  Unknown = 'Unknown',
  /** Push button (no persistent value). */
  PushButton = 'PushButton',
  /** Check box (boolean toggle). */
  CheckBox = 'CheckBox',
  /** Radio button (mutually exclusive choice). */
  RadioButton = 'RadioButton',
  /** Combo box (dropdown selection). */
  ComboBox = 'ComboBox',
  /** List box (scrollable multi-select). */
  ListBox = 'ListBox',
  /** Text field (single- or multi-line text input). */
  TextField = 'TextField',
  /** Signature field (digital signature placeholder). */
  Signature = 'Signature',
}

/**
 * Annotation flags as bit flags.
 *
 * These flags control the behaviour and visibility of annotations.
 */
export enum AnnotationFlags {
  /** No flags. */
  None = 0,
  /** Invisible (not displayed, not printed). */
  Invisible = 1 << 0,
  /** Hidden (not displayed, not printed, not interactive). */
  Hidden = 1 << 1,
  /** Print (annotation should be printed). */
  Print = 1 << 2,
  /** NoZoom (annotation size stays constant when zooming). */
  NoZoom = 1 << 3,
  /** NoRotate (annotation orientation stays constant when page rotates). */
  NoRotate = 1 << 4,
  /** NoView (not displayed but may be printed). */
  NoView = 1 << 5,
  /** ReadOnly (no user interaction). */
  ReadOnly = 1 << 6,
  /** Locked (cannot be deleted or modified). */
  Locked = 1 << 7,
  /** ToggleNoView (toggle NoView flag on hover). */
  ToggleNoView = 1 << 8,
  /** LockedContents (contents cannot be modified). */
  LockedContents = 1 << 9,
}

/**
 * Form field flags as bit flags.
 *
 * These flags are specific to form field widgets.
 */
export enum FormFieldFlags {
  /** No flags. */
  None = 0,
  /** ReadOnly (field cannot be edited). */
  ReadOnly = 1 << 0,
  /** Required (field must be filled). */
  Required = 1 << 1,
  /** NoExport (field should not be exported). */
  NoExport = 1 << 2,
  // Text fields
  /** Multiline text field. */
  Multiline = 1 << 12,
  /** Password field (characters masked). */
  Password = 1 << 13,
  /** Rich text field. */
  RichText = 1 << 25,
  // Choice fields
  /** Combo (editable dropdown). */
  Combo = 1 << 17,
  /** Edit (combo box allows text entry). */
  Edit = 1 << 18,
  /** Sort (options are sorted). */
  Sort = 1 << 19,
  /** MultiSelect (multiple items can be selected). */
  MultiSelect = 1 << 21,
  /** CommitOnSelChange (selection changes commit immediately). */
  CommitOnSelChange = 1 << 26,
}

/**
 * Keyboard modifier flags for form event methods.
 *
 * These flags indicate which modifier keys are held during an event.
 * Combine with bitwise OR for multiple modifiers.
 *
 * @example
 * ```typescript
 * page.formMouseMove(FormModifierFlags.Shift | FormModifierFlags.Control, x, y);
 * ```
 */
export enum FormModifierFlags {
  /** No modifier keys held. */
  None = 0,
  /** Shift key held. */
  Shift = 1 << 0,
  /** Control key held. */
  Control = 1 << 1,
  /** Alt key held. */
  Alt = 1 << 2,
  /** Meta (macOS Command) key held. */
  MetaOrCommand = 1 << 3,
}

/**
 * Mouse button identifier for form interaction methods.
 */
export type FormMouseButton = 'left' | 'right';

/**
 * Appearance mode for annotation appearance streams.
 */
export enum AnnotationAppearanceMode {
  /** Normal appearance. */
  Normal = 'Normal',
  /** Rollover appearance (on hover). */
  Rollover = 'Rollover',
  /** Down appearance (on click). */
  Down = 'Down',
}

/**
 * A point in 2D space.
 */
export interface Point {
  /** X coordinate. */
  x: number;
  /** Y coordinate. */
  y: number;
}

/**
 * A line segment with start and end points.
 */
export interface LinePoints {
  /** Start point X coordinate. */
  startX: number;
  /** Start point Y coordinate. */
  startY: number;
  /** End point X coordinate. */
  endX: number;
  /** End point Y coordinate. */
  endY: number;
}

/**
 * Quad points for text markup annotations (highlight, underline, etc.).
 *
 * The four points define a quadrilateral that encloses marked content.
 * Points are ordered: bottom-left, bottom-right, top-left, top-right.
 */
export interface QuadPoints {
  /** Bottom-left X. */
  x1: number;
  /** Bottom-left Y. */
  y1: number;
  /** Bottom-right X. */
  x2: number;
  /** Bottom-right Y. */
  y2: number;
  /** Top-left X. */
  x3: number;
  /** Top-left Y. */
  y3: number;
  /** Top-right X. */
  x4: number;
  /** Top-right Y. */
  y4: number;
}

/**
 * Border properties for an annotation.
 */
export interface AnnotationBorder {
  /** Horizontal corner radius. */
  horizontalRadius: number;
  /** Vertical corner radius. */
  verticalRadius: number;
  /** Border width. */
  borderWidth: number;
}

/**
 * Extended annotation information with additional details.
 */
export interface ExtendedAnnotation extends Annotation {
  /** Annotation flags. */
  flags: AnnotationFlags;
  /** Contents/subject text if available. */
  contents?: string;
  /** Author/title if available. */
  author?: string;
  /** Modification date if available. */
  modificationDate?: string;
  /** Creation date if available. */
  creationDate?: string;
}

/**
 * Form widget annotation with field information.
 */
export interface WidgetAnnotation extends ExtendedAnnotation {
  /** Form field type. */
  fieldType: FormFieldType;
  /** Form field name. */
  fieldName?: string;
  /** Alternate (tooltip) name. */
  alternateName?: string;
  /** Current field value. */
  fieldValue?: string;
  /** Form field flags. */
  fieldFlags: FormFieldFlags;
  /** Options for combo/list boxes. */
  options?: WidgetOption[];
}

/**
 * An option in a combo/list box widget.
 */
export interface WidgetOption {
  /** Option index. */
  index: number;
  /** Option label text. */
  label: string;
  /** Whether this option is selected. */
  selected: boolean;
}

/**
 * Form types in a PDF document.
 *
 * Indicates the type of form technology used (AcroForm, XFA, or none).
 */
export enum FormType {
  /** No form. */
  None = 'None',
  /** AcroForm (standard PDF forms). */
  AcroForm = 'AcroForm',
  /** XFA full form (not supported by PDFium). */
  XFAFull = 'XFAFull',
  /** XFA foreground form (partial XFA support). */
  XFAForeground = 'XFAForeground',
}

/**
 * DocMDP (Modification Detection and Prevention) permission levels.
 *
 * These control what modifications are allowed after signing.
 */
export enum DocMDPPermission {
  /** No MDP permission specified. */
  None = 'None',
  /** No changes allowed. */
  NoChanges = 'NoChanges',
  /** Form filling and signing allowed. */
  FillAndSign = 'FillAndSign',
  /** Form filling, signing, and annotation allowed. */
  FillSignAnnotate = 'FillSignAnnotate',
}

/**
 * Digital signature information from a PDF.
 */
export interface PDFSignature {
  /** Zero-based index of the signature. */
  index: number;
  /** Signature contents (the actual signature bytes). */
  contents?: Uint8Array;
  /** Byte range covered by the signature [start1, length1, start2, length2, ...]. */
  byteRange?: number[];
  /** Sub-filter (signature algorithm, e.g., 'adbe.pkcs7.detached'). */
  subFilter?: string;
  /** Reason for signing. */
  reason?: string;
  /** Signing time (PDF date string format). */
  time?: string;
  /** DocMDP permission level. */
  docMDPPermission: DocMDPPermission;
}

/**
 * Line cap styles for path strokes.
 *
 * Defines how the ends of open paths are drawn.
 */
export enum LineCapStyle {
  /** Butt cap - stroke ends at the endpoint. */
  Butt = 'Butt',
  /** Round cap - stroke ends with a semicircle. */
  Round = 'Round',
  /** Square cap - stroke extends half the line width past the endpoint. */
  Square = 'Square',
}

/**
 * Line join styles for path strokes.
 *
 * Defines how corners are drawn where two path segments meet.
 */
export enum LineJoinStyle {
  /** Miter join - sharp corner. */
  Miter = 'Miter',
  /** Round join - rounded corner. */
  Round = 'Round',
  /** Bevel join - bevelled corner. */
  Bevel = 'Bevel',
}

/**
 * Blend modes for page objects.
 *
 * These define how overlapping content is composited.
 * Values match the PDF specification (ISO 32000-1:2008, Table 136).
 */
export enum BlendMode {
  /** Normal blending. */
  Normal = 'Normal',
  /** Multiply blending. */
  Multiply = 'Multiply',
  /** Screen blending. */
  Screen = 'Screen',
  /** Overlay blending. */
  Overlay = 'Overlay',
  /** Darken blending. */
  Darken = 'Darken',
  /** Lighten blending. */
  Lighten = 'Lighten',
  /**
   * Colour dodge blending.
   *
   * The member name uses American spelling ("Color") to match the PDF specification
   * (ISO 32000-1:2008, Table 136) where the blend mode is defined as "ColorDodge".
   */
  ColorDodge = 'ColorDodge',
  /**
   * Colour burn blending.
   *
   * The member name uses American spelling ("Color") to match the PDF specification
   * (ISO 32000-1:2008, Table 136) where the blend mode is defined as "ColorBurn".
   */
  ColorBurn = 'ColorBurn',
  /** Hard light blending. */
  HardLight = 'HardLight',
  /** Soft light blending. */
  SoftLight = 'SoftLight',
  /** Difference blending. */
  Difference = 'Difference',
  /** Exclusion blending. */
  Exclusion = 'Exclusion',
}

/**
 * A 2D transformation matrix.
 *
 * The matrix represents an affine transformation:
 * [a, b, 0]
 * [c, d, 0]
 * [e, f, 1]
 *
 * Where (x', y') = (a*x + c*y + e, b*x + d*y + f)
 */
export interface TransformMatrix {
  /** Scale X (horizontal). */
  a: number;
  /** Shear Y (vertical skew). */
  b: number;
  /** Shear X (horizontal skew). */
  c: number;
  /** Scale Y (vertical). */
  d: number;
  /** Translate X (horizontal offset). */
  e: number;
  /** Translate Y (vertical offset). */
  f: number;
}

/**
 * Dash pattern for stroked paths.
 */
export interface DashPattern {
  /** The dash array (alternating dash and gap lengths). */
  dashArray: readonly number[];
  /** The phase offset to start the pattern. */
  phase: number;
}

/**
 * Image colour space types.
 */
export enum ImageColourSpace {
  /** Unknown colour space. */
  Unknown = 'Unknown',
  /** DeviceGray. */
  DeviceGray = 'DeviceGray',
  /** DeviceRGB. */
  DeviceRGB = 'DeviceRGB',
  /** DeviceCMYK. */
  DeviceCMYK = 'DeviceCMYK',
  /** CalGray. */
  CalGray = 'CalGray',
  /** CalRGB. */
  CalRGB = 'CalRGB',
  /** Lab. */
  Lab = 'Lab',
  /** ICCBased. */
  ICCBased = 'ICCBased',
  /** Separation. */
  Separation = 'Separation',
  /** DeviceN. */
  DeviceN = 'DeviceN',
  /** Indexed. */
  Indexed = 'Indexed',
  /** Pattern. */
  Pattern = 'Pattern',
}

/**
 * Image marked content type.
 */
export enum ImageMarkedContentType {
  /** Not marked content. */
  None = 'None',
  /** Artifact. */
  Artifact = 'Artifact',
  /** Tagged. */
  Tagged = 'Tagged',
}

/**
 * Metadata for an image object in a PDF.
 */
export interface ImageMetadata {
  /** Image width in pixels. */
  width: number;
  /** Image height in pixels. */
  height: number;
  /** Horizontal DPI. */
  horizontalDpi: number;
  /** Vertical DPI. */
  verticalDpi: number;
  /** Bits per pixel. */
  bitsPerPixel: number;
  /** Colour space. */
  colourSpace: ImageColourSpace;
  /** Marked content type. */
  markedContent: ImageMarkedContentType;
}

/**
 * Value types for attachment dictionary entries.
 */
export enum AttachmentValueType {
  /** Unknown value type. */
  Unknown = 'Unknown',
  /** Boolean value. */
  Boolean = 'Boolean',
  /** Number value. */
  Number = 'Number',
  /** String value. */
  String = 'String',
  /** Name value. */
  Name = 'Name',
  /** Array value. */
  Array = 'Array',
  /** Dictionary value. */
  Dictionary = 'Dictionary',
  /** Stream value. */
  Stream = 'Stream',
  /** Reference value. */
  Reference = 'Reference',
}

// ─────────────────────────────────────────────────────────────────────────────
// Coordinate Conversion Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Context for coordinate transformation between device and page space.
 *
 * Defines the viewport mapping used for conversion between device coordinates
 * (pixels) and page coordinates (points).
 */
export interface CoordinateTransformContext {
  /** X offset in device coordinates where rendering starts. */
  startX: number;
  /** Y offset in device coordinates where rendering starts. */
  startY: number;
  /** Width of the rendering area in device coordinates. */
  sizeX: number;
  /** Height of the rendering area in device coordinates. */
  sizeY: number;
  /** Page rotation applied during rendering. */
  rotate: PageRotation;
}

/**
 * A point in device coordinate space (pixels).
 */
export interface DeviceCoordinate {
  /** X coordinate in pixels. */
  x: number;
  /** Y coordinate in pixels. */
  y: number;
}

/**
 * A point in page coordinate space (points, 1/72 inch).
 */
export interface PageCoordinate {
  /** X coordinate in points. */
  x: number;
  /** Y coordinate in points. */
  y: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Page Import/Merge Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Options for importing pages from another document.
 */
export interface ImportPagesOptions {
  /**
   * Page range string specifying which pages to import.
   *
   * Format: comma-separated page numbers and ranges (1-indexed).
   * Examples:
   * - "1,2,3" - pages 1, 2, and 3
   * - "1-5" - pages 1 through 5
   * - "1,3,5-7" - pages 1, 3, 5, 6, and 7
   * - undefined/null - all pages
   */
  pageRange?: string;

  /**
   * Zero-based index where pages should be inserted.
   *
   * If undefined, pages are appended to the end.
   */
  insertIndex?: number;
}

/**
 * Options for creating an N-up layout document.
 *
 * N-up combines multiple pages onto single sheets for printing.
 */
export interface NUpLayoutOptions {
  /** Output page width in points. */
  outputWidth: number;
  /** Output page height in points. */
  outputHeight: number;
  /** Number of source pages per row. */
  pagesPerRow: number;
  /** Number of source pages per column. */
  pagesPerColumn: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Form Action Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Document-level action types for form events.
 *
 * These actions are triggered at document lifecycle events.
 */
export enum DocumentActionType {
  /** Executed before the document is closed. */
  WillClose = 'WillClose',
  /** Executed before the document is saved. */
  WillSave = 'WillSave',
  /** Executed after the document is saved. */
  DidSave = 'DidSave',
  /** Executed before the document is printed. */
  WillPrint = 'WillPrint',
  /** Executed after the document is printed. */
  DidPrint = 'DidPrint',
}

/**
 * Page-level action types for form events.
 *
 * These actions are triggered at page lifecycle events.
 */
export enum PageActionType {
  /** Executed when the page is opened. */
  Open = 'Open',
  /** Executed when the page is closed. */
  Close = 'Close',
}

/**
 * A web link detected in page text content.
 *
 * These are URLs automatically detected in the page text,
 * distinct from interactive link annotations.
 */
export interface WebLink {
  /** Zero-based index of the web link. */
  index: number;
  /** The URL string. */
  url: string;
  /** Bounding rectangles covering the link text. */
  rects: Rect[];
  /** The text range in the page content. */
  textRange?: {
    /** Starting character index in the text page. */
    startCharIndex: number;
    /** Number of characters in the link text. */
    charCount: number;
  };
}
