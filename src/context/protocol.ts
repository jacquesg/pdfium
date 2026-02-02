/**
 * Worker communication protocol.
 *
 * Defines the message types for worker-to-main-thread communication.
 *
 * @module context/protocol
 */

import type { RenderOptions, SerialisedError } from '../core/types.js';

/**
 * Request types sent from main thread to worker.
 */
export type WorkerRequest =
  | { type: 'INIT'; id: string; payload: { wasmBinary: ArrayBuffer; maxDocuments?: number; maxPages?: number } }
  | { type: 'OPEN_DOCUMENT'; id: string; payload: { data: ArrayBuffer; password?: string } }
  | { type: 'CLOSE_DOCUMENT'; id: string; payload: { documentId: number } }
  | { type: 'GET_PAGE_COUNT'; id: string; payload: { documentId: number } }
  | { type: 'LOAD_PAGE'; id: string; payload: { documentId: number; pageIndex: number } }
  | { type: 'CLOSE_PAGE'; id: string; payload: { pageId: number } }
  | { type: 'GET_PAGE_SIZE'; id: string; payload: { pageId: number } }
  | { type: 'RENDER_PAGE'; id: string; payload: RenderPagePayload }
  | { type: 'GET_TEXT'; id: string; payload: { pageId: number } }
  | { type: 'DESTROY'; id: string };

/**
 * Response types sent from worker to main thread.
 */
export type WorkerResponse =
  | { type: 'SUCCESS'; id: string; payload: unknown }
  | { type: 'ERROR'; id: string; error: SerialisedError }
  | { type: 'PROGRESS'; id: string; progress: number };

/**
 * Payload for page rendering request.
 */
export interface RenderPagePayload {
  pageId: number;
  options: RenderOptions;
}

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
  documentId: number;
  pageCount: number;
}

/**
 * Response payload for page load.
 */
export interface LoadPageResponse {
  pageId: number;
  index: number;
  width: number;
  height: number;
}
