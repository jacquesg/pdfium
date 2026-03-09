import type { PendingBorderCommit, PendingColourCommitMap } from './annotation-style-commit-queue.types.js';

export function hasQueuedStyleCommits(
  pendingColourCommits: PendingColourCommitMap,
  pendingBorderCommit: PendingBorderCommit | null,
): boolean {
  return pendingColourCommits.stroke !== null || pendingColourCommits.interior !== null || pendingBorderCommit !== null;
}
