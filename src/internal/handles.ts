/**
 * Branded handle types for WASM resources.
 *
 * These are internal implementation details.
 *
 * @module internal/handles
 * @internal
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

/** Branded handle for a loaded font. */
export type FontHandle = number & { readonly __brand: 'FontHandle' };

/** Branded handle for a document availability provider. */
export type AvailabilityHandle = number & { readonly __brand: 'AvailabilityHandle' };

/** Branded handle for a JavaScript action in a PDF. */
export type JavaScriptActionHandle = number & { readonly __brand: 'JavaScriptActionHandle' };

/** Branded handle for a digital signature in a PDF. */
export type SignatureHandle = number & { readonly __brand: 'SignatureHandle' };

/** Branded handle for a clip path. */
export type ClipPathHandle = number & { readonly __brand: 'ClipPathHandle' };

/** Branded handle for a path segment. */
export type PathSegmentHandle = number & { readonly __brand: 'PathSegmentHandle' };

/** Branded handle for an annotation. */
export type AnnotationHandle = number & { readonly __brand: 'AnnotationHandle' };

/** Branded handle for a link on a page. */
export type LinkHandle = number & { readonly __brand: 'LinkHandle' };

/** Branded handle for an action. */
export type ActionHandle = number & { readonly __brand: 'ActionHandle' };

/** Branded handle for a web links container from FPDFLink_LoadWebLinks. */
export type PageLinkHandle = number & { readonly __brand: 'PageLinkHandle' };

/** Branded handle for a page object content mark. */
export type PageObjectMarkHandle = number & { readonly __brand: 'PageObjectMarkHandle' };
