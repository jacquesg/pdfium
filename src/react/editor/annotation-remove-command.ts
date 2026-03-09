import type { SerialisedAnnotation } from '../../context/protocol.js';
import type { SnapshotRestoreOptions } from './annotation-command-types.js';
import {
  restoreRemovedAnnotationDocument,
  saveSnapshotDocumentBytes,
} from './annotation-remove-command-document-snapshot.js';
import { removeAnnotationAtIndex, restoreRemovedAnnotation } from './annotation-remove-command-page-operations.js';
import type { EditorCommand, PageAccessor } from './command-shared.js';

export class RemoveAnnotationCommand implements EditorCommand {
  readonly description = 'Remove annotation';
  readonly #getPage: PageAccessor;
  #annotationIndex: number;
  #snapshot: SerialisedAnnotation | undefined;
  readonly #snapshotRestore: SnapshotRestoreOptions | undefined;
  #beforeDocumentBytes: Uint8Array | undefined;
  #afterDocumentBytes: Uint8Array | undefined;

  constructor(
    getPage: PageAccessor,
    annotationIndex: number,
    snapshot: SerialisedAnnotation,
    snapshotRestore?: SnapshotRestoreOptions,
  ) {
    this.#getPage = getPage;
    this.#annotationIndex = annotationIndex;
    this.#snapshot = snapshot;
    this.#snapshotRestore = snapshotRestore;
  }

  async execute(): Promise<void> {
    const afterDocumentBytes = this.#afterDocumentBytes;
    if (
      this.#snapshotRestore !== undefined &&
      this.#beforeDocumentBytes !== undefined &&
      afterDocumentBytes !== undefined
    ) {
      await restoreRemovedAnnotationDocument(this.#snapshotRestore, afterDocumentBytes);
      return;
    }

    if (this.#snapshotRestore !== undefined && this.#beforeDocumentBytes === undefined) {
      this.#beforeDocumentBytes = await saveSnapshotDocumentBytes(this.#snapshotRestore);
    }

    await removeAnnotationAtIndex(this.#getPage, this.#annotationIndex);

    if (this.#snapshotRestore !== undefined && this.#afterDocumentBytes === undefined) {
      this.#afterDocumentBytes = await saveSnapshotDocumentBytes(this.#snapshotRestore);
    }
  }

  async undo(): Promise<void> {
    if (this.#snapshot === undefined) return;

    const beforeDocumentBytes = this.#beforeDocumentBytes;
    if (
      this.#snapshotRestore !== undefined &&
      beforeDocumentBytes !== undefined &&
      this.#afterDocumentBytes !== undefined
    ) {
      await restoreRemovedAnnotationDocument(this.#snapshotRestore, beforeDocumentBytes);
      return;
    }

    this.#annotationIndex = await restoreRemovedAnnotation(this.#getPage, this.#snapshot);
  }
}
