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
