/**
 * Worker communication protocol.
 *
 * Defines the message types for worker-to-main-thread communication.
 *
 * @module context/protocol
 */

import type {
  ActionType,
  AnnotationBorder,
  AnnotationType,
  Bookmark,
  CharacterInfo,
  CharBox,
  Colour,
  DestinationFitType,
  DocMDPPermission,
  DocumentMetadata,
  DocumentPermissions,
  FlattenFlags,
  FlattenResult,
  FormFieldType,
  FormType,
  ImageMetadata,
  ImportPagesOptions,
  JavaScriptAction,
  LineCapStyle,
  LineJoinStyle,
  NamedDestination,
  NUpLayoutOptions,
  PageBox,
  PageMode,
  PageObjectMark,
  PageObjectType,
  PageRotation,
  PathFillMode,
  PathSegmentType,
  PDFSignature,
  Rect,
  RenderOptions,
  SaveOptions,
  SerialisedError,
  StructureElement,
  TextSearchFlags,
  TextSearchResult,
  TransformMatrix,
  ViewerPreferences,
  WebLink,
  WidgetOption,
} from '../core/types.js';

/**
 * Payload for destroy request (intentionally empty).
 */
export type DestroyPayload = Record<string, never>;

/**
 * Payload for page rendering request.
 */
export interface RenderPagePayload {
  pageId: string;
  options: RenderOptions;
}

/**
 * Request types sent from main thread to worker.
 */
export type WorkerRequest =
  // Existing messages
  | { type: 'INIT'; id: string; payload: { wasmBinary: ArrayBuffer; maxDocuments?: number; maxPages?: number } }
  | { type: 'OPEN_DOCUMENT'; id: string; payload: { data: ArrayBuffer; password?: string } }
  | { type: 'CLOSE_DOCUMENT'; id: string; payload: { documentId: string } }
  | { type: 'GET_PAGE_COUNT'; id: string; payload: { documentId: string } }
  | { type: 'LOAD_PAGE'; id: string; payload: { documentId: string; pageIndex: number } }
  | { type: 'CLOSE_PAGE'; id: string; payload: { pageId: string } }
  | { type: 'GET_PAGE_SIZE'; id: string; payload: { pageId: string } }
  | { type: 'RENDER_PAGE'; id: string; payload: RenderPagePayload }
  | {
      type: 'RENDER_PAGE_STANDALONE';
      id: string;
      payload: { documentId: string; pageIndex: number; options: RenderOptions };
    }
  | { type: 'GET_TEXT'; id: string; payload: { pageId: string } }
  | { type: 'GET_TEXT_LAYOUT'; id: string; payload: { pageId: string } }
  | { type: 'PING'; id: string; payload?: DestroyPayload }
  | { type: 'DESTROY'; id: string; payload?: DestroyPayload }
  // Document-level queries
  | { type: 'GET_DOCUMENT_INFO'; id: string; payload: { documentId: string } }
  | { type: 'GET_BOOKMARKS'; id: string; payload: { documentId: string } }
  | { type: 'GET_ATTACHMENTS'; id: string; payload: { documentId: string } }
  | { type: 'GET_NAMED_DESTINATIONS'; id: string; payload: { documentId: string } }
  | { type: 'GET_NAMED_DEST_BY_NAME'; id: string; payload: { documentId: string; name: string } }
  | { type: 'GET_PAGE_LABEL'; id: string; payload: { documentId: string; pageIndex: number } }
  | { type: 'SAVE_DOCUMENT'; id: string; payload: { documentId: string; options?: SaveOptions } }
  // Page-level read queries
  | { type: 'GET_PAGE_INFO'; id: string; payload: { pageId: string } }
  | { type: 'GET_ANNOTATIONS'; id: string; payload: { pageId: string } }
  | { type: 'GET_PAGE_OBJECTS'; id: string; payload: { pageId: string } }
  | { type: 'GET_LINKS'; id: string; payload: { pageId: string } }
  | { type: 'GET_WEB_LINKS'; id: string; payload: { pageId: string } }
  | { type: 'GET_STRUCTURE_TREE'; id: string; payload: { pageId: string } }
  | { type: 'GET_CHAR_AT_POS'; id: string; payload: { pageId: string; x: number; y: number } }
  | {
      type: 'GET_TEXT_IN_RECT';
      id: string;
      payload: { pageId: string; left: number; top: number; right: number; bottom: number };
    }
  | { type: 'FIND_TEXT'; id: string; payload: { pageId: string; query: string; flags?: TextSearchFlags } }
  | { type: 'GET_CHARACTER_INFO'; id: string; payload: { pageId: string; charIndex: number } }
  | { type: 'GET_CHAR_BOX'; id: string; payload: { pageId: string; charIndex: number } }
  // Page-level mutations
  | { type: 'FLATTEN_PAGE'; id: string; payload: { pageId: string; flags?: FlattenFlags } }
  | { type: 'GET_FORM_WIDGETS'; id: string; payload: { pageId: string } }
  // Form operations
  | { type: 'GET_FORM_SELECTED_TEXT'; id: string; payload: { pageId: string } }
  | { type: 'CAN_FORM_UNDO'; id: string; payload: { pageId: string } }
  | { type: 'FORM_UNDO'; id: string; payload: { pageId: string } }
  | { type: 'KILL_FORM_FOCUS'; id: string; payload: { documentId: string } }
  // Document operations
  | {
      type: 'SET_FORM_HIGHLIGHT';
      id: string;
      payload: { documentId: string; fieldType: FormFieldType; colour: Colour; alpha: number };
    }
  | {
      type: 'IMPORT_PAGES';
      id: string;
      payload: { targetDocId: string; sourceDocId: string; options?: ImportPagesOptions };
    }
  | { type: 'CREATE_N_UP'; id: string; payload: { documentId: string; options: NUpLayoutOptions } }
  | { type: 'GET_ALL_PAGE_DIMENSIONS'; id: string; payload: { documentId: string } }
  // Extended document-level queries
  | { type: 'GET_METADATA'; id: string; payload: { documentId: string } }
  | { type: 'GET_PERMISSIONS'; id: string; payload: { documentId: string } }
  | { type: 'GET_VIEWER_PREFERENCES'; id: string; payload: { documentId: string } }
  | { type: 'GET_JAVASCRIPT_ACTIONS'; id: string; payload: { documentId: string } }
  | { type: 'GET_SIGNATURES'; id: string; payload: { documentId: string } }
  | { type: 'GET_PRINT_PAGE_RANGES'; id: string; payload: { documentId: string } }
  | { type: 'GET_EXTENDED_DOCUMENT_INFO'; id: string; payload: { documentId: string } };

