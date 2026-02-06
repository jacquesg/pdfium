/**
 * Worker communication protocol.
 *
 * Defines the message types for worker-to-main-thread communication.
 *
 * @module context/protocol
 */

import type { RenderOptions, SerialisedError } from '../core/types.js';

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
  | { type: 'INIT'; id: string; payload: { wasmBinary: ArrayBuffer; maxDocuments?: number; maxPages?: number } }
  | { type: 'OPEN_DOCUMENT'; id: string; payload: { data: ArrayBuffer; password?: string } }
  | { type: 'CLOSE_DOCUMENT'; id: string; payload: { documentId: string } }
  | { type: 'GET_PAGE_COUNT'; id: string; payload: { documentId: string } }
  | { type: 'LOAD_PAGE'; id: string; payload: { documentId: string; pageIndex: number } }
  | { type: 'CLOSE_PAGE'; id: string; payload: { pageId: string } }
  | { type: 'GET_PAGE_SIZE'; id: string; payload: { pageId: string } }
  | { type: 'RENDER_PAGE'; id: string; payload: RenderPagePayload }
  | { type: 'GET_TEXT'; id: string; payload: { pageId: string } }
  | { type: 'GET_TEXT_LAYOUT'; id: string; payload: { pageId: string } }
  | { type: 'PING'; id: string; payload?: DestroyPayload }
  | { type: 'DESTROY'; id: string; payload?: DestroyPayload };

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
  GET_TEXT: { pageId: string };
  GET_TEXT_LAYOUT: { pageId: string };
  PING: Record<string, never>;
  DESTROY: Record<string, never>;
};

/**
 * Response types sent from worker to main thread.
 */
export type WorkerResponse =
  | { type: 'SUCCESS'; id: string; payload: unknown }
  | { type: 'ERROR'; id: string; error: SerialisedError }
  | { type: 'PROGRESS'; id: string; progress: number };

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
