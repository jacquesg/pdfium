interface TriggerObjectUrlDownloadOptions {
  readonly blob: Blob;
  readonly filename: string;
  readonly documentRef?: Document | undefined;
  readonly revokeTimers?: Set<ReturnType<typeof setTimeout>> | undefined;
  readonly revokeDelayMs?: number | undefined;
}

const DEFAULT_OBJECT_URL_REVOKE_DELAY_MS = 1000;

function scheduleObjectUrlRevoke(
  url: string,
  revokeTimers?: Set<ReturnType<typeof setTimeout>>,
  revokeDelayMs = DEFAULT_OBJECT_URL_REVOKE_DELAY_MS,
): void {
  const timer = globalThis.setTimeout(() => {
    URL.revokeObjectURL(url);
    revokeTimers?.delete(timer);
  }, revokeDelayMs);
  revokeTimers?.add(timer);
}

function clearObjectUrlRevokeTimers(revokeTimers: Set<ReturnType<typeof setTimeout>>): void {
  for (const timer of revokeTimers) {
    globalThis.clearTimeout(timer);
  }
  revokeTimers.clear();
}

function triggerObjectUrlDownload({
  blob,
  filename,
  documentRef,
  revokeTimers,
  revokeDelayMs,
}: TriggerObjectUrlDownloadOptions): void {
  const doc = documentRef ?? (typeof globalThis.document !== 'undefined' ? globalThis.document : undefined);
  if (!doc) return;

  const url = URL.createObjectURL(blob);
  try {
    const anchor = doc.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
  } finally {
    scheduleObjectUrlRevoke(url, revokeTimers, revokeDelayMs);
  }
}

export { DEFAULT_OBJECT_URL_REVOKE_DELAY_MS, clearObjectUrlRevokeTimers, triggerObjectUrlDownload };
