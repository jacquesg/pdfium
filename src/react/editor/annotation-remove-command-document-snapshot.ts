import type { SnapshotRestoreOptions } from './annotation-command-types.js';
import { restoreDocumentFromSnapshot } from './command-shared.js';

export function hasRestorableDocumentSnapshot(
  snapshotRestore: SnapshotRestoreOptions | undefined,
  beforeDocumentBytes: Uint8Array | undefined,
  afterDocumentBytes: Uint8Array | undefined,
): snapshotRestore is SnapshotRestoreOptions {
  return snapshotRestore !== undefined && beforeDocumentBytes !== undefined && afterDocumentBytes !== undefined;
}

export async function saveSnapshotDocumentBytes(snapshotRestore: SnapshotRestoreOptions): Promise<Uint8Array> {
  return snapshotRestore.document.save();
}

export async function restoreRemovedAnnotationDocument(
  snapshotRestore: SnapshotRestoreOptions,
  snapshotBytes: Uint8Array,
): Promise<void> {
  await restoreDocumentFromSnapshot(snapshotRestore.document, snapshotBytes, snapshotRestore.openDocument);
}