/**
 * Maps each worker request type to its payload type.
 *
 * Used by {@link WorkerProxy} to type-check the payload passed to `#sendRequest`.
 */
export type WorkerRequestPayloadMap = {
  INIT: { wasmBinary: ArrayBuffer; maxDocuments?: number; maxPages?: number };
  OPEN_DOCUMENT: { data: ArrayBuffer; password?: string };
  CLOSE_DOCUMENT: { documentId: string };
  GET_PAGE_COUNT: { documentId: string };
  LOAD_PAGE: { documentId: string; pageIndex: number };
  CLOSE_PAGE: { pageId: string };
  GET_PAGE_SIZE: { pageId: string };
  RENDER_PAGE: RenderPagePayload;
  RENDER_PAGE_STANDALONE: { documentId: string; pageIndex: number; options: RenderOptions };
  GET_TEXT: { pageId: string };
  GET_TEXT_LAYOUT: { pageId: string };
  PING: Record<string, never>;
  DESTROY: Record<string, never>;
  // New entries
  GET_DOCUMENT_INFO: { documentId: string };
  GET_BOOKMARKS: { documentId: string };
  GET_ATTACHMENTS: { documentId: string };
  GET_NAMED_DESTINATIONS: { documentId: string };
  GET_NAMED_DEST_BY_NAME: { documentId: string; name: string };
  GET_PAGE_LABEL: { documentId: string; pageIndex: number };
  SAVE_DOCUMENT: { documentId: string; options?: SaveOptions };
  GET_PAGE_INFO: { pageId: string };
  GET_ANNOTATIONS: { pageId: string };
  GET_PAGE_OBJECTS: { pageId: string };
  GET_LINKS: { pageId: string };
  GET_WEB_LINKS: { pageId: string };
  GET_STRUCTURE_TREE: { pageId: string };
  GET_CHAR_AT_POS: { pageId: string; x: number; y: number };
  GET_TEXT_IN_RECT: { pageId: string; left: number; top: number; right: number; bottom: number };
  FIND_TEXT: { pageId: string; query: string; flags?: TextSearchFlags };
  GET_CHARACTER_INFO: { pageId: string; charIndex: number };
  GET_CHAR_BOX: { pageId: string; charIndex: number };
  FLATTEN_PAGE: { pageId: string; flags?: FlattenFlags };
  GET_FORM_WIDGETS: { pageId: string };
  GET_FORM_SELECTED_TEXT: { pageId: string };
  CAN_FORM_UNDO: { pageId: string };
  FORM_UNDO: { pageId: string };
  KILL_FORM_FOCUS: { documentId: string };
  SET_FORM_HIGHLIGHT: { documentId: string; fieldType: FormFieldType; colour: Colour; alpha: number };
  IMPORT_PAGES: { targetDocId: string; sourceDocId: string; options?: ImportPagesOptions };
  CREATE_N_UP: { documentId: string; options: NUpLayoutOptions };
  GET_ALL_PAGE_DIMENSIONS: { documentId: string };
  GET_METADATA: { documentId: string };
  GET_PERMISSIONS: { documentId: string };
  GET_VIEWER_PREFERENCES: { documentId: string };
  GET_JAVASCRIPT_ACTIONS: { documentId: string };
  GET_SIGNATURES: { documentId: string };
  GET_PRINT_PAGE_RANGES: { documentId: string };
  GET_EXTENDED_DOCUMENT_INFO: { documentId: string };
};

