/**
 * Link, action, and destination WASM bindings.
 *
 * @module wasm/bindings/link
 */

import type {
  ActionHandle,
  AnnotationHandle,
  BookmarkHandle,
  DestinationHandle,
  DocumentHandle,
  LinkHandle,
  PageHandle,
  PageLinkHandle,
  TextPageHandle,
  WASMPointer,
} from '../../internal/handles.js';

/**
 * Link, action, and destination WASM bindings.
 */
export interface LinkBindings {
  // Bookmark operations
  _FPDFBookmark_GetFirstChild: (document: DocumentHandle, bookmark: BookmarkHandle) => BookmarkHandle;
  _FPDFBookmark_GetNextSibling: (document: DocumentHandle, bookmark: BookmarkHandle) => BookmarkHandle;
  _FPDFBookmark_GetTitle: (bookmark: BookmarkHandle, buffer: WASMPointer, bufferLen: number) => number;
  _FPDFBookmark_GetCount: (bookmark: BookmarkHandle) => number;
  _FPDFBookmark_Find: (document: DocumentHandle, title: WASMPointer) => BookmarkHandle;
  _FPDFBookmark_GetDest: (document: DocumentHandle, bookmark: BookmarkHandle) => DestinationHandle;
  _FPDFBookmark_GetAction: (bookmark: BookmarkHandle) => number;
  _FPDFDest_GetDestPageIndex: (document: DocumentHandle, dest: DestinationHandle) => number;

  // Link operations
  _FPDFLink_GetLinkAtPoint: (page: PageHandle, x: number, y: number) => LinkHandle;
  _FPDFLink_GetLinkZOrderAtPoint: (page: PageHandle, x: number, y: number) => number;

  // Web links (URLs detected in text content)
  // These use the PageLink container returned by LoadWebLinks
  _FPDFLink_LoadWebLinks: (textPage: TextPageHandle) => PageLinkHandle;
  _FPDFLink_CloseWebLinks: (linkPage: PageLinkHandle) => void;
  _FPDFLink_CountWebLinks: (linkPage: PageLinkHandle) => number;
  _FPDFLink_GetURL: (linkPage: PageLinkHandle, linkIndex: number, buffer: WASMPointer, bufferLen: number) => number;
  _FPDFLink_CountRects: (linkPage: PageLinkHandle, linkIndex: number) => number;
  _FPDFLink_GetRect: (
    linkPage: PageLinkHandle,
    linkIndex: number,
    rectIndex: number,
    left: WASMPointer,
    top: WASMPointer,
    right: WASMPointer,
    bottom: WASMPointer,
  ) => number;
  _FPDFLink_GetTextRange: (
    linkPage: PageLinkHandle,
    linkIndex: number,
    startCharIndex: WASMPointer,
    charCount: WASMPointer,
  ) => number;
  _FPDFLink_GetDest: (document: DocumentHandle, link: LinkHandle) => DestinationHandle;
  _FPDFLink_GetAction: (link: LinkHandle) => ActionHandle;
  _FPDFLink_Enumerate: (page: PageHandle, startPos: WASMPointer, linkAnnot: WASMPointer) => number;
  _FPDFLink_GetAnnot: (page: PageHandle, linkIndex: number) => AnnotationHandle;
  _FPDFLink_GetAnnotRect: (link: LinkHandle, rect: WASMPointer) => number;
  _FPDFLink_CountQuadPoints: (link: LinkHandle) => number;
  _FPDFLink_GetQuadPoints: (link: LinkHandle, quadIndex: number, quadPoints: WASMPointer) => number;

  // Action operations
  _FPDFAction_GetType: (action: ActionHandle) => number;
  _FPDFAction_GetDest: (document: DocumentHandle, action: ActionHandle) => DestinationHandle;
  _FPDFAction_GetFilePath: (action: ActionHandle, buffer: WASMPointer, bufferLen: number) => number;
  _FPDFAction_GetURIPath: (
    document: DocumentHandle,
    action: ActionHandle,
    buffer: WASMPointer,
    bufferLen: number,
  ) => number;

  // Destination operations (extended)
  _FPDFDest_GetView: (dest: DestinationHandle, numParams: WASMPointer, params: WASMPointer) => number;
  _FPDFDest_GetLocationInPage: (
    dest: DestinationHandle,
    hasX: WASMPointer,
    hasY: WASMPointer,
    hasZoom: WASMPointer,
    x: WASMPointer,
    y: WASMPointer,
    zoom: WASMPointer,
  ) => number;
}
