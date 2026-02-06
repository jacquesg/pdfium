/**
 * Core interfaces for PDF document and page interactions.
 *
 * @module core/interfaces
 */

// PDFiumPageObject is the public API type for page objects. The dependency on
// `document/page-object.js` is intentional — the interface references a public
// abstraction, not an implementation detail.
import type { PDFiumPageObject } from '../document/page-object.js';
import type {
  Annotation,
  Bookmark,
  DocumentMetadata,
  DocumentPermissions,
  IProgressiveRenderContext,
  NamedDestination,
  PageBox,
  PageBoxType,
  PageMode,
  PageRotation,
  PageSize,
  PDFAttachment,
  RenderOptions,
  RenderResult,
  SaveOptions,
  TextSearchFlags,
  TextSearchResult,
} from './types.js';

/**
 * Interface for reading PDF documents.
 */
export interface IDocumentReader extends Disposable {
  /** Get the number of pages in the document. */
  readonly pageCount: number;

  /** Get the document's initial page mode. */
  readonly pageMode: PageMode;

  /** Get the raw document permissions bitmask. */
  readonly rawPermissions: number;

  /** Get the security handler revision. */
  readonly securityHandlerRevision: number;

  /** Get structured document permissions with named boolean fields. */
  getPermissions(): DocumentPermissions;

  /** Get all standard metadata fields. */
  getMetadata(): DocumentMetadata;

  /** Get a specific metadata field. */
  getMetaText(tag: string): string | undefined;

  /** Get the PDF file version. */
  readonly fileVersion: number | undefined;

  /** Load a specific page. */
  getPage(pageIndex: number): IPageReader;

  /** Iterate over all pages. */
  pages(): IterableIterator<IPageReader>;

  /** Get the bookmark tree. */
  getBookmarks(): Bookmark[];

  /** Iterate over bookmarks. */
  bookmarks(): IterableIterator<Bookmark>;

  /** Get the number of attachments. */
  readonly attachmentCount: number;

  /** Get an attachment by index. */
  getAttachment(index: number): PDFAttachment;

  /** Iterate over attachments. */
  attachments(): IterableIterator<PDFAttachment>;

  /** Get all attachments. */
  getAttachments(): PDFAttachment[];

  /** Get all named destinations. */
  getNamedDestinations(): NamedDestination[];

  /** Get a named destination by name. */
  getNamedDestinationByName(name: string): NamedDestination | undefined;

  /** Save the document. */
  save(options?: SaveOptions): Uint8Array;
}

/**
 * Interface for interacting with a PDF page.
 */
export interface IPageReader extends Disposable {
  /** The zero-based index of this page. */
  readonly index: number;

  /** Page dimensions. */
  readonly size: PageSize;
  readonly width: number;
  readonly height: number;

  /** Page rotation. */
  rotation: PageRotation;

  /** Get specific page box. */
  getPageBox(boxType: PageBoxType): PageBox | undefined;

  /** Get text content. */
  getText(): string;

  /** Find text occurrences. */
  findText(query: string, flags?: TextSearchFlags): IterableIterator<TextSearchResult>;

  /** Get annotations. */
  getAnnotations(): Annotation[];

  /** Render the page. */
  render(options?: RenderOptions): RenderResult;

  /** Start progressive render. */
  startProgressiveRender(options?: RenderOptions): IProgressiveRenderContext;

  /** Get page objects. */
  getObjects(): PDFiumPageObject[];
  objects(): IterableIterator<PDFiumPageObject>;
}