/**
 * Response types sent from worker to main thread.
 */
export type WorkerResponse =
  | { type: 'SUCCESS'; id: string; payload: unknown }
  | { type: 'ERROR'; id: string; error: SerialisedError }
  | { type: 'PROGRESS'; id: string; progress: number };

// ────────────────────────────────────────────────────────────
// Response payloads
// ────────────────────────────────────────────────────────────

/**
 * Response payload for page rendering.
 */
export interface RenderPageResponse {
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  data: ArrayBuffer;
}

/**
 * Response payload for page size.
 */
export interface PageSizeResponse {
  width: number;
  height: number;
}

/**
 * Response payload for document open.
 */
export interface OpenDocumentResponse {
  documentId: string;
  pageCount: number;
}

/**
 * Response payload for page load.
 */
export interface LoadPageResponse {
  pageId: string;
  index: number;
  width: number;
  height: number;
}

/**
 * Response payload for GET_DOCUMENT_INFO.
 */
export interface DocumentInfoResponse {
  isTagged: boolean;
  hasForm: boolean;
  formType: FormType;
  namedDestinationCount: number;
  pageMode: PageMode;
}

/**
 * Response payload for GET_PAGE_INFO.
 */
export interface PageInfoResponse {
  rotation: PageRotation;
  hasTransparency: boolean;
  boundingBox: PageBox;
  charCount: number;
  pageBoxes: {
    media: PageBox | undefined;
    crop: PageBox | undefined;
    bleed: PageBox | undefined;
    trim: PageBox | undefined;
    art: PageBox | undefined;
  };
}

/**
 * Response payload for GET_CHAR_AT_POS.
 */
export interface CharAtPosResponse {
  index: number;
  info: CharacterInfo | undefined;
  box: CharBox | undefined;
}

/**
 * Response payload for CREATE_N_UP.
 */
export interface CreateNUpResponse {
  documentId: string;
  pageCount: number;
}

/**
 * Response payload for GET_EXTENDED_DOCUMENT_INFO.
 *
 * Contains document-level properties that don't fit in the basic DocumentInfoResponse.
 */
export interface ExtendedDocumentInfoResponse {
  fileVersion: number | undefined;
  rawPermissions: number;
  securityHandlerRevision: number;
  signatureCount: number;
  hasValidCrossReferenceTable: boolean;
}

/**
 * Serialised signature for transfer across the worker boundary.
 *
 * Uses ArrayBuffer instead of Uint8Array for structured clone transfer.
 */
export interface SerialisedSignature {
  index: number;
  contents: ArrayBuffer | undefined;
  byteRange: number[] | undefined;
  subFilter: string | undefined;
  reason: string | undefined;
  time: string | undefined;
  docMDPPermission: DocMDPPermission;
}

// ────────────────────────────────────────────────────────────
// Serialised types for worker boundary
// ────────────────────────────────────────────────────────────

