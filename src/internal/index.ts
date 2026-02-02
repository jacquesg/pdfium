/**
 * Internal module exports.
 *
 * @module internal
 * @internal
 */

export {
  NULL_ACTION,
  NULL_ANNOT,
  NULL_ATTACHMENT,
  NULL_BITMAP,
  NULL_BOOKMARK,
  NULL_CLIP_PATH,
  NULL_DEST,
  NULL_FONT,
  NULL_FORM,
  NULL_JAVASCRIPT,
  NULL_LINK,
  NULL_MARK,
  NULL_PAGE_LINK,
  NULL_PAGE_OBJECT,
  NULL_PATH_SEGMENT,
  NULL_SEARCH,
  NULL_SIGNATURE,
  NULL_STRUCT_ELEMENT,
  NULL_STRUCT_TREE,
  NULL_TEXT_PAGE,
  UTF16LE_BYTES_PER_CHAR,
  UTF16LE_NULL_TERMINATOR_BYTES,
} from './constants.js';
export type {
  ActionHandle,
  AnnotationHandle,
  AttachmentHandle,
  AvailabilityHandle,
  BitmapHandle,
  BookmarkHandle,
  ClipPathHandle,
  DestinationHandle,
  DocumentHandle,
  FontHandle,
  FormHandle,
  JavaScriptActionHandle,
  LinkHandle,
  PageHandle,
  PageObjectHandle,
  PageObjectMarkHandle,
  PathSegmentHandle,
  SearchHandle,
  SignatureHandle,
  StructElementHandle,
  StructTreeHandle,
  TextPageHandle,
  WASMPointer,
} from './handles.js';
export { INTERNAL } from './symbols.js';
