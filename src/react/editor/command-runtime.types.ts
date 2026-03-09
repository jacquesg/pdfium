import type { WorkerPDFiumDocument, WorkerPDFiumPage } from '../../context/worker-client.js';

/**
 * A reversible editor operation.
 */
export interface EditorCommand {
  readonly description: string;
  execute(): Promise<void>;
  undo(): Promise<void>;
}

export interface CoalescibleCommand extends EditorCommand {
  coalesce(next: EditorCommand): EditorCommand | null;
}

/**
 * Factory that opens a fresh page handle. Commands call this on every
 * execute/undo to avoid holding stale disposed references. The caller
 * is responsible for disposing the returned page.
 */
export type PageAccessor = () => Promise<WorkerPDFiumPage>;

/**
 * Function that opens a temporary worker-backed document from bytes.
 *
 * Used by snapshot-backed commands that need lossless undo/redo.
 */
export type DocumentOpener = (data: Uint8Array | ArrayBuffer) => Promise<WorkerPDFiumDocument>;