/**
 * Serialised annotation data. All properties collected upfront into
 * a plain object for transfer across the worker boundary.
 */
export interface SerialisedAnnotation {
  index: number;
  type: AnnotationType;
  bounds: Rect;
  colour: { stroke: Colour | undefined; interior: Colour | undefined };
  flags: number;
  contents: string;
  author: string;
  subject: string;
  border: AnnotationBorder | null;
  appearance: string | null;
  fontSize: number;
  // Type-specific data
  line: { start: { x: number; y: number }; end: { x: number; y: number } } | undefined;
  vertices: Array<{ x: number; y: number }> | undefined;
  inkPaths: Array<Array<{ x: number; y: number }>> | undefined;
  attachmentPoints: SerialisedQuadPoints[] | undefined;
  // Widget/form data
  widget: SerialisedWidgetData | undefined;
  // Link data
  link: SerialisedLinkTarget | undefined;
}

/**
 * Serialised quad points for highlight/underline/strikeout annotations.
 */
export interface SerialisedQuadPoints {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  x3: number;
  y3: number;
  x4: number;
  y4: number;
}

/**
 * Serialised widget (form field) data within an annotation.
 */
export interface SerialisedWidgetData {
  fieldType: FormFieldType;
  fieldName: string;
  fieldValue: string;
  alternateName: string;
  exportValue: string;
  fieldFlags: number;
  options: WidgetOption[];
}

/**
 * Serialised link target data within an annotation.
 */
export interface SerialisedLinkTarget {
  action: SerialisedAction | undefined;
  destination: SerialisedDestination | undefined;
}

/**
 * Serialised PDF action.
 */
export interface SerialisedAction {
  type: ActionType;
  uri: string | undefined;
  filePath: string | undefined;
}

/**
 * Serialised PDF destination.
 */
export interface SerialisedDestination {
  pageIndex: number;
  fitType: DestinationFitType;
  x: number | undefined;
  y: number | undefined;
  zoom: number | undefined;
}

/**
 * Serialised page object data.
 */
export interface SerialisedPageObject {
  type: PageObjectType;
  bounds: Rect;
  matrix: TransformMatrix;
  marks: PageObjectMark[];
  // Type-specific data (only one populated based on type)
  text: SerialisedTextObjectData | undefined;
  image: SerialisedImageObjectData | undefined;
  path: SerialisedPathObjectData | undefined;
}

/**
 * Serialised text object data.
 */
export interface SerialisedTextObjectData {
  text: string;
  fontSize: number;
  fontName: string;
  familyName: string;
  weight: number;
  isEmbedded: boolean;
  italicAngle: number;
  fontFlags: number;
  metrics: { ascent: number; descent: number };
}

/**
 * Serialised image object data.
 */
export interface SerialisedImageObjectData {
  width: number;
  height: number;
  metadata: ImageMetadata;
}

/**
 * Serialised path segment data.
 */
export interface SerialisedPathSegment {
  type: PathSegmentType;
  x: number;
  y: number;
  close: boolean;
}

/**
 * Serialised path object data.
 */
export interface SerialisedPathObjectData {
  segmentCount: number;
  segments: SerialisedPathSegment[];
  drawMode: { fill: PathFillMode; stroke: boolean };
  strokeWidth: number;
  lineCap: LineCapStyle;
  lineJoin: LineJoinStyle;
}

/**
 * Serialised form widget data (simplified annotation subset).
 */
export interface SerialisedFormWidget {
  annotationIndex: number;
  fieldName: string;
  fieldType: FormFieldType;
  fieldValue: string;
}

/**
 * Serialised link (from page.getLinks()).
 */
export interface SerialisedLink {
  index: number;
  bounds: Rect;
  action: SerialisedAction | undefined;
  destination: SerialisedDestination | undefined;
}

/**
 * Serialised attachment.
 */
export interface SerialisedAttachment {
  index: number;
  name: string;
  data: ArrayBuffer;
}

// Re-export types used by consumers of the protocol
export type {
  Bookmark,
  CharBox,
  CharacterInfo,
  DocumentMetadata,
  DocumentPermissions,
  FlattenResult,
  JavaScriptAction,
  NamedDestination,
  PDFSignature,
  StructureElement,
  TextSearchResult,
  ViewerPreferences,
  WebLink,
};
