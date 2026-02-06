/**
 * Shared constants for internal use.
 *
 * @module internal/constants
 * @internal
 */

import type {
  ActionHandle,
  AnnotationHandle,
  AttachmentHandle,
  BitmapHandle,
  BookmarkHandle,
  ClipPathHandle,
  DestinationHandle,
  FontHandle,
  FormHandle,
  JavaScriptActionHandle,
  LinkHandle,
  PageLinkHandle,
  PageObjectHandle,
  PageObjectMarkHandle,
  PathSegmentHandle,
  SearchHandle,
  SignatureHandle,
  StructElementHandle,
  StructTreeHandle,
  TextPageHandle,
} from './handles.js';

/** Bytes per character in UTF-16LE encoding. */
export const UTF16LE_BYTES_PER_CHAR = 2 as const;

/** Bytes for UTF-16LE null terminator. */
export const UTF16LE_NULL_TERMINATOR_BYTES = 2 as const;

// Null handle constants
export const NULL_FORM = 0 as FormHandle;
export const NULL_TEXT_PAGE = 0 as TextPageHandle;
export const NULL_BITMAP = 0 as BitmapHandle;
export const NULL_BOOKMARK = 0 as BookmarkHandle;
export const NULL_ATTACHMENT = 0 as AttachmentHandle;
export const NULL_DEST = 0 as DestinationHandle;
export const NULL_JAVASCRIPT = 0 as JavaScriptActionHandle;
export const NULL_SIGNATURE = 0 as SignatureHandle;
export const NULL_ANNOT = 0 as AnnotationHandle;
export const NULL_SEARCH = 0 as SearchHandle;
export const NULL_PAGE_OBJECT = 0 as PageObjectHandle;
export const NULL_STRUCT_TREE = 0 as StructTreeHandle;
export const NULL_STRUCT_ELEMENT = 0 as StructElementHandle;
export const NULL_LINK = 0 as LinkHandle;
export const NULL_PAGE_LINK = 0 as PageLinkHandle;
export const NULL_ACTION = 0 as ActionHandle;
export const NULL_CLIP_PATH = 0 as ClipPathHandle;
export const NULL_PATH_SEGMENT = 0 as PathSegmentHandle;
export const NULL_FONT = 0 as FontHandle;
export const NULL_MARK = 0 as PageObjectMarkHandle;

// C structure sizes (in bytes)
export const SIZEOF_INT = 4 as const;
export const SIZEOF_FLOAT = 4 as const;
export const SIZEOF_FS_POINTF = 8 as const; // 2 floats
export const SIZEOF_FS_RECTF = 16 as const; // 4 floats
export const SIZEOF_FS_MATRIX = 24 as const; // 6 floats
export const SIZEOF_FS_QUADPOINTSF = 32 as const; // 8 floats
